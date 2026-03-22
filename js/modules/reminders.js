/* ============================================================
   ClinAxis — Reminders Module
   ============================================================ */

const RemindersModule = (() => {

  let _reminders = [];
  let _patients = [];
  let _view = 'list'; // 'list' | 'calendar'

  const TYPES = ['Cita', 'Evaluación', 'Seguimiento', 'Medicación', 'Alta', 'Otro'];

  async function render(container) {
    [_reminders, _patients] = await Promise.all([
      DB.getAll('reminders'),
      DB.getAll('patients'),
    ]);
    _reminders.sort((a,b) => a.date.localeCompare(b.date));

    document.getElementById('topbar-actions').innerHTML = `
      <div class="toggle-group mr-2">
        <button class="toggle-btn ${_view==='list'?'active':''}" onclick="RemindersModule.setView('list')">Lista</button>
        <button class="toggle-btn ${_view==='calendar'?'active':''}" onclick="RemindersModule.setView('calendar')">Calendario</button>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-new-rem">
        ${Utils.icon.plus} Nuevo Recordatorio
      </button>`;
    document.getElementById('btn-new-rem')?.addEventListener('click', () => openForm(null));

    renderView(container);
  }

  function setView(v) {
    _view = v;
    document.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active',
        (v==='list' && b.textContent.includes('Lista')) ||
        (v==='calendar' && b.textContent.includes('Calendario')));
    });
    renderView(document.getElementById('module-container'));
  }

  function renderView(container) {
    if (_view === 'calendar') renderCalendar(container);
    else renderList(container);
  }

  // ── LIST VIEW ──
  function renderList(container) {
    const today = Utils.todayISO();
    const overdue = _reminders.filter(r => !r.completed && r.date < today);
    const upcoming = _reminders.filter(r => !r.completed && r.date >= today);
    const completed = _reminders.filter(r => r.completed);

    container.innerHTML = `
      ${overdue.length ? `
        <div class="card mb-4 border-danger">
          <div class="card-header"><h3 class="card-title text-danger">Vencidos (${overdue.length})</h3></div>
          ${overdue.map(r => reminderRow(r, true)).join('')}
        </div>` : ''}

      <div class="card mb-4">
        <div class="card-header"><h3 class="card-title">Próximos (${upcoming.length})</h3></div>
        ${upcoming.length ? upcoming.map(r => reminderRow(r, false)).join('') :
          '<div class="empty-state" style="padding:1.5rem">Sin recordatorios próximos</div>'}
      </div>

      ${completed.length ? `
        <details>
          <summary class="text-muted text-sm mb-2" style="cursor:pointer">Completados (${completed.length})</summary>
          <div class="card">
            ${completed.slice(0,20).map(r => reminderRow(r, false)).join('')}
          </div>
        </details>` : ''}
    `;
  }

  function reminderRow(r, overdue) {
    const p = _patients.find(x => x.id === r.patientId);
    const pName = p ? Utils.patientLabel(p) : '';
    const days = Utils.daysUntil(r.date);
    const daysLabel = r.completed ? 'Completado' :
      overdue ? `Venció hace ${Math.abs(days)} día(s)` :
      days === 0 ? 'Hoy' : `En ${days} día(s)`;

    return `
      <div class="timeline-item ${overdue?'overdue':''} ${r.completed?'opacity-60':''}">
        <div class="timeline-dot ${r.completed?'dot-neutral':overdue?'dot-danger':'dot-accent'}"></div>
        <div class="timeline-content" style="flex:1">
          <div class="flex-between">
            <div>
              <div class="timeline-title ${r.completed?'line-through':''}">${r.title}</div>
              <div class="timeline-meta">
                ${pName ? `${pName} · ` : ''}
                ${r.type ? `<span class="badge badge-neutral text-xs">${r.type}</span> · ` : ''}
                <span class="${overdue&&!r.completed?'text-danger':''}">${daysLabel} — ${Utils.formatDate(r.date)}</span>
              </div>
              ${r.description ? `<div class="text-xs text-muted mt-1">${Utils.truncate(r.description,80)}</div>` : ''}
            </div>
            <div class="flex gap-1">
              ${!r.completed ? `<button class="btn btn-ghost btn-sm" onclick="RemindersModule.toggleComplete('${r.id}')">${Utils.icon.check} Completar</button>` : ''}
              <button class="btn btn-icon" onclick="RemindersModule.openForm('${r.id}')">${Utils.icon.edit}</button>
              <button class="btn btn-icon btn-danger" onclick="RemindersModule.deleteReminder('${r.id}')">${Utils.icon.trash}</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── CALENDAR VIEW ──
  function renderCalendar(container) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    function drawCalendar(y, m) {
      const firstDay = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthName = new Date(y, m).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      const today = Utils.todayISO();

      const cells = [];
      for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(d);

      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <button class="btn btn-icon" onclick="RemindersModule._calNav(-1)">&#8249;</button>
            <h3 class="card-title">${monthName}</h3>
            <button class="btn btn-icon" onclick="RemindersModule._calNav(1)">&#8250;</button>
          </div>
          <div class="calendar-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
            ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-head text-center text-xs text-muted font-semibold py-1">${d}</div>`).join('')}
            ${cells.map(d => {
              if (!d) return '<div></div>';
              const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const dayRems = _reminders.filter(r => r.date === dateStr);
              const isToday = dateStr === today;
              const hasOverdue = dayRems.some(r => !r.completed && dateStr < today);
              return `
                <div class="cal-cell p-1 rounded cursor-pointer ${isToday?'cal-today':''} ${hasOverdue?'cal-overdue':''}"
                     style="min-height:64px;border:1px solid var(--border)"
                     onclick="RemindersModule._calDayClick('${dateStr}')">
                  <div class="text-xs font-semibold ${isToday?'text-primary':''}" style="text-align:right">${d}</div>
                  ${dayRems.slice(0,3).map(r => `
                    <div class="text-xs mt-0.5 truncate rounded px-1 ${r.completed?'opacity-50':''}"
                         style="background:var(--color-accent-alpha);color:var(--color-accent)">
                      ${Utils.truncate(r.title,15)}
                    </div>`).join('')}
                  ${dayRems.length > 3 ? `<div class="text-xs text-muted">+${dayRems.length-3}</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`;

      RemindersModule._calNav = (dir) => { month += dir; if (month > 11) { month=0; year++; } if (month<0) { month=11; year--; } drawCalendar(year, month); };
      RemindersModule._calDayClick = (dateStr) => openForm(null, dateStr);
    }

    drawCalendar(year, month);
  }

  // ── Form ──
  async function openForm(id, defaultDate) {
    const existing = id ? await DB.get('reminders', id) : null;
    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Título *</label>
          <input type="text" class="form-input" id="rem-title" value="${existing?.title||''}" placeholder="Ej: Cita de seguimiento">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input type="date" class="form-input" id="rem-date" value="${existing?.date||defaultDate||Utils.todayISO()}">
        </div>
      </div>
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="rem-type">
            <option value="">Sin tipo</option>
            ${TYPES.map(t => `<option value="${t}" ${existing?.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Paciente</label>
          <select class="form-select" id="rem-patient">
            <option value="">Sin paciente</option>
            ${_patients.map(p => `<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea class="form-input" id="rem-desc" rows="3">${existing?.description||''}</textarea>
      </div>`;

    Utils.openModal(existing ? 'Editar Recordatorio' : 'Nuevo Recordatorio', body, async () => {
      const title = document.getElementById('rem-title').value.trim();
      const date = document.getElementById('rem-date').value;
      if (!title || !date) { Utils.toast('Título y fecha son obligatorios', 'warning'); return false; }
      const now = Date.now();
      const record = {
        id: existing?.id || Utils.uuid(),
        patientId: document.getElementById('rem-patient').value || null,
        title,
        date,
        type: document.getElementById('rem-type').value,
        description: document.getElementById('rem-desc').value,
        completed: existing?.completed || false,
        createdAt: existing?.createdAt || now,
      };
      await DB.put('reminders', record);
      _reminders = await DB.getAll('reminders');
      _reminders.sort((a,b) => a.date.localeCompare(b.date));
      Utils.closeModal();
      Utils.toast(existing ? 'Recordatorio actualizado' : 'Recordatorio creado', 'success');
      renderView(document.getElementById('module-container'));
    });
  }

  async function toggleComplete(id) {
    const r = await DB.get('reminders', id);
    if (!r) return;
    r.completed = !r.completed;
    await DB.put('reminders', r);
    _reminders = await DB.getAll('reminders');
    _reminders.sort((a,b) => a.date.localeCompare(b.date));
    Utils.toast(r.completed ? 'Marcado como completado' : 'Reabierto', 'info');
    renderView(document.getElementById('module-container'));
  }

  async function deleteReminder(id) {
    const ok = await Utils.confirm('¿Eliminar recordatorio?', '');
    if (!ok) return;
    await DB.del('reminders', id);
    _reminders = await DB.getAll('reminders');
    _reminders.sort((a,b) => a.date.localeCompare(b.date));
    Utils.toast('Recordatorio eliminado', 'info');
    renderView(document.getElementById('module-container'));
  }

  return { render, setView, openForm, toggleComplete, deleteReminder };
})();
