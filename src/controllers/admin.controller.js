// Controller: Admin — Gestión de obras, jueces y resultados

import { getWorks, createWork, createWorksBatch, deleteWork } from '../models/work.model.js';
import { getUsersByRole, deleteUserDoc, updateUserDoc } from '../models/user.model.js';
import { getAllScores, getScoresByWork, createScore, hasJudgeScored } from '../models/score.model.js';
import { db } from '../firebase-config.js';
import { addDoc, collection, serverTimestamp, writeBatch, doc, getDocs, query, orderBy } from 'firebase/firestore';

/**
 * Cargar datos del dashboard: contadores básicos.
 */
export async function loadDashboard() {
    const [works, judges] = await Promise.all([
        getWorks(),
        getUsersByRole('judge'),
    ]);

    return {
        totalWorks: works.length,
        totalJudges: judges.length,
    };
}

/**
 * Agregar una obra individual.
 */
export async function addWork(data) {
    const existingWorks = await getWorks();
    const isDuplicate = existingWorks.some(w =>
        w.title.toLowerCase() === data.title.toLowerCase() &&
        w.author.toLowerCase() === data.author.toLowerCase() &&
        (w.contest?.toLowerCase() || '') === (data.contest?.toLowerCase() || '')
    );

    if (isDuplicate) {
        throw new Error(`La obra "${data.title}" del autor "${data.author}" ya está registrada.`);
    }

    return await createWork(data);
}

/**
 * Importar obras desde un array de datos (procesado de CSV o Excel).
 */
export async function importWorksBatch(dataWorks, contestName) {
    if (!dataWorks || dataWorks.length === 0) {
        throw new Error('El archivo está vacío o no contiene datos válidos');
    }

    const validCategories = ['infantil', 'juvenil', 'adulto'];

    const existingWorks = await getWorks();
    const existingKeys = new Set(existingWorks.filter(w => (w.contest?.toLowerCase() || '') === contestName.toLowerCase()).map(w => `${w.title.toLowerCase()}|${w.author.toLowerCase()}`));
    const newKeys = new Set();

    const works = [];

    dataWorks.forEach((item, index) => {
        if (!item.title || !item.author || !item.category) {
            throw new Error(`Obra ${index + 1}: faltan datos requeridos (título, autor o categoría)`);
        }

        const category = item.category.toLowerCase();
        if (!validCategories.includes(category)) {
            throw new Error(`Obra "${item.title}": categoría "${item.category}" no válida. Usar: infantil, juvenil o adulto`);
        }

        const key = `${item.title.toLowerCase()}|${item.author.toLowerCase()}`;
        if (existingKeys.has(key) || newKeys.has(key)) {
            throw new Error(`La obra "${item.title}" del autor "${item.author}" ya está registrada o existe un duplicado en el mismo archivo.`);
        }
        newKeys.add(key);

        works.push({
            title: item.title,
            author: item.author,
            category: category,
            description: item.description || '',
            contest: contestName,
        });
    });

    if (works.length === 0) {
        throw new Error('No se encontraron obras válidas en el archivo');
    }

    const count = await createWorksBatch(works);
    return count;
}

/**
 * Cargar listado de obras.
 */
export async function loadWorks() {
    return await getWorks();
}

/**
 * Eliminar una obra.
 */
export async function removeWork(workId) {
    await deleteWork(workId);
}

/**
 * Cargar listado de jueces.
 */
export async function loadJudges() {
    return await getUsersByRole('judge');
}

/**
 * Eliminar un juez (solo su documento Firestore, no la cuenta Auth).
 */
export async function removeJudge(uid) {
    await deleteUserDoc(uid);
}

/**
 * Modificar un juez (su nombre).
 */
export async function editJudge(uid, newName) {
    await updateUserDoc(uid, { name: newName });
}

/**
 * Calcular resultados: sumatoria de puntajes por obra, ordenados de mayor a menor.
 * Incluye detalle de puntajes individuales por juez.
 */
