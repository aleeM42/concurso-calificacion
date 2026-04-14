// Model: Puntajes (calificaciones de jueces)

import { db } from '../firebase-config.js';
import {
    collection, doc, addDoc, getDocs, updateDoc, writeBatch,
    query, where, serverTimestamp
} from 'firebase/firestore';

const scoresCol = collection(db, 'scores');

/**
 * Verificar si un juez ya tiene un documento de puntaje para una obra.
 * @returns {{ exists: boolean, docId: string|null, estado: string|null }}
 */
export async function getExistingScore(judgeId, workId) {
    const q = query(
        scoresCol,
        where('judgeId', '==', judgeId),
        where('workId', '==', workId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { exists: false, docId: null, estado: null };
    const docSnap = snap.docs[0];
    return { exists: true, docId: docSnap.id, estado: docSnap.data().estado_calificacion };
}

/**
 * @deprecated Usa getExistingScore en su lugar.
 */
export async function hasJudgeScored(judgeId, workId) {
    const { exists } = await getExistingScore(judgeId, workId);
    return exists;
}

/**
 * Upsert de puntaje: crea si no existe, actualiza si ya existe.
 * Solo bloquea la actualización si el estado actual es 'enviado'.
 * @param {{ workId, judgeId, score, comment, estado_calificacion }} param0
 */
export async function upsertScore({ workId, judgeId, score, comment, estado_calificacion }) {
    const { exists, docId, estado } = await getExistingScore(judgeId, workId);

    if (exists && estado === 'enviado') {
        throw new Error('Esta calificación ya fue enviada definitivamente y no puede modificarse.');
    }

    const payload = {
        workId,
        judgeId,
        score: Number(score),
        comment: comment || '',
        estado_calificacion: estado_calificacion || 'borrador',
        updatedAt: serverTimestamp(),
    };

    if (exists) {
        await updateDoc(doc(db, 'scores', docId), payload);
    } else {
        await addDoc(scoresCol, {
            ...payload,
            createdAt: serverTimestamp(),
        });
    }
}

/**
 * @deprecated Usa upsertScore en su lugar.
 */
export async function createScore({ workId, judgeId, score, comment }) {
    return upsertScore({ workId, judgeId, score, comment, estado_calificacion: 'enviado' });
}

/**
 * Cambia TODOS los borradores de un juez a 'enviado' en una sola operación batch.
 * @param {string} judgeId
 */
export async function submitAllDrafts(judgeId) {
    const q = query(
        scoresCol,
        where('judgeId', '==', judgeId),
        where('estado_calificacion', '==', 'borrador')
    );
    const snap = await getDocs(q);

    if (snap.empty) return 0; // Nada que confirmar

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
        batch.update(d.ref, {
            estado_calificacion: 'enviado',
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
    return snap.size;
}

/**
 * Obtener todos los puntajes de una obra específica.
 */
export async function getScoresByWork(workId) {
    const q = query(scoresCol, where('workId', '==', workId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtener todos los puntajes de un juez.
 */
export async function getScoresByJudge(judgeId) {
    const q = query(scoresCol, where('judgeId', '==', judgeId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtener todos los puntajes del sistema.
 * Se usa para calcular el ranking general.
 */
export async function getAllScores() {
    const snap = await getDocs(scoresCol);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
