/* ============================================================
   ClinAxis — Dashboard Module
   ============================================================ */

const DashboardModule = (() => {

  async function render(container) {
    
    const [patients, evaluations, reminders, notes, goals, vitals] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('evaluations'),
      DB.getAll('reminders'),
      DB.getAll('notes'),
      DB.getAll('goals'),
      DB.getAll('vitals'),
    ]);

    const today = Utils.todayISO();
    const overdueReminders = reminders.filter(r => !r.completed && r.date < today);
    const upcomingReminders = reminders.filter(r => !r.completed && r.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date)).slice(0, 5);
    const recentEvals = [...evaluations].sort((a,b) => b.createdAt - a.createdAt).slice(0, 6);
    const thisWeek = Date.now() - 7 * 86400000;
    const newPatients = patients.filter(p => p.createdAt >= thisWeek).length;

    // Build topbar
    document.getElementById('page-subtitle').textContent = `Resumen de tu actividad clínica`;
    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="App.navigateTo('patients')">
        ${Utils.icon.plus} Nuevo Paciente
      </button>`;

    container.innerHTML = `
      <!-- Stat cards -->
      <div class="grid-4 mb-6">
        ${statCard(Utils.icon.patients, 'Pacientes', patients.length, `+${newPatients} esta semana`, 'primary')}
        ${statCard(Utils.icon.evaluations, 'Evaluaciones', evaluations.length, recentEvals.length + ' recientes', 'accent')}
        ${statCard(Utils.icon.reminders, 'Recordatorios', upcomingReminders.length, overdueReminders.length + ' vencidos', overdueReminders.length ? 'danger' : 'neutral')}
        ${statCard(Utils.icon.notes, 'Notas', notes.length, 'Registro clínico', 'neutral')}
      </div>
      
      <!-- Alerts widget (filled async) -->
      <div id="dash-alerts-area"></div>
      
      ${(() => {
        const alerts = [];
        // Pacientes sin evaluación en 30 días
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
        const thirtyISO = thirtyDaysAgo.toISOString().split('T')[0];
        const patientsWithRecentEval = new Set(evaluations.filter(e=>e.date>=thirtyISO).map(e=>e.patientId));
        const inactivePatients = patients.filter(p => !patientsWithRecentEval.has(p.id) && p.createdAt < thirtyDaysAgo.getTime());
        if (inactivePatients.length) alerts.push(`${inactivePatients.length} paciente(s) sin evaluación en los últimos 30 días`);
        // Metas vencidas sin lograr
        const overdueGoals = goals.filter(g => g.status==='Activo' && g.targetDate && g.targetDate < Utils.todayISO());
        if (overdueGoals.length) alerts.push(`${overdueGoals.length} meta(s) con plazo vencido`);
      
        if (!alerts.length) return '';
        return `<div class="card mb-4 border-danger">
          <div class="card-header"><h3 class="card-title text-danger">⚠ Alertas clínicas</h3></div>
          ${alerts.map(a=>`<div class="timeline-item"><div class="timeline-dot dot-danger"></div><div class="timeline-content"><div class="timeline-title text-sm">${a}</div></div></div>`).join('')}
        </div>`;
      })()}

      <div class="grid-2 mb-6">
        <!-- Activity chart -->
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Evaluaciones — Últimos 30 días</h3>
          </div>
          <div class="chart-wrap" style="height:220px">
            <canvas id="chart-activity"></canvas>
          </div>
        </div>

        <!-- Upcoming reminders -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Utils.icon.calendar} Próximos Recordatorios</h3>
            <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('reminders')">Ver todos</button>
          </div>
          <div id="reminders-list">
            ${upcomingReminders.length ? upcomingReminders.map(r => reminderRow(r, patients)).join('') : emptyMsg('Sin recordatorios próximos')}
          </div>
        </div>
      </div>

      <!-- Recent evaluations -->
      <div class="card mb-6">
        <div class="card-header">
          <h3 class="card-title">${Utils.icon.evaluations} Evaluaciones Recientes</h3>
          <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('evaluations')">Ver todas</button>
        </div>
        <div id="recent-evals">
          ${recentEvals.length ? recentEvals.map(e => evalRow(e, patients)).join('') : emptyMsg('Sin evaluaciones registradas')}
        </div>
      </div>

      ${overdueReminders.length ? `
      <div class="card mb-6 border-danger">
        <div class="card-header">
          <h3 class="card-title text-danger">${Utils.icon.calendar} Recordatorios Vencidos (${overdueReminders.length})</h3>
        </div>
        <div>${overdueReminders.map(r => reminderRow(r, patients, true)).join('')}</div>
      </div>` : ''}
    `;

    renderActivityChart(evaluations);

    // Poblar widget de alertas de forma asíncrona (no bloquea el render)
    AlertsModule.compute().then(alerts => {
      const critical = alerts.filter(a => a.severity === 'critical');
      const warnings = alerts.filter(a => a.severity === 'warning');
      const alertArea = document.getElementById('dash-alerts-area');
      if (!alertArea) return;
      if (!critical.length && !warnings.length) {
        alertArea.remove();
        return;
      }
      const items = [...critical, ...warnings].slice(0, 5);
      alertArea.innerHTML = `
        <div class="card mb-4 ${critical.length ? 'border-danger' : ''}"
             style="${!critical.length ? 'border-color:var(--warning)' : ''}">
          <div class="card-header">
            <h3 class="card-title ${critical.length ? 'text-danger' : ''}"
                style="${!critical.length ? 'color:var(--warning)' : ''}">
              ${critical.length ? '🔴' : '🟡'}
              ${critical.length} alerta(s) crítica(s) · ${warnings.length} advertencia(s)
            </h3>
            <button class="btn btn-ghost btn-sm"
                    onclick="App.navigateTo('alerts')">
              Ver todas →
            </button>
          </div>
          ${items.map(a => `
            <div class="timeline-item"
                 onclick="App.navigateTo('alerts')"
                 style="cursor:pointer">
              <div class="timeline-dot ${a.severity === 'critical' ? 'dot-danger' : ''}"
                   style="${a.severity === 'warning' ? 'background:var(--warning)' : ''}">
              </div>
              <div class="timeline-content">
                <div class="timeline-title">${a.title}</div>
                <div class="timeline-meta">${a.body}</div>
              </div>
            </div>`).join('')}
        </div>`;
    }).catch(() => {}); // silencioso si AlertsModule aún no tiene datos
  }

  function statCard(iconSvg, label, value, sub, color) {
    const colorClass = color === 'primary' ? 'stat-primary' : color === 'accent' ? 'stat-accent' : color === 'danger' ? 'stat-danger' : 'stat-neutral';
    return `
      <div class="card stat-card ${colorClass}">
        <div class="stat-icon">${iconSvg}</div>
        <div class="stat-body">
          <div class="stat-value">${value}</div>
          <div class="stat-label">${label}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      </div>`;
  }

  function reminderRow(r, patients, overdue = false) {
    const p = patients.find(x => x.id === r.patientId);
    const pName = p ? Utils.patientLabel(p) : '';
    const days = Utils.daysUntil(r.date);
    const daysLabel = overdue ? `Venció hace ${Math.abs(days)} días` : days === 0 ? 'Hoy' : `En ${days} días`;
    return `
      <div class="timeline-item ${overdue ? 'overdue' : ''}">
        <div class="timeline-dot ${overdue ? 'dot-danger' : 'dot-accent'}"></div>
        <div class="timeline-content">
          <div class="timeline-title">${Utils.truncate(r.title, 50)}</div>
          <div class="timeline-meta">
            ${pName ? `<span>${pName}</span> · ` : ''}
            <span class="${overdue ? 'text-danger' : ''}">${daysLabel} — ${Utils.formatDate(r.date)}</span>
          </div>
        </div>
      </div>`;
  }

  function evalRow(e, patients) {
    const p = patients.find(x => x.id === e.patientId);
    const pName = p ? Utils.patientLabel(p) : 'Paciente desconocido';
    return `
      <div class="timeline-item" style="cursor:pointer" onclick="App.navigateTo('evaluations')">
        <div class="timeline-dot dot-primary"></div>
        <div class="timeline-content">
          <div class="timeline-title">${Utils.truncate(e.title || 'Evaluación', 50)} <span class="badge badge-neutral ml-1">${(e.instruments||[]).length} instrumento(s)</span></div>
          <div class="timeline-meta">${pName} · ${Utils.formatDate(e.date)}</div>
        </div>
      </div>`;
  }

  function emptyMsg(msg) {
    return `<div class="empty-state" style="padding:1.5rem">${msg}</div>`;
  }

  function renderActivityChart(evaluations) {
    // Build last 30 days bins
    const days = [];
    const counts = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(Utils.formatDateShort(d.toISOString().split('T')[0]));
      const dayStr = d.toISOString().split('T')[0];
      counts.push(evaluations.filter(e => e.date === dayStr).length);
    }

    Charts.line('chart-activity', days, [{
      label: 'Evaluaciones',
      data: counts,
      tension: 0.4,
      fill: true,
    }]);
  }

  return { render };
})();
