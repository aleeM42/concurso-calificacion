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

  // Filtro por categoría
  document.getElementById('categoryFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;

    // Actualizar botón activo
    document.querySelectorAll('#categoryFilter .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.category;
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
          // Deshabilitar botón durante proceso
          const btn = document.getElementById('btnFinalizeContest');
          btn.disabled = true;
          btn.textContent = 'Procesando...';

          await finalizeContest(contestName);
          showToast(`Concurso "${contestName}" finalizado y archivado exitosamente.`);
          
          // Recargar TODO
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
    const top5 = catResults.slice(0, 5); // Tomamos solo el top 5

    if (top5.length === 0) {
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
          <h3 class="category-title" style="text-transform: capitalize; margin-top: 1rem; margin-bottom: 1rem; color: var(--primary-color);">🏆 Top 5 - Categoría: ${cat}</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Obra</th>
                  <th>Autor</th>
                  <th>Puntaje Total</th>
                  <th>Detalle por Juez</th>
                </tr>
              </thead>
              <tbody>
                ${top5.map((r, i) => {
      const rank = i + 1;
      const rankClass = rank <= 5 ? `rank-${rank}` : '';

      return `
                    <tr class="top-5-row">
                      <td>
                        <span class="rank-badge ${rankClass}">${rank}</span>
                      </td>
                      <td><strong>${r.author}</strong></td>
                      <td>${r.title}</td>
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
