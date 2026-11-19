// View JS: Admin — Gestión de Jueces

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, showConfirmModal } from './shared.js';
import { createJudge } from '../controllers/auth.controller.js';
import { loadJudges, removeJudge, editJudge } from '../controllers/admin.controller.js';

let currentUser;

async function init() {
  currentUser = await requireAuth('admin');
  renderNavbar('admin', currentUser.name, 'judges');
  await renderJudgesList();
}

// --- Crear juez ---
document.getElementById('addJudgeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnAddJudge');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  const judgeId = document.getElementById('judgeId').value.trim();
  const password = document.getElementById('judgePassword').value;
  const name = document.getElementById('judgeName').value.trim();

  try {
    const currentJudges = await loadJudges();
    if (currentJudges.length >= 5) {
      showToast('El límite es de 5 jueces máximo.', 'error');
      btn.disabled = false;
      btn.textContent = 'Crear Juez';
      return;
    }
    await createJudge(judgeId, password, name);
    showToast(`Juez "${name}" creado correctamente`);
    e.target.reset();
    await renderJudgesList();
  } catch (error) {
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'Este ID de juez ya está en uso';
    } else if (error.code === 'auth/weak-password') {
      msg = 'La contraseña debe tener al menos 6 caracteres';
    }
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Juez';
  }
});

// --- Renderizar tabla de jueces ---
async function renderJudgesList() {
  const container = document.getElementById('judgesTable');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const judges = await loadJudges();
    // Hallazgo 2: ordenar alfabéticamente por nombre (reglas del español: acentos, ñ)
    judges.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));

    if (judges.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚖️</div>
          <p>No hay jueces registrados aún</p>
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
              <th>Nombre</th>
              <th>ID de Acceso</th>
              <th>Código de Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${judges.map((j, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${j.name}</strong></td>
                <td><code style="background: var(--color-bg); padding: 2px 6px; border-radius: 4px;">${j.idAcceso || 'No especificado'}</code></td>
                <td>
                  <span class="access-code">
                    <code class="access-code-value" data-code="${j.accessCode || 'N/A'}" style="background: var(--color-bg); padding: 2px 6px; border-radius: 4px;">••••••</code>
                    <button type="button" class="btn-reveal-code" aria-label="Mostrar código" title="Mostrar código" aria-pressed="false">👁</button>
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-secondary btn-edit-judge" data-id="${j.id}" data-name="${j.name}">
                    Modificar
                  </button>
                  <button class="btn btn-sm btn-danger btn-delete-judge" data-id="${j.id}" data-name="${j.name}">
                    Eliminar
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Hallazgo 3: códigos ocultos por defecto; el botón 👁 los muestra u oculta
    document.querySelectorAll('.btn-reveal-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const codeEl = btn.parentElement.querySelector('.access-code-value');
        const show = btn.getAttribute('aria-pressed') !== 'true';
        codeEl.textContent = show ? codeEl.dataset.code : '••••••';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Ocultar código' : 'Mostrar código');
        btn.title = show ? 'Ocultar código' : 'Mostrar código';
      });
    });

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-judge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const name = e.target.dataset.name;

        showConfirmModal(
          'Eliminar Juez',
          `¿Estás seguro de que deseas eliminar al juez "<strong>${name}</strong>"? El perfil será eliminado pero debes borrar su cuenta en Firebase Auth manualmente si quieres reutilizar el correo.`,
          async () => {
            try {
              await removeJudge(id);
              showToast('Juez eliminado correctamente');
              await renderJudgesList();
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          }
        );
      });
    });

    // Bind edit buttons
    document.querySelectorAll('.btn-edit-judge').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const currentName = e.target.dataset.name;

        const newName = prompt('Introduce el nuevo nombre para este juez:', currentName);

        if (newName !== null && newName.trim() !== '' && newName.trim() !== currentName) {
          try {
            await editJudge(id, newName.trim());
            showToast('Juez modificado correctamente');
            await renderJudgesList();
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--color-error);">Error cargando jueces: ${error.message}</p>`;
  }
}

init();
