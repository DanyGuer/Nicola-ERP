// Sales Logic - Full Rewrite with Professional PDF, Chapters, Catalog & Quick Actions

let salesOffers = [];
let salesClients = [];
let salesProducts = [];
let currentItems = [];
let loadedLogo = null; // base64 logo from upload
let defaultLogo = null; // base64 logo loaded from server
let salesCurrentStatusFilter = 'ALL';

const DEFAULT_LEGAL_TERMS = `ART. 1 - DEFINIZIONE DEL BENE/SERVIZIO
1.1. Il servizio/lavoro oggetto del contratto è descritto in modo preciso nel preventivo.
1.2. Il Cliente non può modificare le specifiche pattuite senza accordo scritto.

ART. 2 - ESECUZIONE E CONSEGNA
2.1. Il lavoro sarà eseguito a regola d'arte secondo le normative vigenti.

ART. 3 - MODALITA' DI UTILIZZO
3.1. Il Cliente si impegna a fornire accesso ai locali per l'esecuzione dei lavori.

ART. 4 - LUOGO DI ESECUZIONE
4.1. I lavori saranno eseguiti nel cantiere indicato nell'ordine.

ART. 5 - DURATA
5.1. La durata dei lavori è specificata nell'ordine a titolo indicativo.
5.2. Cause di forza maggiore possono prorogare il termine di consegna.

ART. 6 - TRASPORTO
6.1. Il costo del trasporto materiali è incluso nel prezzo salvo diverso accordo.

ART. 7 - PREZZI E PAGAMENTI
7.1. I prezzi si intendono IVA esclusa.

ART. 8 - TRATTAMENTO DATI (GDPR)
8.1. I dati personali sono trattati ai sensi del Reg. UE 679/2016 per l'esecuzione del contratto.`;

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

        salesOffers = await offersRes.json();
        salesClients = await clientsRes.json();
        salesProducts = await productsRes.json();

        if (!defaultLogo) {
            defaultLogo = await preloadDefaultLogo();
        }

        salesPopulateCatalogSelect();
        renderSalesKpis(salesOffers);
        salesFilterList();

        const logoInput = document.getElementById('sales-logo-upload');
        if (logoInput && !logoInput.dataset.bound) {
            logoInput.dataset.bound = '1';
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

function salesPopulateCatalogSelect() {
    const sel = document.getElementById('sales-catalog-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">+ Inserisci voce da Listino...</option>';
    salesProducts.forEach(p => {
        const priceLabel = p.item_type === 'Note' ? 'Nota' : formatCurrency(p.price || 0);
        const shortDesc = (p.description || '').length > 55 ? p.description.slice(0, 55) + '...' : (p.description || '');
        sel.innerHTML += `<option value="${p.id}">[${p.item_type || 'Merce'}] ${shortDesc} (${priceLabel})</option>`;
    });
}

function renderSalesKpis(offers) {
    const bar = document.getElementById('sales-kpi-bar');
    if (!bar) return;

    const totalCount = offers.length;
    const totalValue = offers.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const pendingOffers = offers.filter(o => o.status === 'Bozza' || o.status === 'Inviata');
    const pendingValue = pendingOffers.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const acceptedOffers = offers.filter(o => o.status === 'Accettata');
    const acceptedValue = acceptedOffers.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const convRate = totalCount > 0 ? Math.round((acceptedOffers.length / totalCount) * 100) : 0;

    bar.innerHTML = `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Totale Preventivi (${totalCount})</div>
            <div class="text-lg font-bold text-slate-800 mt-1">${formatCurrency(totalValue)}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs font-bold uppercase tracking-wider text-blue-500">In Trattativa (${pendingOffers.length})</div>
            <div class="text-lg font-bold text-blue-700 mt-1">${formatCurrency(pendingValue)}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs font-bold uppercase tracking-wider text-emerald-600">Accettati (${acceptedOffers.length})</div>
            <div class="text-lg font-bold text-emerald-700 mt-1">${formatCurrency(acceptedValue)}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-xs font-bold uppercase tracking-wider text-indigo-500">Conversione</div>
            <div class="text-lg font-bold text-indigo-700 mt-1">${convRate}% <span class="text-xs font-normal text-slate-400">confermati</span></div>
        </div>
    `;
}

function salesSetStatusFilter(status) {
    salesCurrentStatusFilter = status;
    document.querySelectorAll('.sales-filter-btn').forEach(btn => {
        if (btn.dataset.status === status) {
            btn.className = 'sales-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm';
        } else {
            btn.className = 'sales-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200';
        }
    });
    salesFilterList();
}

function salesFilterList() {
    const query = (document.getElementById('sales-search-input')?.value || '').trim().toLowerCase();
    const filtered = salesOffers.filter(o => {
        const matchStatus = salesCurrentStatusFilter === 'ALL' || o.status === salesCurrentStatusFilter;
        if (!matchStatus) return false;
        if (!query) return true;
        const haystack = [
            o.client_name || '',
            o.subject || '',
            o.worksite_address || '',
            o.client_address || '',
            o.notes || ''
        ].join(' ').toLowerCase();
        return haystack.includes(query);
    });
    renderSalesList(filtered);
}

function renderSalesList(offers) {
    const container = document.getElementById('sales-list');
    if (!container) return;
    container.innerHTML = '';

    if (offers.length === 0) {
        container.innerHTML = '<div class="text-center p-10 bg-white rounded-xl border border-slate-200 text-slate-400">Nessun preventivo trovato con i filtri selezionati</div>';
        return;
    }

    const statusColors = {
        'Bozza': 'bg-slate-100 text-slate-700 border-slate-300',
        'Inviata': 'bg-blue-50 text-blue-700 border-blue-200',
        'Accettata': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Rifiutata': 'bg-red-50 text-red-700 border-red-200'
    };

    offers.forEach(offer => {
        const div = document.createElement('div');
        div.className = 'bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer';
        div.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('select')) {
                salesLoadOffer(offer);
            }
        };

        const dateFormatted = offer.date ? new Date(offer.date).toLocaleDateString('it-IT') : '-';
        const subjectHtml = offer.subject
            ? `<div class="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100"><i data-lucide="file-text" class="w-3.5 h-3.5"></i> ${offer.subject}</div>`
            : '';
        const worksiteHtml = offer.worksite_address
            ? `<span class="inline-flex items-center gap-1 text-xs text-slate-500"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${offer.worksite_address}</span>`
            : '';
        const validityHtml = offer.validity_days && Number(offer.validity_days) > 0
            ? `<span class="text-xs text-slate-400">• Valida ${offer.validity_days} gg</span>`
            : '';
        const itemsCount = (offer.items || []).filter(i => i.item_type !== 'Capitolo').length;

        const projectBtn = offer.project_id
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Cantiere Attivo</span>`
            : `<button type="button" onclick="salesCreateProjectFromOffer('${offer.id}', event)" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200" title="Crea automaticamente il Cantiere da questo preventivo"><i data-lucide="hard-hat" class="w-3.5 h-3.5"></i> Apri Cantiere</button>`;

        div.innerHTML = `
            <div class="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="font-bold text-lg text-slate-800">${offer.client_name}</h3>
                        <span class="text-xs text-slate-400">del ${dateFormatted} ${validityHtml}</span>
                    </div>
                    ${subjectHtml}
                    <div class="mt-1.5 flex flex-wrap items-center gap-3">
                        ${worksiteHtml}
                        <span class="text-xs text-slate-400">${itemsCount} voci</span>
                        ${offer.pricing_mode === 'lump_sum' ? '<span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">A Corpo</span>' : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <select onchange="salesChangeStatus('${offer.id}', this.value, event)"
                        class="px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${statusColors[offer.status] || statusColors['Bozza']}">
                        <option value="Bozza" ${offer.status === 'Bozza' ? 'selected' : ''}>Bozza</option>
                        <option value="Inviata" ${offer.status === 'Inviata' ? 'selected' : ''}>Inviata</option>
                        <option value="Accettata" ${offer.status === 'Accettata' ? 'selected' : ''}>Accettata</option>
                        <option value="Rifiutata" ${offer.status === 'Rifiutata' ? 'selected' : ''}>Rifiutata</option>
                    </select>
                </div>
            </div>
            <div class="flex flex-wrap justify-between items-end border-t border-slate-100 pt-3 gap-3">
                <div class="text-xs text-slate-500 space-y-0.5">
                    <div>Imponibile: <span class="font-semibold text-slate-700">${formatCurrency(offer.subtotal)}</span> · IVA (${offer.vat_rate ?? 22}%): ${formatCurrency(offer.vat_amount)}</div>
                    ${offer.discount > 0 ? `<div class="text-red-500 font-medium">Sconto applicato: -${formatCurrency(offer.discount)}</div>` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    ${projectBtn}
                    <button type="button" onclick="salesQuickDownloadPDF('${offer.id}', event)"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                        title="Scarica subito il PDF"><i data-lucide="download" class="w-3.5 h-3.5"></i> PDF</button>
                    <button type="button" onclick="salesDuplicateOffer('${offer.id}', event)"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        title="Crea una copia di questo preventivo"><i data-lucide="copy" class="w-3.5 h-3.5"></i> Duplica</button>
                    <button type="button" onclick="salesDelete('${offer.id}', event)"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50"
                        title="Elimina offerta"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    <div class="text-xl font-bold text-indigo-700 ml-2">${formatCurrency(offer.total)}</div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    lucide.createIcons();
}

async function salesChangeStatus(offerId, newStatus, e) {
    if (e) e.stopPropagation();
    try {
        const res = await fetch(`/api/offers/${offerId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            await loadSales();
        }
    } catch (err) {
        console.error(err);
        alert('Errore aggiornamento stato');
    }
}

async function salesCreateProjectFromOffer(offerId, e) {
    if (e) e.stopPropagation();
    try {
        const res = await fetch(`/api/offers/${offerId}/create-project`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            await loadSales();
            if (typeof loadProjects === 'function') loadProjects();
            alert(`Cantiere "${data.project_name || ''}" creato e collegato con successo! Lo trovi nella sezione Cantieri / Progetti.`);
        } else {
            alert(data.error || 'Errore creazione cantiere');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di connessione');
    }
}

function salesDuplicateOffer(offerId, e) {
    if (e) e.stopPropagation();
    const offer = salesOffers.find(o => o.id === offerId);
    if (!offer) return;
    salesLoadOffer(offer, true);
}

function salesDuplicateCurrent() {
    const form = document.getElementById('sales-form');
    form.querySelector('[name="id"]').value = '';
    form.querySelector('[name="date"]').valueAsDate = new Date();
    const subjInput = document.getElementById('sales-subject');
    if (subjInput && subjInput.value && !subjInput.value.includes('(Copia)')) {
        subjInput.value = subjInput.value + ' (Copia)';
    }
    const statusSel = document.getElementById('sales-status-select');
    if (statusSel) statusSel.value = 'Bozza';
    const titleEl = document.getElementById('sales-modal-title');
    if (titleEl) titleEl.innerText = 'Nuova Offerta (Duplicata)';
    const dupBtn = document.getElementById('sales-btn-duplicate-modal');
    if (dupBtn) dupBtn.classList.add('hidden');
    currentItems = currentItems.map(item => ({
        ...item,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6)
    }));
    renderSalesItems();
}

function salesQuickDownloadPDF(offerId, e) {
    if (e) e.stopPropagation();
    const offer = salesOffers.find(o => o.id === offerId);
    if (!offer) return;
    salesLoadOffer(offer, false);
    salesGeneratePDF(true);
    salesCloseModal();
}

// ---- QUICK CLIENT CREATION ----

function salesToggleQuickClient() {
    const box = document.getElementById('sales-quick-client-box');
    if (!box) return;
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
        document.getElementById('sqc-name')?.focus();
    }
}

