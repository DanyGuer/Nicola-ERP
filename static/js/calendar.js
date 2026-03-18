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
            const evJSON = JSON.stringify(ev).replace(/"/g, '&quot;');
            container.innerHTML += `
                <div class="flex items-center gap-3 p-4 bg-white rounded-xl border ${typeColors[ev.type] || 'border-slate-200'} ${ev.completed ? 'opacity-50' : ''} cursor-pointer hover:shadow-sm transition-shadow" onclick="calEdit(${evJSON})">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeColors[ev.type] || 'bg-slate-100'}"><i data-lucide="${typeIcons[ev.type] || 'star'}" class="w-5 h-5"></i></div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium ${ev.completed ? 'line-through' : ''} truncate">${ev.title}</div>
                        <div class="text-xs text-slate-400 truncate">${ev.time || ''} ${ev.client_name ? '· ' + ev.client_name : ''} ${ev.project_name ? '· 🏗️ ' + ev.project_name : ''}</div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="event.stopPropagation();calAddToCalendar('${ev.title}','${ev.date}','${ev.time || ''}','${(ev.description || '').replace(/'/g, "\\'")}')" class="text-xs text-indigo-500 hover:text-indigo-700 p-1" title="Aggiungi al Calendario">📅</button>
                        <button onclick="event.stopPropagation();calToggle('${ev.id}')" class="text-xs ${ev.completed ? 'text-green-600' : 'text-slate-400'} hover:text-green-700 p-1">${ev.completed ? '✓' : '○'}</button>
                        <button onclick="event.stopPropagation();calDelete('${ev.id}')" class="text-xs text-red-400 hover:text-red-600 p-1">✕</button>
                    </div>
                </div>
            `;
        });
    });
    lucide.createIcons();
}

// ---- AGGIUNGI AL CALENDARIO ----

function calAddToCalendar(title, date, time, description) {
    // Mostra scelta: Google Calendar o file iCal
    const choice = confirm("Premi OK per Google Calendar\nPremi Annulla per scaricare file iCal (iPhone/Outlook)");
    if (choice) {
        calAddToGoogleCalendar(title, date, time, description);
    } else {
        calDownloadICS(title, date, time, description);
    }
}

function calAddToGoogleCalendar(title, date, time, description) {
    // Formato data per Google: YYYYMMDD o YYYYMMDDTHHmmSS
    const dateClean = date.replace(/-/g, '');
    let startStr, endStr;
    
    if (time) {
        const timeClean = time.replace(/:/g, '');
        startStr = `${dateClean}T${timeClean}00`;
        // Durata default: 1 ora
        const startDate = new Date(`${date}T${time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const endHH = String(endDate.getHours()).padStart(2, '0');
        const endMM = String(endDate.getMinutes()).padStart(2, '0');
        endStr = `${dateClean}T${endHH}${endMM}00`;
    } else {
        // Evento tutto il giorno
        startStr = dateClean;
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        endStr = nextDay.toISOString().split('T')[0].replace(/-/g, '');
    }

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(description || '')}&sf=true`;
    window.open(url, '_blank');
}

function calDownloadICS(title, date, time, description) {
    const dateClean = date.replace(/-/g, '');
    let dtStart, dtEnd;

    if (time) {
        const timeClean = time.replace(/:/g, '');
        dtStart = `${dateClean}T${timeClean}00`;
        const startDate = new Date(`${date}T${time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const endHH = String(endDate.getHours()).padStart(2, '0');
        const endMM = String(endDate.getMinutes()).padStart(2, '0');
        dtEnd = `${dateClean}T${endHH}${endMM}00`;
    } else {
        dtStart = dateClean;
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        dtEnd = nextDay.toISOString().split('T')[0].replace(/-/g, '');
    }

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MiniERP//IT',
        'BEGIN:VEVENT',
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    link.click();
}

// ---- MODAL ----

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
