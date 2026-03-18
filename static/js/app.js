// App Logic - Navigation & Dashboard

// ============================================
//   API WRAPPER (gestisce sessione scaduta)
// ============================================

async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        alert('Sessione scaduta. Effettua il login.');
        window.location.href = '/login';
        return null;
    }
    return res;
}

function formatCurrency(val) {
    return '€ ' + Number(val || 0).toFixed(2).replace('.', ',');
}

// ============================================
//   MOBILE SIDEBAR DRAWER
// ============================================

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// ============================================
//   NAVIGATION
// ============================================

function navigateTo(view) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden-view'));
    document.getElementById(`view-${view}`).classList.remove('hidden-view');

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('text-indigo-700', 'bg-indigo-50');
        btn.classList.add('text-slate-600');
    });
    const activeBtn = document.getElementById(`nav-${view}`);
    if (activeBtn) {
        activeBtn.classList.add('text-indigo-700', 'bg-indigo-50');
        activeBtn.classList.remove('text-slate-600');
    }

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.remove('text-indigo-600');
        btn.classList.add('text-slate-500');
    });
    const activeBottomBtn = document.getElementById(`bottom-nav-${view}`);
    if (activeBottomBtn) {
        activeBottomBtn.classList.remove('text-slate-500');
        activeBottomBtn.classList.add('text-indigo-600');
    }

    const loaders = {
        'dashboard': loadDashboard,
        'crm': loadCRM,
        'inventory': loadInventory,
        'sales': loadSales,
        'suppliers': loadSuppliers,
        'expenses': loadExpenses,
        'projects': loadProjects,
        'invoices': loadInvoices,
        'calendar': loadCalendar,
        'deadlines': loadDeadlines,
        'reports': loadReports
    };
    if (loaders[view]) loaders[view]();
    lucide.createIcons();

    // Close mobile sidebar after navigation
    if (window.innerWidth < 768) closeSidebar();
}

// ============================================
//   DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        const res = await fetch('/api/reports/summary');
        const data = await res.json();

        const cards = document.getElementById('dash-cards');
        cards.innerHTML = `
            <div class="stat-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><i data-lucide="file-text" class="w-5 h-5 text-blue-600"></i></div><span class="text-sm text-slate-500">Offerte</span></div>
                <div class="text-2xl font-bold">${data.offers.total}</div>
                <div class="text-xs text-slate-400 mt-1">${data.offers.accepted} accettate · ${data.offers.pending} in attesa</div>
            </div>
            <div class="stat-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><i data-lucide="receipt" class="w-5 h-5 text-green-600"></i></div><span class="text-sm text-slate-500">Fatturato</span></div>
                <div class="text-2xl font-bold">${formatCurrency(data.invoices.total_invoiced)}</div>
                <div class="text-xs text-slate-400 mt-1">${data.invoices.paid} pagate · ${data.invoices.unpaid} da incassare</div>
            </div>
            <div class="stat-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><i data-lucide="hard-hat" class="w-5 h-5 text-amber-600"></i></div><span class="text-sm text-slate-500">Cantieri Attivi</span></div>
                <div class="text-2xl font-bold">${data.projects.active}</div>
            </div>
            <div class="stat-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><i data-lucide="wallet" class="w-5 h-5 text-red-600"></i></div><span class="text-sm text-slate-500">Spese Totali</span></div>
                <div class="text-2xl font-bold">${formatCurrency(data.expenses.total)}</div>
            </div>
        `;

        const evDiv = document.getElementById('dash-events');
        evDiv.innerHTML = data.upcoming_events.length ? data.upcoming_events.map(e => `<div class="flex justify-between items-center py-2 border-b border-slate-50"><span>${e.title}</span><span class="text-xs text-slate-400">${e.date}${e.time ? ' ' + e.time : ''}</span></div>`).join('') : '<p class="text-slate-400">Nessun evento in programma</p>';

        const odDiv = document.getElementById('dash-overdue');
        odDiv.innerHTML = data.overdue_invoices.length ? data.overdue_invoices.map(i => `<div class="flex justify-between items-center py-2 border-b border-slate-50"><span class="text-red-600 font-medium">${i.invoice_number} - ${i.client_name}</span><span class="text-red-600 font-bold">${formatCurrency(i.total)}</span></div>`).join('') : '<p class="text-green-600">Nessuna fattura scaduta ✓</p>';

        const tcDiv = document.getElementById('dash-top-clients');
        tcDiv.innerHTML = data.top_clients.length ? data.top_clients.map(c => `<div class="flex justify-between items-center py-2 border-b border-slate-50"><span>${c.client_name}</span><span class="font-medium">${formatCurrency(c.total_value)}</span></div>`).join('') : '<p class="text-slate-400">Nessun dato</p>';

        const ecDiv = document.getElementById('dash-expense-cats');
        ecDiv.innerHTML = data.expenses.by_category.length ? data.expenses.by_category.map(c => `<div class="flex justify-between items-center py-2 border-b border-slate-50"><span>${c.category}</span><span class="font-medium">${formatCurrency(c.total)}</span></div>`).join('') : '<p class="text-slate-400">Nessuna spesa registrata</p>';

        lucide.createIcons();
    } catch (e) { console.error('Dashboard error', e); }
}
