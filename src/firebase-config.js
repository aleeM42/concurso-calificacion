// Firebase Configuration
// El DESARROLLADOR debe reemplazar estos valores con los de su proyecto Firebase.
// Ir a: Firebase Console → Project Settings → Web App → Config

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCOYXl9eM9jN94pTuO3f7g_NOf-UBi-lhw",
    authDomain: "calificacion-concursos.firebaseapp.com",
    projectId: "calificacion-concursos",
    storageBucket: "calificacion-concursos.firebasestorage.app",
    messagingSenderId: "187383159271",
    appId: "1:187383159271:web:587bf83e4b0d4d7a87c542",
    measurementId: "G-FX02D5YPP0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
