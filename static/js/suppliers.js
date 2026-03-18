// Suppliers Module
async function loadSuppliers() {
    try {
        const res = await fetch('/api/suppliers');
        const suppliers = await res.json();
        renderSuppliers(suppliers);
    } catch (e) { console.error(e); }
}

function renderSuppliers(suppliers) {
    const tbody = document.getElementById('supp-table-body');
    tbody.innerHTML = '';
    if (!suppliers.length) { tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">Nessun fornitore</td></tr>'; return; }
    suppliers.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer';
        tr.onclick = (e) => { if (e.target.tagName !== 'BUTTON') suppEdit(s); };
        tr.innerHTML = `
            <td class="px-6 py-4"><div class="font-medium">${s.name}</div><div class="text-xs text-slate-400">${s.vat ? 'P.IVA: ' + s.vat : ''}</div></td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs bg-slate-100">${s.category || '-'}</span></td>
            <td class="px-6 py-4"><div class="text-sm">${s.email || ''}</div><div class="text-xs text-slate-400">${s.phone || ''}</div></td>
            <td class="px-6 py-4 text-right"><button onclick="suppDelete('${s.id}')" class="text-red-500 hover:text-red-700 text-xs">Elimina</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function suppOpenModal() {
    document.getElementById('supp-form').reset();
    document.querySelector('#supp-form [name="id"]').value = '';
    document.getElementById('supp-modal').classList.remove('hidden');
    lucide.createIcons();
}
function suppCloseModal() { document.getElementById('supp-modal').classList.add('hidden'); }

function suppEdit(s) {
    suppOpenModal();
    const form = document.getElementById('supp-form');
    form.querySelector('[name="id"]').value = s.id;
    form.querySelector('[name="name"]').value = s.name;
    form.querySelector('[name="vat"]').value = s.vat || '';
    form.querySelector('[name="cf"]').value = s.cf || '';
    form.querySelector('[name="address"]').value = s.address || '';
    form.querySelector('[name="email"]').value = s.email || '';
    form.querySelector('[name="phone"]').value = s.phone || '';
    form.querySelector('[name="category"]').value = s.category || 'Materiali';
    form.querySelector('[name="notes"]').value = s.notes || '';
}

async function suppSave(e) {
    e.preventDefault();
    const form = document.getElementById('supp-form');
    const data = Object.fromEntries(new FormData(form));
    try {
        await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        suppCloseModal(); loadSuppliers();
    } catch (e) { alert('Errore'); }
}

async function suppDelete(id) {
    if (!confirm('Eliminare fornitore?')) return;
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    loadSuppliers();
}
