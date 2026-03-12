// Controller: Autenticación

import { auth } from '../firebase-config.js';
import { secondaryAuth } from '../firebase-secondary.js';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { createUserDoc, getUser } from '../models/user.model.js';

/**
 * Login con email y contraseña.
 * Redirige según el rol del usuario.
 */
export async function login(id, password) {
    // Transformar el ID en un correo ficticio constante para Firebase Auth
    const syntheticEmail = `${id.toLowerCase()}@concurso.local`;

    const credential = await signInWithEmailAndPassword(auth, syntheticEmail, password);
    const userData = await getUser(credential.user.uid);

    if (!userData) {
        await signOut(auth);
        throw new Error('Usuario no registrado en el sistema');
    }

    // Redirigir según rol
    if (userData.role === 'admin') {
        window.location.href = '/admin-dashboard.html';
    } else if (userData.role === 'judge') {
        window.location.href = '/judge-scoring.html';
    }

    return userData;
}

/**
 * Cerrar sesión y redirigir al login.
 */
export async function logout() {
    await signOut(auth);
    window.location.href = '/index.html';
}

/**
 * Crear cuenta de juez usando la segunda instancia de Firebase.
 * Así no se cierra la sesión del admin.
 */
export async function createJudge(id, password, name) {
    const syntheticEmail = `${id.toLowerCase()}@concurso.local`;

    // Crear cuenta en Auth con la segunda instancia
    const credential = await createUserWithEmailAndPassword(secondaryAuth, syntheticEmail, password);

    // Crear documento en Firestore (usa la instancia principal)
    await createUserDoc(credential.user.uid, {
        idAcceso: id.toLowerCase(),
        name,
        role: 'judge',
        accessCode: password
    });

    // Cerrar sesión de la segunda instancia (no afecta al admin)
    await signOut(secondaryAuth);

    return credential.user.uid;
}
