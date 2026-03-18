// Invoices Module
let invClients = [];
let invOffers = [];
let invoiceItems = [];

async function loadInvoices() {
    try {
        const [invRes, cRes, oRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/clients'), fetch('/api/offers')]);
        const invoices = await invRes.json();
        invClients = await cRes.json();
        invOffers = await oRes.json();
        renderInvoices(invoices);
    } catch (e) { console.error(e); }
}

function renderInvoices(invoices) {
    const container = document.getElementById('invoices-list');
    container.innerHTML = '';
    if (!invoices.length) { container.innerHTML = '<div class="text-center p-10 text-slate-400">Nessuna fattura</div>'; return; }

    const statusColors = { 'Emessa': 'bg-blue-100 text-blue-700', 'Pagata': 'bg-green-100 text-green-700', 'Scaduta': 'bg-red-100 text-red-700', 'Annullata': 'bg-slate-100 text-slate-700' };

    invoices.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer';
        div.onclick = (e) => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') invEditInvoice(inv); };
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div><h3 class="font-bold text-lg">${inv.invoice_number}</h3><p class="text-sm text-slate-500">${inv.client_name} · ${new Date(inv.date).toLocaleDateString('it-IT')}</p></div>
                <div class="flex items-center gap-2">
                    <select onchange="invChangeStatus('${inv.id}', this.value)" class="text-xs border rounded-lg px-2 py-1 ${statusColors[inv.status] || ''}">
                        ${['Emessa', 'Pagata', 'Scaduta', 'Annullata'].map(s => `<option value="${s}" ${s === inv.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="flex justify-between items-end border-t border-slate-50 pt-3">
                <div class="text-xs text-slate-400">${inv.due_date ? 'Scadenza: ' + new Date(inv.due_date).toLocaleDateString('it-IT') : 'Nessuna scadenza'}</div>
                <div class="text-xl font-bold text-indigo-700">${formatCurrency(inv.total)}</div>
            </div>
            <div class="mt-3 flex gap-2 justify-end">
                <button onclick="invGenerateInvoicePDF('${inv.id}')" class="text-xs text-slate-600 hover:text-slate-800 underline">PDF</button>
                <button onclick="invDeleteInvoice('${inv.id}')" class="text-xs text-red-500 hover:text-red-700 underline">Elimina</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function invOpenInvoiceModal() {
    document.getElementById('invoice-form').reset();
    document.querySelector('#invoice-form [name="id"]').value = '';
    document.querySelector('#invoice-form [name="date"]').valueAsDate = new Date();
    invoiceItems = [];

    const cSel = document.getElementById('inv-invoice-client');
    cSel.innerHTML = '<option value="">-- Seleziona --</option>';
    invClients.forEach(c => { cSel.innerHTML += `<option value="${c.id}" data-name="${c.name}" data-address="${c.address || ''}" data-vat="${c.vat || c.cf || ''}">${c.name}</option>`; });

    const oSel = document.getElementById('inv-invoice-offer');
    oSel.innerHTML = '<option value="">-- Nessuna --</option>';
    invOffers.filter(o => o.status === 'Accettata').forEach(o => { oSel.innerHTML += `<option value="${o.id}">${o.offer_number} - ${o.client_name} (${formatCurrency(o.total)})</option>`; });

    renderInvoiceItems();
    document.getElementById('invoice-modal').classList.remove('hidden');
    lucide.createIcons();
}
function invCloseInvoiceModal() { document.getElementById('invoice-modal').classList.add('hidden'); }

function invInvoiceClientChange() { }

function invImportFromOffer() {
    const offerId = document.getElementById('inv-invoice-offer').value;
    if (!offerId) return;
    const offer = invOffers.find(o => o.id === offerId);
    if (!offer) return;

    document.getElementById('inv-invoice-client').value = offer.client_id;
    const form = document.getElementById('invoice-form');
    form.querySelector('[name="vatRate"]').value = offer.vat_rate || 22;

    invoiceItems = (offer.items || []).map(i => ({
        description: i.description, quantity: i.quantity, unit: i.unit || 'corpo',
        unitPrice: i.unit_price, total: i.quantity * i.unit_price
    }));
    renderInvoiceItems();
    invCalcInvoice();
}

function invAddInvoiceItem() {
    invoiceItems.push({ description: '', quantity: 1, unit: 'corpo', unitPrice: 0, total: 0 });
    renderInvoiceItems();
}

function renderInvoiceItems() {
    const container = document.getElementById('invoice-items-container');
    container.innerHTML = '';
    invoiceItems.forEach((item, i) => {
        container.innerHTML += `
            <div class="flex gap-2 items-center">
                <input type="text" value="${item.description}" onchange="invUpdateInvItem(${i},'description',this.value)" class="flex-1 border rounded-lg p-2 text-sm" placeholder="Descrizione">
                <input type="number" step="0.5" value="${item.quantity}" onchange="invUpdateInvItem(${i},'quantity',parseFloat(this.value))" class="w-16 border rounded-lg p-2 text-sm text-right" placeholder="Qta">
                <input type="number" step="0.01" value="${item.unitPrice}" onchange="invUpdateInvItem(${i},'unitPrice',parseFloat(this.value))" class="w-24 border rounded-lg p-2 text-sm text-right" placeholder="Prezzo">
                <span class="w-24 text-right text-sm font-medium">${formatCurrency(item.quantity * item.unitPrice)}</span>
                <button type="button" onclick="invoiceItems.splice(${i},1);renderInvoiceItems();invCalcInvoice()" class="text-red-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        `;
    });
    lucide.createIcons();
}

function invUpdateInvItem(i, field, val) {
    invoiceItems[i][field] = val;
    invoiceItems[i].total = invoiceItems[i].quantity * invoiceItems[i].unitPrice;
    renderInvoiceItems();
    invCalcInvoice();
}

function invCalcInvoice() {
    const form = document.getElementById('invoice-form');
    const subtotal = invoiceItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const vatRate = parseFloat(form.querySelector('[name="vatRate"]').value) || 22;
    const vatAmount = subtotal * vatRate / 100;
    const total = subtotal + vatAmount;
    form.querySelector('[name="subtotal"]').value = subtotal.toFixed(2);
    form.querySelector('[name="total"]').value = total.toFixed(2);
}

async function invSaveInvoice() {
    const form = document.getElementById('invoice-form');
    const fd = Object.fromEntries(new FormData(form));
    const cSel = document.getElementById('inv-invoice-client');
    if (!fd.clientId) { alert('Seleziona un cliente'); return; }
    const opt = cSel.selectedOptions[0];

    const data = {
        id: fd.id || null,
        clientId: fd.clientId, clientName: opt.dataset.name, clientAddress: opt.dataset.address, clientVatCf: opt.dataset.vat,
        offerId: fd.offerId || null, date: fd.date, dueDate: fd.dueDate || null,
        subtotal: parseFloat(fd.subtotal) || 0, vatRate: parseFloat(fd.vatRate) || 22,
        vatAmount: (parseFloat(fd.subtotal) || 0) * (parseFloat(fd.vatRate) || 22) / 100,
        total: parseFloat(fd.total) || 0,
        paymentMethod: fd.paymentMethod, notes: fd.notes, status: 'Emessa',
        items: invoiceItems
    };
    try {
        await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        invCloseInvoiceModal(); loadInvoices();
    } catch (e) { alert('Errore'); }
}

function invEditInvoice(inv) {
    invOpenInvoiceModal();
    const form = document.getElementById('invoice-form');
    form.querySelector('[name="id"]').value = inv.id;
    document.getElementById('inv-invoice-client').value = inv.client_id;
    form.querySelector('[name="date"]').value = inv.date;
    form.querySelector('[name="dueDate"]').value = inv.due_date || '';
    form.querySelector('[name="paymentMethod"]').value = inv.payment_method || 'Bonifico';
    form.querySelector('[name="vatRate"]').value = inv.vat_rate || 22;
    form.querySelector('[name="notes"]').value = inv.notes || '';
    if (inv.offer_id) document.getElementById('inv-invoice-offer').value = inv.offer_id;

    invoiceItems = (inv.items || []).map(i => ({
        description: i.description, quantity: i.quantity, unit: i.unit || 'corpo',
        unitPrice: i.unit_price, total: i.total
    }));
    renderInvoiceItems();
    invCalcInvoice();
}

async function invChangeStatus(id, status) {
    await fetch(`/api/invoices/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    loadInvoices();
}

async function invDeleteInvoice(id) {
    if (!confirm('Eliminare fattura?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    loadInvoices();
}

function invGenerateInvoicePDF(id) {
    // Simple invoice PDF generation
    fetch('/api/invoices').then(r => r.json()).then(invoices => {
        const inv = invoices.find(i => i.id === id);
        if (!inv) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont("helvetica", "bold"); doc.setFontSize(18);
        doc.text(`FATTURA N. ${inv.invoice_number}`, 105, 25, { align: 'center' });
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.text(`Data: ${new Date(inv.date).toLocaleDateString('it-IT')}`, 15, 40);
        doc.text(`Cliente: ${inv.client_name}`, 15, 48);
        doc.text(`Indirizzo: ${inv.client_address || ''}`, 15, 56);
        doc.text(`P.IVA/CF: ${inv.client_vat_cf || ''}`, 15, 64);

        if (inv.items && inv.items.length) {
            doc.autoTable({
                startY: 75,
                head: [['Descrizione', 'Qta', 'Prezzo', 'Totale']],
                body: inv.items.map(i => [i.description, i.quantity, '€' + Number(i.unit_price).toFixed(2), '€' + Number(i.total).toFixed(2)]),
                theme: 'grid', margin: { left: 15, right: 15 }
            });
        }

        let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;
        doc.setFont("helvetica", "bold");
        doc.text(`Imponibile: € ${Number(inv.subtotal).toFixed(2)}`, 140, y);
        doc.text(`IVA ${inv.vat_rate}%: € ${Number(inv.vat_amount).toFixed(2)}`, 140, y + 8);
        doc.setFontSize(14);
        doc.text(`TOTALE: € ${Number(inv.total).toFixed(2)}`, 140, y + 18);

        window.open(doc.output('bloburi'), '_blank');
    });
}