async function salesSaveQuickClient() {
    const name = (document.getElementById('sqc-name')?.value || '').trim();
    const address = (document.getElementById('sqc-address')?.value || '').trim();
    const vat = (document.getElementById('sqc-vat')?.value || '').trim();
    const phoneOrEmail = (document.getElementById('sqc-phone')?.value || '').trim();

    if (!name) {
        alert('Inserisci almeno il Nome o la Ragione Sociale del cliente.');
        return;
    }

    const isEmail = phoneOrEmail.includes('@');
    const payload = {
        type: vat && /^\d{11}$/.test(vat) ? 'company' : 'private',
        name: name,
        vat: vat,
        cf: vat,
        address: address || '-',
        email: isEmail ? phoneOrEmail : '',
        phone: !isEmail ? phoneOrEmail : ''
    };

    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.id) {
            const clientsRes = await fetch('/api/clients');
            salesClients = await clientsRes.json();
            const select = document.getElementById('sales-client-select');
            select.innerHTML = '<option value="">-- Seleziona --</option>';
            salesClients.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
            select.value = data.id;
            salesSelectClient();

            // Clear and hide quick box
            document.getElementById('sqc-name').value = '';
            document.getElementById('sqc-address').value = '';
            document.getElementById('sqc-vat').value = '';
            document.getElementById('sqc-phone').value = '';
            document.getElementById('sales-quick-client-box').classList.add('hidden');

            // Auto-fill worksite address if empty
            const wsInput = document.getElementById('sales-worksite-address');
            if (wsInput && !wsInput.value && address) {
                wsInput.value = address;
            }
        } else {
            alert('Errore salvataggio cliente rapido');
        }
    } catch (err) {
        console.error(err);
        alert('Errore di connessione');
    }
}

