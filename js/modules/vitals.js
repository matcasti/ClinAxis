const VitalsModule = (() => {
  let _patients = [];
  let _vitals = [];
  let _selectedPatient = null;

  const VITAL_FIELDS = [
    { id: 'sbp',    name: 'PAS (mmHg)',   unit: 'mmHg', min: 60,  max: 250, normalMin: 90,  normalMax: 140 },
    { id: 'dbp',    name: 'PAD (mmHg)',   unit: 'mmHg', min: 40,  max: 150, normalMin: 60,  normalMax: 90  },
    { id: 'hr',     name: 'FC (lpm)',     unit: 'lpm',  min: 30,  max: 250, normalMin: 60,  normalMax: 100 },
    { id: 'spo2',   name: 'SpO₂ (%)',    unit: '%',    min: 70,  max: 100, normalMin: 95,  normalMax: 100 },
    { id: 'temp',   name: 'Temp (°C)',   unit: '°C',   min: 34,  max: 42,  normalMin: 36.0,normalMax: 37.5 },
    { id: 'rr',     name: 'FR (rpm)',    unit: 'rpm',  min: 8,   max: 60,  normalMin: 12,  normalMax: 20  },
    { id: 'weight', name: 'Peso (kg)',   unit: 'kg',   min: 1,   max: 300  },
    { id: 'glucose',name: 'Glucosa (mg/dL)', unit: 'mg/dL', min: 40, max: 600, normalMin: 70, normalMax: 110 },
  ];

  async function render(container) {
    [_patients, _vitals] = await Promise.all([
      DB.getAll('patients'), DB.getAll('vitals'),
    ]);

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-vital">
        ${Utils.icon.plus} Registrar Signos
      </button>`;
    document.getElementById('btn-new-vital')?.addEventListener('click', () => openForm(null));
    renderView(container);
  }

  function renderView(container) {
    container.innerHTML = `
      <div class="toolbar mb-4">
        <select class="form-select" id="vitals-patient-sel" style="min-width:240px">
          <option value="">— Todos los pacientes —</option>
          ${_patients.map(p => `<option value="${p.id}" ${_selectedPatient===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
        </select>
      </div>
      <div id="vitals-area"></div>`;

    document.getElementById('vitals-patient-sel').addEventListener('change', e => {
      _selectedPatient = e.target.value;
      drawVitals();
    });
    drawVitals();
  }

  function drawVitals() {
    Charts.destroyAll();
    const area = document.getElementById('vitals-area');
    const filtered = _selectedPatient
      ? _vitals.filter(v => v.patientId === _selectedPatient)
      : _vitals;
    filtered.sort((a,b) => a.datetime.localeCompare(b.datetime));

    if (!filtered.length) {
      area.innerHTML = `<div class="empty-state">${Utils.icon.monitoring}<h3>Sin signos vitales registrados</h3></div>`;
      return;
    }

    // Latest values summary
    const latest = filtered[filtered.length - 1];
    const summaryCards = VITAL_FIELDS.map(f => {
      const val = latest.values?.[f.id];
      if (!val) return '';
      const num = parseFloat(val);
      let status = 'neutral';
      if (f.normalMin !== undefined && f.normalMax !== undefined) {
        status = (num < f.normalMin || num > f.normalMax) ? 'bad' : 'good';
      }
      return `<div class="card stat-card">
        <div class="stat-body">
          <div class="stat-value" style="font-size:1.4rem">${val}</div>
          <div class="stat-label">${f.name}</div>
          <div class="stat-sub">${Utils.formatDateTime(new Date(latest.datetime).getTime())}</div>
        </div>
        <span class="badge ${status==='bad'?'badge-danger':status==='good'?'badge-success':'badge-neutral'}">${status==='bad'?'Anormal':status==='good'?'Normal':'—'}</span>
      </div>`;
    }).join('');

    // Charts for PA and key vitals
    const dates = [...new Set(filtered.map(v => v.datetime.split('T')[0]))];
    const getSeries = (fieldId) => filtered
      .filter(v => v.values?.[fieldId] !== undefined && v.values?.[fieldId] !== '')
      .map(v => ({ date: Utils.formatDateShort(v.datetime.split('T')[0]), val: parseFloat(v.values[fieldId]) }));

    area.innerHTML = `
      <div class="grid-4 mb-4">${summaryCards}</div>
      <div class="grid-2 mb-4">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Presión Arterial</h3></div>
          <div class="chart-wrap" style="height:220px"><canvas id="chart-bp"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">FC / SpO₂</h3></div>
          <div class="chart-wrap" style="height:220px"><canvas id="chart-hr-spo2"></canvas></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Historial</h3></div>
        <table class="table">
          <thead><tr>
            <th>Fecha/Hora</th>
            <th>Paciente</th>
            ${VITAL_FIELDS.map(f=>`<th>${f.name}</th>`).join('')}
            <th></th>
          </tr></thead>
          <tbody>
            ${[...filtered].reverse().slice(0,20).map(v => {
              const p = _patients.find(x => x.id === v.patientId);
              return `<tr>
                <td>${Utils.formatDateTime(new Date(v.datetime).getTime())}</td>
                <td>${p ? Utils.patientLabel(p) : '—'}</td>
                ${VITAL_FIELDS.map(f => {
                  const val = v.values?.[f.id];
                  if (!val) return '<td>—</td>';
                  const num = parseFloat(val);
                  let cls = '';
                  if (f.normalMin !== undefined && (num < f.normalMin || num > f.normalMax)) cls = 'text-danger fw-600';
                  return `<td class="${cls}">${val}</td>`;
                }).join('')}
                <td><button class="btn btn-icon btn-danger btn-sm" onclick="VitalsModule.deleteVital('${v.id}')">${Utils.icon.trash}</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    // Draw BP chart
    const sbp = getSeries('sbp'), dbp = getSeries('dbp');
    if (sbp.length) {
      Charts.line('chart-bp',
        sbp.map(s=>s.date),
        [
          { label: 'PAS', data: sbp.map(s=>s.val), borderColor: '#EF4444', backgroundColor: '#EF444422' },
          { label: 'PAD', data: dbp.map(s=>s.val), borderColor: '#3B82F6', backgroundColor: '#3B82F622' },
        ]
      );
    }
    const hr = getSeries('hr'), spo2 = getSeries('spo2');
    if (hr.length) {
      Charts.line('chart-hr-spo2',
        hr.map(s=>s.date),
        [
          { label: 'FC', data: hr.map(s=>s.val), borderColor: '#F59E0B' },
          { label: 'SpO₂', data: spo2.map(s=>s.val), borderColor: '#10B981' },
        ]
      );
    }
  }

  async function openForm(id, onSaved) {
    if (!_patients.length) _patients = await DB.getAll('patients');
    const existing = id ? await DB.get('vitals', id) : null;
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);

    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select class="form-select" id="vit-patient">
            <option value="">— Seleccionar —</option>
            ${_patients.map(p=>`<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha y hora</label>
          <input type="datetime-local" class="form-input" id="vit-datetime" value="${existing?.datetime||localISO}">
        </div>
      </div>
      <div class="grid-4">
        ${VITAL_FIELDS.map(f=>`
          <div class="form-group">
            <label class="form-label">${f.name}</label>
            <input type="number" class="form-input" id="vit-${f.id}"
              placeholder="${f.normalMin??f.min}–${f.normalMax??f.max}"
              min="${f.min}" max="${f.max}" step="0.1"
              value="${existing?.values?.[f.id]??''}">
          </div>`).join('')}
      </div>
      <div class="form-group mt-3">
        <label class="form-label">Observaciones</label>
        <textarea class="form-input" id="vit-notes" rows="2">${existing?.notes||''}</textarea>
      </div>`;

    Utils.openLargeModal(existing ? 'Editar Signos Vitales' : 'Registrar Signos Vitales', body, async () => {
      const patientId = document.getElementById('vit-patient').value;
      if (!patientId) { Utils.toast('Selecciona un paciente', 'warning'); return false; }
      const values = {};
      VITAL_FIELDS.forEach(f => {
        const v = document.getElementById(`vit-${f.id}`).value;
        if (v !== '') values[f.id] = v;
      });
      const record = {
        id: existing?.id || Utils.uuid(),
        patientId,
        datetime: document.getElementById('vit-datetime').value,
        values,
        notes: document.getElementById('vit-notes').value,
        createdAt: existing?.createdAt || Date.now(),
      };
      await DB.put('vitals', record);
      _vitals = await DB.getAll('vitals');
      Utils.closeLargeModal();
      Utils.toast('Signos vitales registrados', 'success');
      if (typeof onSaved === 'function') onSaved();
      else drawVitals();
    });
  }

  async function deleteVital(id) {
    const v = await DB.get('vitals', id);
    const ok = await Utils.confirm('¿Eliminar este registro de signos vitales? Esta acción no se puede deshacer.', 'Eliminar registro');
    if (!ok) return;
    await DB.del('vitals', id);
    _vitals = await DB.getAll('vitals');
    drawVitals();
    Utils.toastWithUndo('Registro de signos vitales eliminado', async () => {
      await DB.put('vitals', v);
      _vitals = await DB.getAll('vitals');
      drawVitals();
    });
  }

  return { render, openForm, deleteVital };
})();
