// Model: Puntajes (calificaciones de jueces)

import { db } from '../firebase-config.js';
import {
    collection, addDoc, getDocs,
    query, where, serverTimestamp
} from 'firebase/firestore';

const scoresCol = collection(db, 'scores');

/**
 * Verificar si un juez ya calificó una obra.
 * @returns {boolean}
 */
export async function hasJudgeScored(judgeId, workId) {
    const q = query(
        scoresCol,
        where('judgeId', '==', judgeId),
        where('workId', '==', workId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

/**
 * Crear un puntaje. Lanza error si el juez ya calificó esta obra.
 */
export async function createScore({ workId, judgeId, score, comment }) {
    // Doble verificación (la primera la hace el controller)
    const alreadyScored = await hasJudgeScored(judgeId, workId);
    if (alreadyScored) {
        throw new Error('Ya calificaste esta obra');
    }

    await addDoc(scoresCol, {
        workId,
        judgeId,
        score: Number(score),
        comment: comment || '',
        createdAt: serverTimestamp(),
    });
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