function salesCopyClientAddress() {
    const id = document.getElementById('sales-client-select').value;
    const client = salesClients.find(c => c.id === id);
    if (!client || !client.address) {
        alert('Seleziona prima un cliente con indirizzo valido.');
        return;
    }
    const ws = document.getElementById('sales-worksite-address');
    if (ws) ws.value = client.address;
}

function salesSetField(fieldName, value) {
    const el = document.querySelector(`#sales-form [name="${fieldName}"]`);
    if (el) el.value = value;
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

function salesVatSelectChanged() {
    const sel = document.getElementById('sales-vat-select');
    const input = document.getElementById('sales-vat-rate');
    if (!sel || !input) return;
    if (sel.value !== 'custom') {
        input.value = sel.value;
    } else {
        input.focus();
        input.select();
    }
    salesCalcTotals();
}

function salesVatInputChanged() {
    const sel = document.getElementById('sales-vat-select');
    const input = document.getElementById('sales-vat-rate');
    if (!sel || !input) return;
    const val = input.value.trim();
    if (['22', '10', '4', '0'].includes(val)) {
        sel.value = val;
    } else {
        sel.value = 'custom';
    }
    salesCalcTotals();
}

function salesGetVatRate() {
    const input = document.getElementById('sales-vat-rate');
    if (!input) return 22;
    const val = input.value.trim();
    if (val === '') return 22;
    const num = parseFloat(val);
    return isNaN(num) ? 22 : num;
}

function salesOpenModal() {
    const form = document.getElementById('sales-form');
    form.reset();
    form.querySelector('[name="id"]').value = '';
    currentItems = [];
    loadedLogo = null;

    const titleEl = document.getElementById('sales-modal-title');
    if (titleEl) titleEl.innerText = 'Nuova Offerta';
    const dupBtn = document.getElementById('sales-btn-duplicate-modal');
    if (dupBtn) dupBtn.classList.add('hidden');
    const quickClientBox = document.getElementById('sales-quick-client-box');
    if (quickClientBox) quickClientBox.classList.add('hidden');

    form.querySelector('[name="date"]').valueAsDate = new Date();
    const subjInput = document.getElementById('sales-subject');
    if (subjInput) subjInput.value = '';
    const valDays = document.getElementById('sales-validity-days');
    if (valDays) valDays.value = '30';
    const statusSel = document.getElementById('sales-status-select');
    if (statusSel) statusSel.value = 'Bozza';

    document.getElementById('sales-discount').value = 0;
    const discType = document.getElementById('sales-discount-type');
    if (discType) discType.value = 'eur';

    const vatInput = document.getElementById('sales-vat-rate');
    if (vatInput) vatInput.value = 22;
    const vatSel = document.getElementById('sales-vat-select');
    if (vatSel) vatSel.value = '22';

    const legalArea = form.querySelector('[name="legalTerms"]');
    if (legalArea && !legalArea.value.trim()) {
        legalArea.value = DEFAULT_LEGAL_TERMS;
    }

    const itemizedRadio = form.querySelector('[name="pricingMode"][value="itemized"]');
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

    salesPopulateCatalogSelect();
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
        document.getElementById('sales-client-address').innerText = client.address || '-';
        document.getElementById('sales-client-vat').innerText = (client.vat || client.cf || '-');
        document.getElementById('sales-client-email').innerText = client.email || '-';
    } else {
        document.getElementById('sales-client-address').innerText = '-';
        document.getElementById('sales-client-vat').innerText = '-';
        document.getElementById('sales-client-email').innerText = '-';
    }
}

// ---- ITEMS, CHAPTERS & CATALOG ----

