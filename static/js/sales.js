// Sales Logic - Full Rewrite with Professional PDF

let salesClients = [];
let salesProducts = [];
let currentItems = [];
let loadedLogo = null; // base64 logo from upload
let defaultLogo = null; // base64 logo loaded from server
let currentOfferNumber = null; // Progressive offer number from backend

// ---- LOAD DEFAULT LOGO ON INIT ----
async function preloadDefaultLogo() {
    try {
        const response = await fetch('/static/img/logo.png');
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Default logo not found", e);
        return null;
    }
}

async function loadSales() {
    try {
        const [offersRes, clientsRes, productsRes] = await Promise.all([
            fetch('/api/offers'),
            fetch('/api/clients'),
            fetch('/api/products')
        ]);

        const offers = await offersRes.json();
        salesClients = await clientsRes.json();
        salesProducts = await productsRes.json();

        // Preload default logo
        if (!defaultLogo) {
            defaultLogo = await preloadDefaultLogo();
        }

        renderSalesList(offers);

        // Init Logo Listener
        const logoInput = document.getElementById('sales-logo-upload');
        if (logoInput) {
            logoInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => { loadedLogo = reader.result; };
                    reader.readAsDataURL(file);
                }
            });
        }
    } catch (e) {
        console.error("Error loading sales data", e);
    }
}

