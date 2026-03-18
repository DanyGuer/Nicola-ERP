// Expenses Module
let expSuppliers = [];
let expProjects = [];

async function loadExpenses() {
    try {
        const [expRes, suppRes, projRes] = await Promise.all([
            fetch('/api/expenses'), fetch('/api/suppliers'), fetch('/api/projects')
        ]);
        const expenses = await expRes.json();
        expSuppliers = await suppRes.json();
        expProjects = await projRes.json();
        renderExpenses(expenses);
    } catch (e) { console.error(e); }
}

function renderExpenses(expenses) {
    // Summary cards
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const categories = {};
    expenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + e.amount; });
    const topCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('exp-summary').innerHTML = `
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-sm text-slate-500 mb-1">Totale Spese</div>
            <div class="text-2xl font-bold text-red-600">${formatCurrency(total)}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-sm text-slate-500 mb-1">N. Registrazioni</div>
            <div class="text-2xl font-bold">${expenses.length}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-sm text-slate-500 mb-1">Categoria Top</div>
            <div class="text-2xl font-bold">${topCat ? topCat[0] : '-'}</div>
            <div class="text-xs text-slate-400">${topCat ? formatCurrency(topCat[1]) : ''}</div>
        </div>
    `;

    const tbody = document.getElementById('exp-table-body');
    tbody.innerHTML = '';
    if (!expenses.length) { tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">Nessuna spesa</td></tr>'; return; }
    expenses.forEach(e => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer';
        tr.onclick = (ev) => { if (ev.target.tagName !== 'BUTTON') expEdit(e); };
        const catColors = { 'Materiali': 'bg-blue-100 text-blue-700', 'Trasporto': 'bg-amber-100 text-amber-700', 'Manodopera': 'bg-green-100 text-green-700', 'Utenze': 'bg-purple-100 text-purple-700', 'Attrezzatura': 'bg-cyan-100 text-cyan-700', 'Altro': 'bg-slate-100 text-slate-700' };
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm">${new Date(e.date).toLocaleDateString('it-IT')}</td>
            <td class="px-6 py-4"><div class="font-medium text-sm">${e.description}</div><div class="text-xs text-slate-400">${e.supplier_name || ''}</div></td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs ${catColors[e.category] || 'bg-slate-100'}">${e.category}</span></td>
            <td class="px-6 py-4 text-xs text-slate-400">${e.project_name || '-'}</td>
            <td class="px-6 py-4 text-right font-medium text-red-600">${formatCurrency(e.amount)}</td>
            <td class="px-6 py-4 text-right"><button onclick="expDelete('${e.id}')" class="text-red-500 hover:text-red-700 text-xs">Elimina</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function expOpenModal() {
    document.getElementById('exp-form').reset();
    document.querySelector('#exp-form [name="id"]').value = '';
    document.querySelector('#exp-form [name="date"]').valueAsDate = new Date();

    const suppSel = document.getElementById('exp-supplier-select');
    suppSel.innerHTML = '<option value="">-- Nessuno --</option>';
    expSuppliers.forEach(s => { suppSel.innerHTML += `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`; });

    const projSel = document.getElementById('exp-project-select');
    projSel.innerHTML = '<option value="">-- Nessuno --</option>';
    expProjects.forEach(p => { projSel.innerHTML += `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`; });

    document.getElementById('exp-modal').classList.remove('hidden');
    lucide.createIcons();
}
function expCloseModal() { document.getElementById('exp-modal').classList.add('hidden'); }

function expEdit(e) {
    expOpenModal();
    const form = document.getElementById('exp-form');
    form.querySelector('[name="id"]').value = e.id;
    form.querySelector('[name="date"]').value = e.date;
    form.querySelector('[name="description"]').value = e.description;
    form.querySelector('[name="amount"]').value = e.amount;
    form.querySelector('[name="category"]').value = e.category;
    form.querySelector('[name="paymentMethod"]').value = e.payment_method || 'Bonifico';
    if (e.supplier_id) document.getElementById('exp-supplier-select').value = e.supplier_id;
    if (e.project_id) document.getElementById('exp-project-select').value = e.project_id;
    form.querySelector('[name="notes"]').value = e.notes || '';
}

async function expSave(ev) {
    ev.preventDefault();
    const form = document.getElementById('exp-form');
    const fd = Object.fromEntries(new FormData(form));
    const suppSel = document.getElementById('exp-supplier-select');
    const projSel = document.getElementById('exp-project-select');
    fd.supplierId = fd.supplierId || null;
    fd.supplierName = suppSel.selectedOptions[0]?.dataset?.name || null;
    fd.projectId = fd.projectId || null;
    fd.projectName = projSel.selectedOptions[0]?.dataset?.name || null;
    try {
        await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
        expCloseModal(); loadExpenses();
    } catch (e) { alert('Errore'); }
}

async function expDelete(id) {
    if (!confirm('Eliminare spesa?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    loadExpenses();
}
