// View JS: Admin — Resultados

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, categoryBadge, showToast, showConfirmModal, SHOW_LOCATION } from './shared.js';
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
      `¿Confirmas finalizar "<strong>${contestName}</strong>"?<br><br>Se guardará el Top 5 en el historial y se <strong>borrarán irreversiblemente</strong> todas las obras y puntuaciones actuales.`,
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
    const top10 = catResults.slice(0, 5); // ← Top 5 (igual que lo que se guarda en el historial)

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
        <h3 class="category-title" style="text-transform: capitalize; margin-top: 1rem; margin-bottom: 1rem; color: var(--primary-color);">🏆 Top 5 — Categoría: ${cat}</h3>
        <div class="table-wrapper results-table-wrapper">
          <table class="results-table">
            <thead>
              <tr>
                <th class="rt-num">Pos.</th>
                <th>Código</th>
                <th>Participante</th>
                <th>Obra</th>
                ${SHOW_LOCATION ? '<th>Locación</th>' : ''}
                <th class="rt-avg">Promedio</th>
                <th class="rt-chev" aria-label="Detalle por juez"></th>
              </tr>
            </thead>
            ${top10.map((r, i) => {
              const rank = i + 1;
              const rankClass = `rank-${Math.min(rank, 5)}`;
              const detailId = `detalle-${cat}-${i}`;
              const colCount = SHOW_LOCATION ? 7 : 6;
              const sum = r.scores.reduce((acc, s) => acc + Number(s.score || 0), 0);
              const average = r.scores.length > 0 ? formatScore(sum / r.scores.length) : '—';

              // Hallazgos 4 y 7: código y participante en columnas separadas; fila desplegable con el detalle por juez
              return `
                <tbody>
                  <tr class="result-row" tabindex="0" role="button" aria-expanded="false" aria-controls="${detailId}">
                    <td class="rt-num"><span class="rank-badge ${rankClass}">${rank}</span></td>
                    <td class="rt-code">${r.participantNumber || '—'}</td>
                    <td class="rt-name">${r.author || '—'}</td>
                    <td>${r.title || '—'}</td>
                    ${SHOW_LOCATION ? `<td>${r.location || '—'}</td>` : ''}
                    <td class="rt-avg"><span class="rt-avg-value">${average}</span> <span class="rt-avg-max">/ 10</span><small>${r.scores.length} ${r.scores.length === 1 ? 'juez' : 'jueces'}</small></td>
                    <td class="rt-chev"><svg class="rt-chev-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg></td>
                  </tr>
                  <tr class="result-detail-row" id="${detailId}" hidden>
                    <td colspan="${colCount}">
                      <div class="result-detail">
                        ${r.scores.length > 0
                          ? r.scores.map(s => `
                            <div class="judge-detail">
                              <span class="judge-detail-name">${s.judgeName}</span>
                              <span class="judge-detail-comment${s.comment ? '' : ' is-empty'}">${s.comment || 'Sin comentario'}</span>
                              <span class="judge-detail-score">${s.score}</span>
                            </div>`).join('')
                          : '<p class="judge-detail-comment is-empty">Sin calificaciones</p>'
                        }
                        <div class="result-detail-foot">Suma: ${sum} · Promedio: ${average} · ${r.scores.length} ${r.scores.length === 1 ? 'juez' : 'jueces'}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              `;
            }).join('')}
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  bindResultRows(container);
}

/** Promedio con 1 decimal en formato español (p. ej. 8,6). */
function formatScore(value) {
  return value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Hallazgo 7: abrir/cerrar el detalle por juez con clic, Enter o Espacio. */
function bindResultRows(container) {
  if (container.dataset.rowsBound) return;
  container.dataset.rowsBound = 'true';

  const toggle = (row) => {
    const detail = document.getElementById(row.getAttribute('aria-controls'));
    if (!detail) return;
    const open = row.getAttribute('aria-expanded') !== 'true';
    row.setAttribute('aria-expanded', String(open));
    row.classList.toggle('is-open', open);
    detail.hidden = !open;
  };

  container.addEventListener('click', (e) => {
    const row = e.target.closest('.result-row');
    if (row) toggle(row);
  });
  container.addEventListener('keydown', (e) => {
    const row = e.target.closest('.result-row');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggle(row);
    }
  });
}

init();