function salesCreateEmptyItem(type = 'Merce') {
    return {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        itemType: type,
        description: '',
        unit: type === 'Capitolo' ? '' : 'corpo',
        quantity: type === 'Capitolo' ? 0 : 1,
        unitPrice: 0,
        total: 0
    };
}

function salesAddItem() {
    currentItems.push(salesCreateEmptyItem('Merce'));
    renderSalesItems();
}

function salesAddSectionHeader() {
    currentItems.push(salesCreateEmptyItem('Capitolo'));
    renderSalesItems();
}

function salesInsertItem(index) {
    const safeIndex = Math.max(0, Math.min(index, currentItems.length));
    currentItems.splice(safeIndex, 0, salesCreateEmptyItem('Merce'));
    renderSalesItems();
}

function salesDuplicateRow(index) {
    const orig = currentItems[index];
    if (!orig) return;
    const copy = {
        ...orig,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6)
    };
    currentItems.splice(index + 1, 0, copy);
    renderSalesItems();
}

function salesMoveItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;
    const temp = currentItems[index];
    currentItems[index] = currentItems[targetIndex];
    currentItems[targetIndex] = temp;
    renderSalesItems();
}

function salesAddFromCatalog(productId) {
    if (!productId) return;
    const prod = salesProducts.find(p => p.id === productId);
    if (!prod) return;
    const isNote = prod.item_type === 'Note';
    currentItems.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        productId: prod.id,
        itemType: prod.item_type || 'Merce',
        description: prod.description || '',
        unit: prod.unit || 'corpo',
        quantity: 1,
        unitPrice: isNote ? 0 : (parseFloat(prod.price) || 0),
        total: isNote ? 0 : (parseFloat(prod.price) || 0)
    });
    const sel = document.getElementById('sales-catalog-select');
    if (sel) sel.value = '';
    renderSalesItems();
}

async function salesSaveRowToCatalog(index) {
    const item = currentItems[index];
    if (!item || !item.description.trim()) {
        alert('Inserisci prima una descrizione nella riga da salvare nel listino.');
        return;
    }
    const payload = {
        item_type: item.itemType === 'Note' ? 'Note' : 'Merce',
        description: item.description.trim(),
        unit: item.unit || 'corpo',
        price: item.itemType === 'Note' ? 0 : (parseFloat(item.unitPrice) || 0)
    };
    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const productsRes = await fetch('/api/products');
            salesProducts = await productsRes.json();
            salesPopulateCatalogSelect();
            if (typeof loadInventory === 'function') loadInventory();
            alert('Voce salvata in "Articoli & Listini"!');
        }
    } catch (e) {
        console.error(e);
        alert('Errore salvataggio nel listino');
    }
}

function salesAutoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(34, textarea.scrollHeight) + 'px';
}

