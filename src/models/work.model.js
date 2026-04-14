// Model: Obras del concurso

import { db } from '../firebase-config.js';
import {
    collection, doc, addDoc, getDoc, getDocs,
    updateDoc, deleteDoc, query, where, writeBatch,
    serverTimestamp, orderBy
} from 'firebase/firestore';

const worksCol = collection(db, 'works');

/**
 * Obtener todas las obras, ordenadas por fecha de creación.
 */
export async function getWorks() {
    const q = query(worksCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtener obras filtradas por categoría.
 */
export async function getWorksByCategory(category) {
    const q = query(worksCol, where('category', '==', category));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtener una obra por su ID.
 */
export async function getWorkById(workId) {
    const snap = await getDoc(doc(db, 'works', workId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Crear una obra individual.
 */
export async function createWork({ title, author, category, description, contest, participantNumber }) {
    const docRef = await addDoc(worksCol, {
        title,
        author,
        category,
        description: description || '',
        contest: contest || '',
        participantNumber: participantNumber || '',
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

/**
 * Crear obras en lote (para importación CSV).
 * @param {Array<{title, author, category, description, contest}>} worksArray
 */
export async function createWorksBatch(worksArray) {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const work of worksArray) {
        const ref = doc(worksCol);
        batch.set(ref, {
            title: work.title,
            author: work.author,
            category: work.category,
            description: work.description || '',
            contest: work.contest || '',
            participantNumber: work.participantNumber || '',
            createdAt: now,
        });
    }

    await batch.commit();
    return worksArray.length;
}

/**
 * Actualizar una obra.
 */
export async function updateWork(workId, data) {
    await updateDoc(doc(db, 'works', workId), data);
}

/**
 * Eliminar una obra.
 */
export async function deleteWork(workId) {
    await deleteDoc(doc(db, 'works', workId));
}
