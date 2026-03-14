// View JS: Admin — Historial de Concursos

import { requireAuth } from '../auth-guard.js';
import { renderNavbar } from './shared.js';
import { getContestsHistory } from '../controllers/admin.controller.js';

async function init() {
  const user = await requireAuth('admin');
  renderNavbar('admin', user.name, 'contests');
  
  await loadAndRenderContests();
}

async function loadAndRenderContests() {
  const container = document.getElementById('contestsContainer');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const contests = await getContestsHistory();

    if (contests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <p>No hay concursos en el historial.</p>
        </div>
      `;
      return;
    }

    let html = '';
    
    contests.forEach(contest => {
        html += `
            <div class="contest-card">
                <div class="contest-header">
                    <div>
                        <h2 class="contest-title">${contest.name}</h2>
                        <span class="contest-date">Finalizado el: ${contest.date}</span>
                    </div>
                </div>
                <div class="contest-winners">
        `;

        const categories = ['infantil', 'juvenil', 'adulto'];
        categories.forEach(cat => {
            const winnersList = contest.winners[cat] || [];
            if (winnersList.length > 0) {
                html += `
                    <div class="winner-category">
                        <h4>Categoría: ${cat}</h4>
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 60px;">Pos.</th>
                                        <th>Obra</th>
                                        <th>Autor</th>
                                        <th style="width: 120px; text-align: center;">Puntaje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${winnersList.map((w, index) => `
                                        <tr>
                                            <td style="text-align: center;">
                                                <span class="rank-badge ${index < 5 ? `rank-${index + 1}` : ''}">${index + 1}</span>
                                            </td>
                                            <td><strong>${w.title}</strong></td>
                                            <td>${w.author}</td>
                                            <td style="text-align: center;"><strong>${w.totalScore}</strong></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<p style="color: var(--color-error);">Error al cargar historial: ${error.message}</p>`;
  }
}

init();
