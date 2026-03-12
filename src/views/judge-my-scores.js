// View JS: Juez — Mis Puntajes (solo lectura)

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, categoryBadge } from './shared.js';
import { loadMyScores } from '../controllers/judge.controller.js';

async function init() {
    const user = await requireAuth('judge');
    renderNavbar('judge', user.name, 'my-scores');

    const container = document.getElementById('myScoresContent');

    try {
        const scores = await loadMyScores(user.uid);

        if (scores.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Aún no has calificado ninguna obra</p>
          <a href="/judge-scoring.html" class="btn btn-primary" style="margin-top: var(--space-md);">Ir a calificar</a>
        </div>
      `;
            return;
        }

        container.innerHTML = `
      <div class="my-scores-list">
        ${scores.map(s => `
          <div class="my-score-item">
            <div class="score-work-info">
              <h4>${s.workTitle}</h4>
              <p>${s.workAuthor} ${categoryBadge(s.workCategory)}</p>
              ${s.comment ? `<p style="margin-top: 4px; font-size: var(--font-size-xs); color: var(--color-text-secondary);"><em>"${s.comment}"</em></p>` : ''}
            </div>
            <div class="score-value">${s.score}</div>
          </div>
        `).join('')}
      </div>
    `;
    } catch (error) {
        container.innerHTML = `<p style="color: var(--color-error);">Error: ${error.message}</p>`;
    }
}

init();