function renderSalesList(offers) {
    const container = document.getElementById('sales-list');
    container.innerHTML = '';

    if (offers.length === 0) {
        container.innerHTML = '<div class="text-center p-10 text-slate-400">Nessuna offerta presente</div>';
        return;
    }

    offers.forEach(offer => {
        const div = document.createElement('div');
        div.className = 'bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer';
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') salesLoadOffer(offer);
        };

        const statusColors = {
            'Bozza': 'bg-slate-100 text-slate-700',
            'Inviata': 'bg-blue-100 text-blue-700',
            'Accettata': 'bg-green-100 text-green-700',
            'Rifiutata': 'bg-red-100 text-red-700'
        };

        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-slate-800">${offer.client_name}</h3>
                    <p class="text-sm text-slate-500">Offerta N. ${offer.offer_number || '-'} del ${new Date(offer.date).toLocaleDateString('it-IT')}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusColors[offer.status] || 'bg-slate-100'}">
                    ${offer.status}
                </span>
            </div>
            <div class="flex justify-between items-end border-t border-slate-50 pt-4">
                <div class="text-xs text-slate-400">
                    <div>Imponibile: ${formatCurrency(offer.subtotal)}</div>
                    ${offer.discount > 0 ? `<div class="text-red-500">Sconto: -${formatCurrency(offer.discount)}</div>` : ''}
                </div>
                <div class="text-xl font-bold text-indigo-700">${formatCurrency(offer.total)}</div>
            </div>
            <div class="mt-4 flex gap-2 justify-end">
                <button onclick="salesDelete('${offer.id}', event)" class="text-xs text-red-500 hover:text-red-700 underline z-10 relative">Elimina</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ---- MODAL MANAGEMENT ----

function salesGetPricingMode() {
    const radio = document.querySelector('#sales-form [name="pricingMode"]:checked');
    return radio ? radio.value : 'itemized';
}

function salesTogglePricingMode() {
    const mode = salesGetPricingMode();
    const lumpRow = document.getElementById('lump-sum-row');
    if (mode === 'lump_sum') {
        lumpRow.classList.remove('hidden');
    } else {
        lumpRow.classList.add('hidden');
    }
    renderSalesItems();
    salesCalcTotals();
}

function salesOpenModal() {
    document.getElementById('sales-form').reset();
    document.querySelector('#sales-form [name="id"]').value = '';
    currentItems = [];
    loadedLogo = null;
    currentOfferNumber = null;

    document.querySelector('#sales-form [name="date"]').valueAsDate = new Date();
    document.getElementById('sales-discount').value = 0;

    // Reset pricing mode to itemized
    const itemizedRadio = document.querySelector('#sales-form [name="pricingMode"][value="itemized"]');
    if (itemizedRadio) itemizedRadio.checked = true;
    document.getElementById('lump-sum-row').classList.add('hidden');
    document.getElementById('sales-lump-sum-amount').value = 0;

    const select = document.getElementById('sales-client-select');
    select.innerHTML = '<option value="">-- Seleziona --</option>';
    salesClients.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    document.getElementById('sales-client-address').innerText = '-';
    document.getElementById('sales-client-vat').innerText = '-';
    document.getElementById('sales-client-email').innerText = '-';

    renderSalesItems();
    salesCalcTotals();

    document.getElementById('sales-modal').classList.remove('hidden');
    lucide.createIcons();
}

function salesCloseModal() {
    document.getElementById('sales-modal').classList.add('hidden');
}

function salesSelectClient() {
    const id = document.getElementById('sales-client-select').value;
    const client = salesClients.find(c => c.id === id);
    if (client) {
        document.getElementById('sales-client-address').innerText = client.address;
        document.getElementById('sales-client-vat').innerText = (client.vat || client.cf || '-');
        document.getElementById('sales-client-email').innerText = client.email;
    } else {
        document.getElementById('sales-client-address').innerText = '-';
        document.getElementById('sales-client-vat').innerText = '-';
        document.getElementById('sales-client-email').innerText = '-';
    }
}

// ---- ITEMS ----

function salesAddItem() {
    currentItems.push({
        id: Date.now().toString(),
        productCode: '',
        description: '',
        unit: 'corpo',
        quantity: 1,
        unitPrice: 0,
        total: 0
    });
    renderSalesItems();
}

function renderSalesItems() {
    const tbody = document.getElementById('sales-items-body');
    tbody.innerHTML = '';
    const isLumpSum = salesGetPricingMode() === 'lump_sum';

    currentItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        // In lump_sum mode price fields are readonly / hidden
        const priceInput = isLumpSum
            ? `<input type="number" step="0.01" class="w-full border p-1 text-sm rounded text-right bg-slate-100 text-slate-400 cursor-not-allowed" value="${item.unitPrice}" readonly tabindex="-1">`
            : `<input type="number" step="0.01" onchange="salesUpdateItem(${index}, 'unitPrice', parseFloat(this.value))" class="w-full border p-1 text-sm rounded text-right" value="${item.unitPrice}">`;
        const totalCell = isLumpSum
            ? `<span class="text-slate-300 text-xs italic">—</span>`
            : formatCurrency(item.quantity * item.unitPrice);

        tr.innerHTML = `
            <td class="px-2 py-2">
                <input type="text" list="products-list" onchange="salesProductChanged(${index}, this.value)" 
                    class="w-full border p-1 text-sm rounded" value="${item.productCode || ''}" placeholder="Cod.">
            </td>
            <td class="px-2 py-2">
                <input type="text" onchange="salesUpdateItem(${index}, 'description', this.value)" 
                    class="w-full border p-1 text-sm rounded" value="${item.description || ''}">
            </td>
            <td class="px-2 py-2">
                <input type="text" onchange="salesUpdateItem(${index}, 'unit', this.value)" 
                    class="w-full border p-1 text-sm rounded" value="${item.unit || ''}">
            </td>
            <td class="px-2 py-2">
                <input type="number" step="0.5" onchange="salesUpdateItem(${index}, 'quantity', parseFloat(this.value))" 
                    class="w-full border p-1 text-sm rounded text-right" value="${item.quantity}">
            </td>
            <td class="px-2 py-2">${priceInput}</td>
            <td class="px-4 py-2 text-right font-medium">${totalCell}</td>
            <td class="px-2 py-2 text-center">
                <button onclick="salesRemoveItem(${index})" class="text-red-500 hover:text-red-700">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Datalist for product codes
    let dl = document.getElementById('products-list');
    if (dl) dl.remove();
    dl = document.createElement('datalist');
    dl.id = 'products-list';
    salesProducts.forEach(p => {
        const op = document.createElement('option');
        op.value = p.code;
        dl.appendChild(op);
    });
    document.body.appendChild(dl);

    lucide.createIcons();
    salesCalcTotals();
}

function salesProductChanged(index, code) {
    const product = salesProducts.find(p => p.code === code);
    if (product) {
        currentItems[index].productCode = product.code;
        currentItems[index].description = product.description;
        currentItems[index].unit = product.unit;
        currentItems[index].unitPrice = product.price;
        renderSalesItems();
    }
}

function salesUpdateItem(index, field, value) {
    currentItems[index][field] = value;
    currentItems[index].total = currentItems[index].quantity * currentItems[index].unitPrice;
    renderSalesItems();
}

function salesRemoveItem(index) {
    currentItems.splice(index, 1);
    renderSalesItems();
}

// ---- TOTALS ----

function salesCalcTotals() {
    const mode = salesGetPricingMode();
    let grossTotal;
    if (mode === 'lump_sum') {
        // In modalità a corpo il lordo viene inserito dall'utente
        grossTotal = parseFloat(document.getElementById('sales-lump-sum-amount').value) || 0;
    } else {
        // In modalità dettagliata somma i righi articoli
        grossTotal = currentItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }
    const discount = parseFloat(document.getElementById('sales-discount').value) || 0;
    const subtotal = Math.max(0, grossTotal - discount);
    const vatRate = parseFloat(document.getElementById('sales-vat-rate').value) || 22;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    document.getElementById('sales-gross-total').innerText = formatCurrency(grossTotal);
    document.getElementById('sales-discount-display').innerText = '- ' + formatCurrency(discount);
    document.getElementById('sales-subtotal').innerText = formatCurrency(subtotal);
    document.getElementById('sales-vat-amount').innerText = formatCurrency(vatAmount);
    document.getElementById('sales-total').innerText = formatCurrency(total);

    return { grossTotal, discount, subtotal, vatRate, vatAmount, total, pricingMode: mode };
}

// ---- SAVE ----

async function salesSave() {
    const clientId = document.getElementById('sales-client-select').value;
    if (!clientId) { alert('Seleziona un cliente'); return; }

    const client = salesClients.find(c => c.id === clientId);
    const totals = salesCalcTotals();
    const form = document.getElementById('sales-form');
    const pricingMode = totals.pricingMode;

    const offer = {
        id: form.querySelector('[name="id"]').value || null,
        clientId: client.id,
        clientName: client.name,
        clientAddress: client.address,
        clientVatOrCf: client.vat || client.cf,
        date: form.querySelector('[name="date"]').value,
        executionTime: form.querySelector('[name="executionTime"]').value,
        worksiteAddress: form.querySelector('[name="worksiteAddress"]').value,
        items: currentItems,
        // lumpSumAmount ha senso solo in modalità corpo
        lumpSumAmount: pricingMode === 'lump_sum' ? totals.grossTotal : null,
        discount: totals.discount,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        total: totals.total,
        paymentMethod: form.querySelector('[name="paymentMethod"]').value,
        paymentTerms: form.querySelector('[name="paymentTerms"]').value,
        legalTerms: form.querySelector('[name="legalTerms"]') ? form.querySelector('[name="legalTerms"]').value : '',
        notes: form.querySelector('[name="notes"]') ? form.querySelector('[name="notes"]').value : '',
        status: 'Bozza',
        pricingMode: pricingMode,  // FIX: non più hardcoded a 'itemized'
        customLogoUrl: loadedLogo
    };

    try {
        const res = await fetch('/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offer)
        });
        if (res.ok) { salesCloseModal(); loadSales(); }
        else alert('Errore salvataggio');
    } catch (e) { console.error(e); alert('Errore connessione'); }
}

async function salesDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Eliminare offerta?')) return;
    await fetch(`/api/offers/${id}`, { method: 'DELETE' });
    loadSales();
}

function salesLoadOffer(offer) {
    salesOpenModal();
    const form = document.getElementById('sales-form');
    form.querySelector('[name="id"]').value = offer.id;
    form.querySelector('[name="date"]').value = offer.date;
    document.getElementById('sales-client-select').value = offer.client_id;
    salesSelectClient();

    form.querySelector('[name="worksiteAddress"]').value = offer.worksite_address || '';
    form.querySelector('[name="executionTime"]').value = offer.execution_time || '';
    form.querySelector('[name="paymentMethod"]').value = offer.payment_method || '';
    form.querySelector('[name="paymentTerms"]').value = offer.payment_terms || '';

    if (form.querySelector('[name="legalTerms"]')) form.querySelector('[name="legalTerms"]').value = offer.legal_terms || '';
    if (form.querySelector('[name="notes"]')) form.querySelector('[name="notes"]').value = offer.notes || '';

    document.getElementById('sales-discount').value = offer.discount || 0;

    // FIX: Ripristinare la modalità pricing salvata
    const pricingMode = offer.pricing_mode || 'itemized';
    const modeRadio = form.querySelector(`[name="pricingMode"][value="${pricingMode}"]`);
    if (modeRadio) modeRadio.checked = true;

    if (pricingMode === 'lump_sum') {
        document.getElementById('lump-sum-row').classList.remove('hidden');
        document.getElementById('sales-lump-sum-amount').value = offer.lump_sum_amount || 0;
    } else {
        document.getElementById('lump-sum-row').classList.add('hidden');
        document.getElementById('sales-lump-sum-amount').value = 0;
    }

    currentItems = offer.items.map(i => ({
        ...i,
        quantity: i.quantity,
        unitPrice: i.unit_price
    }));

    loadedLogo = offer.custom_logo_url;
    currentOfferNumber = offer.offer_number;
    renderSalesItems();
    salesCalcTotals();
}

// =============================================
//   PROFESSIONAL PDF GENERATION
// =============================================

const EUR = (val) => {
    return '\u20AC ' + Number(val).toFixed(2).replace('.', ',');
};

function drawPageFooter(doc, marginL, marginR, pageW, DARK_BLUE, GRAY) {
    const footerY = 278;
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.2);
    doc.line(marginL, footerY, marginR, footerY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_BLUE);
    doc.text("DESIGN & CREATION di Nicola Guerra", pageW / 2, footerY + 4, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("Sede Legale: Via P.le Caldarulo 18, Bari 70132 - P.IVA 03445000734", pageW / 2, footerY + 8, { align: 'center' });
    doc.text("Email: guerranicola76@gmail.com - Tel: +39 379 143 0601", pageW / 2, footerY + 12, { align: 'center' });
}

function salesGeneratePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const clientId = document.getElementById('sales-client-select').value;
    if (!clientId) { alert("Seleziona prima un cliente."); return; }

    const client = salesClients.find(c => c.id === clientId);
    const form = document.getElementById('sales-form');
    const totals = salesCalcTotals();

    const dateStr = new Date(form.querySelector('[name="date"]').value).toLocaleDateString('it-IT');
    const offerNo = currentOfferNumber || 'NUOVO';

    const pageW = 210;
    const marginL = 15;
    const marginR = 195;
    const contentW = marginR - marginL;

    // Colors
    const DARK_BLUE = [40, 80, 120];
    const RED = [180, 40, 40];
    const BLACK = [0, 0, 0];
    const GRAY = [120, 120, 120];
    const LIGHT_GRAY_BG = [245, 245, 245];

    // ==========================================
    //   PAGE 1 - OFFERTA
    // ==========================================

    // ---- LOGO ----
    const logoData = loadedLogo || defaultLogo;
    if (logoData) {
        try { doc.addImage(logoData, 'PNG', marginL, 8, 35, 28); } catch (e) { console.warn('Logo err', e); }
    }

    // ---- OFFER NUMBER (top-right) ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK_BLUE);
    doc.text(`Offerta N. ${offerNo}`, marginR, 18, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Del ${dateStr}`, marginR, 24, { align: 'right' });

    // ---- SEPARATOR LINE ----
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.4);
    doc.line(marginL, 40, marginR, 40);

    // ---- CLIENT INFO ----
    let y = 48;
    const labelX = marginL;
    const valueX = 38;

    const drawClientLine = (label, value, yPos) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...DARK_BLUE);
        doc.text(label, labelX, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BLACK);
        doc.text(value || '', valueX, yPos);
        // Thin underline
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.15);
        doc.line(valueX, yPos + 1, marginR, yPos + 1);
    };

    drawClientLine("Cliente:", client.name, y);
    drawClientLine("Indirizzo:", client.address, y + 7);
    drawClientLine("P.IVA/CF:", client.vat || client.cf || '', y + 14);

    // ---- CONDIZIONI PARTICOLARI ----
    y = y + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text("CONDIZIONI PARTICOLARI:", labelX, y);
    // Underline title
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    const titleW = doc.getTextWidth("CONDIZIONI PARTICOLARI:");
    doc.line(labelX, y + 0.5, labelX + titleW, y + 0.5);

    y += 7;
    doc.setFontSize(9);

    const worksiteAddr = form.querySelector('[name="worksiteAddress"]').value || '-';
    const execTime = form.querySelector('[name="executionTime"]').value || '-';
    const payMethod = form.querySelector('[name="paymentMethod"]').value || '-';

    doc.setFont("helvetica", "bold");
    doc.text("a) Luogo di Esecuzione:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(worksiteAddr, 60, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("b) Tempo di Esecuzione:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(execTime, 60, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("c) Pagamento:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(payMethod, 60, y);

    // ---- TABLE SECTION ----
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("d) Oggetto del contratto", labelX, y);

    const pricingMode = salesGetPricingMode();

    let tableRows, tableHead, tableColumnStyles;
    if (pricingMode === 'lump_sum') {
        // Modalità a corpo: solo descrizione e quantità (senza prezzi)
        tableRows = currentItems.map(item => [
            item.description || '',
            item.unit || '',
            item.quantity != null ? item.quantity.toString() : ''
        ]);
        tableHead = [['Descrizione', 'U.M.', 'Qta']];
        tableColumnStyles = {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' }
        };
    } else {
        // Modalità dettagliata: descrizione, qta, u.m., prezzo unitario, totale riga
        tableRows = currentItems.map(item => [
            item.description || '',
            item.unit || '',
            item.quantity != null ? item.quantity.toString() : '',
            EUR(item.unitPrice || 0),
            EUR((item.quantity || 0) * (item.unitPrice || 0))
        ]);
        tableHead = [['Descrizione', 'U.M.', 'Qta', 'Prezzo Unit.', 'Totale']];
        tableColumnStyles = {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 28, halign: 'right' }
        };
    }

    doc.autoTable({
        startY: y + 3,
        head: tableHead,
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: BLACK,
            fontStyle: 'bold',
            lineColor: BLACK,
            lineWidth: 0.2,
            fontSize: 10
        },
        bodyStyles: {
            textColor: BLACK,
            lineColor: BLACK,
            lineWidth: 0.1,
            fontSize: 9,
            cellPadding: 2.5
        },
        columnStyles: tableColumnStyles,
        margin: { left: marginL, right: marginL }
    });

    let tableEndY = doc.lastAutoTable.finalY + 5;

    // ---- TOTALS BOX (right-aligned) ----
    const boxX = 110;
    const boxW = 85;
    const rowH = 6;
    let bY = tableEndY;

    // Helper: controlla se serve nuova pagina
    const checkPageBreak = (neededHeight) => {
        if (bY + neededHeight > 270) {
            drawPageFooter(doc, marginL, marginR, pageW, DARK_BLUE, GRAY);
            doc.addPage();
            bY = 20;
        }
    };

    const drawTotalRow = (label, value, isBold, isRed, hasBg) => {
        checkPageBreak(rowH + 2);
        if (hasBg) {
            doc.setFillColor(...LIGHT_GRAY_BG);
            doc.rect(boxX, bY, boxW, rowH, 'F');
        }
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.rect(boxX, bY, boxW, rowH, 'S');

        doc.setFontSize(9);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(isRed ? 180 : 0, isRed ? 40 : 0, isRed ? 40 : 0);
        doc.text(label, boxX + 2, bY + 4);
        doc.text(value, boxX + boxW - 2, bY + 4, { align: 'right' });

        bY += rowH;
    };

    // Label diversa a seconda della modalità
    const grossLabel = pricingMode === 'lump_sum' ? "Importo Lordo (A CORPO):" : "Totale Articoli (lordo):";
    drawTotalRow(grossLabel, EUR(totals.grossTotal), false, false, false);

    if (totals.discount > 0) {
        drawTotalRow("Sconto applicato:", "- " + EUR(totals.discount), false, true, false);
    }

    drawTotalRow("Imponibile Netto:", EUR(totals.subtotal), true, false, true);
    drawTotalRow(`IVA (${totals.vatRate}%):`, EUR(totals.vatAmount), false, false, false);

    // TOTALE LAVORAZIONE (bigger row)
    checkPageBreak(rowH + 5);
    doc.setFillColor(...LIGHT_GRAY_BG);
    doc.rect(boxX, bY, boxW, rowH + 1, 'F');
    doc.rect(boxX, bY, boxW, rowH + 1, 'S');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text("TOTALE LAVORAZIONE:", boxX + 2, bY + 5);
    doc.text(EUR(totals.total), boxX + boxW - 2, bY + 5, { align: 'right' });
    bY += rowH + 5;

    // ---- PAYMENT BREAKDOWN BOX ----
    const payTerms = form.querySelector('[name="paymentTerms"]').value || '';
    const payBoxH = 28;
    checkPageBreak(payBoxH + 5);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, bY, contentW, payBoxH, 'S');

    // Title 
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text("Modalità di pagamento dettagliate:", marginL + 2, bY + 5);
    const ptW = doc.getTextWidth("Modalità di pagamento dettagliate:");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.15);
    doc.line(marginL + 2, bY + 5.5, marginL + 2 + ptW, bY + 5.5);

    // Payment text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(payTerms, marginL + 2, bY + 10);

    // Dashed separator
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginL + 1, bY + 14, marginR - 1, bY + 14);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0, 0, 0);

    // Title rate breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Ripartizione Rate (Stima su Totale Lavorazione):", marginL + 2, bY + 18);

    // Parse percentages
    const matches = payTerms.match(/(\d+)\s*%/g);
    if (matches) {
        let xPos = marginL + 2;
        matches.forEach(match => {
            const perc = parseInt(match);
            const amount = totals.total * (perc / 100);
            const cellW = 38;
            const cellH = 6;

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.15);
            doc.rect(xPos, bY + 20, cellW, cellH, 'S');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...BLACK);
            doc.text(`${perc}% = ${EUR(amount)}`, xPos + 2, bY + 24);

            xPos += cellW + 3;
        });
    }

    bY += payBoxH + 5;

    // Company footer info (pagina 1)
    drawPageFooter(doc, marginL, marginR, pageW, DARK_BLUE, GRAY);

    // ==========================================
    //   PAGE 2 - CONDIZIONI GENERALI
    // ==========================================
    doc.addPage();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK_BLUE);
    doc.text("CONDIZIONI GENERALI DI CONTRATTO", pageW / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Rif. Offerta N. ${offerNo}`, pageW / 2, 26, { align: 'center' });

    // Separator
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.3);
    doc.line(marginL, 30, marginR, 30);

    // ---- ARTICLES IN 2 COLUMNS ----
    const colL = marginL;
    const colR = 110;
    const colW = 82;
    let artY = 38;

    const drawArticle = (x, y, title, lines) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...DARK_BLUE);
        doc.text(title, x, y);
        // Underline
        const tw = doc.getTextWidth(title);
        doc.setDrawColor(...DARK_BLUE);
        doc.setLineWidth(0.1);
        doc.line(x, y + 0.5, x + tw, y + 0.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        let lineY = y + 4;
        lines.forEach(line => {
            const splitLines = doc.splitTextToSize(line, colW);
            splitLines.forEach(sl => {
                doc.text(sl, x, lineY);
                lineY += 3.5;
            });
        });
        return lineY;
    };

    // LEFT COLUMN
    drawArticle(colL, artY, "ART. 1 - DEFINIZIONE DEL BENE/SERVIZIO", [
        "1.1. Il servizio/lavoro oggetto del contratto è descritto in modo preciso nel preventivo.",
        "1.2. Il Cliente non può modificare le specifiche pattuite senza accordo scritto."
    ]);

    drawArticle(colL, artY + 20, "ART. 2 - ESECUZIONE E CONSEGNA", [
        "2.1. Il lavoro sarà eseguito a regola d'arte secondo le normative vigenti."
    ]);

    drawArticle(colL, artY + 32, "ART. 3 - MODALITA' DI UTILIZZO", [
        "3.1. Il Cliente si impegna a fornire accesso ai locali per l'esecuzione dei lavori."
    ]);

    drawArticle(colL, artY + 44, "ART. 4 - LUOGO DI ESECUZIONE", [
        "4.1. I lavori saranno eseguiti nel cantiere indicato nell'ordine."
    ]);

    // RIGHT COLUMN
    drawArticle(colR, artY, "ART. 5 - DURATA", [
        "5.1. La durata dei lavori è specificata nell'ordine a titolo indicativo.",
        "5.2. Cause di forza maggiore possono prorogare il termine di consegna."
    ]);

    drawArticle(colR, artY + 20, "ART. 6 - TRASPORTO", [
        "6.1. Il costo del trasporto materiali è incluso nel prezzo salvo diverso accordo."
    ]);

    drawArticle(colR, artY + 32, "ART. 7 - PREZZI E PAGAMENTI", [
        "7.1. I prezzi si intendono IVA esclusa."
    ]);

    drawArticle(colR, artY + 44, "ART. 8 - TRATTAMENTO DATI (GDPR)", [
        "8.1. I dati personali sono trattati ai sensi del Reg. UE 679/2016 per l'esecuzione del contratto."
    ]);

    // ---- NOTES BOX ----
    const notesY = artY + 62;
    const notesH = 60;
    const notes = form.querySelector('[name="notes"]') ? form.querySelector('[name="notes"]').value : '';

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, notesY, contentW, notesH, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_BLUE);
    doc.text("Note:", marginL + 3, notesY + 5);

    if (notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...BLACK);
        const noteLines = doc.splitTextToSize(notes, contentW - 8);
        doc.text(noteLines, marginL + 3, notesY + 10);
    }

    // ---- LEGAL TEXT (art. 1341/1342) ----
    const legalY = notesY + notesH + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const legalText = "Ai sensi e per gli effetti degli artt. 1341 e 1342 c.c., il Cliente dichiara di approvare specificamente le clausole contenute negli articoli: Art. 2 (Esecuzione), Art. 5 (Durata), Art. 7 (Pagamenti e Interessi), Art. 11 (Risoluzione), Art. 12 (Foro Competente).";
    const legalLines = doc.splitTextToSize(legalText, contentW);
    doc.text(legalLines, marginL, legalY);

    // ---- ACCEPTANCE SECTION ----
    const accY = legalY + 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TIMBRO E FIRMA PER ACCETTAZIONE", 150, accY, { align: 'center' });

    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(130, accY + 15, marginR, accY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Luogo e Data: ____________________", marginL, accY + 15);

    // ---- FOOTER PAGE 2 ----
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.2);
    doc.line(marginL, 278, marginR, 278);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_BLUE);
    doc.text(`DESIGN & CREATION di Nicola Guerra - Pagina 2`, pageW / 2, 283, { align: 'center' });

    // ---- OPEN PDF ----
    const pdfData = doc.output('bloburi');
    window.open(pdfData, '_blank');
}
