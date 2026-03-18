// Projects Module
let projClients = [];

async function loadProjects() {
    try {
        const [projRes, clientRes] = await Promise.all([fetch('/api/projects'), fetch('/api/clients')]);
        const projects = await projRes.json();
        projClients = await clientRes.json();
        renderProjects(projects);
    } catch (e) { console.error(e); }
}

function renderProjects(projects) {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';
    if (!projects.length) { container.innerHTML = '<div class="text-center p-10 text-slate-400">Nessun cantiere</div>'; return; }

    const statusColors = { 'Pianificato': 'bg-slate-100 text-slate-700', 'In Corso': 'bg-blue-100 text-blue-700', 'Completato': 'bg-green-100 text-green-700', 'Chiuso': 'bg-red-100 text-red-700' };

    projects.forEach(p => {
        const revenue = p.total_invoiced || 0;
        const expenses = p.total_expenses || 0;
        const margin = revenue - expenses;
        const budgetUsed = p.budget > 0 ? Math.min(100, (expenses / p.budget * 100)).toFixed(0) : 0;

        const div = document.createElement('div');
        div.className = 'bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer';
        div.onclick = (e) => { if (e.target.tagName !== 'BUTTON') projEdit(p); };
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div><h3 class="font-bold text-lg">${p.name}</h3><p class="text-sm text-slate-500">${p.client_name || '-'} · ${p.address || '-'}</p></div>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColors[p.status] || 'bg-slate-100'}">${p.status}</span>
            </div>
            <div class="grid grid-cols-4 gap-4 text-sm mb-4">
                <div><div class="text-xs text-slate-400">Budget</div><div class="font-medium">${formatCurrency(p.budget)}</div></div>
                <div><div class="text-xs text-slate-400">Fatturato</div><div class="font-medium text-green-600">${formatCurrency(revenue)}</div></div>
                <div><div class="text-xs text-slate-400">Spese</div><div class="font-medium text-red-600">${formatCurrency(expenses)}</div></div>
                <div><div class="text-xs text-slate-400">Margine</div><div class="font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(margin)}</div></div>
            </div>
            ${p.budget > 0 ? `<div class="w-full bg-slate-100 rounded-full h-2">
                <div class="h-2 rounded-full ${budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-amber-500' : 'bg-indigo-500'}" style="width:${budgetUsed}%"></div>
            </div><div class="text-xs text-slate-400 mt-1">Budget utilizzato: ${budgetUsed}%</div>` : ''}
            <div class="mt-4 flex gap-4 text-xs text-slate-400">
                <span>${p.start_date ? 'Inizio: ' + new Date(p.start_date).toLocaleDateString('it-IT') : ''}</span>
                <span>${p.end_date ? 'Fine: ' + new Date(p.end_date).toLocaleDateString('it-IT') : ''}</span>
                <button onclick="projDelete('${p.id}')" class="ml-auto text-red-500 hover:text-red-700">Elimina</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function projOpenModal() {
    document.getElementById('proj-form').reset();
    document.querySelector('#proj-form [name="id"]').value = '';
    const cSel = document.getElementById('proj-client-select');
    cSel.innerHTML = '<option value="">-- Nessuno --</option>';
    projClients.forEach(c => { cSel.innerHTML += `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`; });
    document.getElementById('proj-modal').classList.remove('hidden');
    lucide.createIcons();
}
function projCloseModal() { document.getElementById('proj-modal').classList.add('hidden'); }

function projEdit(p) {
    projOpenModal();
    const form = document.getElementById('proj-form');
    form.querySelector('[name="id"]').value = p.id;
    form.querySelector('[name="name"]').value = p.name;
    if (p.client_id) document.getElementById('proj-client-select').value = p.client_id;
    form.querySelector('[name="address"]').value = p.address || '';
    form.querySelector('[name="startDate"]').value = p.start_date || '';
    form.querySelector('[name="endDate"]').value = p.end_date || '';
    form.querySelector('[name="budget"]').value = p.budget || '';
    form.querySelector('[name="status"]').value = p.status;
    form.querySelector('[name="notes"]').value = p.notes || '';
}

async function projSave(e) {
    e.preventDefault();
    const form = document.getElementById('proj-form');
    const fd = Object.fromEntries(new FormData(form));
    const cSel = document.getElementById('proj-client-select');
    fd.clientId = fd.clientId || null;
    fd.clientName = cSel.selectedOptions[0]?.dataset?.name || null;
    try {
        await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
        projCloseModal(); loadProjects();
    } catch (e) { alert('Errore'); }
}

async function projDelete(id) {
    if (!confirm('Eliminare cantiere?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    loadProjects();
}
