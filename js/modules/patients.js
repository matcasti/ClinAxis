/* ============================================================
   ClinAxis — Patients Module
   ============================================================ */

const PatientsModule = (() => {

  let _patients = [];
  let _templates = [];
  let _searchTerm = '';
  let _selectedTemplate = null;

  async function render(container) {
    [_patients, _templates] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('templates'),
    ]);
    _patients.sort((a,b) => Utils.patientLabel(a).localeCompare(Utils.patientLabel(b)));

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-patient">
        ${Utils.icon.plus} Nuevo Paciente
      </button>`;
    document.getElementById('btn-new-patient')?.addEventListener('click', openNewPatientModal);

    renderList(container);
  }

  function renderList(container) {
    const filtered = _patients.filter(p => {
      const name = Utils.patientLabel(p).toLowerCase();
      const s = _searchTerm.toLowerCase();
      return !s || name.includes(s) || (p.fields?.rut || '').toLowerCase().includes(s);
    });

    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="search-box">
          ${Utils.icon.search}
          <input type="text" id="patient-search" placeholder="Buscar pacientes…" value="${_searchTerm}">
        </div>
        <span class="text-muted text-sm">${filtered.length} paciente(s)</span>
      </div>
      ${filtered.length ? `
        <div class="grid-auto" id="patients-grid">
          ${filtered.map(p => patientCard(p)).join('')}
        </div>` : `
        <div class="empty-state">
          ${Utils.icon.patients}
          <h3>Sin pacientes</h3>
          <p>Registra tu primer paciente para comenzar</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-patient').click()">
            ${Utils.icon.plus} Nuevo Paciente
          </button>
        </div>`}
    `;

    document.getElementById('patient-search')?.addEventListener('input', Utils.debounce(e => {
      _searchTerm = e.target.value;
      renderList(container);
    }, 250));
  }

  function patientCard(p) {
    const name = Utils.patientLabel(p);
    const age = Utils.calcAge(p.fields?.fecha_nacimiento || p.fields?.f3 || p.fields?.nacimiento);
    const tpl = _templates.find(t => t.id === p.templateId);
    return `
      <div class="card patient-card" onclick="PatientsModule.openDetail('${p.id}')">
        <div class="patient-avatar">${Utils.initials(name)}</div>
        <div class="patient-info">
          <div class="patient-name">${name}</div>
          <div class="patient-meta">
            ${age ? `${age} años · ` : ''}${tpl ? tpl.name : 'Sin plantilla'}
          </div>
          <div class="patient-date text-muted text-xs">
            Registrado ${Utils.formatDate(new Date(p.createdAt).toISOString().split('T')[0])}
          </div>
        </div>
        <div class="patient-actions">
          <button class="btn btn-icon" title="Editar" onclick="event.stopPropagation(); PatientsModule.openEdit('${p.id}')">
            ${Utils.icon.edit}
          </button>
          <button class="btn btn-icon btn-danger" title="Eliminar" onclick="event.stopPropagation(); PatientsModule.deletePatient('${p.id}')">
            ${Utils.icon.trash}
          </button>
          <button class="btn btn-icon" title="Historia 360°" onclick="event.stopPropagation(); History360Module.openForPatient('${p.id}')">
            ${Utils.icon.monitoring}
          </button>
        </div>
      </div>`;
  }

  // ── Detail view ──
  async function openDetail(id) {
    const p = await DB.get('patients', id);
    if (!p) return;
    const tpl = _templates.find(t => t.id === p.templateId);
    const evals = await DB.getByIndex('evaluations', 'patientId', id);
    const notes = await DB.getByIndex('notes', 'patientId', id);
    const name = Utils.patientLabel(p);

    const fields = tpl ? tpl.fields : [];

    Utils.openLargeModal(name, `
      <div class="detail-grid mb-4">
        ${fields.map(f => {
          const val = p.fields?.[f.id];
          if (!val) return '';
          return `<div class="detail-item">
            <div class="detail-label">${f.name}</div>
            <div class="detail-value">${val}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="tabs mb-4">
        <button class="tab active" onclick="PatientsModule.switchTab(this,'tab-timeline')">Cronología</button>
        <button class="tab" onclick="PatientsModule.switchTab(this,'tab-evals')">Evaluaciones (${evals.length})</button>
        <button class="tab" onclick="PatientsModule.switchTab(this,'tab-notes')">Notas (${notes.length})</button>
      </div>
      
      <div id="tab-timeline">
        ${await buildTimeline(id, evals, notes)}
      </div>
      
      <div id="tab-evals" class="hidden">
        ${evals.length ? evals.sort((a,b)=>b.createdAt-a.createdAt).map(e => `
          <div class="timeline-item">
            <div class="timeline-dot dot-primary"></div>
            <div class="timeline-content">
              <div class="timeline-title">${e.title || 'Evaluación'}</div>
              <div class="timeline-meta">${Utils.formatDate(e.date)} · ${(e.instruments||[]).length} instrumento(s)</div>
            </div>
          </div>`).join('') : '<p class="text-muted">Sin evaluaciones</p>'}
      </div>
      
      <div id="tab-notes" class="hidden">
        ${notes.length ? notes.sort((a,b)=>b.createdAt-a.createdAt).map(n => `
          <div class="timeline-item">
            <div class="timeline-dot dot-accent"></div>
            <div class="timeline-content">
              <div class="timeline-title">${n.title || 'Nota'}</div>
              <div class="timeline-meta">${Utils.formatDate(n.date)}</div>
              <div class="text-sm mt-1">${Utils.truncate(n.content, 100)}</div>
            </div>
          </div>`).join('') : '<p class="text-muted">Sin notas</p>'}
      </div>
    `, [
      { label: 'Editar', action: () => { Utils.closeLargeModal(); openEdit(id); }},
      { label: 'Nueva Evaluación', primary: true, action: () => { Utils.closeLargeModal(); App.navigateTo('evaluations'); }},
    ]);
  }

  function switchTab(btn, tabId) {
    document.querySelectorAll('#modal-lg-body .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#modal-lg-body > div[id^="tab-"]').forEach(d => d.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');
  }

  // ── New/Edit form ──
  async function openNewPatientModal() {
    _selectedTemplate = _templates[0] || null;
    renderPatientForm(null);
  }

  async function openEdit(id) {
    const p = await DB.get('patients', id);
    if (!p) return;
    _selectedTemplate = _templates.find(t => t.id === p.templateId) || null;
    renderPatientForm(p);
  }

  function renderPatientForm(patient) {
    const tpl = _selectedTemplate;
    const fields = tpl ? tpl.fields : [];

    const body = `
      <div class="form-group mb-3">
        <label class="form-label">Plantilla de ficha</label>
        <select class="form-select" id="patient-template-sel">
          <option value="">— Sin plantilla —</option>
          ${_templates.map(t => `<option value="${t.id}" ${_selectedTemplate?.id===t.id?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div id="patient-fields">
        ${fields.map(f => Utils.renderFormField(f, patient?.fields?.[f.id] ?? '')).join('')}
      </div>`;

    Utils.openModal(patient ? 'Editar Paciente' : 'Nuevo Paciente', body, async () => {
      const tplId = document.getElementById('patient-template-sel').value;
      const selectedTpl = _templates.find(t => t.id === tplId);
      const flds = selectedTpl ? selectedTpl.fields : [];
      const fieldValues = {};
      flds.forEach(f => {
        const el = document.getElementById(`field-${f.id}`);
        if (el) fieldValues[f.id] = el.value;
      });
      const now = Date.now();
      const record = {
        id: patient?.id || Utils.uuid(),
        templateId: tplId || null,
        fields: fieldValues,
        createdAt: patient?.createdAt || now,
        updatedAt: now,
      };
      await DB.put('patients', record);
      _patients = await DB.getAll('patients');
      _patients.sort((a,b) => Utils.patientLabel(a).localeCompare(Utils.patientLabel(b)));
      Utils.closeModal();
      Utils.toast(patient ? 'Paciente actualizado' : 'Paciente registrado', 'success');
      renderList(document.getElementById('module-container'));
    });

    // Template change listener
    document.getElementById('patient-template-sel')?.addEventListener('change', e => {
      _selectedTemplate = _templates.find(t => t.id === e.target.value) || null;
      const flds = _selectedTemplate ? _selectedTemplate.fields : [];
      document.getElementById('patient-fields').innerHTML =
        flds.map(f => Utils.renderFormField(f, '')).join('');
      flds.forEach(f => {
        const el = document.getElementById(`field-${f.id}`);
        if (el && patient?.fields?.[f.id]) el.value = patient.fields[f.id];
      });
    });
  }

  async function deletePatient(id) {
    const p = await DB.get('patients', id);
    const name = Utils.patientLabel(p);
    const ok = await Utils.confirm(`¿Eliminar a ${name}?`, 'Esta acción no se puede deshacer. Se eliminarán también sus evaluaciones y notas.');
    if (!ok) return;
    const evals = await DB.getByIndex('evaluations', 'patientId', id);
    const notes = await DB.getByIndex('notes', 'patientId', id);
    await DB.del('patients', id);
    for (const e of evals) await DB.del('evaluations', e.id);
    for (const n of notes) await DB.del('notes', n.id);
    _patients = await DB.getAll('patients');
    _patients.sort((a,b) => Utils.patientLabel(a).localeCompare(Utils.patientLabel(b)));
    renderList(document.getElementById('module-container'));
    Utils.toastWithUndo(`Paciente "${name}" eliminado`, async () => {
      await DB.put('patients', p);
      for (const e of evals) await DB.put('evaluations', e);
      for (const n of notes) await DB.put('notes', n);
      _patients = await DB.getAll('patients');
      _patients.sort((a,b) => Utils.patientLabel(a).localeCompare(Utils.patientLabel(b)));
      renderList(document.getElementById('module-container'));
    });
  }
  
  async function buildTimeline(patientId, evals, notes) {
    // Merge all events
    const vitals = (await DB.getAll('vitals')).filter(v => v.patientId === patientId);
    const goals  = (await DB.getAll('goals')).filter(g => g.patientId === patientId);
    const rems   = (await DB.getAll('reminders')).filter(r => r.patientId === patientId);
  
    const events = [
      ...evals.map(e => ({ date: e.date, type: 'eval', icon: 'dot-primary', label: e.title||'Evaluación', sub: `${(e.instruments||[]).length} instrumento(s)` })),
      ...notes.map(n => ({ date: n.date, type: 'note', icon: 'dot-accent', label: n.title||'Nota', sub: Utils.truncate(n.content,60) })),
      ...vitals.map(v => ({ date: v.datetime?.split('T')[0]||'', type: 'vital', icon: 'dot-neutral', label: 'Signos vitales', sub: Object.entries(v.values||{}).map(([k,v2])=>k+': '+v2).join(' · ') })),
      ...goals.map(g => ({ date: g.createdAt ? new Date(g.createdAt).toISOString().split('T')[0] : '', type: 'goal', icon: 'dot-primary', label: 'Meta: '+g.title, sub: `${g.progress}% — ${g.status}` })),
      ...rems.map(r => ({ date: r.date, type: 'reminder', icon: r.completed?'dot-neutral':'dot-accent', label: r.title, sub: r.completed?'Completado':'Recordatorio' })),
    ].filter(e => e.date).sort((a,b) => b.date.localeCompare(a.date));
  
    if (!events.length) return '<p class="text-muted">Sin actividad registrada</p>';
  
    let currentMonth = '';
    return events.map(ev => {
      const month = ev.date.slice(0,7);
      const monthHeader = month !== currentMonth
        ? `<div class="text-xs fw-600 text-muted mb-1 mt-3" style="text-transform:uppercase;letter-spacing:.05em">${new Date(month+'-01T12:00:00').toLocaleString('es-ES',{month:'long',year:'numeric'})}</div>`
        : '';
      currentMonth = month;
      return `${monthHeader}
        <div class="timeline-item">
          <div class="timeline-dot ${ev.icon}"></div>
          <div class="timeline-content">
            <div class="timeline-title">${ev.label}</div>
            <div class="timeline-meta">${Utils.formatDate(ev.date)} ${ev.sub?'· '+ev.sub:''}</div>
          </div>
        </div>`;
    }).join('');
  }

  return { render, openDetail, openEdit, deletePatient, switchTab };
})();
