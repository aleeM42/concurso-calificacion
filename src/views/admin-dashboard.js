// View JS: Admin Dashboard

import { requireAuth } from '../auth-guard.js';
import { renderNavbar } from './shared.js';
import { loadDashboard } from '../controllers/admin.controller.js';

async function init() {
    const user = await requireAuth('admin');
    renderNavbar('admin', user.name, 'dashboard');

    const data = await loadDashboard();
    document.getElementById('totalWorks').textContent = data.totalWorks;
    document.getElementById('totalJudges').textContent = data.totalJudges;
}

init();
