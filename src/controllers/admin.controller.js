// Controller: Admin — Gestión de obras, jueces y resultados

import { getWorks, createWork, createWorksBatch, deleteWork } from '../models/work.model.js';
import { getUsersByRole, deleteUserDoc, updateUserDoc } from '../models/user.model.js';
import { getAllScores, getScoresByWork, createScore, hasJudgeScored } from '../models/score.model.js';

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
        w.author.toLowerCase() === data.author.toLowerCase()
    );

    if (isDuplicate) {
        throw new Error(`La obra "${data.title}" del autor "${data.author}" ya está registrada.`);
    }

    return await createWork(data);
}

/**
 * Importar obras desde un archivo CSV.
 * Formato esperado: titulo,autor,categoria,descripcion
 * La primera fila puede ser encabezados (se detecta automáticamente).
 */
export async function importCSV(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length === 0) {
        throw new Error('El archivo CSV está vacío');
    }

    // Detectar si la primera fila es encabezados
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes('titulo') || firstLine.includes('title') ||
        firstLine.includes('autor') || firstLine.includes('author');

    const dataLines = hasHeaders ? lines.slice(1) : lines;
    const validCategories = ['infantil', 'juvenil', 'adulto'];

    const existingWorks = await getWorks();
    const existingKeys = new Set(existingWorks.map(w => `${w.title.toLowerCase()}|${w.author.toLowerCase()}`));
    const newKeys = new Set();

    const works = [];

    dataLines.forEach((line, index) => {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => {
            let val = s.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1).trim();
            }
            return val;
        });

        if (parts.length < 3) {
            throw new Error(`Línea ${index + 1}: se necesitan al menos 3 columnas (título, autor, categoría)`);
        }

        const category = parts[2].toLowerCase();
        if (!validCategories.includes(category)) {
            throw new Error(`Línea ${index + 1}: categoría "${parts[2]}" no válida. Usar: infantil, juvenil o adulto`);
        }

        const key = `${parts[0].toLowerCase()}|${parts[1].toLowerCase()}`;
        if (existingKeys.has(key) || newKeys.has(key)) {
            throw new Error(`Línea ${index + 1}: La obra "${parts[0]}" del autor "${parts[1]}" ya está registrada o existe un duplicado en el mismo archivo.`);
        }
        newKeys.add(key);

        works.push({
            title: parts[0],
            author: parts[1],
            category: category,
            description: parts[3] || '',
        });
    });

    if (works.length === 0) {
        throw new Error('No se encontraron obras válidas en el CSV');
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