function renderSalesItems() {
    const tbody = document.getElementById('sales-items-body');
    tbody.innerHTML = '';
    const isLumpSum = salesGetPricingMode() === 'lump_sum';

    currentItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        const isNote = item.itemType === 'Note';
        const isChapter = item.itemType === 'Capitolo';
        const disablePrice = isLumpSum || isNote || isChapter;

        tr.className = isChapter ? 'sales-item-row sales-chapter-row bg-amber-50/70' : 'sales-item-row';

        const unitInput = isChapter
            ? `<input type="text" class="w-full border p-1.5 text-sm rounded text-center bg-slate-100 text-slate-300 cursor-not-allowed" value="—" readonly tabindex="-1">`
            : `<input type="text" list="sales-units-list" oninput="salesUpdateItem(${index}, 'unit', this.value)" class="w-full border p-1.5 text-sm rounded text-center bg-white" value="${String(item.unit || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;

        const qtyInput = isChapter
            ? `<input type="text" class="w-full border p-1.5 text-sm rounded text-right bg-slate-100 text-slate-300 cursor-not-allowed" value="—" readonly tabindex="-1">`
            : `<input type="number" step="0.5" oninput="salesUpdateItem(${index}, 'quantity', parseFloat(this.value) || 0)" class="w-full border p-1.5 text-sm rounded text-right bg-white" value="${item.quantity}">`;

        const priceInput = disablePrice
            ? `<input type="number" step="0.01" class="w-full border p-1.5 text-sm rounded text-right bg-slate-100 text-slate-400 cursor-not-allowed" value="${isNote || isChapter ? 0 : item.unitPrice}" readonly tabindex="-1">`
            : `<input type="number" step="0.01" oninput="salesUpdateItem(${index}, 'unitPrice', parseFloat(this.value) || 0)" class="w-full border p-1.5 text-sm rounded text-right bg-white" value="${item.unitPrice}">`;

        const totalCell = disablePrice
            ? `<span id="sales-item-total-${index}" class="text-slate-300 text-xs italic">—</span>`
            : `<span id="sales-item-total-${index}">${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</span>`;

        const merceSelected = item.itemType === 'Merce' || (!isNote && !isChapter) ? 'selected' : '';
        const noteSelected = isNote ? 'selected' : '';
        const chapterSelected = isChapter ? 'selected' : '';
        const escapedDesc = String(item.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        tr.innerHTML = `
            <td class="cell-type px-2 py-2 align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Tipologia</span>
                <select onchange="salesUpdateItemType(${index}, this.value)" class="w-full border p-1.5 text-xs font-medium rounded bg-white ${isChapter ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : ''}">
                    <option value="Merce" ${merceSelected}>Merce</option>
                    <option value="Note" ${noteSelected}>Nota</option>
                    <option value="Capitolo" ${chapterSelected}>Capitolo</option>
                </select>
            </td>
            <td class="cell-desc px-2 py-2 align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">${isChapter ? 'Titolo Capitolo' : 'Descrizione'}</span>
                <textarea rows="1" oninput="salesUpdateItem(${index}, 'description', this.value); salesAutoResize(this)"
                    placeholder="${isChapter ? 'Es. 1. OPERE DI DEMOLIZIONE E SMALTIMENTO...' : 'Descrizione lavorazione o fornitura...'}"
                    class="sales-desc-textarea w-full border p-1.5 text-sm rounded resize-none overflow-hidden leading-snug bg-white ${isChapter ? 'font-bold text-slate-900 bg-amber-50/50 border-amber-300' : ''}">${escapedDesc}</textarea>
            </td>
            <td class="cell-unit px-2 py-2 align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Unità</span>
                ${unitInput}
            </td>
            <td class="cell-qty px-2 py-2 align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Q.tà</span>
                ${qtyInput}
            </td>
            <td class="cell-price px-2 py-2 align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Prezzo (€)</span>
                ${priceInput}
            </td>
            <td class="cell-total px-2 py-2 text-right font-medium align-top md:pt-3">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Totale Riga</span>
                ${totalCell}
            </td>
            <td class="cell-actions px-2 py-2 text-center whitespace-nowrap align-top">
                <span class="md:hidden block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Azioni Riga</span>
                <div class="inline-flex flex-wrap justify-end items-center gap-1">
                    <button type="button" onclick="salesInsertItem(${index})" title="Inserisci riga sopra"
                        class="px-1.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200">+Sopra</button>
                    <button type="button" onclick="salesInsertItem(${index + 1})" title="Inserisci riga sotto"
                        class="px-1.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200">+Sotto</button>
                    <button type="button" onclick="salesMoveItem(${index}, -1)" title="Sposta su"
                        class="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 bg-white md:bg-transparent rounded border md:border-0 border-slate-200" ${index === 0 ? 'disabled' : ''}>
                        <i data-lucide="arrow-up" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="salesMoveItem(${index}, 1)" title="Sposta giù"
                        class="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 bg-white md:bg-transparent rounded border md:border-0 border-slate-200" ${index === currentItems.length - 1 ? 'disabled' : ''}>
                        <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="salesDuplicateRow(${index})" title="Duplica questa riga"
                        class="p-1.5 text-slate-500 hover:text-indigo-600 bg-white md:bg-transparent rounded border md:border-0 border-slate-200">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="salesSaveRowToCatalog(${index})" title="Salva voce in Articoli & Listini"
                        class="p-1.5 text-slate-500 hover:text-emerald-600 bg-white md:bg-transparent rounded border md:border-0 border-slate-200">
                        <i data-lucide="bookmark-plus" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="salesRemoveItem(${index})" title="Elimina riga"
                        class="p-1.5 text-red-500 hover:text-red-700 bg-white md:bg-transparent rounded border md:border-0 border-red-100">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.sales-desc-textarea').forEach(ta => salesAutoResize(ta));
    lucide.createIcons();
    salesCalcTotals();
}

function salesUpdateItemType(index, type) {
    currentItems[index].itemType = type;
    if (type === 'Note' || type === 'Capitolo') {
        currentItems[index].unitPrice = 0;
        currentItems[index].total = 0;
        if (type === 'Capitolo') {
            currentItems[index].unit = '';
            currentItems[index].quantity = 0;
        }
    }
    renderSalesItems();
}

function salesUpdateItem(index, field, value) {
    currentItems[index][field] = value;
    currentItems[index].total = (currentItems[index].quantity || 0) * (currentItems[index].unitPrice || 0);
    const totalEl = document.getElementById(`sales-item-total-${index}`);
    if (totalEl && salesGetPricingMode() !== 'lump_sum' && currentItems[index].itemType === 'Merce') {
        totalEl.innerText = formatCurrency(currentItems[index].total);
    }
    salesCalcTotals();
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
        grossTotal = parseFloat(document.getElementById('sales-lump-sum-amount').value) || 0;
    } else {
        grossTotal = currentItems
            .filter(item => item.itemType !== 'Note' && item.itemType !== 'Capitolo')
            .reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    }

    const discountInputVal = parseFloat(document.getElementById('sales-discount').value) || 0;
    const discountType = document.getElementById('sales-discount-type')?.value || 'eur';
    const discount = discountType === 'perc'
        ? Math.round((grossTotal * (discountInputVal / 100)) * 100) / 100
        : discountInputVal;

    const subtotal = Math.max(0, grossTotal - discount);
    const vatRate = salesGetVatRate();
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    document.getElementById('sales-gross-total').innerText = formatCurrency(grossTotal);
    document.getElementById('sales-discount-display').innerText = discountType === 'perc' && discountInputVal > 0
        ? `- ${formatCurrency(discount)} (${discountInputVal}%)`
        : `- ${formatCurrency(discount)}`;
    document.getElementById('sales-subtotal').innerText = formatCurrency(subtotal);
    document.getElementById('sales-vat-amount').innerText = formatCurrency(vatAmount);
    document.getElementById('sales-total').innerText = formatCurrency(total);

    return {
        grossTotal,
        discount,
        discountType,
        discountValue: discountInputVal,
        subtotal,
        vatRate,
        vatAmount,
        total,
        pricingMode: mode
    };
}

// ---- SAVE ----

