/* ============================================================
   ClinAxis — Analytics Module
   ============================================================ */

const AnalyticsModule = (() => {

  async function render(container) {
    document.getElementById('topbar-actions').innerHTML = '';
    document.getElementById('page-subtitle').textContent = 'Métricas de tu práctica clínica';
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    Charts.destroyAll();

    const [patients, evaluations, notes, goals, instruments, medications] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('evaluations'),
      DB.getAll('notes'),
      DB.getAll('goals'),
      DB.getAll('instruments'),
      DB.getAll('medications'),
    ]);

    const today = Utils.todayISO();

    /* ── KPIs ── */
    const thisMonth  = today.slice(0, 7);
    const lastMonth  = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
    const evThisM    = evaluations.filter(e => e.date.startsWith(thisMonth)).length;
    const evLastM    = evaluations.filter(e => e.date.startsWith(lastMonth)).length;
    const goalsAch   = goals.filter(g => g.status === 'Logrado').length;
    const goalTotal  = goals.length;
    const achRate    = goalTotal ? Math.round(goalsAch / goalTotal * 100) : 0;

    // Avg days between evaluations per patient
    let avgDaysBetween = null;
    let totalGaps = 0, gapCount = 0;
    patients.forEach(p => {
      const pe = evaluations.filter(e => e.patientId === p.id).sort((a,b)=>a.date.localeCompare(b.date));
      for (let i = 1; i < pe.length; i++) {
        const diff = (new Date(pe[i].date+'T12:00:00') - new Date(pe[i-1].date+'T12:00:00')) / 864e5;
        totalGaps += diff; gapCount++;
      }
    });
    if (gapCount) avgDaysBetween = Math.round(totalGaps / gapCount);

    /* ── Evaluations per week (last 12 weeks) ── */
    const weekLabels = [], weekData = [];
    for (let w = 11; w >= 0; w--) {
      const d = new Date(); d.setDate(d.getDate() - w*7);
      const start = new Date(d); start.setDate(start.getDate() - 6);
      const endStr   = d.toISOString().split('T')[0];
      const startStr = start.toISOString().split('T')[0];
      weekLabels.push(`Sem ${12-w}`);
      weekData.push(evaluations.filter(e => e.date >= startStr && e.date <= endStr).length);
    }

    /* ── Evaluations per month (last 6 months) ── */
    const monthLabels = [], monthEvals = [], monthNotes = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setMonth(d.getMonth()-m);
      const key = d.toISOString().slice(0,7);
      monthLabels.push(new Date(key+'-01T12:00:00').toLocaleString('es-ES',{month:'short',year:'2-digit'}));
      monthEvals.push(evaluations.filter(e => e.date.startsWith(key)).length);
      monthNotes.push(notes.filter(n => n.date.startsWith(key)).length);
    }

    /* ── Most used instruments ── */
    const instUsage = {};
    evaluations.forEach(ev => {
      (ev.instruments||[]).forEach(id => {
        const name = id.instrumentName || id.instrumentId;
        instUsage[name] = (instUsage[name]||0) + 1;
      });
    });
    const instSorted = Object.entries(instUsage).sort((a,b)=>b[1]-a[1]).slice(0,8);

    /* ── Goals by status ── */
    const goalStatus = { Activo:0, Logrado:0, Parcial:0, Abandonado:0 };
    goals.forEach(g => { if (goalStatus[g.status]!==undefined) goalStatus[g.status]++; });

    /* ── Patients registered per month ── */
    const patMonthMap = {};
    patients.forEach(p => {
      const key = new Date(p.createdAt).toISOString().slice(0,7);
      patMonthMap[key] = (patMonthMap[key]||0)+1;
    });

    container.innerHTML = `
      <!-- KPI Row -->
      <div class="grid-4 mb-6">
        ${_kpi(patients.length,       'Pacientes totales',           Utils.icon.patients,    'primary')}
        ${_kpi(evThisM,               `Evaluaciones este mes ${evLastM?`(vs ${evLastM} anterior)`:''}`, Utils.icon.evaluations, evThisM>=evLastM?'accent':'danger')}
        ${_kpi(avgDaysBetween??'—',   'Días prom. entre evaluaciones', Utils.icon.monitoring, 'neutral')}
        ${_kpi(achRate+'%',           `Tasa de logro de metas (${goalsAch}/${goalTotal})`, Utils.icon.goals, achRate>=70?'accent':'warning')}
      </div>

      <!-- Activity charts -->
      <div class="grid-2 mb-6">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Actividad mensual (6 meses)</h3></div>
          <div class="chart-wrap" style="height:240px"><canvas id="an-monthly"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Evaluaciones semanales (12 semanas)</h3></div>
          <div class="chart-wrap" style="height:240px"><canvas id="an-weekly"></canvas></div>
        </div>
      </div>

      <div class="grid-2 mb-6">
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Instrumentos más utilizados</h3></div>
          <div class="chart-wrap" style="height:260px"><canvas id="an-instruments"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3 class="card-title">Estado de metas terapéuticas</h3></div>
          <div class="chart-wrap" style="height:260px"><canvas id="an-goals"></canvas></div>
        </div>
      </div>

      <!-- Patients table -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">Resumen por paciente</h3></div>
        <table class="table">
          <thead><tr><th>Paciente</th><th>Evaluaciones</th><th>Última evaluación</th><th>Metas activas</th><th>Medicamentos</th></tr></thead>
          <tbody>
            ${patients.map(p => {
              const pEvals = evaluations.filter(e=>e.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date));
              const pGoals = goals.filter(g=>g.patientId===p.id&&g.status==='Activo').length;
              const pMeds  = medications.filter(m=>m.patientId===p.id&&(!m.endDate||m.endDate>=today)).length;
              return `<tr>
                <td><strong>${Utils.patientLabel(p)}</strong></td>
                <td>${pEvals.length}</td>
                <td>${pEvals[0]?Utils.formatDate(pEvals[0].date):'—'}</td>
                <td>${pGoals||'—'}</td>
                <td>${pMeds||'—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    /* Draw charts */
    Charts.bar('an-monthly', monthLabels, [
      { label: 'Evaluaciones', data: monthEvals },
      { label: 'Notas',        data: monthNotes },
    ]);
    Charts.bar('an-weekly', weekLabels, [{ label: 'Evaluaciones', data: weekData }]);
    Charts.bar('an-instruments', instSorted.map(([n])=>Utils.truncate(n,20)),
               [{ label: 'Usos', data: instSorted.map(([,v])=>v) }]);
    Charts.doughnut('an-goals', {
      labels: Object.keys(goalStatus),
      data:   Object.values(goalStatus),
      colors: ['#3B82F6','#10B981','#F59E0B','#EF4444'],
      title:  'Estado de metas',
    });
  }

  function _kpi(value, label, icon, color) {
    const cls = color === 'primary' ? 'stat-primary' : color === 'accent' ? 'stat-accent' :
                color === 'danger'  ? 'stat-danger'  : color === 'warning' ? '' : 'stat-neutral';
    const valColor = color === 'warning' ? 'var(--warning)' : '';
    return `
      <div class="card stat-card ${cls}">
        <div class="stat-icon">${icon}</div>
        <div class="stat-body">
          <div class="stat-value" style="${valColor?'color:'+valColor:''}">${value}</div>
          <div class="stat-label" style="font-size:.72rem">${label}</div>
        </div>
      </div>`;
  }

  return { render };
})();
