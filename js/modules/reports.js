/* ============================================================
   ClinAxis — Reports Module
   ============================================================ */

const ReportsModule = (() => {

  let _patients = [];
  let _instruments = [];
  let _evals = [];
  let _notes = [];
  let _selectedPatient = null;

  async function render(container) {
    [_patients, _instruments, _evals, _notes] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('instruments'),
      DB.getAll('evaluations'),
      DB.getAll('notes'),
    ]);

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="window.print()" id="btn-print" style="display:none">
        ${Utils.icon.print} Imprimir / PDF
      </button>`;

    renderSelector(container);
  }

  function renderSelector(container) {
    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header"><h3 class="card-title">Generar Reporte de Paciente</h3></div>
        <div class="card-body">
          <div class="flex gap-3 flex-wrap">
            <div class="form-group mb-0" style="min-width:260px">
              <label class="form-label">Paciente</label>
              <select class="form-select" id="report-patient-sel">
                <option value="">— Seleccionar paciente —</option>
                ${_patients.map(p => `<option value="${p.id}" ${_selectedPatient===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
              </select>
            </div>
            <div class="flex items-end">
              <button class="btn btn-primary" id="btn-gen-report">
                ${Utils.icon.reports} Generar Reporte
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="report-output">
        ${!_selectedPatient ? `<div class="empty-state">${Utils.icon.reports}<h3>Selecciona un paciente</h3><p>Genera un reporte clínico completo listo para imprimir</p></div>` : ''}
      </div>`;

    document.getElementById('report-patient-sel').addEventListener('change', e => {
      _selectedPatient = e.target.value;
    });
    document.getElementById('btn-gen-report')?.addEventListener('click', generateReport);
  }

  async function generateReport() {
    if (!_selectedPatient) { Utils.toast('Selecciona un paciente', 'warning'); return; }
    const p = await DB.get('patients', _selectedPatient);
    if (!p) return;

    const patientEvals = _evals.filter(e => e.patientId === _selectedPatient).sort((a,b)=>a.date.localeCompare(b.date));
    const patientNotes = _notes.filter(n => n.patientId === _selectedPatient).sort((a,b)=>b.date.localeCompare(a.date));
    const pName = Utils.patientLabel(p);
    const today = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });

    // Build evaluation summaries
    let evalHTML = '';
    patientEvals.forEach(ev => {
      let instRows = (ev.instruments || []).map(instData => {
        const inst = _instruments.find(i => i.id === instData.instrumentId);
        const score = inst ? Utils.calcInstrumentScore(inst, instData.values) : null;
        return `<tr>
          <td>${instData.instrumentName}</td>
          <td>${score !== null ? score + ' ' + (inst?.scoring?.label||'pts') : '—'}</td>
          <td>${ev.notes||'—'}</td>
        </tr>`;
      }).join('');
      evalHTML += `
        <div class="report-section">
          <h4>${ev.title || 'Evaluación'} — ${Utils.formatDate(ev.date)}</h4>
          ${instRows ? `<table class="table"><thead><tr><th>Instrumento</th><th>Resultado</th><th>Notas</th></tr></thead><tbody>${instRows}</tbody></table>` : '<p class="text-muted">Sin instrumentos</p>'}
        </div>`;
    });

    let notesHTML = patientNotes.slice(0,10).map(n => `
      <div class="report-section">
        <div class="flex-between">
          <strong>${n.title||'Nota'}</strong>
          <span class="text-muted text-sm">${Utils.formatDate(n.date)}${n.type?' · '+n.type:''}</span>
        </div>
        <p class="mt-1 text-sm" style="white-space:pre-wrap">${n.content||''}</p>
      </div>`).join('');

    // Evolution chart data for report
    const instMap = {};
    patientEvals.forEach(ev => {
      (ev.instruments||[]).forEach(instData => {
        const inst = _instruments.find(i => i.id === instData.instrumentId);
        if (!inst) return;
        if (!instMap[instData.instrumentId]) instMap[instData.instrumentId] = { name: instData.instrumentName, series: [], inst };
        const score = Utils.calcInstrumentScore(inst, instData.values);
        if (score !== null) instMap[instData.instrumentId].series.push({ date: ev.date, val: score });
      });
    });

    const chartSections = Object.values(instMap).filter(m => m.series.length >= 2).map((m, ci) => {
      const cid = `report-chart-${ci}`;
      return { html: `<div class="chart-wrap mb-4" style="height:200px"><canvas id="${cid}"></canvas></div>`, data: m, cid };
    });

    document.getElementById('report-output').innerHTML = `
      <div class="report-wrapper" id="printable-report">
        <!-- Header -->
        <div class="report-header">
          <div>
            <h2 class="report-patient-name">${pName}</h2>
            <div class="text-muted text-sm">Reporte clínico generado el ${today}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-muted">ClinAxis</div>
          </div>
        </div>

        <!-- Patient fields -->
        <div class="report-section">
          <h3>Datos del Paciente</h3>
          <div class="detail-grid">
            ${Object.entries(p.fields||{}).filter(([,v])=>v).map(([k,v]) => `
              <div class="detail-item">
                <div class="detail-label">${k}</div>
                <div class="detail-value">${v}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Evolution charts -->
        ${chartSections.length ? `
          <div class="report-section">
            <h3>Evolución Clínica</h3>
            ${chartSections.map(c => c.html).join('')}
          </div>` : ''}

        <!-- Evaluations -->
        <div class="report-section">
          <h3>Evaluaciones (${patientEvals.length})</h3>
          ${evalHTML || '<p class="text-muted">Sin evaluaciones</p>'}
        </div>

        <!-- Notes -->
        <div class="report-section">
          <h3>Notas Clínicas (${patientNotes.length})</h3>
          ${notesHTML || '<p class="text-muted">Sin notas</p>'}
        </div>
      </div>`;

    // Render evolution charts
    setTimeout(() => {
      chartSections.forEach(c => {
        Charts.line(c.cid,
          c.data.series.map(s => Utils.formatDateShort(s.date)),
          [{ label: c.data.name, data: c.data.series.map(s=>s.val), tension: 0.3 }]
        );
      });
    }, 100);

    document.getElementById('btn-print').style.display = '';
  }

  return { render };
})();
