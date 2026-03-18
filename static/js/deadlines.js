// Deadlines Module - Scadenziario
async function loadDeadlines() {
    try {
        const res = await fetch('/api/invoices');
        const invoices = await res.json();
        renderDeadlines(invoices);
    } catch (e) { console.error(e); }
}

function renderDeadlines(invoices) {
    const container = document.getElementById('deadlines-list');
    container.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];

    // Filter to unpaid invoices with due dates
    const deadlines = invoices
        .filter(i => i.status !== 'Pagata' && i.status !== 'Annullata')
        .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));

    if (!deadlines.length) {
        container.innerHTML = '<div class="text-center p-10 text-slate-400">Nessuna scadenza in programma</div>';
        return;
    }

    // Summary
    const overdue = deadlines.filter(d => d.due_date && d.due_date < today);
    const upcoming = deadlines.filter(d => d.due_date && d.due_date >= today);
    const totalOverdue = overdue.reduce((s, d) => s + d.total, 0);
    const totalUpcoming = upcoming.reduce((s, d) => s + d.total, 0);

    container.innerHTML += `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-red-50 p-5 rounded-xl border border-red-200">
                <div class="text-sm text-red-600 mb-1">⚠️ Scadute</div>
                <div class="text-2xl font-bold text-red-700">${overdue.length}</div>
                <div class="text-sm text-red-500">${formatCurrency(totalOverdue)}</div>
            </div>
            <div class="bg-amber-50 p-5 rounded-xl border border-amber-200">
                <div class="text-sm text-amber-600 mb-1">⏳ In Scadenza</div>
                <div class="text-2xl font-bold text-amber-700">${upcoming.length}</div>
                <div class="text-sm text-amber-500">${formatCurrency(totalUpcoming)}</div>
            </div>
            <div class="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div class="text-sm text-slate-500 mb-1">💰 Totale da Incassare</div>
                <div class="text-2xl font-bold">${formatCurrency(totalOverdue + totalUpcoming)}</div>
            </div>
        </div>
    `;

    deadlines.forEach(d => {
        const isOverdue = d.due_date && d.due_date < today;
        const daysLeft = d.due_date ? Math.ceil((new Date(d.due_date) - new Date()) / 86400000) : null;

        let statusClass, statusText;
        if (isOverdue) { statusClass = 'border-red-300 bg-red-50'; statusText = `<span class="text-red-600 font-bold">Scaduta da ${Math.abs(daysLeft)} giorni</span>`; }
        else if (daysLeft !== null && daysLeft <= 7) { statusClass = 'border-amber-300 bg-amber-50'; statusText = `<span class="text-amber-600 font-medium">Scade tra ${daysLeft} giorni</span>`; }
        else { statusClass = 'border-slate-200 bg-white'; statusText = d.due_date ? `<span class="text-slate-500">Scade il ${new Date(d.due_date).toLocaleDateString('it-IT')}</span>` : '<span class="text-slate-400">Nessuna scadenza</span>'; }

        container.innerHTML += `
            <div class="p-5 rounded-xl border ${statusClass} flex justify-between items-center">
                <div>
                    <div class="font-bold">${d.invoice_number}</div>
                    <div class="text-sm text-slate-500">${d.client_name}</div>
                    <div class="text-xs mt-1">${statusText}</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-bold">${formatCurrency(d.total)}</div>
                    <button onclick="invChangeStatus('${d.id}','Pagata');setTimeout(loadDeadlines,500)" class="text-xs text-green-600 hover:text-green-800 underline mt-1">✓ Segna Pagata</button>
                </div>
            </div>
        `;
    });
}
