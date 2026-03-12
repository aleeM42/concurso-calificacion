// View JS: Juez — Calificación de obras

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, categoryBadge } from './shared.js';
import { loadPendingWorks, submitScore } from '../controllers/judge.controller.js';
import { getScoresByJudge } from '../models/score.model.js';
import { getWorks } from '../models/work.model.js';

let currentUser;

async function init() {
  currentUser = await requireAuth('judge');
  renderNavbar('judge', currentUser.name, 'scoring');
  setupEventListeners();
  await renderScoringView();
}

function setupEventListeners() {
  const container = document.getElementById('scoringContent');
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-submit-score');
    if (!btn) return;

    const workId = btn.dataset.workId;
    const scoreInput = document.getElementById(`score-${workId}`);
    const commentInput = document.getElementById(`comment-${workId}`);
    const score = scoreInput.value;

    if (score === '' || score === undefined) {
      showToast('Debes ingresar un puntaje', 'error');
      scoreInput.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      await submitScore(currentUser.uid, workId, score, commentInput.value.trim());
      showToast('Calificación enviada');

      // Re-renderizar la vista completa
      await renderScoringView();
    } catch (error) {
      showToast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Enviar Calificación';
    }
  });
}

async function renderScoringView() {
  const container = document.getElementById('scoringContent');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const [pendingWorks, allWorks, myScores] = await Promise.all([
      loadPendingWorks(currentUser.uid),
      getWorks(),
      getScoresByJudge(currentUser.uid),
    ]);

    const totalWorks = allWorks.length;
    const scored = myScores.length;

    // Actualizar barra de progreso
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'flex';
    document.getElementById('progressText').textContent = `${scored} / ${totalWorks} calificadas`;
    document.getElementById('progressFill').style.width = totalWorks > 0 ? `${(scored / totalWorks) * 100}%` : '0%';

    if (pendingWorks.length === 0) {
      container.innerHTML = `
        <div class="completed-state">
          <div class="check-icon">✅</div>
          <h2>¡Todas las obras calificadas!</h2>
          <p>Has completado la calificación de todas las obras.</p>
          <a href="/judge-my-scores.html" class="btn btn-primary" style="margin-top: var(--space-md);">Ver mis puntajes</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="scoring-cards">
        ${pendingWorks.map(work => `
          <div class="scoring-card" id="card-${work.id}">
            <div class="work-info">
              <h3 class="work-title">${work.title}</h3>
              <p class="work-author">Por: ${work.author} ${categoryBadge(work.category)}</p>
              ${work.description ? `<p class="work-description">${work.description}</p>` : ''}
            </div>

            <div class="score-input-group">
              <label>Puntaje:</label>
              <input type="number" class="score-input" id="score-${work.id}" min="0" max="10" step="1" placeholder="0" required>
              <span class="score-range">(0 – 10)</span>
            </div>

            <textarea id="comment-${work.id}" placeholder="Comentario (opcional)"></textarea>

            <button class="btn btn-success btn-block btn-submit-score" data-work-id="${work.id}">
              Enviar Calificación
            </button>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    container.innerHTML = `<p style="color: var(--color-error);">Error: ${error.message}</p>`;
  }
}

init();
