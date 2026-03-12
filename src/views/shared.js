// Utilidades compartidas: toast, navbar, helpers

import { logout } from '../controllers/auth.controller.js';

/**
 * Mostrar notificación toast.
 */
export function showToast(message, type = 'success') {
  // Eliminar toast previo
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Mostrar con animación
  requestAnimationFrame(() => toast.classList.add('show'));

  // Ocultar después de 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Renderizar la barra de navegación.
 * @param {'admin'|'judge'} role
 * @param {string} userName
 * @param {string} activePage - Nombre de la página activa
 */
export function renderNavbar(role, userName, activePage) {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const adminLinks = [
    { href: '/admin-dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { href: '/admin-works.html', label: 'Obras', id: 'works' },
    { href: '/admin-judges.html', label: 'Jueces', id: 'judges' },
    { href: '/admin-results.html', label: 'Resultados', id: 'results' },
  ];

  const judgeLinks = [
    { href: '/judge-scoring.html', label: 'Calificar', id: 'scoring' },
    { href: '/judge-my-scores.html', label: 'Mis Puntajes', id: 'my-scores' },
  ];

  const links = role === 'admin' ? adminLinks : judgeLinks;

  nav.innerHTML = `
    <div class="container">
      <span class="navbar-brand">🏆 Concurso</span>
      <ul class="navbar-nav">
        ${links.map(l => `
          <li><a href="${l.href}" class="${l.id === activePage ? 'active' : ''}">${l.label}</a></li>
        `).join('')}
      </ul>
      <div class="navbar-user">
        <span>${userName}</span>
        <button class="btn-logout" id="btnLogout">Salir</button>
      </div>
    </div>
  `;

  document.getElementById('btnLogout').addEventListener('click', async () => {
    await logout();
  });
}

/**
 * Obtener clase CSS del badge según la categoría.
 */
export function categoryBadge(category) {
  return `<span class="badge badge-${category}">${category}</span>`;
}

/**
 * Mostrar/ocultar spinner de carga.
 */
export function setLoading(containerId, isLoading) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (isLoading) {
    el.innerHTML = '<div class="spinner"></div>';
  }
}

/**
 * Mostrar cuadro de diálogo modal para confirmar acciones.
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje de confirmación
 * @param {function} onConfirm - Callback a ejecutar si el usuario confirma
 */
export function showConfirmModal(title, message, onConfirm) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="form-actions" style="margin-top: var(--space-lg); justify-content: flex-end;">
            <button class="btn btn-secondary" id="btnCancelModal">Cancelar</button>
            <button class="btn btn-danger" id="btnConfirmModal">Confirmar</button>
        </div>
    `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animación de entrada
  requestAnimationFrame(() => overlay.classList.add('active'));

  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('btnConfirmModal').addEventListener('click', async () => {
    // Deshabilitar botones mientras procesa para evitar doble click
    document.getElementById('btnConfirmModal').disabled = true;
    document.getElementById('btnCancelModal').disabled = true;

    try {
      await onConfirm();
    } finally {
      closeModal();
    }
  });
}
