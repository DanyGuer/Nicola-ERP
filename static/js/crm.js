// CRM Logic

async function loadCRM() {
    try {
        const response = await fetch('/api/clients');
        const clients = await response.json();
        renderCRMTable(clients);
    } catch (e) {
        console.error("Error loading clients", e);
    }
}

function renderCRMTable(clients) {
    const tbody = document.getElementById('crm-table-body');
    tbody.innerHTML = '';

    clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors cursor-pointer';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-medium text-slate-900">${client.name}</div>
                <div class="text-xs text-slate-500">${client.address}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-slate-600">${client.email || '-'}</div>
                <div class="text-xs text-slate-500">${client.phone || '-'}</div>
            </td>
             <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    ${client.type === 'company' ? 'Azienda' : 'Privato'}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteClient('${client.id}')" class="text-red-600 hover:text-red-900 text-xs font-medium">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function crmOpenModal() {
    document.getElementById('crm-form').reset();
    document.querySelector('#crm-form [name="id"]').value = '';
    document.getElementById('crm-modal').classList.remove('hidden');
    crmToggleFields();
}

function crmCloseModal() {
    document.getElementById('crm-modal').classList.add('hidden');
}

function crmToggleFields() {
    const type = document.querySelector('#crm-form [name="type"]').value;
    const vatField = document.getElementById('crm-vat-field');
    if (type === 'company') {
        vatField.classList.remove('hidden');
    } else {
        vatField.classList.add('hidden');
    }
}

async function crmSave(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            crmCloseModal();
            loadCRM();
        } else {
            alert('Errore nel salvataggio');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di connessione');
    }
}

async function deleteClient(id) {
    if (!confirm('Sei sicuro?')) return;
    try {
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        loadCRM();
    } catch (e) {
        console.error(e);
    }
}
