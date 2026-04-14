// Controller: Juez — Calificación de obras

import { getWorks } from '../models/work.model.js';
import {
    getScoresByJudge,
    upsertScore,
    submitAllDrafts,
    getExistingScore,
} from '../models/score.model.js';

// ─────────────────────────────────────────────────────────────────────────────
// Utilidad: Ordenamiento Natural Alfanumérico
// Formato esperado: LETRA-NUMERO, ej: "I-01", "J-10", "A-03"
//   I = Infantil  |  J = Juvenil  |  A = Adulto
// ─────────────────────────────────────────────────────────────────────────────

/** Regex que detecta el formato de número de participante: LETRA-NUMERO */
const PARTICIPANT_REGEX = /^([A-Za-z])-(\d+)$/;

/**
 * Extrae la clave de ordenamiento de una obra.
 * Prioridad: campo `participantNumber` → campo `title` si contiene el patrón → null
 * @param {Object} work
 * @returns {{ letter: string, num: number } | null}
 */
function extractSortKey(work) {
    // 1. Intentar con el campo dedicado
    const source = (work.participantNumber || '').trim();
    const match = PARTICIPANT_REGEX.exec(source);
    if (match) {
        return { letter: match[1].toUpperCase(), num: parseInt(match[2], 10) };
    }

    // 2. Fallback: buscar el patrón dentro del título (ej: título empieza con "I-01 ...")
    if (work.title) {
        const titleMatch = PARTICIPANT_REGEX.exec(work.title.trim().split(' ')[0]);
        if (titleMatch) {
            return { letter: titleMatch[1].toUpperCase(), num: parseInt(titleMatch[2], 10) };
        }
    }

    return null;
}

/**
 * Orden de las letras de categoría.
 * A (Adulto), I (Infantil), J (Juvenil) → orden alfabético por defecto.
 * Podés modificar este array para cambiar el orden de los grupos.
 */
const LETTER_ORDER = { 'A': 0, 'I': 1, 'J': 2 };

/**
 * Ordena un array de obras por número de participante con Natural Sort.
 * - Agrupa por letra (A → I → J), luego por número creciente.
 * - Las obras sin identificador reconocible van al final, ordenadas por título.
 * @param {Array} works
 * @returns {Array}
 */
export function sortWorksByParticipantNumber(works) {
    return [...works].sort((a, b) => {
        const keyA = extractSortKey(a);
        const keyB = extractSortKey(b);

        // Obras sin clave van al final
        if (!keyA && !keyB) return (a.title || '').localeCompare(b.title || '');
        if (!keyA) return 1;
        if (!keyB) return -1;

        // Ordenar por letra primero (A < I < J)
        const letterA = LETTER_ORDER[keyA.letter] ?? keyA.letter.charCodeAt(0);
        const letterB = LETTER_ORDER[keyB.letter] ?? keyB.letter.charCodeAt(0);
        if (letterA !== letterB) return letterA - letterB;

        // Dentro del mismo grupo: orden numérico natural (2 < 10)
        return keyA.num - keyB.num;
    });
}

/**
 * Compara dos strings de número de participante (usado externamente si es necesario).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function naturalSortParticipant(a, b) {
    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Carga de obras
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cargar TODAS las obras del concurso junto con el estado de calificación del juez.
 * Retorna las obras enriquecidas con `scoreStatus`: 'sin_calificar' | 'borrador' | 'enviado'
 * y el score/comment actuales si existen.
 * @param {string} judgeId
 * @returns {Promise<Array>}
 */
export async function loadAllWorksWithStatus(judgeId) {
    const [works, myScores] = await Promise.all([
        getWorks(),
        getScoresByJudge(judgeId),
    ]);

    // Mapa rápido: workId → score doc
    const scoreMap = {};
    myScores.forEach(s => { scoreMap[s.workId] = s; });

    // Enriquecer con estado y ordenar
    const enriched = works.map(w => {
        const scoreDoc = scoreMap[w.id];
        return {
            ...w,
            scoreStatus: scoreDoc ? scoreDoc.estado_calificacion : 'sin_calificar',
            currentScore: scoreDoc ? scoreDoc.score : '',
            currentComment: scoreDoc ? scoreDoc.comment : '',
        };
    });

    return sortWorksByParticipantNumber(enriched);
}

/**
 * @deprecated Usa loadAllWorksWithStatus para tener el estado visual completo.
 * Mantiene compatibilidad: retorna solo obras sin calificar O en borrador.
 */
export async function loadPendingWorks(judgeId) {
    const allWorks = await loadAllWorksWithStatus(judgeId);
    return allWorks.filter(w => w.scoreStatus !== 'enviado');
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardado y envío
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda un borrador de calificación. Permite edición futura.
 * @param {string} judgeId
 * @param {string} workId
 * @param {number|string} score
 * @param {string} comment
 */
export async function saveDraft(judgeId, workId, score, comment = '') {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error('El puntaje debe ser un número entre 0 y 10');
    }
    if (!Number.isInteger(numScore)) {
        throw new Error('El puntaje debe ser un número entero');
    }

    await upsertScore({
        workId,
        judgeId,
        score: numScore,
        comment,
        estado_calificacion: 'borrador',
    });
}

/**
 * Envía una calificación como definitiva ('enviado') de forma individual.
 * @param {string} judgeId
 * @param {string} workId
 * @param {number|string} score
 * @param {string} comment
 */
export async function submitScore(judgeId, workId, score, comment = '') {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error('El puntaje debe ser un número entre 0 y 10');
    }
    if (!Number.isInteger(numScore)) {
        throw new Error('El puntaje debe ser un número entero');
    }

    await upsertScore({
        workId,
        judgeId,
        score: numScore,
        comment,
        estado_calificacion: 'enviado',
    });
}

/**
 * Envío Definitivo: convierte TODOS los borradores del juez a 'enviado'.
 * Valida primero que TODAS las obras tengan al menos un borrador o calificación enviada.
 * @param {string} judgeId
 * @returns {Promise<{ confirmedCount: number }>}
 */
export async function submitVerdict(judgeId) {
    const allWorks = await loadAllWorksWithStatus(judgeId);

    // Verificar que no queda ninguna obra sin calificar
    const unscored = allWorks.filter(w => w.scoreStatus === 'sin_calificar');
    if (unscored.length > 0) {
        throw new Error(
            `Hay ${unscored.length} obra(s) sin calificar. Debes calificar todas las obras antes de enviar el veredicto.`
        );
    }

    const confirmedCount = await submitAllDrafts(judgeId);
    return { confirmedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectura de "Mis Puntajes"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cargar los puntajes ya enviados por un juez (solo lectura).
 */
export async function loadMyScores(judgeId) {
    const [scores, works] = await Promise.all([
        getScoresByJudge(judgeId),
        getWorks(),
    ]);

    const workMap = {};
    works.forEach(w => { workMap[w.id] = w; });

    return scores.map(s => ({
        ...s,
        workTitle: workMap[s.workId]?.title || 'Obra eliminada',
        workAuthor: workMap[s.workId]?.author || '',
        workCategory: workMap[s.workId]?.category || '',
        participantNumber: workMap[s.workId]?.participantNumber || '',
    }));
}
