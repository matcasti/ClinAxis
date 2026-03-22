/* ============================================================
   ClinAxis — Dashboard Module
   ============================================================ */

const DashboardModule = (() => {

  async function render(container) {
    const [patients, evaluations, reminders, notes] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('evaluations'),
      DB.getAll('reminders'),
      DB.getAll('notes'),
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

    Charts.bar('chart-activity', days, [{
      label: 'Evaluaciones',
      data: counts,
    }], { tension: 0.4, fillArea: true });
  }

  return { render };
})();
