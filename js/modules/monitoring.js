/* ============================================================
   ClinAxis — Monitoring Module
   ============================================================ */

const MonitoringModule = (() => {

  let _patients = [];
  let _instruments = [];
  let _evals = [];
  let _view = 'global'; // 'global' | 'patient'
  let _selectedPatient = null;
  let _selectedInstrument = null;
  let _selectedField = null;
  let _vitals = [];

  async function render(container) {
    [_patients, _instruments, _evals, _vitals] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('instruments'),
      DB.getAll('evaluations'),
      DB.getAll('vitals'),
    ]);
    _evals.sort((a,b) => a.date.localeCompare(b.date));

    document.getElementById('topbar-actions').innerHTML = `
      <div class="toggle-group">
        <button class="toggle-btn ${_view==='global'?'active':''}" onclick="MonitoringModule.setView('global')">
          ${Utils.icon.monitoring} Global
        </button>
        <button class="toggle-btn ${_view==='patient'?'active':''}" onclick="MonitoringModule.setView('patient')">
          ${Utils.icon.patients} Por Paciente
        </button>
      </div>`;

    renderView(container);
  }

  function setView(v) {
    _view = v;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.toggle-btn').forEach(b => {
      if (b.textContent.trim().includes(v === 'global' ? 'Global' : 'Paciente')) b.classList.add('active');
    });
    renderView(document.getElementById('module-container'));
  }

  function renderView(container) {
    if (_view === 'global') renderGlobal(container);
    else renderByPatient(container);
  }

  // ── GLOBAL VIEW ──
  function renderGlobal(container) {
    if (!_instruments.length) {
      container.innerHTML = `<div class="empty-state">${Utils.icon.monitoring}<h3>Sin instrumentos</h3><p>Crea instrumentos primero</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="form-group mb-0" style="min-width:220px">
          <label class="form-label mb-1">Instrumento</label>
          <select class="form-select" id="global-inst-sel">
            ${_instruments.map(i => `<option value="${i.id}" ${_selectedInstrument===i.id?'selected':''}>${i.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group mb-0" style="min-width:180px">
          <label class="form-label mb-1">Campo / Puntuación</label>
          <select class="form-select" id="global-field-sel"></select>
        </div>
      </div>
      <div id="global-charts-area"></div>`;

    document.getElementById('global-inst-sel').addEventListener('change', e => {
      _selectedInstrument = e.target.value;
      _selectedField = null;
      populateFieldSel();
      drawGlobalCharts();
    });
    document.getElementById('global-field-sel').addEventListener('change', e => {
      _selectedField = e.target.value;
      drawGlobalCharts();
    });

    if (!_selectedInstrument && _instruments.length) _selectedInstrument = _instruments[0].id;
    populateFieldSel();
    drawGlobalCharts();
  }

  function populateFieldSel() {
    const inst = _instruments.find(i => i.id === _selectedInstrument);
    if (!inst) return;
    const sel = document.getElementById('global-field-sel');
    if (!sel) return;                                    // ← guard ya presente; asegurar que exista
    const numericFields = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type));
    sel.innerHTML = `<option value="__score__">Puntuación total</option>` +
      numericFields.map(f => `<option value="${f.id}" ${_selectedField===f.id?'selected':''}>${f.name}</option>`).join('');
    if (!_selectedField) _selectedField = '__score__';
  }

  function drawGlobalCharts() {
    Charts.destroyAll();
    const inst = _instruments.find(i => i.id === _selectedInstrument);
    if (!inst) return;                                                  // ← guard primero
    const numericFields = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type));
    const area = document.getElementById('global-charts-area');
    if (!area) return;
    const fieldSel = document.getElementById('global-field-sel'); 
    if (!fieldSel) return;        

    // Gather data per patient
    const patientData = {};
    _evals.forEach(ev => {
      const instData = (ev.instruments || []).find(i => i.instrumentId === _selectedInstrument);
      if (!instData) return;
      if (!patientData[ev.patientId]) patientData[ev.patientId] = [];
      let val;
      if (_selectedField === '__score__') {
        val = Utils.calcInstrumentScore(inst, instData.values);
      } else {
        val = Utils.getNumericValue(inst.fields.find(f => f.id === _selectedField), instData.values?.[_selectedField]);
      }
      if (val !== null) patientData[ev.patientId].push({ date: ev.date, val });
    });

    const patientIds = Object.keys(patientData);
    // Recopilar datos por campo para el desglose
    const patientFieldData = {};
    _evals.forEach(ev => {
      const instData = (ev.instruments||[]).find(i => i.instrumentId === _selectedInstrument);
      if (!instData) return;
      if (!patientFieldData[ev.patientId]) patientFieldData[ev.patientId] = {};
      numericFields.forEach(f => {
        const val = Utils.getNumericValue(f, instData.values?.[f.id]);
        if (val !== null) {
          if (!patientFieldData[ev.patientId][f.id]) patientFieldData[ev.patientId][f.id] = [];
          patientFieldData[ev.patientId][f.id].push({ date: ev.date, val });
        }
      });
    });
    if (!patientIds.length) {
      area.innerHTML = `<div class="empty-state">Sin datos para este instrumento</div>`;
      return;
    }

    // All dates union
    const allDates = [...new Set(_evals.map(e => e.date))].sort();

    area.innerHTML = `
      <div class="grid-2 mb-4">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Evolución por Paciente — ${inst.name}</h3></div>
          <div class="chart-wrap" style="height:300px"><canvas id="chart-global-line"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Comparativa Última Medición</h3></div>
          <div class="chart-wrap" style="height:300px"><canvas id="chart-global-bar"></canvas></div>
        </div>
      </div>
      <div class="card chart-card mb-4">
        <div class="card-header"><h3 class="card-title">Radar Comparativo (última medición)</h3></div>
        <div class="chart-wrap" style="height:320px"><canvas id="chart-global-radar"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Tabla Resumen</h3></div>
        <table class="table" id="global-summary-table">
          <thead><tr><th>Paciente</th><th>N° Evaluaciones</th><th>Primera</th><th>Última</th><th>Tendencia</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      ${numericFields.length ? `
      <div class="card mt-4">
        <div class="card-header"><h3 class="card-title">Desglose por campo — todos los pacientes</h3></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem;padding:1rem">
          ${numericFields.map((f, fi) => `
            <div>
              <div class="text-xs fw-600 text-muted mb-1">${Utils.escapeHtml(f.name)}</div>
              <div class="chart-wrap" style="height:150px"><canvas id="chart-global-field-${fi}"></canvas></div>
            </div>`).join('')}
        </div>
      </div>` : ''}
      `;

    const lineDatasets = [];
    const barLabels = [];
    const barData = [];
    const radarLabels = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type)).map(f => f.name);
    const radarDatasets = [];
    const tbody = area.querySelector('#global-summary-table tbody');

    patientIds.forEach((pid, ci) => {
      const p = _patients.find(x => x.id === pid);
      const pName = p ? Utils.patientLabel(p) : 'Desconocido';
      const series = patientData[pid];
      const color = Utils.chartColors[ci % Utils.chartColors.length];

      const linePoints = allDates.map(d => {
        const pt = series.find(s => s.date === d);
        return pt ? pt.val : null;
      });
      lineDatasets.push({ label: pName, data: linePoints, borderColor: color, backgroundColor: color + '33', tension: 0.3 });

      const last = series[series.length - 1];
      barLabels.push(pName);
      barData.push(last ? last.val : null);

      // radar — last eval multi-field
      const lastEval = [..._evals].reverse().find(ev => ev.patientId === pid && (ev.instruments||[]).some(i => i.instrumentId === _selectedInstrument));
      const lastInstData = lastEval ? (lastEval.instruments||[]).find(i => i.instrumentId === _selectedInstrument) : null;
      if (lastInstData) {
        const numFields = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type));
        radarDatasets.push({
          label: pName,
          data: numFields.map(f => Utils.getNumericValue(f, lastInstData.values?.[f.id]) ?? 0),
          borderColor: color,
          backgroundColor: color + '44',
        });
      }

      // trend
      const trend = series.length >= 2 ? Utils.getTrend(series.map(s => s.val), inst.scoring?.direction || 'higher_better') : null;
      tbody.innerHTML += `<tr>
        <td><strong>${pName}</strong></td>
        <td>${series.length}</td>
        <td>${Utils.formatDate(series[0]?.date)}</td>
        <td>${Utils.formatDate(last?.date)} — <strong>${last?.val ?? '—'}</strong></td>
        <td>${trend ? Utils.trendIcon(trend) : '—'}</td>
      </tr>`;
    });

    Charts.line('chart-global-line', allDates.map(d => Utils.formatDateShort(d)), lineDatasets);
    Charts.bar('chart-global-bar', barLabels, [{ label: _selectedField === '__score__' ? 'Puntuación' : inst.fields.find(f=>f.id===_selectedField)?.name || '', data: barData }]);
    if (radarLabels.length >= 3) Charts.radar('chart-global-radar', radarLabels, radarDatasets);
    // Gráficos de desglose por campo (todos los pacientes)
    numericFields.forEach((f, fi) => {
      const cid = `chart-global-field-${fi}`;
      if (!document.getElementById(cid)) return;
      const datasets = patientIds.map((pid, ci) => {
        const pPts = patientFieldData[pid]?.[f.id] || [];
        if (!pPts.length) return null;
        const p = _patients.find(x => x.id === pid);
        const color = Utils.chartColors[ci % Utils.chartColors.length];
        return {
          label: p ? Utils.patientLabel(p) : pid,
          data: allDates.map(d => { const pt = pPts.find(pp => pp.date === d); return pt ? pt.val : null; }),
          borderColor: color, backgroundColor: color + '22',
          tension: 0.3, spanGaps: true, borderWidth: 1.5,
        };
      }).filter(Boolean);
      if (datasets.length) Charts.line(cid, allDates.map(d => Utils.formatDateShort(d)), datasets);
    });
  }

  // ── BY PATIENT VIEW ──
  function renderByPatient(container) {
    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="form-group mb-0" style="min-width:240px">
          <label class="form-label mb-1">Paciente</label>
          <select class="form-select" id="patient-mon-sel">
            <option value="">— Seleccionar paciente —</option>
            ${_patients.map(p => `<option value="${p.id}" ${_selectedPatient===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="patient-mon-area">
        ${!_selectedPatient ? '<div class="empty-state">Selecciona un paciente para ver su evolución</div>' : ''}
      </div>`;

    document.getElementById('patient-mon-sel').addEventListener('change', e => {
      _selectedPatient = e.target.value;
      drawPatientCharts();
    });

    if (_selectedPatient) drawPatientCharts();
  }

  function drawPatientCharts() {
    Charts.destroyAll();
    const area = document.getElementById('patient-mon-area');
    if (!area || !_selectedPatient) return;

    const patientEvals = _evals.filter(e => e.patientId === _selectedPatient);
    const p = _patients.find(x => x.id === _selectedPatient);
    const pName = p ? Utils.patientLabel(p) : '';

    if (!patientEvals.length) {
      area.innerHTML = `<div class="empty-state">Sin evaluaciones para ${pName}</div>`;
      return;
    }

    // Group by instrument
    const instMap = {};
    patientEvals.forEach(ev => {
      (ev.instruments || []).forEach(instData => {
        if (!instMap[instData.instrumentId]) instMap[instData.instrumentId] = [];
        instMap[instData.instrumentId].push({ date: ev.date, values: instData.values, evalId: ev.id });
      });
    });

    const instIds = Object.keys(instMap);
    let html = `<h3 class="mb-4">Evolución de ${pName}</h3>`;
    html += `<div id="patient-chart-sections"></div>`;
    area.innerHTML = html;

    const sections = document.getElementById('patient-chart-sections');

    instIds.forEach((instId, ci) => {
      const inst = _instruments.find(i => i.id === instId);
      if (!inst) return;
      const series = instMap[instId].sort((a,b) => a.date.localeCompare(b.date));
      const hasScore = inst.scoring?.type && inst.scoring.type !== 'none';
      const scores = series.map(s => Utils.calcInstrumentScore(inst, s.values));
      const dates = series.map(s => Utils.formatDateShort(s.date));
      const validScores = scores.filter(s => s !== null);
      const trend = hasScore && validScores.length >= 2
        ? Utils.getTrend(validScores, inst.scoring?.direction||'higher_better')
        : null;

      const chartId = `chart-pt-${ci}`;
      const radarId = `chart-pt-radar-${ci}`;
      const numFields = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type));

      const fieldGridHtml = numFields.length ? `
        <div style="padding:0.5rem 1rem 1rem${hasScore?';border-top:1px solid var(--border)':''}">
          <div class="text-xs fw-600 text-muted mb-2" style="text-transform:uppercase;letter-spacing:.04em">Campos individuales</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem">
            ${numFields.map((f, fi) => `
              <div>
                <div class="text-xs fw-600 text-muted mb-1">${Utils.escapeHtml(f.name)}</div>
                <div class="chart-wrap" style="height:110px"><canvas id="chart-pt-field-${ci}-${fi}"></canvas></div>
              </div>`).join('')}
          </div>
        </div>` : '';

      const sec = document.createElement('div');
      sec.className = 'card mb-4';
      sec.innerHTML = `
        <div class="card-header">
          <h4 class="card-title">${inst.name}</h4>
          <div class="flex gap-2">
            ${trend ? `<span class="badge badge-${trend==='better'?'success':trend==='worse'?'danger':'neutral'}">${Utils.trendIcon(trend)} ${trend==='better'?'Mejorando':trend==='worse'?'Empeorando':'Estable'}</span>` : ''}
            <span class="badge badge-neutral">${series.length} medición(es)</span>
          </div>
        </div>
        ${hasScore ? `
        <div class="grid-2">
          <div class="chart-wrap" style="height:240px"><canvas id="${chartId}"></canvas></div>
          ${numFields.length >= 3 ? `<div class="chart-wrap" style="height:240px"><canvas id="${radarId}"></canvas></div>` :
            `<div class="p-4">
              <table class="table">
                <thead><tr><th>Fecha</th><th>Puntuación</th></tr></thead>
                <tbody>${series.map((s,i) => `<tr><td>${Utils.formatDate(s.date)}</td><td><strong>${scores[i] ?? '—'}</strong></td></tr>`).join('')}</tbody>
              </table>
            </div>`}
        </div>` : ''}
        ${fieldGridHtml}`;
      sections.appendChild(sec);

      // Gráfico puntuación total
      if (hasScore) {
        Charts.line(chartId, dates, [{ label: inst.name, data: scores, tension: 0.3 }]);
        if (numFields.length >= 3) {
          const radarDatasets = series.map((s, i) => ({
            label: Utils.formatDateShort(s.date),
            data: numFields.map(f => Utils.getNumericValue(f, s.values?.[f.id]) ?? 0),
            borderColor: Utils.chartColors[i % Utils.chartColors.length],
            backgroundColor: Utils.chartColors[i % Utils.chartColors.length] + '33',
          })).slice(-3);
          Charts.radar(radarId, numFields.map(f => f.name), radarDatasets);
        }
      }

      // Mini gráficos de campos individuales
      numFields.forEach((f, fi) => {
        const fPts = series
          .map(s => ({ date: s.date, val: Utils.getNumericValue(f, s.values?.[f.id]) }))
          .filter(p => p.val !== null);
        if (!fPts.length) return;
        Charts.mini(`chart-pt-field-${ci}-${fi}`, {
          labels: fPts.map(p => Utils.formatDateShort(p.date)),
          data: fPts.map(p => p.val),
          direction: f.direction || inst.scoring?.direction || 'neutral',
        });
      });
    });

    // ── Signos vitales del paciente ──
    const patientVitals = _vitals
      .filter(v => v.patientId === _selectedPatient)
      .sort((a,b) => a.datetime.localeCompare(b.datetime));
    if (patientVitals.length) {
      const VITAL_LABELS = { sbp:'PAS (mmHg)', dbp:'PAD (mmHg)', hr:'FC (lpm)', spo2:'SpO₂ (%)', temp:'Temp (°C)', rr:'FR (rpm)', weight:'Peso (kg)', glucose:'Glucosa (mg/dL)' };
      const VITAL_DIRECTION = { sbp:'neutral', dbp:'neutral', hr:'neutral', spo2:'higher_better', temp:'neutral', rr:'neutral', weight:'neutral', glucose:'lower_better' };
      const usedKeys = Object.keys(VITAL_LABELS).filter(k =>
        patientVitals.some(v => v.values?.[k] !== undefined && v.values?.[k] !== '')
      );
      if (usedKeys.length) {
        const vSec = document.createElement('div');
        vSec.className = 'card mb-4';
        vSec.innerHTML = `
          <div class="card-header">
            <h4 class="card-title">${Utils.icon.vitals} Signos Vitales</h4>
            <span class="badge badge-neutral">${patientVitals.length} registro(s)</span>
          </div>
          <div style="padding:0.5rem 1rem 1rem">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem">
              ${usedKeys.map(k => `
                <div>
                  <div class="text-xs fw-600 text-muted mb-1">${VITAL_LABELS[k]}</div>
                  <div class="chart-wrap" style="height:110px"><canvas id="chart-pt-vital-${k}"></canvas></div>
                </div>`).join('')}
            </div>
          </div>`;
        sections.appendChild(vSec);
        usedKeys.forEach(k => {
          const pts = patientVitals
            .filter(v => v.values?.[k] !== undefined && v.values?.[k] !== '')
            .map(v => ({ date: v.datetime.split('T')[0], val: parseFloat(v.values[k]) }));
          if (!pts.length) return;
          Charts.mini(`chart-pt-vital-${k}`, {
            labels: pts.map(p => Utils.formatDateShort(p.date)),
            data: pts.map(p => p.val),
            direction: VITAL_DIRECTION[k],
          });
        });
      }
    }
  }

  return { render, setView };
})();