async function salesSave() {
    const clientId = document.getElementById('sales-client-select').value;
    if (!clientId) { alert('Seleziona un cliente'); return; }

    const client = salesClients.find(c => c.id === clientId);
    const totals = salesCalcTotals();
    const form = document.getElementById('sales-form');
    const pricingMode = totals.pricingMode;
    const statusSel = document.getElementById('sales-status-select');

    const offer = {
        id: form.querySelector('[name="id"]').value || null,
        clientId: client.id,
        clientName: client.name,
        clientAddress: client.address,
        clientVatOrCf: client.vat || client.cf,
        date: form.querySelector('[name="date"]').value,
        subject: form.querySelector('[name="subject"]') ? form.querySelector('[name="subject"]').value : '',
        validityDays: form.querySelector('[name="validityDays"]') ? parseInt(form.querySelector('[name="validityDays"]').value || '30') : 30,
        executionTime: form.querySelector('[name="executionTime"]').value,
        worksiteAddress: form.querySelector('[name="worksiteAddress"]').value,
        items: currentItems,
        lumpSumAmount: pricingMode === 'lump_sum' ? totals.grossTotal : null,
        discount: totals.discount,
        discountType: totals.discountType,
        discountValue: totals.discountValue,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        total: totals.total,
        paymentMethod: form.querySelector('[name="paymentMethod"]').value,
        paymentTerms: form.querySelector('[name="paymentTerms"]').value,
        legalTerms: form.querySelector('[name="legalTerms"]') ? form.querySelector('[name="legalTerms"]').value : '',
        notes: form.querySelector('[name="notes"]') ? form.querySelector('[name="notes"]').value : '',
        status: statusSel ? statusSel.value : 'Bozza',
        pricingMode: pricingMode,
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

function salesLoadOffer(offer, isDuplicate = false) {
    salesOpenModal();
    const form = document.getElementById('sales-form');
    form.querySelector('[name="id"]').value = isDuplicate ? '' : offer.id;
    form.querySelector('[name="date"]').value = isDuplicate ? new Date().toISOString().slice(0, 10) : offer.date;
    document.getElementById('sales-client-select').value = offer.client_id;
    salesSelectClient();

    const titleEl = document.getElementById('sales-modal-title');
    if (titleEl) {
        titleEl.innerText = isDuplicate ? 'Duplica Offerta (Nuova Copia)' : `Modifica Offerta - ${offer.client_name}`;
    }
    const dupBtn = document.getElementById('sales-btn-duplicate-modal');
    if (dupBtn) {
        if (isDuplicate) dupBtn.classList.add('hidden');
        else dupBtn.classList.remove('hidden');
    }

    const subjInput = document.getElementById('sales-subject');
    if (subjInput) {
        const baseSubj = offer.subject || '';
        subjInput.value = isDuplicate && baseSubj ? `${baseSubj} (Copia)` : baseSubj;
    }

    const valDays = document.getElementById('sales-validity-days');
    if (valDays) valDays.value = String(offer.validity_days !== undefined && offer.validity_days !== null ? offer.validity_days : 30);

    const statusSel = document.getElementById('sales-status-select');
    if (statusSel) statusSel.value = isDuplicate ? 'Bozza' : (offer.status || 'Bozza');

    form.querySelector('[name="worksiteAddress"]').value = offer.worksite_address || '';
    form.querySelector('[name="executionTime"]').value = offer.execution_time || '';
    form.querySelector('[name="paymentMethod"]').value = offer.payment_method || 'Bonifico Bancario';
    form.querySelector('[name="paymentTerms"]').value = offer.payment_terms || '';

    if (form.querySelector('[name="legalTerms"]')) {
        form.querySelector('[name="legalTerms"]').value = offer.legal_terms || DEFAULT_LEGAL_TERMS;
    }
    if (form.querySelector('[name="notes"]')) {
        form.querySelector('[name="notes"]').value = offer.notes || '';
    }

    const discType = document.getElementById('sales-discount-type');
    if (discType) discType.value = offer.discount_type || 'eur';
    document.getElementById('sales-discount').value = (offer.discount_type === 'perc' && offer.discount_value) ? offer.discount_value : (offer.discount || 0);

    const savedVatRate = (offer.vat_rate !== null && offer.vat_rate !== undefined) ? offer.vat_rate : 22;
    const vatInput = document.getElementById('sales-vat-rate');
    if (vatInput) vatInput.value = savedVatRate;
    const vatSel = document.getElementById('sales-vat-select');
    if (vatSel) {
        const strVal = String(savedVatRate);
        if (['22', '10', '4', '0'].includes(strVal)) {
            vatSel.value = strVal;
        } else {
            vatSel.value = 'custom';
        }
    }

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

    currentItems = (offer.items || []).map(i => ({
        ...i,
        id: isDuplicate ? (Date.now().toString() + Math.random().toString(36).slice(2, 6)) : i.id,
        itemType: i.item_type || 'Merce',
        quantity: i.quantity,
        unitPrice: i.unit_price
    }));

    loadedLogo = offer.custom_logo_url;
    renderSalesItems();
    salesCalcTotals();
}

// =============================================
//   PROFESSIONAL PDF GENERATION (2 PAGES)
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

function salesParseLegalArticles(rawText) {
    const text = (rawText || DEFAULT_LEGAL_TERMS).trim();
    const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const articles = [];
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;
        if (/^ART\.?\s*\d+/i.test(lines[0]) || lines.length > 1) {
            articles.push({
                title: lines[0],
                lines: lines.slice(1)
            });
        } else {
            articles.push({
                title: '',
                lines: [lines[0]]
            });
        }
    });
    return articles;
}

