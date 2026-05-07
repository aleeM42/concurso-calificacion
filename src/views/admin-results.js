// View JS: Admin — Resultados

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, categoryBadge, showToast, showConfirmModal } from './shared.js';
import { calculateResults, finalizeContest } from '../controllers/admin.controller.js';

let allResults = [];
let currentFilter = 'all';

async function init() {
  const user = await requireAuth('admin');
  renderNavbar('admin', user.name, 'results');

  // Cargar resultados
  allResults = await calculateResults();
  renderResults();

  // Filtrar al cambiar el select
  document.getElementById('categorySelect').addEventListener('change', () => {
    currentFilter = document.getElementById('categorySelect').value;
    renderResults();
  });

  // Finalizar Concurso
  document.getElementById('btnFinalizeContest').addEventListener('click', () => {
    if (allResults.length === 0) {
      showToast('No hay obras procesadas para finalizar', 'error');
      return;
    }

    const defaultName = allResults[0].contest || 'Concurso Actual';

    // Prompt no bloquea UI, pero usamos native API por simplicidad
    const contestName = prompt('Ingresa el nombre del concurso para archivar los resultados:', defaultName);

    if (!contestName) return;

    showConfirmModal(
      'Finalizar Concurso',
      `¿Confirmas finalizar "<strong>${contestName}</strong>"?<br><br>Se guardará el Top 10 en el historial y se <strong>borrarán irreversiblemente</strong> todas las obras y puntuaciones actuales.`,
      async () => {
        try {
          const btn = document.getElementById('btnFinalizeContest');
          btn.disabled = true;
          btn.textContent = 'Procesando...';

          await finalizeContest(contestName);
          showToast(`Concurso "${contestName}" finalizado y archivado exitosamente.`);

          allResults = [];
          renderResults();
          btn.disabled = false;
          btn.textContent = 'Finalizar Concurso';

        } catch (error) {
          showToast(`Error al finalizar concurso: ${error.message}`, 'error');
          const btn = document.getElementById('btnFinalizeContest');
          btn.disabled = false;
          btn.textContent = 'Finalizar Concurso';
        }
      }
    );
  });
}

function renderResults() {
  const container = document.getElementById('resultsTable');

  if (allResults.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <p>No hay resultados disponibles en el sistema.</p>
      </div>
    `;
    return;
  }

  const categories = ['infantil', 'juvenil', 'adulto'];
  const catsToRender = currentFilter === 'all' ? categories : [currentFilter];

  let html = '';

  catsToRender.forEach(cat => {
    const catResults = allResults.filter(r => r.category === cat);
    const top10 = catResults.slice(0, 10); // ← Top 10

    if (top10.length === 0) {
      html += `
        <div class="category-section" style="margin-bottom: 2rem;">
          <h3 class="category-title" style="text-transform: capitalize; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--primary-color);">Categoría: ${cat}</h3>
          <p style="padding: 1rem; color: var(--text-muted); background: var(--bg-color); border-radius: var(--radius-md);">No hay obras calificadas en esta categoría.</p>
        </div>
      `;
      return;
    }

    html += `
      <div class="category-section" style="margin-bottom: 2rem;">
        <h3 class="category-title" style="text-transform: capitalize; margin-top: 1rem; margin-bottom: 1rem; color: var(--primary-color);">🏆 Top 10 — Categoría: ${cat}</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Participante</th>
                <th>Autor</th>
                <th>Locación</th>
                <th>Puntaje Total</th>
                <th>Detalle por Juez</th>
              </tr>
            </thead>
            <tbody>
              ${top10.map((r, i) => {
                const rank = i + 1;
                const rankClass = rank <= 10 ? `rank-${Math.min(rank, 5)}` : '';
                // Mostrar número de participante; si no existe, mostrar el título como fallback
                const participantLabel = r.participantNumber
                  ? `#${r.participantNumber}`
                  : r.title || '—';

                return `
                  <tr class="top-5-row">
                    <td>
                      <span class="rank-badge ${rankClass}">${rank}</span>
                    </td>
                    <td><strong>${participantLabel}</strong></td>
                    <td>${r.author || '—'}</td>
                    <td>${r.location || '—'}</td>
                    <td><span class="total-score">${r.totalScore}</span></td>
                    <td>
                      <div class="score-detail">
                        ${r.scores.length > 0
                          ? r.scores.map(s => `${s.judgeName}: <strong>${s.score}</strong>${s.comment ? ` — <em>${s.comment}</em>` : ''}`).join('<br>')
                          : '<em>Sin calificaciones</em>'
                        }
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

init();
