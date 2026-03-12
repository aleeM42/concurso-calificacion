// Controller: Juez — Calificación de obras

import { getWorks } from '../models/work.model.js';
import { getScoresByJudge, createScore, hasJudgeScored } from '../models/score.model.js';

/**
 * Cargar obras pendientes de calificar para un juez.
 * Retorna solo las obras que el juez NO ha calificado aún.
 */
export async function loadPendingWorks(judgeId) {
    const [works, myScores] = await Promise.all([
        getWorks(),
        getScoresByJudge(judgeId),
    ]);

    // IDs de obras ya calificadas
    const scoredWorkIds = new Set(myScores.map(s => s.workId));

    // Filtrar obras pendientes
    return works.filter(w => !scoredWorkIds.has(w.id));
}

/**
 * Enviar puntaje para una obra. El puntaje es INMUTABLE.
 * Valida que sea 0-10 y que no exista calificación previa.
 */
export async function submitScore(judgeId, workId, score, comment = '') {
    // Validar rango
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error('El puntaje debe ser un número entre 0 y 10');
    }

    // Validar que no sea decimal
    if (!Number.isInteger(numScore)) {
        throw new Error('El puntaje debe ser un número entero');
    }

    // Crear puntaje (el model también verifica unicidad)
    await createScore({
        workId,
        judgeId,
        score: numScore,
        comment,
    });
}

/**
 * Cargar los puntajes ya enviados por un juez (solo lectura).
 */
export async function loadMyScores(judgeId) {
    const [scores, works] = await Promise.all([
        getScoresByJudge(judgeId),
        getWorks(),
    ]);

    // Enriquecer con datos de la obra
    const workMap = {};
    works.forEach(w => { workMap[w.id] = w; });

    return scores.map(s => ({
        ...s,
        workTitle: workMap[s.workId]?.title || 'Obra eliminada',
        workAuthor: workMap[s.workId]?.author || '',
        workCategory: workMap[s.workId]?.category || '',
    }));
}
