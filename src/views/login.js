// View JS: Login

import { login } from '../controllers/auth.controller.js';
import { auth } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '../models/user.model.js';

// Si ya tiene sesión activa, redirigir
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userData = await getUser(user.uid);
        if (userData?.role === 'admin') {
            window.location.href = '/admin-dashboard.html';
        } else if (userData?.role === 'judge') {
            window.location.href = '/judge-scoring.html';
        }
    }
});

const form = document.getElementById('loginForm');
const errorEl = document.getElementById('loginError');
const btnLogin = document.getElementById('btnLogin');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('show');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Ingresando...';

    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value;

    try {
        await login(userId, password);
    } catch (error) {
        console.error('Login error:', error);

        let msg = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'Correo o contraseña incorrectos';
        } else if (error.code === 'auth/too-many-requests') {
            msg = 'Demasiados intentos. Intenta más tarde';
        } else if (error.message) {
            msg = error.message;
        }

        errorEl.textContent = msg;
        errorEl.classList.add('show');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    }
});