export async function calculateResults() {
    const [works, scores, judges] = await Promise.all([
        getWorks(),
        getAllScores(),
        getUsersByRole('judge'),
    ]);

    // Mapa de jueces para mostrar nombres
    const judgeMap = {};
    judges.forEach(j => { judgeMap[j.id] = j.name; });

    // Agrupar puntajes por obra
    const scoresByWork = {};
    scores.forEach(s => {
        if (!scoresByWork[s.workId]) {
            scoresByWork[s.workId] = [];
        }
        scoresByWork[s.workId].push({
            judgeId: s.judgeId,
            judgeName: judgeMap[s.judgeId] || 'Juez desconocido',
            score: s.score,
            comment: s.comment,
        });
    });

    // Calcular sumatoria por obra y crear ranking con parámetros de desempate
    const results = works.map(work => {
        const workScores = scoresByWork[work.id] || [];
        const totalScore = workScores.reduce((sum, s) => sum + s.score, 0);

        // Contar la cantidad de 10s, 9s, etc. para desempate
        const scoreCounts = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
        workScores.forEach(s => {
            if (s.score >= 0 && s.score <= 10) {
                scoreCounts[s.score]++;
            }
        });

        // Fecha de creación para último recurso de desempate
        let createdTime = 0;
        if (work.createdAt) {
            createdTime = work.createdAt.toMillis ? work.createdAt.toMillis() : (work.createdAt.seconds || 0);
        }

        return {
            workId: work.id,
            title: work.title,
            author: work.author,
            category: work.category,
            contest: work.contest,
            totalScore,
            scoreCount: workScores.length,
            scores: workScores,
            scoreCounts,
            createdTime
        };
    });

    // Ordenar por sumatoria descendente y aplicar reglas de desempate
    results.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
        }

        // 1er Desempate: Quien tenga más 10s, luego 9s, luego 8s...
        for (let i = 10; i >= 0; i--) {
            if (b.scoreCounts[i] !== a.scoreCounts[i]) {
                return b.scoreCounts[i] - a.scoreCounts[i];
            }
        }

        // 2do Desempate: La obra más antigua gana
        return a.createdTime - b.createdTime;
    });

    return results;
}

/**
 * Generar calificaciones falsas para probar escenarios de desempate.
 */
export async function generateTestScores() {
    const works = await getWorks();
    const judges = await getUsersByRole('judge');

    if (works.length === 0 || judges.length === 0) {
        throw new Error('Se necesitan obras y jueces para generar calificaciones.');
    }

    let count = 0;
    for (const judge of judges) {
        for (const work of works) {
            // Verificar si ya calificó para no duplicar en caso de múltiples ejecuciones
            const alreadyScored = await hasJudgeScored(judge.id, work.id);
            if (!alreadyScored) {
                // Generar puntaje aleatorio sesgado hacia arriba (7 a 10) para forzar empates
                const score = Math.floor(Math.random() * 4) + 7;
                await createScore({
                    workId: work.id,
                    judgeId: judge.id,
                    score: score,
                    comment: 'Calificación automática de prueba'
                });
                count++;
            }
        }
    }
    return count;
}

/**
 * Finalizar el concurso actual.
 * Guarda el top 5 de cada categoría en el historial y elimina todas las obras y calificaciones actuales.
 * @param {string} contestName - Nombre del concurso para el historial.
 */
export async function finalizeContest(contestName) {
    // 1. Calcular resultados actuales
    const allResults = await calculateResults();
    if (allResults.length === 0) {
        throw new Error('No hay obras para finalizar.');
    }

    // 2. Extraer Top 5 por categoría
    const categories = ['infantil', 'juvenil', 'adulto'];
    const winners = {};

    categories.forEach(cat => {
        const catResults = allResults.filter(r => r.category === cat);
        winners[cat] = catResults.slice(0, 5).map(r => ({
            title: r.title,
            author: r.author,
            totalScore: r.totalScore
        }));
    });

    // 3. Guardar en nueva colección "contests"
    const contestsCol = collection(db, 'contests');
    await addDoc(contestsCol, {
        name: contestName,
        date: serverTimestamp(),
        winners: winners
    });

    // 4. Borrar todas las obras y calificaciones actuales
    const worksCol = collection(db, 'works');
    const worksSnap = await getDocs(worksCol);
    
    const scoresCol = collection(db, 'scores');
    const scoresSnap = await getDocs(scoresCol);

    let batch = writeBatch(db);
    let opsCount = 0;
    const batches = [batch];

    const addDeleteToBatch = (ref) => {
        if (opsCount >= 490) { // Límite seguro < 500
            batch = writeBatch(db);
            batches.push(batch);
            opsCount = 0;
        }
        batch.delete(ref);
        opsCount++;
    };

    worksSnap.forEach(d => addDeleteToBatch(d.ref));
    scoresSnap.forEach(d => addDeleteToBatch(d.ref));

    for (const b of batches) {
        if (opsCount > 0 || batches.length > 1) { // No commit si el batch está vacío
             await b.commit();
        }
    }
}

/**
 * Obtener el historial de concursos finalizados.
 */
export async function getContestsHistory() {
    const contestsCol = collection(db, 'contests');
    const q = query(contestsCol, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => {
        const data = d.data();
        let formattedDate = 'Fecha desconocida';
        if (data.date) {
             const dateObj = data.date.toDate ? data.date.toDate() : new Date(data.date.seconds * 1000);
             formattedDate = dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        return {
             id: d.id,
             name: data.name || 'Concurso sin nombre',
             date: formattedDate,
             winners: data.winners || {}
        };
    });
}
