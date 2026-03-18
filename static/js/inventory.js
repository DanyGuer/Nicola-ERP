// Inventory Logic

async function loadInventory() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        renderInvTable(products);
    } catch (e) {
        console.error("Error loading products", e);
    }
}

function renderInvTable(products) {
    const tbody = document.getElementById('inv-table-body');
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 font-mono text-xs text-slate-500">${p.code}</td>
            <td class="px-6 py-4 font-medium text-slate-900">${p.description}</td>
            <td class="px-6 py-4 text-slate-600">${p.unit}</td>
            <td class="px-6 py-4 text-right font-medium text-slate-900">${formatCurrency(p.price)}</td>
            <td class="px-6 py-4 text-right">
                 <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900 text-xs font-medium">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function invOpenModal() {
    document.getElementById('inv-form').reset();
    document.querySelector('#inv-form [name="id"]').value = '';
    document.getElementById('inv-modal').classList.remove('hidden');
}

function invCloseModal() {
    document.getElementById('inv-modal').classList.add('hidden');
}

async function invSave(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    // Convert price to number
    data.price = parseFloat(data.price);

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            invCloseModal();
            loadInventory();
        } else {
            alert('Errore nel salvataggio');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di connessione');
    }
}

async function deleteProduct(id) {
    if (!confirm('Sei sicuro?')) return;
    try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        loadInventory();
    } catch (e) {
        console.error(e);
    }
}
