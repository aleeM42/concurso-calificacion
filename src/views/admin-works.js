// View JS: Admin — Gestión de Obras

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, categoryBadge, showConfirmModal } from './shared.js';
import { loadWorks, addWork, importWorksBatch, removeWork } from '../controllers/admin.controller.js';

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
      participantNumber: document.getElementById('workParticipantNumber').value.trim().toUpperCase(),
      title: document.getElementById('workTitle').value.trim(),
      author: document.getElementById('workAuthor').value.trim(),
      category: document.getElementById('workCategory').value,
      description: document.getElementById('workDescription').value.trim(),
      contest: document.getElementById('workContest').value.trim(),
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

// --- Importar CSV / Excel ---
document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const contestName = document.getElementById('csvContest').value.trim();
  if (!contestName) {
    showToast('Por favor, ingresa el nombre del concurso', 'error');
    e.target.value = '';
    return;
  }

  const statusEl = document.getElementById('csvStatus');
  statusEl.textContent = 'Procesando archivo localmente...';
  statusEl.style.color = 'var(--color-text-secondary)';

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      if (!window.XLSX) {
         throw new Error('La librería para procesar Excel no se ha cargado.');
      }
      const data = new Uint8Array(event.target.result);
      const workbook = window.XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const dataWorks = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0]).trim().toLowerCase();
        // Saltar encabezados
        if (i === 0 && (firstCell === '#' || firstCell.includes('participante') || firstCell.includes('titulo'))) {
            continue;
        }

        // Se necesitan al menos 3 columnas (#, Titulo, Autor)
        if (row.length < 3) continue;

        const idPart = String(row[0]).trim().toUpperCase();
        const title = String(row[1]).trim();
        const author = String(row[2]).trim();
        const description = row.length > 3 ? String(row[3]).trim() : '';

        // La primera letra define la categoría
        let category = '';
        if (idPart.startsWith('I')) category = 'infantil';
        else if (idPart.startsWith('J')) category = 'juvenil';
        else if (idPart.startsWith('A')) category = 'adulto';

        if (!category) {
            throw new Error(`Fila ${i + 1}: El identificador "${idPart}" no comienza con I (Infantil), J (Juvenil) o A (Adulto).`);
        }

        // Guardar el número de participante para el ordenamiento natural
        dataWorks.push({ title, author, category, description, participantNumber: idPart });
      }

      statusEl.textContent = 'Guardando en la base de datos...';
      const count = await importWorksBatch(dataWorks, contestName);
      
      showToast(`${count} obras importadas correctamente`);
      statusEl.textContent = `✅ ${count} obras importadas`;
      statusEl.style.color = 'var(--color-success)';
      await renderWorksList();

    } catch (err) {
      showToast(err.message, 'error');
      statusEl.textContent = `❌ Error: ${err.message}`;
      statusEl.style.color = 'var(--color-error)';
    }
  };

  reader.onerror = () => {
    showToast('Error al leer el archivo', 'error');
    statusEl.textContent = '❌ Error de lectura';
    statusEl.style.color = 'var(--color-error)';
  };

  reader.readAsArrayBuffer(file);
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
              <th>N° Part.</th>
              <th>Título</th>
              <th>Autor</th>
              <th>Categoría</th>
              <th>Concurso</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${works.map((w, i) => `
              <tr>
                <td><code>${w.participantNumber || (i + 1)}</code></td>
                <td><strong>${w.title}</strong></td>
                <td>${w.author}</td>
                <td>${categoryBadge(w.category)}</td>
                <td>${w.contest || '—'}</td>
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
