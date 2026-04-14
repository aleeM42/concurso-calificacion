// View JS: Juez — Calificación de obras (con borradores y envío definitivo)

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, categoryBadge } from './shared.js';
import {
    loadAllWorksWithStatus,
    saveDraft,
    submitScore,
    submitVerdict,
} from '../controllers/judge.controller.js';

let currentUser;
let cachedAllWorks = []; // Todas las obras con su estado actual

// ─────────────────────────────────────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
    currentUser = await requireAuth('judge');
    renderNavbar('judge', currentUser.name, 'scoring');
    setupEventListeners();
    await loadAndRenderScoringView();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────────────────────

function setupEventListeners() {
    const container = document.getElementById('scoringContent');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) searchInput.addEventListener('input', renderFilteredWorks);
    if (categoryFilter) categoryFilter.addEventListener('change', renderFilteredWorks);

    // Delegación de eventos para los botones de cada tarjeta
    container.addEventListener('click', async (e) => {
        // ── Botón: Guardar Borrador ──────────────────────────────────────────
        const draftBtn = e.target.closest('.btn-save-draft');
        if (draftBtn) {
            await handleSaveScore(draftBtn, 'borrador');
            return;
        }

        // ── Botón: Enviar Calificación (definitivo por obra) ────────────────
        const submitBtn = e.target.closest('.btn-submit-score');
        if (submitBtn) {
            await handleSaveScore(submitBtn, 'enviado');
            return;
        }
    });

    // ── Botón: Enviar Veredicto Final (global) ───────────────────────────────
    document.addEventListener('click', async (e) => {
        const verdictBtn = e.target.closest('#btnSubmitVerdict');
        if (!verdictBtn || verdictBtn.disabled) return;

        const confirmed = confirm(
            '⚠️ ¿Estás seguro de enviar el VEREDICTO FINAL?\n\n' +
            'Esta acción enviará TODAS tus calificaciones de forma definitiva. ' +
            'No podrás modificarlas después.'
        );
        if (!confirmed) return;

        verdictBtn.disabled = true;
        verdictBtn.textContent = 'Enviando veredicto...';

        try {
            const { confirmedCount } = await submitVerdict(currentUser.uid);
            showToast(
                confirmedCount > 0
                    ? `✅ Veredicto enviado. ${confirmedCount} calificación(es) confirmada(s).`
                    : '✅ Veredicto confirmado. Todas las calificaciones ya estaban enviadas.',
                'success'
            );
            await loadAndRenderScoringView();
        } catch (error) {
            showToast(error.message, 'error');
            verdictBtn.disabled = false;
            verdictBtn.textContent = '🏆 Enviar Veredicto Final';
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Manejador unificado para guardar (borrador o enviado)
// ─────────────────────────────────────────────────────────────────────────────

async function handleSaveScore(btn, estado) {
    const workId = btn.dataset.workId;
    const scoreInput = document.getElementById(`score-${workId}`);
    const commentInput = document.getElementById(`comment-${workId}`);
    const score = scoreInput?.value;

    if (score === '' || score === undefined || score === null) {
        showToast('Debes ingresar un puntaje antes de guardar', 'error');
        scoreInput?.focus();
        return;
    }

    // Deshabilitar ambos botones de la tarjeta durante la operación
    const card = btn.closest('.scoring-card');
    const allBtns = card?.querySelectorAll('.btn-save-draft, .btn-submit-score');
    allBtns?.forEach(b => { b.disabled = true; });

    const originalText = btn.textContent;
    btn.textContent = estado === 'borrador' ? 'Guardando...' : 'Enviando...';

    try {
        if (estado === 'borrador') {
            await saveDraft(currentUser.uid, workId, score, commentInput?.value?.trim() || '');
            showToast('📝 Borrador guardado correctamente');
        } else {
            await submitScore(currentUser.uid, workId, score, commentInput?.value?.trim() || '');
            showToast('✅ Calificación enviada definitivamente');
        }

        // Re-cargar para reflejar el nuevo estado visual
        await loadAndRenderScoringView();
    } catch (error) {
        showToast(error.message, 'error');
        allBtns?.forEach(b => { b.disabled = false; });
        btn.textContent = originalText;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Carga de datos y renderizado
// ─────────────────────────────────────────────────────────────────────────────

async function loadAndRenderScoringView() {
    const container = document.getElementById('scoringContent');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        cachedAllWorks = await loadAllWorksWithStatus(currentUser.uid);

        const totalWorks = cachedAllWorks.length;
        const scored = cachedAllWorks.filter(w => w.scoreStatus !== 'sin_calificar').length;
        const allSubmitted = cachedAllWorks.every(w => w.scoreStatus === 'enviado');

        // ── Barra de progreso ────────────────────────────────────────────────
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.display = 'flex';
            document.getElementById('progressText').textContent =
                `${scored} / ${totalWorks} calificadas`;
            document.getElementById('progressFill').style.width =
                totalWorks > 0 ? `${(scored / totalWorks) * 100}%` : '0%';
        }

        // ── Botón Veredicto Final ────────────────────────────────────────────
        renderVerdictButton(cachedAllWorks);

        renderFilteredWorks();

    } catch (error) {
        container.innerHTML = `<p style="color: var(--color-error);">Error: ${error.message}</p>`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderizar botón de veredicto global
// ─────────────────────────────────────────────────────────────────────────────

function renderVerdictButton(works) {
    const existingWrapper = document.getElementById('verdictWrapper');
    if (existingWrapper) existingWrapper.remove();

    // Si no hay obras, no mostrar
    if (!works || works.length === 0) return;

    const allScored = works.every(w => w.scoreStatus !== 'sin_calificar');
    const allSubmitted = works.every(w => w.scoreStatus === 'enviado');

    const wrapper = document.createElement('div');
    wrapper.id = 'verdictWrapper';
    wrapper.className = 'verdict-wrapper';

    if (allSubmitted) {
        // Estado final: todo enviado, bloqueado
        wrapper.innerHTML = `
            <div class="verdict-complete">
                <span class="verdict-check">✅</span>
                <div>
                    <strong>Veredicto enviado</strong>
                    <p>Todas tus calificaciones han sido enviadas definitivamente.</p>
                </div>
                <a href="/judge-my-scores.html" class="btn btn-secondary btn-sm">
                    Ver mis puntajes
                </a>
            </div>
        `;
    } else {
        // Pendiente o en borrador
        const pendingCount = works.filter(w => w.scoreStatus === 'sin_calificar').length;
        const draftCount = works.filter(w => w.scoreStatus === 'borrador').length;

        let statusMsg = '';
        if (!allScored) {
            statusMsg = `<span class="verdict-hint">⚠️ Faltan ${pendingCount} obra(s) por calificar para poder enviar.</span>`;
        } else {
            statusMsg = `<span class="verdict-hint ready">✔ ${draftCount} borrador(es) listos para envío definitivo.</span>`;
        }

        wrapper.innerHTML = `
            <div class="verdict-action">
                ${statusMsg}
                <button
                    id="btnSubmitVerdict"
                    class="btn btn-verdict ${allScored ? '' : 'btn-disabled'}"
                    ${allScored ? '' : 'disabled'}
                    title="${allScored ? 'Enviar veredicto definitivo' : 'Califica todas las obras primero'}"
                >
                    🏆 Enviar Veredicto Final
                </button>
            </div>
        `;
    }

    // Insertar antes de los filtros
    const filtersSection = document.querySelector('.filters-section');
    if (filtersSection) {
        filtersSection.parentNode.insertBefore(wrapper, filtersSection);
    } else {
        const pageHeader = document.querySelector('.page-header');
        pageHeader?.insertAdjacentElement('afterend', wrapper);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderizado con filtros
// ─────────────────────────────────────────────────────────────────────────────

function renderFilteredWorks() {
    const container = document.getElementById('scoringContent');

    if (cachedAllWorks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No hay obras registradas en este concurso.</p>
            </div>
        `;
        return;
    }

    let filtered = cachedAllWorks;
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput?.value) {
        const term = searchInput.value.toLowerCase();
        filtered = filtered.filter(w =>
            w.title.toLowerCase().includes(term) ||
            w.author.toLowerCase().includes(term) ||
            (w.participantNumber || '').toLowerCase().includes(term)
        );
    }

    if (categoryFilter?.value) {
        filtered = filtered.filter(w => w.category === categoryFilter.value);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>No se encontraron obras con los filtros actuales.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="scoring-cards">
            ${filtered.map(work => renderWorkCard(work)).join('')}
        </div>
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderizar tarjeta individual
// ─────────────────────────────────────────────────────────────────────────────

function renderWorkCard(work) {
    const isSubmitted = work.scoreStatus === 'enviado';
    const isDraft = work.scoreStatus === 'borrador';
    const isPending = work.scoreStatus === 'sin_calificar';

    const statusBadge = getStatusBadge(work.scoreStatus);
    const participantLabel = work.participantNumber
        ? `<span class="participant-number">${work.participantNumber}</span>`
        : '';

    // Tarjeta enviada: solo lectura
    if (isSubmitted) {
        return `
            <div class="scoring-card scoring-card--submitted" id="card-${work.id}">
                <div class="work-info">
                    <div class="work-header">
                        ${participantLabel}
                        ${statusBadge}
                    </div>
                    <h3 class="work-title">${work.title}</h3>
                    <p class="work-author">Por: ${work.author} ${categoryBadge(work.category)}</p>
                    ${work.description ? `<p class="work-description">${work.description}</p>` : ''}
                </div>
                <div class="score-readonly">
                    <span class="score-readonly-label">Puntaje enviado:</span>
                    <span class="score-readonly-value">${work.currentScore}</span>
                    ${work.currentComment ? `<p class="score-readonly-comment">"${work.currentComment}"</p>` : ''}
                </div>
            </div>
        `;
    }

    // Tarjeta editable (sin calificar o borrador)
    return `
        <div class="scoring-card ${isDraft ? 'scoring-card--draft' : ''}" id="card-${work.id}">
            <div class="work-info">
                <div class="work-header">
                    ${participantLabel}
                    ${statusBadge}
                </div>
                <h3 class="work-title">${work.title}</h3>
                <p class="work-author">Por: ${work.author} ${categoryBadge(work.category)}</p>
                ${work.description ? `<p class="work-description">${work.description}</p>` : ''}
            </div>

            <div class="score-input-group">
                <label>Puntaje:</label>
                <input
                    type="number"
                    class="score-input"
                    id="score-${work.id}"
                    min="0" max="10" step="1"
                    placeholder="0"
                    value="${work.currentScore}"
                    required
                >
                <span class="score-range">(0 – 10)</span>
            </div>

            <textarea
                id="comment-${work.id}"
                placeholder="Comentario (opcional)"
            >${work.currentComment || ''}</textarea>

            <div class="scoring-actions">
                <button
                    class="btn btn-outline btn-save-draft"
                    data-work-id="${work.id}"
                    title="Guardar sin enviar definitivamente"
                >
                    💾 Guardar Borrador
                </button>
                <button
                    class="btn btn-success btn-submit-score"
                    data-work-id="${work.id}"
                    title="Enviar calificación definitiva para esta obra"
                >
                    ✔ Enviar Calificación
                </button>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge de estado
// ─────────────────────────────────────────────────────────────────────────────

function getStatusBadge(status) {
    const badges = {
        sin_calificar: `<span class="status-badge status-badge--pending">Sin calificar</span>`,
        borrador:      `<span class="status-badge status-badge--draft">📝 Borrador</span>`,
        enviado:       `<span class="status-badge status-badge--submitted">✅ Enviada</span>`,
    };
    return badges[status] || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Arranque
// ─────────────────────────────────────────────────────────────────────────────

init();
