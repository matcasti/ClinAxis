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

  async function render(container) {
    [_patients, _instruments, _evals] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('instruments'),
      DB.getAll('evaluations'),
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
  
  document.getElementById('global-charts-area').innerHTML = '';

  function drawGlobalCharts() {
    Charts.destroyAll();
    const inst = _instruments.find(i => i.id === _selectedInstrument);
    if (!inst) return;
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
      </div>`;

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
  }
  
  // AI Analysis button
  const toolbar = document.querySelector('#module-container .toolbar');
  if (toolbar) {
    const aiBtn = document.createElement('button');
    aiBtn.className = 'btn btn-ghost btn-sm';
    aiBtn.style.color = 'var(--color-accent)';
    aiBtn.innerHTML = '✨ Analizar con IA';
    aiBtn.onclick = () => _runAIAnalysis();
    toolbar.appendChild(aiBtn);
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
      const scores = series.map(s => Utils.calcInstrumentScore(inst, s.values));
      const dates = series.map(s => Utils.formatDateShort(s.date));
      const trend = scores.filter(s=>s!==null).length >= 2 ? Utils.getTrend(scores.filter(s=>s!==null), inst.scoring?.direction||'higher_better') : null;

      const chartId = `chart-pt-${ci}`;
      const radarId = `chart-pt-radar-${ci}`;
      const numFields = inst.fields.filter(f => ['number','slider','likert','select'].includes(f.type));

      const sec = document.createElement('div');
      sec.className = 'card mb-4';
      sec.innerHTML = `
        <div class="card-header">
          <h4 class="card-title">${inst.name}</h4>
          <div class="flex gap-2">
            ${trend ? `<span class="badge badge-${trend==='up'?'success':trend==='down'?'danger':'neutral'}">${Utils.trendIcon(trend)} ${trend==='up'?'Mejorando':trend==='down'?'Empeorando':'Estable'}</span>` : ''}
            <span class="badge badge-neutral">${series.length} medición(es)</span>
          </div>
        </div>
        <div class="grid-2">
          <div class="chart-wrap" style="height:240px"><canvas id="${chartId}"></canvas></div>
          ${numFields.length >= 3 ? `<div class="chart-wrap" style="height:240px"><canvas id="${radarId}"></canvas></div>` : 
            `<div class="p-4">
              <table class="table">
                <thead><tr><th>Fecha</th><th>Puntuación</th></tr></thead>
                <tbody>${series.map((s,i) => `<tr><td>${Utils.formatDate(s.date)}</td><td><strong>${scores[i] ?? '—'}</strong></td></tr>`).join('')}</tbody>
              </table>
            </div>`}
        </div>`;
      sections.appendChild(sec);

      // Draw charts after DOM insertion
      Charts.line(chartId, dates, [{
        label: inst.name,
        data: scores,
        tension: 0.3,
      }]);

      if (numFields.length >= 3) {
        const radarDatasets = series.map((s, i) => ({
          label: Utils.formatDateShort(s.date),
          data: numFields.map(f => Utils.getNumericValue(f, s.values?.[f.id]) ?? 0),
          borderColor: Utils.chartColors[i % Utils.chartColors.length],
          backgroundColor: Utils.chartColors[i % Utils.chartColors.length] + '33',
        })).slice(-3); // last 3 for readability
        Charts.radar(radarId, numFields.map(f => f.name), radarDatasets);
      }
    });
  }
  
  async function _runAIAnalysis() {
    const inst = _instruments.find(i => i.id === _selectedInstrument);
    if (!inst) return;

    const container = document.getElementById('module-container');
    let area = document.getElementById('monitoring-ai-area');
    if (!area) {
      area = document.createElement('div');
      area.id = 'monitoring-ai-area';
      area.className = 'mb-4';
      container.insertBefore(area, container.firstChild);
    }
    area.innerHTML = `<div class="card"><div class="card-body"><div class="spinner"></div><p class="text-muted text-sm text-center mt-2">Analizando evolución grupal…</p></div></div>`;

    // Build context
    const patientData = {};
    _evals.forEach(ev => {
      const id = (ev.instruments||[]).find(i=>i.instrumentId===_selectedInstrument);
      if (!id) return;
      const score = Utils.calcInstrumentScore(inst, id.values);
      if (score===null) return;
      const p = _patients.find(x=>x.id===ev.patientId);
      if (!patientData[ev.patientId]) patientData[ev.patientId] = { name: p?Utils.patientLabel(p):'—', scores:[] };
      patientData[ev.patientId].scores.push({ date:ev.date, score });
    });

    const context = `
Instrumento: ${inst.name} (${inst.scoring?.direction||'higher_better'}, max: ${inst.scoring?.maxScore||'N/A'})
Datos por paciente: ${JSON.stringify(Object.values(patientData).map(pd=>({
  paciente: pd.name,
  scores: pd.scores,
  tendencia: pd.scores.length>=2 ? Utils.getTrend(pd.scores.map(s=>s.score), inst.scoring?.direction||'higher_better') : 'sin datos'
})), null, 1)}`.trim();

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: 'Eres un especialista en análisis clínico. Analiza la evolución grupal de pacientes y proporciona: 1) Tendencias generales del grupo, 2) Pacientes que requieren atención prioritaria, 3) Recomendaciones. Sé conciso y clínico.',
          messages: [{ role: 'user', content: `Analiza estos datos:\n${context}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      area.innerHTML = `
        <div class="card mb-4" style="border-color:var(--accent)">
          <div class="card-header">
            <h3 class="card-title" style="color:var(--accent)">✨ Análisis IA — ${inst.name}</h3>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('monitoring-ai-area').remove()">✕</button>
          </div>
          <div class="card-body"><div style="white-space:pre-wrap;font-size:.9rem;line-height:1.7">${text}</div></div>
        </div>`;
    } catch(e) {
      area.innerHTML = `<div class="card mb-4"><div class="card-body"><p class="text-danger">Error: ${e.message}</p></div></div>`;
    }
  }

  return { render, setView };
})();
