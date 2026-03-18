// Reports Module
async function loadReports() {
    try {
        const res = await fetch('/api/reports/summary');
        const data = await res.json();
        renderReports(data);
    } catch (e) { console.error(e); }
}

function renderReports(data) {
    const container = document.getElementById('reports-content');

    // Conversion rate
    const convRate = data.offers.total > 0 ? ((data.offers.accepted / data.offers.total) * 100).toFixed(1) : 0;
    const margin = data.invoices.total_paid - data.expenses.total;

    container.innerHTML = `
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="text-sm text-slate-500 mb-1">Fatturato Totale</div>
                <div class="text-2xl font-bold text-green-600">${formatCurrency(data.invoices.total_invoiced)}</div>
                <div class="text-xs text-slate-400">${data.invoices.total} fatture emesse</div>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="text-sm text-slate-500 mb-1">Incassato</div>
                <div class="text-2xl font-bold text-indigo-600">${formatCurrency(data.invoices.total_paid)}</div>
                <div class="text-xs text-slate-400">${data.invoices.paid} fatture pagate</div>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="text-sm text-slate-500 mb-1">Spese Totali</div>
                <div class="text-2xl font-bold text-red-600">${formatCurrency(data.expenses.total)}</div>
            </div>
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div class="text-sm text-slate-500 mb-1">Margine Netto</div>
                <div class="text-2xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}">${formatCurrency(margin)}</div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Offerte Stats -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-semibold mb-4">📊 Offerte - Tasso di Conversione</h3>
                <div class="flex items-center gap-6">
                    <div class="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" class="w-24 h-24 transform -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" stroke-width="3"/>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" stroke-width="3" 
                                stroke-dasharray="${convRate} ${100 - convRate}" stroke-linecap="round"/>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center text-lg font-bold">${convRate}%</div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-slate-200"></div> Totali: ${data.offers.total}</div>
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-blue-400"></div> In Attesa: ${data.offers.pending}</div>
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-green-400"></div> Accettate: ${data.offers.accepted}</div>
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-indigo-600"></div> Valore: ${formatCurrency(data.offers.total_value)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Spese per Categoria -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-semibold mb-4">💰 Spese per Categoria</h3>
                <div class="space-y-3">
                    ${data.expenses.by_category.length ? data.expenses.by_category.map(c => {
        const perc = data.expenses.total > 0 ? (c.total / data.expenses.total * 100).toFixed(0) : 0;
        const colors = { 'Materiali': 'bg-blue-500', 'Trasporto': 'bg-amber-500', 'Manodopera': 'bg-green-500', 'Utenze': 'bg-purple-500', 'Attrezzatura': 'bg-cyan-500', 'Altro': 'bg-slate-500' };
        return `<div>
                            <div class="flex justify-between text-sm mb-1"><span>${c.category}</span><span class="font-medium">${formatCurrency(c.total)} (${perc}%)</span></div>
                            <div class="w-full bg-slate-100 rounded-full h-2"><div class="${colors[c.category] || 'bg-slate-500'} h-2 rounded-full" style="width:${perc}%"></div></div>
                        </div>`;
    }).join('') : '<p class="text-slate-400 text-sm">Nessuna spesa registrata</p>'}
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Fatturato Mensile -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-semibold mb-4">📈 Fatturato Mensile (Incassato)</h3>
                ${data.monthly_revenue.length ? `
                <div class="space-y-2">
                    ${data.monthly_revenue.reverse().map(m => {
        const maxRev = Math.max(...data.monthly_revenue.map(r => r.revenue));
        const perc = maxRev > 0 ? (m.revenue / maxRev * 100).toFixed(0) : 0;
        return `<div class="flex items-center gap-3">
                            <span class="text-xs text-slate-500 w-16">${m.month}</span>
                            <div class="flex-1 bg-slate-100 rounded-full h-4"><div class="bg-green-500 h-4 rounded-full flex items-center justify-end pr-2" style="width:${Math.max(perc, 8)}%"><span class="text-xs text-white font-medium">${formatCurrency(m.revenue)}</span></div></div>
                        </div>`;
    }).join('')}
                </div>` : '<p class="text-slate-400 text-sm">Nessun dato disponibile</p>'}
            </div>
            
            <!-- Top Clienti -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-semibold mb-4">🏆 Top Clienti (per valore offerte accettate)</h3>
                <div class="space-y-3">
                    ${data.top_clients.length ? data.top_clients.map((c, i) => `
                        <div class="flex items-center gap-3 py-2 border-b border-slate-50">
                            <div class="w-8 h-8 rounded-full ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center text-sm font-bold">${i + 1}</div>
                            <div class="flex-1"><div class="font-medium text-sm">${c.client_name}</div><div class="text-xs text-slate-400">${c.num_offers} offerte</div></div>
                            <div class="font-bold text-indigo-600">${formatCurrency(c.total_value)}</div>
                        </div>
                    `).join('') : '<p class="text-slate-400 text-sm">Nessun dato disponibile</p>'}
                </div>
            </div>
        </div>
    `;
}
