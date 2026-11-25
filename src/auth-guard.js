// Auth Guard — Verificar sesión y rol en cada página protegida.
// Importar y llamar desde el JS de cada página.

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { renderNavbar } from './views/shared.js';

/**
 * Verifica que el usuario tenga sesión activa y el rol requerido.
 * Si no cumple, redirige al login.
 *
 * @param {string} requiredRole - "admin" o "judge"
 * @returns {Promise<{uid: string, email: string, name: string, role: string}>}
 */
export function requireAuth(requiredRole) {
    // Hallazgo 1: dibujar la barra de navegación de inmediato (sin nombre de usuario).
    // La llamada a renderNavbar de cada página la vuelve a dibujar con el nombre al terminar la verificación.
    renderNavbar(requiredRole, '', null);

    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = '/index.html';
                reject(new Error('No hay sesión activa'));
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (!userDoc.exists()) {
                    window.location.href = '/index.html';
                    reject(new Error('Usuario no encontrado en Firestore'));
                    return;
                }

                const userData = userDoc.data();

                if (userData.role !== requiredRole) {
                    // Redirigir al dashboard correcto según su rol
                    if (userData.role === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else {
                        window.location.href = '/judge-scoring.html';
                    }
                    reject(new Error('Rol incorrecto'));
                    return;
                }

                resolve({
                    uid: user.uid,
                    email: user.email,
                    name: userData.name,
                    role: userData.role,
                });
            } catch (error) {
                console.error('Error verificando usuario:', error);
                window.location.href = '/index.html';
                reject(error);
            }
        });
    });
}
