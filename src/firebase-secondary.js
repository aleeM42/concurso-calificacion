// Segunda instancia de Firebase para crear cuentas de jueces
// sin cerrar la sesión del administrador actual.
//
// Usa las MISMAS credenciales del proyecto principal.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCOYXl9eM9jN94pTuO3f7g_NOf-UBi-lhw",
    authDomain: "calificacion-concursos.firebaseapp.com",
    projectId: "calificacion-concursos",
    storageBucket: "calificacion-concursos.firebasestorage.app",
    messagingSenderId: "187383159271",
    appId: "1:187383159271:web:587bf83e4b0d4d7a87c542",
    measurementId: "G-FX02D5YPP0"
};

const secondaryApp = initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);
