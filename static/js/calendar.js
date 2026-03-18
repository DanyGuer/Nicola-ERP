// Calendar Module
let calClients = [];
let calProjects = [];

async function loadCalendar() {
    try {
        const [evRes, cRes, pRes] = await Promise.all([fetch('/api/events'), fetch('/api/clients'), fetch('/api/projects')]);
        const events = await evRes.json();
        calClients = await cRes.json();
        calProjects = await pRes.json();
        renderCalendar(events);
    } catch (e) { console.error(e); }
}

function renderCalendar(events) {
    const container = document.getElementById('cal-list');
    container.innerHTML = '';
    if (!events.length) { container.innerHTML = '<div class="text-center p-10 text-slate-400">Nessun evento</div>'; return; }

    const typeIcons = { 'Appuntamento': 'calendar', 'Sopralluogo': 'search', 'Consegna': 'truck', 'Scadenza': 'clock', 'Altro': 'star' };
    const typeColors = { 'Appuntamento': 'bg-blue-100 text-blue-700 border-blue-200', 'Sopralluogo': 'bg-amber-100 text-amber-700 border-amber-200', 'Consegna': 'bg-green-100 text-green-700 border-green-200', 'Scadenza': 'bg-red-100 text-red-700 border-red-200', 'Altro': 'bg-slate-100 text-slate-700 border-slate-200' };

    // Group by date
    const grouped = {};
    events.forEach(e => { (grouped[e.date] = grouped[e.date] || []).push(e); });

    const today = new Date().toISOString().split('T')[0];

    Object.keys(grouped).sort().forEach(date => {
        const isPast = date < today;
        const isToday = date === today;

        container.innerHTML += `<div class="text-sm font-bold ${isToday ? 'text-indigo-600' : isPast ? 'text-slate-400' : 'text-slate-700'} mt-4 mb-2">${isToday ? '📍 OGGI - ' : ''}${new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>`;

        grouped[date].forEach(ev => {
            container.innerHTML += `
                <div class="flex items-center gap-4 p-4 bg-white rounded-xl border ${typeColors[ev.type] || 'border-slate-200'} ${ev.completed ? 'opacity-50' : ''} cursor-pointer hover:shadow-sm transition-shadow" onclick="calEdit(${JSON.stringify(ev).replace(/"/g, '&quot;')})">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[ev.type] || 'bg-slate-100'}"><i data-lucide="${typeIcons[ev.type] || 'star'}" class="w-5 h-5"></i></div>
                    <div class="flex-1">
                        <div class="font-medium ${ev.completed ? 'line-through' : ''}">${ev.title}</div>
                        <div class="text-xs text-slate-400">${ev.time || ''} ${ev.client_name ? '· ' + ev.client_name : ''} ${ev.project_name ? '· 🏗️ ' + ev.project_name : ''}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="event.stopPropagation();calToggle('${ev.id}')" class="text-xs ${ev.completed ? 'text-green-600' : 'text-slate-400'} hover:text-green-700">${ev.completed ? '✓ Fatto' : '○ Da fare'}</button>
                        <button onclick="event.stopPropagation();calDelete('${ev.id}')" class="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                </div>
            `;
        });
    });
    lucide.createIcons();
}

function calOpenModal() {
    document.getElementById('cal-form').reset();
    document.querySelector('#cal-form [name="id"]').value = '';
    document.querySelector('#cal-form [name="date"]').valueAsDate = new Date();

    const cSel = document.getElementById('cal-client-select');
    cSel.innerHTML = '<option value="">-- Nessuno --</option>';
    calClients.forEach(c => { cSel.innerHTML += `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`; });

    const pSel = document.getElementById('cal-project-select');
    pSel.innerHTML = '<option value="">-- Nessuno --</option>';
    calProjects.forEach(p => { pSel.innerHTML += `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`; });

    document.getElementById('cal-modal').classList.remove('hidden');
    lucide.createIcons();
}
function calCloseModal() { document.getElementById('cal-modal').classList.add('hidden'); }

function calEdit(ev) {
    calOpenModal();
    const form = document.getElementById('cal-form');
    form.querySelector('[name="id"]').value = ev.id;
    form.querySelector('[name="title"]').value = ev.title;
    form.querySelector('[name="date"]').value = ev.date;
    form.querySelector('[name="time"]').value = ev.time || '';
    form.querySelector('[name="type"]').value = ev.type;
    form.querySelector('[name="description"]').value = ev.description || '';
    if (ev.client_id) document.getElementById('cal-client-select').value = ev.client_id;
    if (ev.project_id) document.getElementById('cal-project-select').value = ev.project_id;
}

async function calSave(e) {
    e.preventDefault();
    const form = document.getElementById('cal-form');
    const fd = Object.fromEntries(new FormData(form));
    const cSel = document.getElementById('cal-client-select');
    const pSel = document.getElementById('cal-project-select');
    fd.clientId = fd.clientId || null;
    fd.clientName = cSel.selectedOptions[0]?.dataset?.name || null;
    fd.projectId = fd.projectId || null;
    fd.projectName = pSel.selectedOptions[0]?.dataset?.name || null;
    try {
        await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd) });
        calCloseModal(); loadCalendar();
    } catch (e) { alert('Errore'); }
}

async function calToggle(id) {
    await fetch(`/api/events/${id}/toggle`, { method: 'PUT' });
    loadCalendar();
}

async function calDelete(id) {
    if (!confirm('Eliminare evento?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    loadCalendar();
}
