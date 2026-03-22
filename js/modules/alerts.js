/* ============================================================
   ClinAxis — Alerts Module
   ============================================================ */

const AlertsModule = (() => {

  const SEV = { critical: 3, warning: 2, info: 1 };

  const VITAL_LIMITS = {
    sbp:     { min: 80,  max: 180,  name: 'PAS (mmHg)' },
    dbp:     { min: 50,  max: 110,  name: 'PAD (mmHg)' },
    hr:      { min: 40,  max: 150,  name: 'FC (lpm)' },
    spo2:    { min: 90,             name: 'SpO₂ (%)' },
    temp:    { min: 35,  max: 39.5, name: 'Temp (°C)' },
    glucose: { min: 50,  max: 400,  name: 'Glucosa (mg/dL)' },
  };

  const TYPE_LABELS = {
    score_deterioration: 'Deterioro clínico',
    inactive:            'Sin seguimiento',
    overdue_goal:        'Meta vencida',
    vital_critical:      'Signo vital crítico',
    overdue_reminder:    'Recordatorio pendiente',
  };

  async function compute() {
    const [patients, evals, goals, vitals, instruments, reminders] = await Promise.all([
      DB.getAll('patients'),    DB.getAll('evaluations'),
      DB.getAll('goals'),       DB.getAll('vitals'),
      DB.getAll('instruments'), DB.getAll('reminders'),
    ]);

    const alerts = [];
    const today  = Utils.todayISO();
    const d14    = new Date(); d14.setDate(d14.getDate() - 14);
    const d14ISO = d14.toISOString().split('T')[0];
    const d30    = new Date(); d30.setDate(d30.getDate() - 30);
    const d30ISO = d30.toISOString().split('T')[0];

    /* ── 1. Deterioro de score (cambio >15% en dirección negativa en últimos 14 días) ── */
    patients.forEach(p => {
      const pEvals = evals.filter(e => e.patientId === p.id)
                         .sort((a, b) => a.date.localeCompare(b.date));
      const series = {};
      pEvals.forEach(ev => {
        (ev.instruments || []).forEach(id => {
          const inst = instruments.find(i => i.id === id.instrumentId);
          if (!inst || inst.scoring?.type === 'none') return;
          const score = Utils.calcInstrumentScore(inst, id.values);
          if (score === null) return;
          if (!series[inst.id]) series[inst.id] = { name: id.instrumentName, inst, pts: [] };
          series[inst.id].pts.push({ date: ev.date, score });
        });
      });

      Object.values(series).forEach(({ name, inst, pts }) => {
        if (pts.length < 2) return;
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        if (last.date < d14ISO) return;
        const delta = last.score - prev.score;
        const max   = inst.scoring?.maxScore || 100;
        const pct   = Math.abs(delta) / max * 100;
        const dir   = inst.scoring?.direction || 'higher_better';
        const isBad = (dir === 'higher_better' && delta < 0) || (dir === 'lower_better' && delta > 0);
        if (!isBad || pct < 15) return;
        alerts.push({
          id: `det-${p.id}-${inst.id}`,
          severity:  pct >= 30 ? 'critical' : 'warning',
          type:      'score_deterioration',
          patientId: p.id,
          title:     `Deterioro en ${name}`,
          body:      `${Utils.patientLabel(p)}: ${prev.score} → ${last.score} pts (${delta > 0 ? '+' : ''}${delta}) · ${Utils.formatDate(last.date)}`,
          date:      last.date,
          action:    'monitoring',
        });
      });
    });

    /* ── 2. Pacientes sin evaluación en >30 días ── */
    const recentPids = new Set(evals.filter(e => e.date >= d30ISO).map(e => e.patientId));
    patients.forEach(p => {
      if (recentPids.has(p.id) || p.createdAt >= d30.getTime()) return;
      const last = evals.filter(e => e.patientId === p.id)
                        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const days = last
        ? Math.floor((Date.now() - new Date(last.date + 'T12:00:00')) / 864e5)
        : null;
      alerts.push({
        id:        `inactive-${p.id}`,
        severity:  days && days > 60 ? 'warning' : 'info',
        type:      'inactive',
        patientId: p.id,
        title:     'Sin evaluación reciente',
        body:      `${Utils.patientLabel(p)}: ${days ? `${days} días sin evaluación` : 'Sin evaluaciones registradas'}`,
        date:      last?.date || '',
        action:    'evaluations',
      });
    });

    /* ── 3. Metas vencidas sin lograr ── */
    goals.filter(g => g.status === 'Activo' && g.targetDate && g.targetDate < today)
      .forEach(g => {
        const p = patients.find(x => x.id === g.patientId);
        alerts.push({
          id:        `goal-${g.id}`,
          severity:  'warning',
          type:      'overdue_goal',
          patientId: g.patientId,
          title:     `Meta vencida: ${Utils.truncate(g.title, 35)}`,
          body:      `${p ? Utils.patientLabel(p) : '—'} · Plazo: ${Utils.formatDate(g.targetDate)} · Progreso: ${g.progress}%`,
          date:      g.targetDate,
          action:    'goals',
        });
      });

    /* ── 4. Signos vitales críticos (última lectura) ── */
    const latestV = {};
    vitals.forEach(v => {
      if (!latestV[v.patientId] || v.datetime > latestV[v.patientId].datetime)
        latestV[v.patientId] = v;
    });
    Object.values(latestV).forEach(v => {
      const p = patients.find(x => x.id === v.patientId);
      Object.entries(VITAL_LIMITS).forEach(([fid, lim]) => {
        const val = parseFloat(v.values?.[fid]);
        if (isNaN(val)) return;
        const out = (lim.min !== undefined && val < lim.min) ||
                    (lim.max !== undefined && val > lim.max);
        if (!out) return;
        alerts.push({
          id:        `vital-${v.patientId}-${fid}`,
          severity:  'critical',
          type:      'vital_critical',
          patientId: v.patientId,
          title:     `${lim.name} fuera de rango`,
          body:      `${p ? Utils.patientLabel(p) : '—'}: ${lim.name} = ${val} · ${Utils.formatDate(v.datetime.split('T')[0])}`,
          date:      v.datetime.split('T')[0],
          action:    'vitals',
        });
      });
    });

    /* ── 5. Recordatorios vencidos >7 días ── */
    reminders.filter(r => !r.completed && r.date < today).forEach(r => {
      const days = Math.floor((Date.now() - new Date(r.date + 'T12:00:00')) / 864e5);
      if (days <= 7) return;
      const p = patients.find(x => x.id === r.patientId);
      alerts.push({
        id:        `rem-${r.id}`,
        severity:  'info',
        type:      'overdue_reminder',
        patientId: r.patientId,
        title:     'Recordatorio sin completar',
        body:      `${p ? Utils.patientLabel(p) + ' · ' : ''}${r.title} · Vencido hace ${days} días`,
        date:      r.date,
        action:    'reminders',
      });
    });

    return alerts.sort((a, b) =>
      (SEV[b.severity] - SEV[a.severity]) || b.date.localeCompare(a.date)
    );
  }

  async function getCount() {
    const al = await compute();
    return al.filter(a => a.severity !== 'info').length;
  }

  function _row(a) {
    const dotStyle = a.severity === 'warning'
      ? 'background:var(--warning)'
      : '';
    const dotClass = a.severity === 'critical' ? 'dot-danger' :
                     a.severity === 'warning'  ? '' : 'dot-neutral';
    const badgeClass = a.severity === 'critical' ? 'badge-danger' :
                       a.severity === 'warning'  ? 'badge-warning' : 'badge-neutral';
    const sevLabel   = a.severity === 'critical' ? 'Crítico' :
                       a.severity === 'warning'  ? 'Advertencia' : 'Info';
    return `
      <div class="timeline-item" style="cursor:pointer" onclick="App.navigateTo('${a.action}')">
        <div class="timeline-dot ${dotClass}" style="${dotStyle}"></div>
        <div class="timeline-content" style="flex:1">
          <div class="flex-between">
            <div>
              <div class="timeline-title">${a.title}</div>
              <div class="timeline-meta">${a.body}</div>
            </div>
            <div class="flex gap-2 items-center">
              <span class="badge badge-neutral text-xs">${TYPE_LABELS[a.type] || a.type}</span>
              <span class="badge ${badgeClass} text-xs">${sevLabel}</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function render(container) {
    document.getElementById('topbar-actions').innerHTML = '';
    document.getElementById('page-subtitle').textContent =
      'Detección automática de situaciones clínicas relevantes';
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    const alerts = await compute();

    if (!alerts.length) {
      container.innerHTML = `
        <div class="empty-state">
          ${Utils.icon.monitoring}
          <h3>Sin alertas activas</h3>
          <p>Todos los pacientes están en seguimiento adecuado</p>
        </div>`;
      return;
    }

    const groups = [
      { label: '🔴 Crítico',     sev: 'critical', borderColor: 'var(--danger)',  titleClass: 'text-danger' },
      { label: '🟡 Advertencia', sev: 'warning',  borderColor: 'var(--warning)', titleClass: '' },
      { label: '🔵 Informativo', sev: 'info',     borderColor: 'var(--border)',  titleClass: 'text-muted' },
    ];

    container.innerHTML = groups.map(g => {
      const items = alerts.filter(a => a.severity === g.sev);
      if (!items.length) return '';
      return `
        <div class="card mb-4" style="border-color:${g.borderColor}">
          <div class="card-header">
            <h3 class="card-title ${g.titleClass}">${g.label} (${items.length})</h3>
            <button class="btn btn-ghost btn-sm"
              onclick="this.closest('.card').querySelector('.alerts-body').classList.toggle('hidden')">
              Colapsar
            </button>
          </div>
          <div class="alerts-body">${items.map(_row).join('')}</div>
        </div>`;
    }).join('') +
    `<p class="text-xs text-muted text-right mt-2">
       Actualizado: ${new Date().toLocaleString('es-ES')}
     </p>`;
  }

  return { compute, getCount, render };
})();
