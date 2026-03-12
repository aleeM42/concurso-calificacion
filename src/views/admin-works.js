// View JS: Admin — Gestión de Obras

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, categoryBadge, showConfirmModal } from './shared.js';
import { loadWorks, addWork, importCSV, removeWork } from '../controllers/admin.controller.js';

let currentUser;

async function init() {
  currentUser = await requireAuth('admin');
  renderNavbar('admin', currentUser.name, 'works');
  await renderWorksList();
}

// --- Agregar obra individual ---
document.getElementById('addWorkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnAddWork');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await addWork({
      title: document.getElementById('workTitle').value.trim(),
      author: document.getElementById('workAuthor').value.trim(),
      category: document.getElementById('workCategory').value,
      description: document.getElementById('workDescription').value.trim(),
    });

    showToast('Obra agregada correctamente');
    e.target.reset();
    await renderWorksList();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Agregar Obra';
  }
});

// --- Importar CSV ---
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('csvStatus');
  statusEl.textContent = 'Importando...';
  statusEl.style.color = 'var(--color-text-secondary)';

  try {
    const count = await importCSV(file);
    showToast(`${count} obras importadas correctamente`);
    statusEl.textContent = `✅ ${count} obras importadas`;
    statusEl.style.color = 'var(--color-success)';
    await renderWorksList();
  } catch (error) {
    showToast(error.message, 'error');
    statusEl.textContent = `❌ Error: ${error.message}`;
    statusEl.style.color = 'var(--color-error)';
  }

  // Reset file input
  e.target.value = '';
});

// --- Renderizar tabla de obras ---
async function renderWorksList() {
  const container = document.getElementById('worksTable');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const works = await loadWorks();

    if (works.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No hay obras registradas aún</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Autor</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${works.map((w, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${w.title}</strong></td>
                <td>${w.author}</td>
                <td>${categoryBadge(w.category)}</td>
                <td>${w.description || '—'}</td>
                <td>
                  <button class="btn btn-sm btn-danger btn-delete-work" data-id="${w.id}" data-title="${w.title}">
                    Eliminar
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-work').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const title = e.target.dataset.title;

        showConfirmModal(
          'Eliminar Obra',
          `¿Estás seguro de que deseas eliminar la obra "<strong>${title}</strong>"? Esta acción no se puede deshacer.`,
          async () => {
            try {
              await removeWork(id);
              showToast('Obra eliminada correctamente');
              await renderWorksList();
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          }
        );
      });
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--color-error);">Error cargando obras: ${error.message}</p>`;
  }
}

init();
