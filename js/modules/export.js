/* ============================================================
   ClinAxis — HTML Export Module
   ============================================================ */

const ExportModule = (() => {

  let _patients  = [];
  let _selectedP = null;

  async function render(container) {
    _patients = await DB.getAll('patients');
    document.getElementById('page-subtitle').textContent = 'Exporta reportes clínicos en HTML profesional';
    document.getElementById('topbar-actions').innerHTML = '';

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header"><h3 class="card-title">Generar Reporte HTML</h3></div>
        <div class="card-body">
          <div class="flex gap-3 flex-wrap items-end">
            <div class="form-group mb-0" style="min-width:260px">
              <label class="form-label">Paciente</label>
              <select class="form-select" id="exp-patient-sel">
                <option value="">— Seleccionar paciente —</option>
                ${_patients.map(p => `<option value="${p.id}">${Utils.patientLabel(p)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Incluir</label>
              <div class="flex gap-3">
                ${['evaluaciones','notas','vitales','metas','medicamentos'].map(s => `
                  <label class="checkbox-field">
                    <input type="checkbox" id="exp-inc-${s}" checked>
                    <span>${s.charAt(0).toUpperCase()+s.slice(1)}</span>
                  </label>`).join('')}
              </div>
            </div>
            <button class="btn btn-primary" id="btn-gen-exp">
              ${Utils.icon.download} Generar y Descargar
            </button>
          </div>
          <!-- Clinic header settings -->
          <hr style="margin:1.25rem 0">
          <div class="grid-2">
            <div class="form-group mb-0">
              <label class="form-label">Nombre del establecimiento / Profesional</label>
              <input type="text" class="form-input" id="exp-clinic-name" placeholder="Ej: Centro Médico San Juan · Dr. Pérez">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Especialidad</label>
              <input type="text" class="form-input" id="exp-clinic-spec" placeholder="Ej: Neurología · Rehabilitación Física">
            </div>
          </div>
        </div>
      </div>
      <div id="exp-preview-area"></div>`;

    document.getElementById('btn-gen-exp').addEventListener('click', generateReport);

    // Load saved clinic settings
    const [savedName, savedSpec] = await Promise.all([
      DB.getSetting('clinic_name', ''),
      DB.getSetting('clinic_spec', ''),
    ]);
    document.getElementById('exp-clinic-name').value = savedName;
    document.getElementById('exp-clinic-spec').value = savedSpec;
  }

  async function generateReport() {
    const pid = document.getElementById('exp-patient-sel').value;
    if (!pid) { Utils.toast('Selecciona un paciente', 'warning'); return; }

    const inc = s => document.getElementById(`exp-inc-${s}`)?.checked;
    const clinicName = document.getElementById('exp-clinic-name').value.trim();
    const clinicSpec = document.getElementById('exp-clinic-spec').value.trim();

    // Save settings
    await Promise.all([
      DB.setSetting('clinic_name', clinicName),
      DB.setSetting('clinic_spec', clinicSpec),
    ]);

    const [p, templates, evaluations, notes, vitals, goals, medications, instruments] = await Promise.all([
      DB.get('patients', pid),
      DB.getAll('templates'),
      DB.getByIndex('evaluations','patientId', pid),
      DB.getByIndex('notes','patientId', pid),
      DB.getByIndex('vitals','patientId', pid),
      DB.getByIndex('goals','patientId', pid),
      DB.getByIndex('medications','patientId', pid),
      DB.getAll('instruments'),
    ]);

    const tpl    = templates.find(t => t.id === p.templateId);
    const pName  = Utils.patientLabel(p);
    const today  = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });
    const evSort = [...evaluations].sort((a, b) => a.date.localeCompare(b.date));

    // Build chart data inline (JSON-embedded for the exported HTML)
    const instSeries = {};
    evSort.forEach(ev => {
      (ev.instruments||[]).forEach(id => {
        const inst = instruments.find(i => i.id === id.instrumentId);
        if (!inst || inst.scoring?.type === 'none') return;
        const score = Utils.calcInstrumentScore(inst, id.values);
        if (score === null) return;
        if (!instSeries[inst.id]) instSeries[inst.id] = { name: id.instrumentName, labels: [], data: [], dir: inst.scoring?.direction };
        instSeries[inst.id].labels.push(Utils.formatDateShort(ev.date));
        instSeries[inst.id].data.push(score);
      });
    });
    
    // ── Series por campo individual (incluye instrumentos con scoring:none como EVA) ──
    const _PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];
    const _trendColor = (data, dir) => {
      if (!data || data.length < 2) return '#6366F1';
      const d = data[data.length - 1] - data[0];
      if (dir === 'higher_better') return d > 0 ? '#10B981' : d < 0 ? '#EF4444' : '#6366F1';
      if (dir === 'lower_better')  return d < 0 ? '#10B981' : d > 0 ? '#EF4444' : '#6366F1';
      return '#6366F1';
    };

    const fieldSeriesMap = {}; // instId → { instName, fields: { fid: {name,labels,data,direction,color} } }
    evSort.forEach(ev => {
      (ev.instruments||[]).forEach(ir => {
        const inst = instruments.find(i => i.id === ir.instrumentId);
        if (!inst) return;
        const numFields = (inst.fields||[]).filter(f => ['number','slider','likert','select'].includes(f.type));
        if (!numFields.length) return;
        if (!fieldSeriesMap[inst.id]) fieldSeriesMap[inst.id] = { instName: ir.instrumentName, fields: {} };
        numFields.forEach((f, fi) => {
          const val = Utils.getNumericValue(f, ir.values?.[f.id]);
          if (val === null) return;
          if (!fieldSeriesMap[inst.id].fields[f.id]) {
            fieldSeriesMap[inst.id].fields[f.id] = {
              name: f.name, labels: [], data: [],
              direction: f.direction || inst.scoring?.direction || 'neutral',
              color: _PALETTE[fi % _PALETTE.length]
            };
          }
          fieldSeriesMap[inst.id].fields[f.id].labels.push(Utils.formatDateShort(ev.date));
          fieldSeriesMap[inst.id].fields[f.id].data.push(val);
        });
      });
    });

    // ── Series de signos vitales ──
    const _VLABELS = { sbp:'PAS (mmHg)', dbp:'PAD (mmHg)', hr:'FC (lpm)', spo2:'SpO₂ (%)', temp:'Temp (°C)', rr:'FR (rpm)', weight:'Peso (kg)', glucose:'Glucosa (mg/dL)' };
    const _VCOLORS = { sbp:'#EF4444', dbp:'#3B82F6', hr:'#F59E0B', spo2:'#10B981', temp:'#8B5CF6', rr:'#06B6D4', weight:'#6366F1', glucose:'#EC4899' };
    const _vSorted = [...vitals].sort((a,b) => a.datetime.localeCompare(b.datetime));
    const vitalSeriesMap = {};
    Object.keys(_VLABELS).forEach(k => {
      const pts = _vSorted
        .filter(v => v.values?.[k] !== undefined && v.values?.[k] !== '')
        .map(v => ({ date: v.datetime.split('T')[0], val: parseFloat(v.values[k]) }));
      if (pts.length >= 2) vitalSeriesMap[k] = {
        name: _VLABELS[k], color: _VCOLORS[k],
        labels: pts.map(p => Utils.formatDateShort(p.date)),
        data:   pts.map(p => p.val)
      };
    });

    // Entradas con >= 2 puntos de puntuación total
    const scoreEntries = Object.entries(instSeries).filter(([, s]) => s.data.length >= 2);

    // Script puntuación total (ec${ci} — IDs existentes preservados)
    const chartsScript = scoreEntries.map(([, s], ci) => {
      const color = s.dir === 'higher_better' ? '#10B981' : s.dir === 'lower_better' ? '#EF4444' : '#3B82F6';
      return `new Chart(document.getElementById('ec${ci}'),{type:'line',data:{labels:${JSON.stringify(s.labels)},datasets:[{label:${JSON.stringify(s.name)},data:${JSON.stringify(s.data)},borderColor:'${color}',backgroundColor:'${color}22',tension:0.3,fill:true,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false}}}});`;
    }).join('\n');

    // Script mini gráficos por campo — instrumentos con puntuación total
    const fieldChartsScript = scoreEntries.map(([instId], ci) => {
      const fMap = fieldSeriesMap[instId];
      if (!fMap) return '';
      return Object.values(fMap.fields)
        .filter(f => f.data.length >= 2)
        .map((f, fi) => `_mc('ecf${ci}x${fi}',${JSON.stringify(f.labels)},${JSON.stringify(f.data)},'${_trendColor(f.data, f.direction)}');`)
        .join('\n');
    }).join('\n') +
    // Instrumentos sin puntuación total (EVA y similares)
    Object.entries(fieldSeriesMap)
      .filter(([instId]) => !scoreEntries.some(([id]) => id === instId))
      .map(([instId, { fields }]) => {
        const sid = instId.replace(/[^a-z0-9]/gi, '');
        return Object.values(fields)
          .filter(f => f.data.length >= 2)
          .map((f, fi) => `_mc('ecno${sid}${fi}',${JSON.stringify(f.labels)},${JSON.stringify(f.data)},'${_trendColor(f.data, f.direction)}');`)
          .join('\n');
      }).join('\n');

    // Script signos vitales
    const vitalChartsScript = Object.entries(vitalSeriesMap)
      .map(([k, v]) => `_mc('ecv${k}',${JSON.stringify(v.labels)},${JSON.stringify(v.data)},'${v.color}');`)
      .join('\n');

    // HTML evolución: puntuación + desglose campos por instrumento
    const chartsHtml = scoreEntries.map(([instId, s], ci) => {
      const validFields = fieldSeriesMap[instId]
        ? Object.values(fieldSeriesMap[instId].fields).filter(f => f.data.length >= 2)
        : [];
      const fieldGrid = validFields.length ? `
        <div style="border-top:1px solid #e2e8f0;padding:.625rem 0 .25rem;margin-top:.5rem">
          <p style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:.5rem">Desglose por campo</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.625rem">
            ${validFields.map((f, fi) => `
              <div style="break-inside:avoid">
                <p style="font-size:.7rem;font-weight:600;color:#64748b;margin-bottom:.15rem">${Utils.escapeHtml(f.name)}</p>
                <div style="height:86px"><canvas id="ecf${ci}x${fi}"></canvas></div>
              </div>`).join('')}
          </div>
        </div>` : '';
      return `
        <div class="section">
          <h4>${Utils.escapeHtml(s.name)}</h4>
          <div style="height:175px;margin:0.5rem 0"><canvas id="ec${ci}"></canvas></div>
          <p class="meta">Mediciones: ${s.data.length} · Último valor: <strong>${s.data[s.data.length-1]}</strong></p>
          ${fieldGrid}
        </div>`;
    }).join('') +
    // Instrumentos sin puntuación agregada (e.g. EVA)
    Object.entries(fieldSeriesMap)
      .filter(([instId]) => !scoreEntries.some(([id]) => id === instId))
      .map(([instId, { instName, fields }]) => {
        const validFields = Object.values(fields).filter(f => f.data.length >= 2);
        if (!validFields.length) return '';
        const sid = instId.replace(/[^a-z0-9]/gi, '');
        return `
          <div class="section">
            <h4>${Utils.escapeHtml(instName)}</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.625rem;margin:.5rem 0 .25rem">
              ${validFields.map((f, fi) => `
                <div style="break-inside:avoid">
                  <p style="font-size:.7rem;font-weight:600;color:#64748b;margin-bottom:.15rem">${Utils.escapeHtml(f.name)}</p>
                  <div style="height:106px"><canvas id="ecno${sid}${fi}"></canvas></div>
                </div>`).join('')}
            </div>
            <p class="meta">Mediciones: ${validFields[0]?.data.length ?? 0}</p>
          </div>`;
      }).join('');

    // HTML sección de evolución de signos vitales
    const vitalKeys = Object.keys(vitalSeriesMap);
    const vitalChartsHtml = vitalKeys.length && inc('vitales') ? `
      <div class="section">
        <h3>Signos Vitales — Evolución</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:.75rem">
          ${vitalKeys.map(k => `
            <div style="break-inside:avoid">
              <p style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:.2rem">${_VLABELS[k]}</p>
              <div style="height:96px"><canvas id="ecv${k}"></canvas></div>
              <p style="font-size:.7rem;color:#94a3b8;margin-top:.15rem">
                Último: <strong style="color:#0f172a">${vitalSeriesMap[k].data[vitalSeriesMap[k].data.length-1]}</strong>
                &nbsp;·&nbsp;${vitalSeriesMap[k].data.length} registros
              </p>
            </div>`).join('')}
        </div>
      </div>` : '';

    /* ── Patient fields ── */
    const fieldsHtml = tpl ? tpl.fields
      .filter(f => p.fields?.[f.id])
      .map(f => `<div class="field-item"><span class="field-label">${f.name}</span><span class="field-value">${p.fields[f.id]}</span></div>`)
      .join('') : '';

    /* ── Evaluations ── */
    const evalsHtml = inc('evaluaciones') ? `
      <div class="section">
        <h3>Evaluaciones (${evaluations.length})</h3>
        ${[...evaluations].sort((a,b)=>b.date.localeCompare(a.date)).map(ev => `
          <div style="margin-bottom:1rem;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px">
            <strong>${ev.title||'Evaluación'}</strong>
            <span class="meta"> · ${Utils.formatDate(ev.date)}</span>
            ${(ev.instruments||[]).map(id => {
              const inst = instruments.find(i => i.id === id.instrumentId);
              const score = inst ? Utils.calcInstrumentScore(inst, id.values) : null;
              return `<div class="meta" style="margin-top:0.25rem">${id.instrumentName}${score!==null?' → <strong>'+score+' '+(inst?.scoring?.label||'pts')+'</strong>':''}</div>`;
            }).join('')}
            ${ev.notes ? `<div class="meta" style="margin-top:0.25rem">Notas: ${ev.notes}</div>` : ''}
          </div>`).join('')}
      </div>` : '';

    /* ── Notes ── */
    const notesHtml = inc('notas') ? `
      <div class="section">
        <h3>Notas Clínicas (${notes.length})</h3>
        ${[...notes].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(n => `
          <div style="margin-bottom:1rem;padding:0.75rem;border-left:3px solid #00A896;padding-left:1rem">
            <strong>${n.title||'Nota'}</strong>
            <span class="meta"> · ${Utils.formatDate(n.date)}${n.type?' · '+n.type:''}</span>
            <p style="margin:0.5rem 0 0;white-space:pre-wrap;font-size:0.875rem">${n.content||''}</p>
          </div>`).join('')}
      </div>` : '';

    /* ── Medications ── */
    const medsHtml = inc('medicamentos') && medications.length ? `
      <div class="section">
        <h3>Medicamentos (${medications.length})</h3>
        <table><thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>
          ${medications.map(m => `<tr><td>${m.name}</td><td>${m.dose||'—'}</td><td>${m.frequency||'—'}</td><td>${Utils.formatDate(m.startDate)}</td><td>${m.endDate?Utils.formatDate(m.endDate):'Activo'}</td></tr>`).join('')}
        </tbody></table>
      </div>` : '';

    /* ── Goals ── */
    const goalsHtml = inc('metas') && goals.length ? `
      <div class="section">
        <h3>Metas Terapéuticas (${goals.length})</h3>
        ${goals.map(g => `
          <div style="margin-bottom:0.75rem;display:flex;align-items:center;gap:1rem">
            <div style="flex:1">
              <strong>${g.title}</strong>
              <span class="meta"> · ${g.status} · ${g.progress}%</span>
            </div>
            <div style="width:120px;height:8px;background:#e2e8f0;border-radius:4px">
              <div style="width:${g.progress||0}%;height:100%;background:#1A56A0;border-radius:4px"></div>
            </div>
          </div>`).join('')}
      </div>` : '';

    /* ── Vitals ── */
    const vitalsHtml = inc('vitales') && vitals.length ? `
      <div class="section">
        <h3>Signos Vitales (últimas 10 mediciones)</h3>
        <table><thead><tr><th>Fecha</th><th>PAS</th><th>PAD</th><th>FC</th><th>SpO₂</th><th>Temp</th></tr></thead><tbody>
          ${[...vitals].sort((a,b)=>b.datetime.localeCompare(a.datetime)).slice(0,10)
            .map(v=>`<tr><td>${Utils.formatDate(v.datetime.split('T')[0])}</td>${['sbp','dbp','hr','spo2','temp'].map(f=>`<td>${v.values?.[f]??'—'}</td>`).join('')}</tr>`).join('')}
        </tbody></table>
      </div>` : '';

    /* ── Full HTML template ── */
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte Clínico — ${pName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;color:#0f172a;background:#f8fafc;line-height:1.6}
    .page{max-width:900px;margin:2rem auto;background:white;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden}
    .header{background:linear-gradient(135deg,#1A56A0,#00A896);color:white;padding:2rem 2.5rem}
    .header h1{font-size:1.6rem;font-weight:700;margin-bottom:0.25rem}
    .header .sub{opacity:.8;font-size:.9rem}
    .header .meta-row{display:flex;gap:1.5rem;margin-top:1rem;flex-wrap:wrap}
    .header .meta-item{font-size:.8rem;opacity:.9}
    .body{padding:2rem 2.5rem}
    .fields-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem 2rem;margin-bottom:1.5rem}
    .field-item{display:flex;flex-direction:column;gap:.1rem}
    .field-label{font-size:.7rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
    .field-value{font-size:.9rem;color:#0f172a}
    .section{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid #e2e8f0}
    .section:last-child{border-bottom:none}
    h3{font-size:1rem;font-weight:700;color:#1A56A0;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1rem}
    h4{font-size:.9rem;font-weight:600;margin-bottom:.5rem}
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    th{background:#f1f5f9;padding:.5rem .75rem;text-align:left;font-weight:600;color:#475569;font-size:.75rem;text-transform:uppercase}
    td{padding:.5rem .75rem;border-bottom:1px solid #f1f5f9}
    .meta{color:#64748b;font-size:.8rem}
    .footer{background:#f8fafc;padding:1rem 2.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.75rem;color:#94a3b8}
    @media print{body{background:white}.page{box-shadow:none;margin:0;border-radius:0}}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${pName}</h1>
      <div class="sub">Reporte Clínico Completo</div>
      <div class="meta-row">
        <div class="meta-item">📅 Generado el ${today}</div>
        ${clinicName ? `<div class="meta-item">🏥 ${clinicName}</div>` : ''}
        ${clinicSpec ? `<div class="meta-item">🔬 ${clinicSpec}</div>` : ''}
        <div class="meta-item">📊 ${evaluations.length} evaluaciones · ${notes.length} notas</div>
      </div>
    </div>
    <div class="body">
      ${fieldsHtml ? `<div class="section"><h3>Datos del Paciente</h3><div class="fields-grid">${fieldsHtml}</div></div>` : ''}
      ${chartsHtml || vitalChartsHtml ? `<div class="section"><h3>Evolución Clínica</h3>${chartsHtml}${vitalChartsHtml}</div>` : ''}
      ${evalsHtml}
      ${notesHtml}
      ${medsHtml}
      ${goalsHtml}
      ${vitalsHtml}
    </div>
    <div class="footer">
      <span>ClinAxis — Suite Clínica</span>
      <span>${pName} · Generado ${today}</span>
    </div>
  </div>
  <script>
    function _mc(id,lb,dt,cl){
      var el=document.getElementById(id);if(!el)return;
      new Chart(el,{type:'line',data:{labels:lb,datasets:[{data:dt,borderColor:cl,backgroundColor:cl+'22',tension:0.4,pointRadius:dt.length>6?2:3,fill:true,borderWidth:1.5,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return' '+c.parsed.y;}}}},scales:{x:{ticks:{font:{size:8},maxRotation:0,maxTicksLimit:4},grid:{display:false}},y:{ticks:{font:{size:8},maxTicksLimit:3}}}}});
    }
    window.addEventListener('load',function(){
      ${chartsScript}
      ${fieldChartsScript}
      ${vitalChartsScript}
    });
  <\/script>
</body>
</html>`;

    // Download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `reporte-${pName.replace(/\s+/g,'-').toLowerCase()}-${Utils.todayISO()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    Utils.toast('Reporte HTML descargado', 'success');

    // Preview
    document.getElementById('exp-preview-area').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Vista previa del reporte</h3>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('exp-preview-area').innerHTML=''">Cerrar</button>
        </div>
        <iframe srcdoc="${html.replace(/"/g,'&quot;')}" style="width:100%;height:600px;border:none"></iframe>
      </div>`;
  }

  return { render };
})();
