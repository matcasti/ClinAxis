/* ============================================================
   ClinAxis — History 360° Module
   ============================================================ */

const History360Module = (() => {

  let _selectedPatient = null;
  let _patients = [];
  let _pendingEvSorted = [];
  let _pendingInstruments = [];

  /* Punto de entrada desde tarjeta de paciente */
  function openForPatient(id) {
    _selectedPatient = id;
    App.navigateTo('history360');
  }

  async function render(container) {
    _patients = await DB.getAll('patients');

    document.getElementById('topbar-actions').innerHTML = `
      <div class="search-box">
        ${Utils.icon.patients}
        <select class="form-select" id="h360-patient-sel" style="padding-left:2.25rem;min-width:240px">
          <option value="">— Seleccionar paciente —</option>
          ${_patients.map(p => `
            <option value="${p.id}" ${_selectedPatient === p.id ? 'selected' : ''}>
              ${Utils.patientLabel(p)}
            </option>`).join('')}
        </select>
      </div>`;

    document.getElementById('h360-patient-sel')
      .addEventListener('change', e => {
        _selectedPatient = e.target.value;
        renderPatient(container);
      });

    renderPatient(container);
  }

  async function renderPatient(container) {
    Charts.destroyAll();

    if (!_selectedPatient) {
      container.innerHTML = `
        <div class="empty-state">
          ${Utils.icon.patients}
          <h3>Selecciona un paciente</h3>
          <p>Vista longitudinal completa del historial clínico</p>
        </div>`;
      return;
    }

    const [p, templates, evaluations, notes, vitals, goals, medications, instruments, remindersRaw] =
    await Promise.all([
      DB.get('patients',          _selectedPatient),
      DB.getAll('templates'),
      DB.getByIndex('evaluations','patientId', _selectedPatient),
      DB.getByIndex('notes',      'patientId', _selectedPatient),
      DB.getByIndex('vitals',     'patientId', _selectedPatient),
      DB.getByIndex('goals',      'patientId', _selectedPatient),
      DB.getByIndex('medications','patientId', _selectedPatient),
      DB.getAll('instruments'),
      DB.getAll('reminders'),
    ]);
  const reminders = remindersRaw.filter(r => r.patientId === _selectedPatient);

    if (!p) { container.innerHTML = '<p class="text-muted p-4">Paciente no encontrado</p>'; return; }

    const tpl      = templates.find(t => t.id === p.templateId);
    const pName    = Utils.patientLabel(p);
    const age      = Utils.calcAge(p.fields?.f3 || p.fields?.fecha_nacimiento || p.fields?.['Fecha de Nacimiento']);
    const evSorted = [...evaluations].sort((a, b) => a.date.localeCompare(b.date));
    const activeGoals = goals.filter(g => g.status === 'Activo');

    // Active medications count
    const activeMeds = medications.filter(m => !m.endDate || m.endDate >= Utils.todayISO());

    document.getElementById('page-subtitle').textContent = `Historia clínica · ${pName}`;

    container.innerHTML = `
      <!-- Patient header card -->
      <div class="card mb-4">
        <div class="card-body" style="padding:1.25rem">
          <div class="flex gap-4 items-center flex-wrap">
            <div class="patient-avatar" style="width:56px;height:56px;font-size:1.2rem;flex-shrink:0">
              ${Utils.initials(pName)}
            </div>
            <div style="flex:1;min-width:0">
              <h2 style="margin:0;font-size:1.2rem">${pName}</h2>
              <div class="text-sm text-muted mt-1">
                ${age ? `${age} años · ` : ''}${tpl ? tpl.name : 'Sin plantilla'}
                ${p.fields?.['RUT / DNI'] || p.fields?.f5 ? ` · ${p.fields['RUT / DNI'] || p.fields.f5}` : ''}
              </div>
              <div class="flex gap-2 mt-2 flex-wrap">
                ${p.fields?.['Diagnóstico Principal'] || p.fields?.f10
                  ? `<span class="chip">${Utils.truncate(p.fields['Diagnóstico Principal'] || p.fields.f10, 60)}</span>` : ''}
              </div>
            </div>
            <!-- Quick stats -->
            <div class="flex gap-3 flex-wrap">
              ${_statPill(evaluations.length, 'Evaluaciones', 'primary')}
              ${_statPill(notes.length,       'Notas',        'accent')}
              ${_statPill(activeGoals.length, 'Metas activas','success')}
              ${_statPill(activeMeds.length,  'Medicamentos', 'neutral')}
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm"
                onclick="App.navigateTo('evaluations')">
                ${Utils.icon.plus} Evaluación
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs mb-0" id="h360-tabs">
        <button class="tab active" onclick="History360Module._tab(this,'h360-timeline')">
          ${Utils.icon.evaluations} Cronología
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-evolution')">
          ${Utils.icon.monitoring} Evolución
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-notes')">
          ${Utils.icon.notes} Notas (${notes.length})
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-goals')">
          ${Utils.icon.goals} Metas (${goals.length})
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-meds')">
          💊 Medicamentos (${medications.length})
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-vitals')">
          ${Utils.icon.vitals} Vitales (${vitals.length})
        </button>
      </div>

      <!-- Tab panels -->
      <div id="h360-timeline">
        ${_buildTimeline(evaluations, notes, vitals, goals, reminders)}
      </div>
      <div id="h360-evolution" class="hidden">
        ${_buildEvolutionPlaceholder(evSorted, instruments)}
      </div>
      <div id="h360-notes" class="hidden">
        ${_buildNotes(notes)}
      </div>
      <div id="h360-goals" class="hidden">
        ${_buildGoals(goals)}
      </div>
      <div id="h360-meds" class="hidden">
        ${_buildMeds(medications)}
      </div>
      <div id="h360-vitals" class="hidden">
        ${_buildVitalsSummary(vitals)}
      </div>
    `;

    // Draw evolution charts after DOM ready
    _pendingEvSorted = evSorted;
    _pendingInstruments = instruments;
  }

  /* ── Helpers UI ── */
  function _statPill(value, label, color) {
    const colors = { primary: 'var(--primary)', accent: 'var(--accent)', success: 'var(--success)', neutral: 'var(--text-3)' };
    return `
      <div class="text-center" style="min-width:56px">
        <div class="fw-700" style="font-size:1.3rem;font-family:var(--font-display);color:${colors[color]}">${value}</div>
        <div class="text-xs text-muted">${label}</div>
      </div>`;
  }

  function _tab(btn, panelId) {
    document.querySelectorAll('#h360-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('[id^="h360-"]:not(#h360-tabs)').forEach(d => d.classList.add('hidden'));
    document.getElementById(panelId)?.classList.remove('hidden');
    // Draw evolution charts lazily — canvas must be visible (non-zero dimensions) for Chart.js
    if (panelId === 'h360-evolution' && _pendingEvSorted.length) {
      setTimeout(() => _drawEvolutionCharts(_pendingEvSorted, _pendingInstruments), 50);
    }
  }

  /* ── Timeline ── */
  function _buildTimeline(evals, notes, vitals, goals, reminders) {
    const events = [
      ...evals.map(e     => ({ date: e.date,                                                              icon: 'dot-primary', label: e.title||'Evaluación',    sub: `${(e.instruments||[]).length} instrumento(s)` })),
      ...notes.map(n     => ({ date: n.date,                                                              icon: 'dot-accent',  label: n.title||'Nota',           sub: Utils.truncate(n.content,60) })),
      ...vitals.map(v    => ({ date: v.datetime.split('T')[0],                                            icon: 'dot-neutral', label: 'Signos Vitales',          sub: Object.entries(v.values||{}).map(([k,v2])=>`${k}:${v2}`).join(' · ') })),
      ...goals.map(g     => ({ date: g.createdAt?new Date(g.createdAt).toISOString().split('T')[0]:'',   icon: 'dot-primary', label: `Meta: ${Utils.truncate(g.title,40)}`, sub: `${g.progress}% · ${g.status}` })),
      ...reminders.map(r => ({ date: r.date,                                                              icon: r.completed?'dot-neutral':'dot-accent', label: r.title, sub: r.completed?'Completado':'Pendiente' })),
    ].filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));

    if (!events.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin actividad registrada</p></div>';

    let curMonth = '';
    return `<div class="card"><div style="padding:0.25rem 0.75rem">` + events.map(ev => {
      const m = ev.date.slice(0,7);
      const header = m !== curMonth
        ? `<div class="text-xs fw-600 text-muted" style="text-transform:uppercase;letter-spacing:.05em;padding:0.875rem 0 0.25rem">
             ${new Date(m+'-01T12:00:00').toLocaleString('es-ES',{month:'long',year:'numeric'})}
           </div>`
        : '';
      curMonth = m;
      return header + `
        <div class="timeline-item">
          <div class="timeline-dot ${ev.icon}"></div>
          <div class="timeline-content">
            <div class="timeline-title">${ev.label}</div>
            <div class="timeline-meta">${Utils.formatDate(ev.date)} ${ev.sub ? '· '+ev.sub : ''}</div>
          </div>
        </div>`;
    }).join('') + `</div></div>`;
  }

  /* ── Evolution charts ── */
  function _buildEvolutionPlaceholder(evSorted, instruments) {
    const instMap = {};
    evSorted.forEach(ev => {
      (ev.instruments||[]).forEach(id => {
        const inst = instruments.find(i => i.id === id.instrumentId);
        if (!inst || inst.scoring?.type === 'none') return;
        if (!instMap[inst.id]) instMap[inst.id] = { name: id.instrumentName, count: 0 };
        instMap[inst.id].count++;
      });
    });
    const keys = Object.keys(instMap);
    if (!keys.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin datos de instrumentos con puntuación</p></div>';
    return keys.map((instId, ci) =>
      `<div class="card mb-4 chart-card">
         <div class="card-header">
           <h4 class="card-title">${instMap[instId].name}</h4>
           <span class="badge badge-neutral">${instMap[instId].count} medición(es)</span>
         </div>
         <div class="chart-wrap" style="height:220px"><canvas id="h360-chart-${ci}"></canvas></div>
       </div>`
    ).join('');
  }

  function _drawEvolutionCharts(evSorted, instruments) {
    const instMap = {};
    evSorted.forEach(ev => {
      (ev.instruments||[]).forEach(id => {
        const inst = instruments.find(i => i.id === id.instrumentId);
        if (!inst || inst.scoring?.type === 'none') return;
        const score = Utils.calcInstrumentScore(inst, id.values);
        if (score === null) return;
        if (!instMap[inst.id]) instMap[inst.id] = { name: id.instrumentName, inst, pts: [] };
        instMap[inst.id].pts.push({ date: ev.date, score });
      });
    });
    Object.values(instMap).forEach(({ name, inst, pts }, ci) => {
      const canvasId = `h360-chart-${ci}`;
      if (!document.getElementById(canvasId)) return;
      const trend = pts.length >= 2
        ? Utils.getTrend(pts.map(p => p.score), inst.scoring?.direction || 'higher_better')
        : null;
      const color = trend === 'better' ? '#10B981' : trend === 'worse' ? '#EF4444' : '#3B82F6';
      Charts.line(canvasId,
        pts.map(p => Utils.formatDateShort(p.date)),
        [{ label: name, data: pts.map(p => p.score), borderColor: color, backgroundColor: color+'22', tension: 0.3, fill: true }]
      );
    });
  }

  /* ── Notes ── */
  function _buildNotes(notes) {
    if (!notes.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin notas registradas</p></div>';
    const sorted = [...notes].sort((a,b) => b.createdAt - a.createdAt);
    return '<div class="grid-2">' + sorted.map(n => `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="fw-600">${Utils.truncate(n.title||'Sin título',45)}</div>
            <div class="text-xs text-muted">${Utils.formatDate(n.date)}${n.type?' · '+n.type:''}</div>
          </div>
          ${n.type ? `<span class="badge badge-neutral text-xs">${n.type}</span>` : ''}
        </div>
        <div class="card-body">
          <p class="text-sm">${Utils.truncate(n.content||'',120)}</p>
          ${(n.tags||[]).length ? `<div class="chips mt-2">${n.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div>` : ''}
        </div>
      </div>`).join('') + '</div>';
  }

  /* ── Goals ── */
  function _buildGoals(goals) {
    if (!goals.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin metas registradas</p></div>';
    const statusColor = { Activo:'primary', Logrado:'success', Parcial:'warning', Abandonado:'danger' };
    return '<div class="grid-2">' + goals.map(g => `
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-2">
            <span class="badge badge-${statusColor[g.status]||'neutral'}">${g.status}</span>
            <span class="badge badge-${g.priority==='Alta'?'danger':g.priority==='Media'?'warning':'neutral'} text-xs">${g.priority||'—'}</span>
          </div>
          <div class="fw-600 text-sm mb-1">${Utils.truncate(g.title,60)}</div>
          ${g.measure ? `<div class="text-xs text-muted mb-2">Criterio: ${g.measure}</div>` : ''}
          <div class="progress-bar mb-1"><div class="progress-fill" style="width:${g.progress||0}%;background:${(g.progress||0)>=100?'var(--success)':(g.progress||0)>50?'var(--warning)':'var(--primary)'}"></div></div>
          <div class="flex-between text-xs text-muted">
            <span>Plazo: ${Utils.formatDate(g.targetDate)}</span>
            <span>${g.progress||0}%</span>
          </div>
        </div>
      </div>`).join('') + '</div>';
  }

  /* ── Medications ── */
  function _buildMeds(medications) {
    if (!medications.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin medicamentos registrados</p></div>';
    const today = Utils.todayISO();
    return '<div class="card"><table class="table"><thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead><tbody>' +
      medications.map(m => {
        const active = !m.endDate || m.endDate >= today;
        return `<tr>
          <td><strong>${m.name}</strong>${m.prescriber?`<div class="text-xs text-muted">${m.prescriber}</div>`:''}</td>
          <td>${m.dose||'—'}</td>
          <td>${m.frequency||'—'}</td>
          <td>${Utils.formatDate(m.startDate)}</td>
          <td>${m.endDate ? Utils.formatDate(m.endDate) : '—'}</td>
          <td><span class="badge badge-${active?'success':'neutral'}">${active?'Activo':'Finalizado'}</span></td>
        </tr>`;
      }).join('') + '</tbody></table></div>';
  }

  /* ── Vitals summary ── */
  function _buildVitalsSummary(vitals) {
    if (!vitals.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin signos vitales registrados</p></div>';
    const sorted = [...vitals].sort((a,b) => b.datetime.localeCompare(a.datetime));
    return '<div class="card"><table class="table"><thead><tr><th>Fecha</th><th>PAS</th><th>PAD</th><th>FC</th><th>SpO₂</th><th>Temp</th><th>Glucosa</th></tr></thead><tbody>' +
      sorted.slice(0,15).map(v => `<tr>
        <td>${Utils.formatDate(v.datetime.split('T')[0])}</td>
        ${['sbp','dbp','hr','spo2','temp','glucose'].map(f => `<td>${v.values?.[f]??'—'}</td>`).join('')}
      </tr>`).join('') + '</tbody></table></div>';
  }

  return { render, openForPatient, _tab };
})();
