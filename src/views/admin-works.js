// View JS: Admin — Gestión de Obras

import { requireAuth } from '../auth-guard.js';
import { renderNavbar, showToast, categoryBadge, showConfirmModal, SHOW_LOCATION } from './shared.js';
import { loadWorks, addWork, importWorksBatch, removeWork } from '../controllers/admin.controller.js';
import { checkHeaders, parseWorks, escapeHtml } from './import-check.js';

let currentUser;

async function init() {
  currentUser = await requireAuth('admin');
  renderNavbar('admin', currentUser.name, 'works');
  await renderWorksList();
}

// Hallazgo 5: el campo de ubicación queda oculto en el HTML; solo se muestra si SHOW_LOCATION está activo
if (SHOW_LOCATION) {
  const locationGroup = document.getElementById('workLocationGroup');
  if (locationGroup) locationGroup.hidden = false;
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
      location: document.getElementById('workLocation').value.trim(),
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

      // Hallazgos 6 y 8: verificar los encabezados y mostrar una vista previa; nada se guarda sin confirmar
      statusEl.style.color = '';
      showImportCheck(statusEl, rows, contestName);

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

// --- Hallazgos 6 y 8: verificación de encabezados, vista previa y confirmación ---
const FIELD_LABELS = { A: 'Número de participante', B: 'Autor', C: 'Título de la obra', D: 'Descripción' };
const EXPECTED_FORMAT = 'Formato esperado, fila 1: <b>#</b> · <b>Participante</b> · <b>Nombre Obra</b> · Descripción (opcional)';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function showImportCheck(statusEl, rows, contestName) {
  const check = checkHeaders(rows[0]);
  if (check.status !== 'error') {
    showImportPreview(statusEl, rows, contestName, check, false);
    return;
  }

  let head;
  if (check.noHeader) {
    const firstRow = (rows[0] || []).slice(0, 3).map(escapeHtml).join(' · ');
    head = icHead('err', '✕', 'No se puede importar: la fila 1 no contiene encabezados.',
      `Se encontró "${firstRow}", que parece una obra. Agregue una fila de encabezados arriba. No se guardó nada.`);
  } else if (check.swapped) {
    head = icHead('err', '✕', 'No se puede importar: las columnas B y C están invertidas.',
      'Intercambie las columnas B y C en el archivo y vuelva a cargarlo. No se guardó nada.');
  } else {
    const bad = check.columns.filter(c => c.state === 'wrong').length;
    head = icHead('err', '✕', `No se puede importar: ${plural(bad, 'encabezado no coincide', 'encabezados no coinciden')} con el formato.`,
      'Corrija los encabezados en rojo y vuelva a cargar el archivo. No se guardó nada.');
  }

  const overrideHint = check.noHeader
    ? '¿Está seguro de que los datos están bien? Puede continuar: la fila 1 se tratará como una obra y las columnas se leerán por posición (B = Autor, C = Título).'
    : '¿Está seguro de que los datos están bien? Puede continuar: las columnas se leerán por posición (B = Autor, C = Título) y verá la vista previa antes de guardar.';

  statusEl.innerHTML = `
    <div class="import-check ic-err" role="alert">
      ${head}
      ${check.noHeader ? '' : icColumns(check)}
      <div class="ic-foot">${EXPECTED_FORMAT}</div>
      <div class="ic-override">
        <span class="ic-hint">${overrideHint}</span>
        <button type="button" class="btn btn-sm ic-btn-override" id="btnImportOverride">Ignorar advertencias y continuar</button>
      </div>
    </div>`;

  document.getElementById('btnImportOverride').addEventListener('click', () => {
    showImportPreview(statusEl, rows, contestName, check, true);
  });
}

function showImportPreview(statusEl, rows, contestName, check, forced) {
  let works;
  try {
    works = parseWorks(rows, { startRow: forced && check.noHeader ? 0 : 1, withLocation: SHOW_LOCATION });
    if (works.length === 0) throw new Error('No se encontraron obras válidas en el archivo');
  } catch (err) {
    statusEl.innerHTML = `
      <div class="import-check ic-err" role="alert">
        ${icHead('err', '✕', 'No se puede importar.', `${escapeHtml(err.message)} No se guardó nada.`)}
      </div>`;
    showToast(err.message, 'error');
    return;
  }

  const counts = { infantil: 0, juvenil: 0, adulto: 0 };
  works.forEach(w => { counts[w.category]++; });
  const warnCount = check.columns.filter(c => c.state === 'typo' || c.state === 'partial').length;

  let tone = 'ok';
  let head = icHead('ok', '✓', 'Formato correcto. Revise la vista previa y confirme para guardar.', 'Todavía no se ha guardado nada.');
  if (forced) {
    tone = 'err';
    head = icHead('err', '!', 'Advertencias ignoradas: columnas leídas por posición.',
      'Todavía no se ha guardado nada. Revise con atención que el autor y el título sean correctos.');
  } else if (check.status === 'warn') {
    tone = 'warn';
    head = icHead('warn', '!', `Formato aceptado con advertencias en ${plural(warnCount, 'encabezado', 'encabezados')}. Revise la vista previa antes de confirmar.`,
      'Todavía no se ha guardado nada. Conviene usar los nombres exactos en el archivo.');
  }

  const sample = works.slice(0, 5);
  statusEl.innerHTML = `
    <div class="import-check ic-${tone}" role="status">
      ${head}
      ${forced ? '' : icColumns(check)}
      <div class="ic-preview">
        ${forced ? '<p class="ic-forced-note"><b>B → Autor</b> · <b>C → Título de la obra</b> · Si en la vista previa el autor y el título aparecen invertidos, pulse Cancelar y corrija el archivo.</p>' : ''}
        <h4>Vista previa</h4>
        <p class="ic-totals"><b>${plural(works.length, 'obra', 'obras')}</b> para el concurso <b>"${escapeHtml(contestName)}"</b> · Infantil ${counts.infantil} · Juvenil ${counts.juvenil} · Adulto ${counts.adulto}</p>
        <div class="table-wrapper">
          <table class="ic-table">
            <thead><tr><th>#</th><th>Autor (Participante)</th><th>Título de la obra</th></tr></thead>
            <tbody>
              ${sample.map(w => `
                <tr>
                  <td><strong>${escapeHtml(w.participantNumber)}</strong></td>
                  <td data-label="Autor">${escapeHtml(w.author)}</td>
                  <td data-label="Obra">${escapeHtml(w.title)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${works.length > sample.length ? `<p class="ic-more">… y ${plural(works.length - sample.length, 'obra más', 'obras más')}.</p>` : ''}
        <div class="ic-confirm">
          <span class="ic-hint">Verifique que el autor y el título no estén invertidos.</span>
          <button type="button" class="btn btn-secondary" id="btnImportCancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnImportConfirm">✓ Confirmar importación (${plural(works.length, 'obra', 'obras')})</button>
        </div>
      </div>
    </div>`;

  document.getElementById('btnImportCancel').addEventListener('click', () => {
    statusEl.innerHTML = '';
  });

  document.getElementById('btnImportConfirm').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('btnImportConfirm');
    const cancelBtn = document.getElementById('btnImportCancel');
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = 'Guardando…';
    try {
      const count = await importWorksBatch(works, contestName);
      showToast(`${count} obras importadas correctamente`);
      statusEl.innerHTML = `
        <div class="import-check ic-ok" role="status">
          ${icHead('ok', '✓', `Se importaron ${plural(count, 'obra', 'obras')} al concurso "${escapeHtml(contestName)}".`, 'Ya aparecen en "Obras Registradas".')}
        </div>`;
      await renderWorksList();
    } catch (err) {
      showToast(err.message, 'error');
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.textContent = `✓ Confirmar importación (${plural(works.length, 'obra', 'obras')})`;
      const errorEl = document.createElement('p');
      errorEl.className = 'ic-error-msg';
      errorEl.textContent = `❌ Error: ${err.message}. No se guardó nada.`;
      statusEl.querySelector('.ic-preview').prepend(errorEl);
    }
  });
}

function icHead(tone, icon, title, detail) {
  return `<div class="ic-head"><span class="ic-icon">${icon}</span><div>${title}<small>${detail}</small></div></div>`;
}

function icColumns(check) {
  const otherCol = { B: 'C', C: 'B' };
  return `<ul class="ic-rows">${check.columns.map(c => {
    const found = `<span class="ic-found">${escapeHtml(c.found)}</span>`;
    const field = FIELD_LABELS[c.col];
    switch (c.state) {
      case 'exact':
        return icRow('ok', '✓', c.col, `${found} → ${field}<span class="ic-tag">Exacto</span>`);
      case 'typo':
        return icRow('warn', '!', c.col, `${found} se leyó como <b>${c.label}</b> → ${field}<span class="ic-tag">Error de escritura</span><span class="ic-expect">Nombre exacto: <b>${c.label}</b></span>`);
      case 'partial':
        return icRow('warn', '!', c.col, `${found} se aceptó como <b>${c.label}</b> → ${field}<span class="ic-tag">Parcial</span><span class="ic-expect">Nombre exacto: <b>${c.label}</b></span>`);
      case 'swapped':
        return icRow('err', '✕', c.col, `Se encontró ${found}, que corresponde a la columna ${otherCol[c.col]}.<span class="ic-tag">Invertida</span><span class="ic-expect">Se esperaba: <b>${c.label}</b></span>`);
      case 'absent':
        return icRow('skip', '–', c.col, `${field}: no incluida (opcional)`);
      default: {
        const what = c.found ? `Se encontró ${found}, que no se reconoce${c.required ? '' : ' (columna opcional)'}.` : 'No se encontró encabezado.';
        const expect = c.required ? `Se esperaba: <b>${c.label}</b>` : `Se esperaba: <b>${c.label}</b>, o dejar el encabezado vacío`;
        return icRow('err', '✕', c.col, `${what}<span class="ic-tag">Incorrecto</span><span class="ic-expect">${expect}</span>`);
      }
    }
  }).join('')}</ul>`;
}

function icRow(tone, icon, col, message) {
  return `<li class="ic-row ic-row-${tone}"><span class="ic-icon">${icon}</span><span class="ic-col">Col. ${col}</span><span class="ic-msg">${message}</span></li>`;
}

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
              ${SHOW_LOCATION ? '<th>Locación</th>' : ''}
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
                ${SHOW_LOCATION ? `<td>${w.location || '—'}</td>` : ''}
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
