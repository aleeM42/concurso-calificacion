// Model: Usuarios (admin y jueces)

import { db } from '../firebase-config.js';
import {
    doc, setDoc, getDoc, getDocs,
    collection, query, where, deleteDoc, updateDoc,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Crear documento de usuario en Firestore.
 * Se llama después de crear la cuenta en Firebase Auth.
 */
export async function createUserDoc(uid, { email, name, role }) {
    await setDoc(doc(db, 'users', uid), {
        email,
        name,
        role,
        createdAt: serverTimestamp(),
    });
}

/**
 * Obtener datos de un usuario por su UID.
 */
export async function getUser(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Listar usuarios filtrados por rol ("admin" o "judge").
 */
export async function getUsersByRole(role) {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Eliminar documento de usuario.
 */
export async function deleteUserDoc(uid) {
    await deleteDoc(doc(db, 'users', uid));
}

/**
 * Actualizar documento de usuario.
 */
export async function updateUserDoc(uid, data) {
    await updateDoc(doc(db, 'users', uid), data);
}