function salesGeneratePDF(download = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const clientId = document.getElementById('sales-client-select').value;
    if (!clientId) { alert("Seleziona prima un cliente."); return; }

    const client = salesClients.find(c => c.id === clientId);
    const form = document.getElementById('sales-form');
    const totals = salesCalcTotals();

    const rawDate = form.querySelector('[name="date"]').value;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');
    const subject = (form.querySelector('[name="subject"]')?.value || '').trim();
    const validityDays = parseInt(form.querySelector('[name="validityDays"]')?.value || '30');

    const pageW = 210;
    const marginL = 15;
    const marginR = 195;
    const contentW = marginR - marginL;

    const DARK_BLUE = [40, 80, 120];
    const BLACK = [0, 0, 0];
    const GRAY = [120, 120, 120];
    const LIGHT_GRAY_BG = [245, 245, 245];
    const CHAPTER_BG = [232, 240, 248];

    // ==========================================
    //   PAGE 1 - OFFERTA
    // ==========================================

    const logoData = loadedLogo || defaultLogo;
    if (logoData) {
        try { doc.addImage(logoData, 'PNG', marginL, 8, 35, 28); } catch (e) { console.warn('Logo err', e); }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARK_BLUE);
    doc.text('OFFERTA', marginR, 17, { align: 'right' });

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Del ${dateStr}`, marginR, 23, { align: 'right' });

    if (validityDays > 0) {
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY);
        doc.text(`Validità offerta: ${validityDays} giorni`, marginR, 28, { align: 'right' });
    }

    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.4);
    doc.line(marginL, 38, marginR, 38);

    // ---- CLIENT INFO ----
    let y = 45;
    const labelX = marginL;
    const valueX = 38;

    const drawClientLine = (label, value, yPos) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...DARK_BLUE);
        doc.text(label, labelX, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BLACK);
        doc.text(value || '', valueX, yPos);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.15);
        doc.line(valueX, yPos + 1, marginR, yPos + 1);
    };

    drawClientLine("Cliente:", client.name, y);
    drawClientLine("Indirizzo:", client.address, y + 6.5);
    drawClientLine("P.IVA/CF:", client.vat || client.cf || '', y + 13);

    if (subject) {
        drawClientLine("Oggetto:", subject, y + 19.5);
        y += 6.5;
    }

    // ---- CONDIZIONI PARTICOLARI ----
    y = y + 21;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text("CONDIZIONI PARTICOLARI:", labelX, y);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.2);
    const titleW = doc.getTextWidth("CONDIZIONI PARTICOLARI:");
    doc.line(labelX, y + 0.5, labelX + titleW, y + 0.5);

    y += 6;
    doc.setFontSize(8.5);

    const worksiteAddr = form.querySelector('[name="worksiteAddress"]').value || '-';
    const execTime = form.querySelector('[name="executionTime"]').value || '-';
    const payMethod = form.querySelector('[name="paymentMethod"]').value || '-';

    doc.setFont("helvetica", "bold");
    doc.text("a) Luogo di Esecuzione:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(worksiteAddr, 58, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("b) Tempo di Esecuzione:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(execTime, 58, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("c) Pagamento:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(payMethod, 58, y);

    // ---- TABLE SECTION ----
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("d) Oggetto del contratto", labelX, y);

    const pricingMode = salesGetPricingMode();

    let tableRows, tableHead, tableColumnStyles;
    if (pricingMode === 'lump_sum') {
        tableRows = currentItems.map(item => {
            if (item.itemType === 'Capitolo') {
                return [{ content: (item.description || '').toUpperCase(), colSpan: 3, styles: { fontStyle: 'bold', fillColor: CHAPTER_BG, textColor: DARK_BLUE } }];
            }
            return [
                item.description || '',
                item.unit || '',
                item.quantity != null ? item.quantity.toString() : ''
            ];
        });
        tableHead = [['Descrizione', 'U.M.', 'Qta']];
        tableColumnStyles = {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' }
        };
    } else {
        tableRows = currentItems.map(item => {
            if (item.itemType === 'Capitolo') {
                return [{ content: (item.description || '').toUpperCase(), colSpan: 5, styles: { fontStyle: 'bold', fillColor: CHAPTER_BG, textColor: DARK_BLUE } }];
            }
            const isNote = item.itemType === 'Note';
            return [
                item.description || '',
                item.unit || '',
                isNote ? '' : (item.quantity != null ? item.quantity.toString() : ''),
                isNote ? '' : EUR(item.unitPrice || 0),
                isNote ? '' : EUR((item.quantity || 0) * (item.unitPrice || 0))
            ];
        });
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
        startY: y + 2.5,
        head: tableHead,
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: BLACK,
            fontStyle: 'bold',
            lineColor: BLACK,
            lineWidth: 0.2,
            fontSize: 8.5
        },
        bodyStyles: {
            textColor: BLACK,
            lineColor: BLACK,
            lineWidth: 0.1,
            fontSize: 8,
            cellPadding: 1.8
        },
        columnStyles: tableColumnStyles,
        margin: { left: marginL, right: marginL }
    });

    let tableEndY = doc.lastAutoTable.finalY + 3;

    // ---- TOTALS BOX (right-aligned) ----
    const boxX = 110;
    const boxW = 85;
    const rowH = 5.5;
    let bY = tableEndY;

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

        doc.setFontSize(8.5);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(isRed ? 180 : 0, isRed ? 40 : 0, isRed ? 40 : 0);
        doc.text(label, boxX + 2, bY + 4);
        doc.text(value, boxX + boxW - 2, bY + 4, { align: 'right' });

        bY += rowH;
    };

    const grossLabel = pricingMode === 'lump_sum' ? "Importo Lordo (A CORPO):" : "Totale Articoli (lordo):";
    drawTotalRow(grossLabel, EUR(totals.grossTotal), false, false, false);

    if (totals.discount > 0) {
        const discLabel = totals.discountType === 'perc' && totals.discountValue > 0
            ? `Sconto riservato (${totals.discountValue}%):`
            : "Sconto applicato:";
        drawTotalRow(discLabel, "- " + EUR(totals.discount), false, true, false);
    }

    drawTotalRow("Imponibile Netto:", EUR(totals.subtotal), true, false, true);
    const vatLabel = totals.vatRate === 0 ? "IVA (0% - Esente):" : `IVA (${totals.vatRate}%):`;
    drawTotalRow(vatLabel, EUR(totals.vatAmount), false, false, false);

    checkPageBreak(rowH + 5);
    doc.setFillColor(...LIGHT_GRAY_BG);
    doc.rect(boxX, bY, boxW, rowH + 1, 'F');
    doc.rect(boxX, bY, boxW, rowH + 1, 'S');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text("TOTALE LAVORAZIONE:", boxX + 2, bY + 4.8);
    doc.text(EUR(totals.total), boxX + boxW - 2, bY + 4.8, { align: 'right' });
    bY += rowH + 3;

    const payTerms = form.querySelector('[name="paymentTerms"]').value || '';
    const payBoxH = 25;
    checkPageBreak(payBoxH + 3);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, bY, contentW, payBoxH, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text("Modalità di pagamento dettagliate:", marginL + 2, bY + 4.5);
    const ptW = doc.getTextWidth("Modalità di pagamento dettagliate:");
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.15);
    doc.line(marginL + 2, bY + 5, marginL + 2 + ptW, bY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(payTerms, marginL + 2, bY + 9.5);

    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginL + 1, bY + 13, marginR - 1, bY + 13);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0, 0, 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Ripartizione Rate (Stima su Totale Lavorazione):", marginL + 2, bY + 17);

    const matches = payTerms.match(/(\d+)\s*%/g);
    if (matches) {
        let xPos = marginL + 2;
        matches.forEach(match => {
            const perc = parseInt(match);
            const amount = totals.total * (perc / 100);
            const cellW = 38;
            const cellH = 5.5;

            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.15);
            doc.rect(xPos, bY + 18.5, cellW, cellH, 'S');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.8);
            doc.setTextColor(...BLACK);
            doc.text(`${perc}% = ${EUR(amount)}`, xPos + 2, bY + 22.3);

            xPos += cellW + 3;
        });
    }

    drawPageFooter(doc, marginL, marginR, pageW, DARK_BLUE, GRAY);

    // ==========================================
    //   PAGE 2 - CONDIZIONI GENERALI
    // ==========================================
    doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...DARK_BLUE);
    doc.text("CONDIZIONI GENERALI DI CONTRATTO", pageW / 2, 18, { align: 'center' });

    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.3);
    doc.line(marginL, 25, marginR, 25);

    const colL = marginL;
    const colR = 110;
    const colW = 82;
    let artY = 32;

    const drawArticle = (x, yPos, title, lines) => {
        let lineY = yPos;
        if (title) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...DARK_BLUE);
            doc.text(title, x, lineY);
            const tw = doc.getTextWidth(title);
            doc.setDrawColor(...DARK_BLUE);
            doc.setLineWidth(0.1);
            doc.line(x, lineY + 0.5, x + Math.min(tw, colW), lineY + 0.5);
            lineY += 4;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        lines.forEach(line => {
            const splitLines = doc.splitTextToSize(line, colW);
            splitLines.forEach(sl => {
                doc.text(sl, x, lineY);
                lineY += 3.4;
            });
        });
        return lineY + 3;
    };

    const rawLegal = form.querySelector('[name="legalTerms"]') ? form.querySelector('[name="legalTerms"]').value : DEFAULT_LEGAL_TERMS;
    const parsedArticles = salesParseLegalArticles(rawLegal);
    const halfIdx = Math.ceil(parsedArticles.length / 2);
    const leftArticles = parsedArticles.slice(0, halfIdx);
    const rightArticles = parsedArticles.slice(halfIdx);

    let yLeft = artY;
    leftArticles.forEach(a => {
        yLeft = drawArticle(colL, yLeft, a.title, a.lines);
    });

    let yRight = artY;
    rightArticles.forEach(a => {
        yRight = drawArticle(colR, yRight, a.title, a.lines);
    });

    // ---- NOTES BOX ----
    const notesY = Math.max(yLeft, yRight, artY + 60) + 2;
    const notesH = Math.min(58, Math.max(30, 215 - notesY));
    const notes = form.querySelector('[name="notes"]') ? form.querySelector('[name="notes"]').value : '';

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginL, notesY, contentW, notesH, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_BLUE);
    doc.text("Note e Condizioni Particolari Aggiuntive:", marginL + 3, notesY + 5);

    if (notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...BLACK);
        const noteLines = doc.splitTextToSize(notes, contentW - 6);
        doc.text(noteLines, marginL + 3, notesY + 10);
    }

    // ---- LEGAL TEXT (art. 1341/1342) ----
    const legalY = notesY + notesH + 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const legalText = "Ai sensi e per gli effetti degli artt. 1341 e 1342 c.c., il Cliente dichiara di approvare specificamente le clausole contenute negli articoli: Art. 2 (Esecuzione), Art. 5 (Durata), Art. 7 (Pagamenti e Interessi), Art. 11 (Risoluzione), Art. 12 (Foro Competente).";
    const legalLines = doc.splitTextToSize(legalText, contentW);
    doc.text(legalLines, marginL, legalY);

    // ---- ACCEPTANCE SECTION ----
    const accY = legalY + 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("TIMBRO E FIRMA PER ACCETTAZIONE", 150, accY, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(125, accY + 14, marginR, accY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Luogo e Data: ____________________", marginL, accY + 14);

    // ---- FOOTER PAGE 2 ----
    drawPageFooter(doc, marginL, marginR, pageW, DARK_BLUE, GRAY);

    // ---- DOWNLOAD OR OPEN PDF ----
    if (download) {
        const cleanClient = (client.name || 'Cliente').replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').trim().replace(/\s+/g, '_');
        const cleanDate = dateStr.replace(/\//g, '-');
        doc.save(`Offerta_${cleanClient}_${cleanDate}.pdf`);
    } else {
        const pdfData = doc.output('bloburi');
        window.open(pdfData, '_blank');
    }
}
