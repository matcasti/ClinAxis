/* ============================================================
   ClinAxis — History 360° Module
   ============================================================ */

const History360Module = (() => {

  let _selectedPatient = null;
  let _patients = [];
  let _pendingEvSorted = [];
  let _pendingInstruments = [];
  let _pendingVitals = [];
  let _lastContainer = null;

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
    _lastContainer = container;

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
      <div class="tabs " id="h360-tabs">
        <button class="tab active" onclick="History360Module._tab(this,'h360-timeline')">
          ${Utils.icon.evaluations} Cronología
        </button>
        <button class="tab" onclick="History360Module._tab(this,'h360-evals')">
          ${Utils.icon.evaluations} Evaluaciones (${evaluations.length})
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
      <div id="h360-timeline" class="h360-panel">
        ${_buildTimeline(evaluations, notes, vitals, goals, reminders)}
      </div>
      <div id="h360-evals" class="h360-panel hidden">
        ${_buildEvaluations(evSorted, instruments)}
      </div>
      <div id="h360-evolution" class="h360-panel hidden">
        ${_buildEvolutionPlaceholder(evSorted, instruments, vitals)}
      </div>
      <div id="h360-notes" class="h360-panel hidden">
        ${_buildNotes(notes)}
      </div>
      <div id="h360-goals" class="h360-panel hidden">
        ${_buildGoals(goals)}
      </div>
      <div id="h360-meds" class="h360-panel hidden">
        ${_buildMeds(medications)}
      </div>
      <div id="h360-vitals" class="h360-panel hidden">
        ${_buildVitalsSummary(vitals)}
      </div>
    `;

    // Draw evolution charts after DOM ready
    _pendingEvSorted = evSorted;
    _pendingInstruments = instruments;
    _pendingVitals = vitals;
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
    document.querySelectorAll('.h360-panel').forEach(d => d.classList.add('hidden'));
    document.getElementById(panelId)?.classList.remove('hidden');
    // Draw evolution charts lazily — canvas must be visible (non-zero dimensions) for Chart.js
    if (panelId === 'h360-evolution') {
      setTimeout(() => {
        if (_pendingEvSorted.length) _drawEvolutionCharts(_pendingEvSorted, _pendingInstruments);
        _drawVitalsEvolution(_pendingVitals);
      }, 50);
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

  /* ── Evolution placeholder: score + campos individuales + vitales ── */
  function _buildEvolutionPlaceholder(evSorted, instruments, vitals) {
    const VITAL_LABELS = { sbp:'PAS (mmHg)', dbp:'PAD (mmHg)', hr:'FC (lpm)', spo2:'SpO₂ (%)', temp:'Temp (°C)', rr:'FR (rpm)', weight:'Peso (kg)', glucose:'Glucosa (mg/dL)' };

    // Recopila instrumentos con puntuación o campos numéricos
    const instMap = {};
    evSorted.forEach(ev => {
      (ev.instruments||[]).forEach(ir => {
        const inst = instruments.find(i => i.id === ir.instrumentId);
        if (!inst) return;
        const numFields = (inst.fields||[]).filter(f => ['number','slider','likert','select'].includes(f.type));
        const hasScore = inst.scoring?.type && inst.scoring.type !== 'none';
        if (!hasScore && !numFields.length) return;
        if (!instMap[inst.id]) instMap[inst.id] = { name: ir.instrumentName, count: 0, inst, hasScore, numFields };
        instMap[inst.id].count++;
      });
    });

    const usedVitalKeys = Object.keys(VITAL_LABELS).filter(k =>
      (vitals||[]).some(v => v.values?.[k] !== undefined && v.values?.[k] !== '')
    );

    if (!Object.keys(instMap).length && !usedVitalKeys.length) {
      return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin datos de instrumentos ni signos vitales para graficar</p></div>';
    }

    const instHtml = Object.entries(instMap).map(([, { name, count, inst, hasScore, numFields }], ci) => `
      <div class="card mb-4 chart-card">
        <div class="card-header">
          <h4 class="card-title">${name}</h4>
          <span class="badge badge-neutral">${count} medición(es)</span>
        </div>
        ${hasScore ? `<div class="chart-wrap" style="height:190px"><canvas id="h360-chart-${ci}"></canvas></div>` : ''}
        ${numFields.length ? `
          <div style="padding:0.5rem 1rem 1rem${hasScore ? ';border-top:1px solid var(--border)' : ''}">
            ${hasScore ? `<div class="text-xs fw-600 text-muted mb-2" style="text-transform:uppercase;letter-spacing:.04em">Campos individuales</div>` : ''}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem">
              ${numFields.map((f, fi) => `
                <div>
                  <div class="text-xs fw-600 text-muted mb-1">${Utils.escapeHtml(f.name)}</div>
                  <div class="chart-wrap" style="height:110px"><canvas id="h360-field-${ci}-${fi}"></canvas></div>
                </div>`).join('')}
            </div>
          </div>` : ''}
      </div>`).join('');

    const vitalsHtml = usedVitalKeys.length ? `
      <div class="card mb-4 chart-card">
        <div class="card-header">
          <h4 class="card-title">${Utils.icon.vitals} Signos Vitales</h4>
          <span class="badge badge-neutral">${(vitals||[]).length} registro(s)</span>
        </div>
        <div style="padding:0.5rem 1rem 1rem">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem">
            ${usedVitalKeys.map(k => `
              <div>
                <div class="text-xs fw-600 text-muted mb-1">${VITAL_LABELS[k]}</div>
                <div class="chart-wrap" style="height:110px"><canvas id="h360-vital-${k}"></canvas></div>
              </div>`).join('')}
          </div>
        </div>
      </div>` : '';

    return instHtml + vitalsHtml;
  }

  function _drawEvolutionCharts(evSorted, instruments) {
    const instMap = {};
    evSorted.forEach(ev => {
      (ev.instruments||[]).forEach(ir => {
        const inst = instruments.find(i => i.id === ir.instrumentId);
        if (!inst) return;
        const numFields = (inst.fields||[]).filter(f => ['number','slider','likert','select'].includes(f.type));
        const hasScore = inst.scoring?.type && inst.scoring.type !== 'none';
        if (!hasScore && !numFields.length) return;
        if (!instMap[inst.id]) instMap[inst.id] = { name: ir.instrumentName, inst, hasScore, numFields, pts: [], fieldPts: {} };
        if (hasScore) {
          const score = Utils.calcInstrumentScore(inst, ir.values);
          if (score !== null) instMap[inst.id].pts.push({ date: ev.date, score });
        }
        numFields.forEach(f => {
          const val = Utils.getNumericValue(f, ir.values?.[f.id]);
          if (val !== null) {
            if (!instMap[inst.id].fieldPts[f.id]) instMap[inst.id].fieldPts[f.id] = [];
            instMap[inst.id].fieldPts[f.id].push({ date: ev.date, val });
          }
        });
      });
    });

    Object.values(instMap).forEach(({ name, inst, hasScore, numFields, pts, fieldPts }, ci) => {
      // Gráfico de puntuación total
      if (hasScore && pts.length >= 1) {
        const cid = `h360-chart-${ci}`;
        if (document.getElementById(cid)) {
          const trend = pts.length >= 2 ? Utils.getTrend(pts.map(p => p.score), inst.scoring?.direction||'higher_better') : null;
          const color = trend === 'better' ? '#10B981' : trend === 'worse' ? '#EF4444' : '#3B82F6';
          Charts.line(cid, pts.map(p => Utils.formatDateShort(p.date)),
            [{ label: name, data: pts.map(p => p.score), borderColor: color, backgroundColor: color+'22', tension: 0.3, fill: true }]
          );
        }
      }
      // Mini gráficos por campo
      numFields.forEach((f, fi) => {
        const fPts = fieldPts[f.id];
        if (!fPts?.length) return;
        const cid = `h360-field-${ci}-${fi}`;
        if (!document.getElementById(cid)) return;
        Charts.mini(cid, {
          labels: fPts.map(p => Utils.formatDateShort(p.date)),
          data: fPts.map(p => p.val),
          direction: f.direction || inst.scoring?.direction || 'neutral',
        });
      });
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
          <div class="flex gap-1 mt-3">
            <button class="btn btn-ghost btn-sm" onclick="History360Module._editNote('${n.id}')">
              ${Utils.icon.edit} Editar
            </button>
            <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="History360Module._deleteFromH360('notes','${n.id}','nota')">
              ${Utils.icon.trash}
            </button>
          </div>
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
          <div class="flex-between text-xs text-muted mb-3">
            <span>Plazo: ${Utils.formatDate(g.targetDate)}</span>
            <span>${g.progress||0}%</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="History360Module._editGoal('${g.id}')">
              ${Utils.icon.edit} Editar
            </button>
            <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="History360Module._deleteFromH360('goals','${g.id}','meta')">
              ${Utils.icon.trash}
            </button>
          </div>
        </div>
      </div>`).join('') + '</div>';
  }

  /* ── Medications ── */
  function _buildMeds(medications) {
    if (!medications.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin medicamentos registrados</p></div>';
    const today = Utils.todayISO();
    return '<div class="card"><table class="table"><thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Inicio</th><th>Fin</th><th>Estado</th><th></th></tr></thead><tbody>' +
      medications.map(m => {
        const active = !m.endDate || m.endDate >= today;
        return `<tr>
          <td><strong>${m.name}</strong>${m.prescriber?`<div class="text-xs text-muted">${m.prescriber}</div>`:''}</td>
          <td>${m.dose||'—'}</td>
          <td>${m.frequency||'—'}</td>
          <td>${Utils.formatDate(m.startDate)}</td>
          <td>${m.endDate ? Utils.formatDate(m.endDate) : '—'}</td>
          <td><span class="badge badge-${active?'success':'neutral'}">${active?'Activo':'Finalizado'}</span></td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-icon btn-sm" onclick="History360Module._editMed('${m.id}')" title="Editar">${Utils.icon.edit}</button>
              <button class="btn btn-icon btn-danger btn-sm" onclick="History360Module._deleteFromH360('medications','${m.id}','medicamento')" title="Eliminar">${Utils.icon.trash}</button>
            </div>
          </td>
        </tr>`;
      }).join('') + '</tbody></table></div>';
  }

  /* ── Vitals summary ── */
  function _buildVitalsSummary(vitals) {
    if (!vitals.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin signos vitales registrados</p></div>';
    const sorted = [...vitals].sort((a,b) => b.datetime.localeCompare(a.datetime));
    return '<div class="card"><table class="table"><thead><tr><th>Fecha</th><th>PAS</th><th>PAD</th><th>FC</th><th>SpO₂</th><th>Temp</th><th>Glucosa</th><th></th></tr></thead><tbody>' +
      sorted.slice(0,15).map(v => `<tr>
        <td>${Utils.formatDate(v.datetime.split('T')[0])}</td>
        ${['sbp','dbp','hr','spo2','temp','glucose'].map(f => `<td>${v.values?.[f]??'—'}</td>`).join('')}
        <td>
          <div class="flex gap-1">
            <button class="btn btn-icon btn-sm" onclick="History360Module._editVital('${v.id}')" title="Editar">${Utils.icon.edit}</button>
            <button class="btn btn-icon btn-danger btn-sm" onclick="History360Module._deleteFromH360('vitals','${v.id}','signo vital')" title="Eliminar">${Utils.icon.trash}</button>
          </div>
        </td>
      </tr>`).join('') + '</tbody></table></div>';
  }

  function _buildEvaluations(evals, instruments) {
    if (!evals.length) return '<div class="empty-state" style="padding:2rem"><p class="text-muted">Sin evaluaciones registradas</p></div>';
    const sorted = [...evals].sort((a,b) => b.date.localeCompare(a.date));
    return '<div class="card">' + sorted.map(ev => {
      const instChips = (ev.instruments||[]).map(id => {
        const inst = instruments.find(i => i.id === id.instrumentId);
        const score = inst ? Utils.calcInstrumentScore(inst, id.values) : null;
        const scoreStr = score !== null ? `: <strong>${score}</strong>` : '';
        return `<span class="chip">${id.instrumentName}${scoreStr}</span>`;
      }).join('');
      return `
        <div class="timeline-item">
          <div class="timeline-dot dot-primary"></div>
          <div class="timeline-content" style="flex:1">
            <div class="flex-between">
              <div>
                <div class="timeline-title">${ev.title||'Evaluación'}</div>
                <div class="timeline-meta">${Utils.formatDate(ev.date)} · ${(ev.instruments||[]).length} instrumento(s)</div>
                ${instChips ? `<div class="chips mt-1">${instChips}</div>` : ''}
                ${ev.notes ? `<div class="text-xs text-muted mt-1">${Utils.truncate(ev.notes,80)}</div>` : ''}
              </div>
              <div class="flex gap-1" style="flex-shrink:0;margin-left:.75rem">
                <button class="btn btn-ghost btn-sm" onclick="History360Module._editEval('${ev.id}')">
                  ${Utils.icon.edit} Editar
                </button>
                <button class="btn btn-icon btn-danger btn-sm" onclick="History360Module._deleteFromH360('evaluations','${ev.id}','evaluación')">
                  ${Utils.icon.trash}
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('') + '</div>';
  }

  function _h360Refresh() {
    if (_lastContainer) renderPatient(_lastContainer);
  }

  async function _deleteFromH360(store, id, label) {
    const ok = await Utils.confirm(`¿Eliminar esta ${label}?`, 'Esta acción no se puede deshacer.');
    if (!ok) return;
    await DB.del(store, id);
    Utils.toast(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminada`, 'info');
    _h360Refresh();
  }

  function _editNote(id)  { NotesModule.openForm(id, _h360Refresh); }
  function _editGoal(id)  { GoalsModule.openForm(id, _h360Refresh); }
  function _editMed(id)   { MedicationsModule.openForm(id, _h360Refresh); }
  function _editVital(id) { VitalsModule.openForm(id, _h360Refresh); }
  function _editEval(id)  { EvaluationsModule.openForm(id, _h360Refresh); }
  
  function _drawVitalsEvolution(vitals) {
    if (!vitals?.length) return;
    const VITAL_DIRECTION = { sbp:'neutral', dbp:'neutral', hr:'neutral', spo2:'higher_better', temp:'neutral', rr:'neutral', weight:'neutral', glucose:'lower_better' };
    const sorted = [...vitals].sort((a,b) => a.datetime.localeCompare(b.datetime));
    Object.keys(VITAL_DIRECTION).forEach(key => {
      const cid = `h360-vital-${key}`;
      if (!document.getElementById(cid)) return;
      const pts = sorted
        .filter(v => v.values?.[key] !== undefined && v.values?.[key] !== '')
        .map(v => ({ date: v.datetime.split('T')[0], val: parseFloat(v.values[key]) }));
      if (!pts.length) return;
      Charts.mini(cid, {
        labels: pts.map(p => Utils.formatDateShort(p.date)),
        data: pts.map(p => p.val),
        direction: VITAL_DIRECTION[key],
      });
    });
  }

  return { render, openForPatient, _tab,
           _editNote, _editGoal, _editMed, _editVital, _editEval,
           _deleteFromH360 };
})();
