const GoalsModule = (() => {
  let _goals = [];
  let _patients = [];
  let _instruments = [];

  const STATUS = ['Activo', 'Logrado', 'Parcial', 'Abandonado'];
  const PRIORITY = ['Alta', 'Media', 'Baja'];

  async function render(container) {
    [_goals, _patients, _instruments] = await Promise.all([
      DB.getAll('goals'), DB.getAll('patients'), DB.getAll('instruments'),
    ]);
    _goals.sort((a,b) => b.createdAt - a.createdAt);

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-goal">
        ${Utils.icon.plus} Nueva Meta
      </button>`;
    document.getElementById('btn-new-goal')?.addEventListener('click', () => openForm(null));
    renderList(container);
  }

  function renderList(container) {
    const byStatus = (st) => _goals.filter(g => g.status === st);
    const columns = STATUS.map(st => `
      <div>
        <div class="flex-between mb-2">
          <h4 class="text-sm fw-600">${st}
            <span class="badge badge-neutral ml-1">${byStatus(st).length}</span>
          </h4>
        </div>
        ${byStatus(st).map(g => goalCard(g)).join('') ||
          `<div class="card" style="padding:1rem;opacity:.5;font-size:.8rem;text-align:center">Sin metas</div>`}
      </div>`).join('');

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
        ${columns}
      </div>`;
  }

  function goalCard(g) {
    const p = _patients.find(x => x.id === g.patientId);
    const pct = g.progress ?? 0;
    const priorityColor = g.priority==='Alta'?'danger':g.priority==='Media'?'warning':'neutral';
    return `
      <div class="card mb-2" style="padding:.875rem">
        <div class="flex-between mb-2">
          <span class="badge badge-${priorityColor}" style="font-size:.65rem">${g.priority||'—'}</span>
          <div class="flex gap-1">
            <button class="btn btn-icon btn-sm" onclick="GoalsModule.openForm('${g.id}')">${Utils.icon.edit}</button>
            <button class="btn btn-icon btn-danger btn-sm" onclick="GoalsModule.deleteGoal('${g.id}')">${Utils.icon.trash}</button>
          </div>
        </div>
        <div class="fw-600 text-sm mb-1">${Utils.truncate(g.title,50)}</div>
        <div class="text-xs text-muted mb-2">${p?Utils.patientLabel(p):'—'} · Plazo: ${Utils.formatDate(g.targetDate)}</div>
        <div class="progress-bar mb-1"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--success)':pct>50?'var(--warning)':'var(--primary)'}"></div></div>
        <div class="flex-between text-xs text-muted">
          <span>Progreso</span><span>${pct}%</span>
        </div>
        ${g.measure ? `<div class="text-xs text-muted mt-1">Medida: ${g.measure}</div>` : ''}
      </div>`;
  }

  async function openForm(id) {
    const existing = id ? await DB.get('goals', id) : null;
    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select class="form-select" id="goal-patient">
            <option value="">— Seleccionar —</option>
            ${_patients.map(p=>`<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Prioridad</label>
          <select class="form-select" id="goal-priority">
            ${PRIORITY.map(p=>`<option value="${p}" ${existing?.priority===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Meta (específica y medible) *</label>
        <input type="text" class="form-input" id="goal-title" value="${existing?.title||''}"
          placeholder="Ej: Paciente logrará marcha 100m sin ayuda técnica">
      </div>
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Medida / Criterio de logro</label>
          <input type="text" class="form-input" id="goal-measure" value="${existing?.measure||''}"
            placeholder="Ej: Test TUG < 12 seg">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha objetivo</label>
          <input type="date" class="form-input" id="goal-date" value="${existing?.targetDate||''}">
        </div>
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Progreso actual: <span id="goal-pct-label">${existing?.progress??0}%</span></label>
        <input type="range" class="form-range" id="goal-progress" min="0" max="100" step="5"
          value="${existing?.progress??0}"
          oninput="document.getElementById('goal-pct-label').textContent=this.value+'%'">
      </div>
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-select" id="goal-status">
            ${STATUS.map(s=>`<option value="${s}" ${existing?.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Vincular a instrumento (actualización automática de progreso)</label>
          <select class="form-select" id="goal-linked-inst">
            <option value="">Sin vínculo automático</option>
            ${_instruments.filter(i => i.scoring?.type !== 'none').map(i =>
              `<option value="${i.id}" ${existing?.linkedInstrumentId===i.id?'selected':''}>${i.name}</option>`
            ).join('')}
          </select>
          <p class="form-hint">Al registrar una evaluación con este instrumento para el paciente, el progreso de la meta se actualizará automáticamente.</p>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas / Estrategia</label>
        <textarea class="form-input" id="goal-notes" rows="3">${existing?.notes||''}</textarea>
      </div>`;

    Utils.openLargeModal(existing ? 'Editar Meta' : 'Nueva Meta Terapéutica', body, async () => {
      const patientId = document.getElementById('goal-patient').value;
      const title = document.getElementById('goal-title').value.trim();
      if (!patientId || !title) { Utils.toast('Paciente y meta son obligatorios', 'warning'); return false; }
      const record = {
        id: existing?.id || Utils.uuid(),
        patientId, title,
        measure: document.getElementById('goal-measure').value,
        targetDate: document.getElementById('goal-date').value,
        progress: +document.getElementById('goal-progress').value,
        status: document.getElementById('goal-status').value,
        linkedInstrumentId: document.getElementById('goal-linked-inst').value || null,
        priority: document.getElementById('goal-priority').value,
        notes: document.getElementById('goal-notes').value,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await DB.put('goals', record);
      _goals = await DB.getAll('goals');
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Meta actualizada' : 'Meta registrada', 'success');
      renderList(document.getElementById('module-container'));
    });
  }

  async function deleteGoal(id) {
    const ok = await Utils.confirm('¿Eliminar meta?', '');
    if (!ok) return;
    await DB.del('goals', id);
    _goals = await DB.getAll('goals');
    Utils.toast('Meta eliminada', 'info');
    renderList(document.getElementById('module-container'));
  }

  return { render, openForm, deleteGoal };
})();
