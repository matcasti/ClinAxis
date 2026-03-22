/* ============================================================
   ClinAxis — Medications Module
   ============================================================ */

const MedicationsModule = (() => {

  let _patients = [];
  let _meds     = [];
  let _filterPatient = '';

  const FREQUENCIES = ['Cada 4h','Cada 6h','Cada 8h','Cada 12h','Cada 24h','1x/día','2x/día','3x/día','Según necesidad','Otra'];
  const ROUTES      = ['Oral','Sublingual','IV','IM','SC','Tópico','Inhalado','Transdérmico','Rectal','Otro'];

  async function render(container) {
    [_patients, _meds] = await Promise.all([
      DB.getAll('patients'),
      DB.getAll('medications'),
    ]);
    _meds.sort((a, b) => b.createdAt - a.createdAt);

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-med">
        ${Utils.icon.plus} Nuevo Medicamento
      </button>`;
    document.getElementById('btn-new-med')?.addEventListener('click', () => openForm(null));

    renderList(container);
  }

  function renderList(container) {
    const today    = Utils.todayISO();
    const filtered = _meds.filter(m =>
      !_filterPatient || m.patientId === _filterPatient
    );
    const active   = filtered.filter(m => !m.endDate || m.endDate >= today);
    const inactive = filtered.filter(m =>  m.endDate && m.endDate <  today);

    container.innerHTML = `
      <div class="toolbar mb-4">
        <select class="form-select" id="med-filter-patient" style="min-width:240px">
          <option value="">Todos los pacientes</option>
          ${_patients.map(p => `
            <option value="${p.id}" ${_filterPatient === p.id ? 'selected' : ''}>
              ${Utils.patientLabel(p)}
            </option>`).join('')}
        </select>
        <span class="text-muted text-sm">${active.length} activo(s) · ${inactive.length} finalizado(s)</span>
      </div>

      ${active.length ? `
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Medicamentos Activos (${active.length})</h3></div>
          <table class="table">${_tableHead()}
            <tbody>${active.map(medRow).join('')}</tbody>
          </table>
        </div>` : '<div class="empty-state" style="padding:3rem">' + Utils.icon.notes + '<h3>Sin medicamentos activos</h3></div>'}

      ${inactive.length ? `
        <details>
          <summary class="text-muted text-sm mb-2" style="cursor:pointer">
            Medicamentos finalizados (${inactive.length})
          </summary>
          <div class="card">
            <table class="table">${_tableHead()}
              <tbody>${inactive.map(medRow).join('')}</tbody>
            </table>
          </div>
        </details>` : ''}
    `;

    document.getElementById('med-filter-patient')?.addEventListener('change', e => {
      _filterPatient = e.target.value;
      renderList(container);
    });
  }

  function _tableHead() {
    return `<thead><tr>
      <th>Paciente</th><th>Medicamento</th><th>Dosis</th>
      <th>Frecuencia</th><th>Vía</th><th>Inicio</th><th>Fin</th>
      <th>Prescriptor</th><th></th>
    </tr></thead>`;
  }

  function medRow(m) {
    const p = _patients.find(x => x.id === m.patientId);
    return `
      <tr>
        <td><strong>${p ? Utils.patientLabel(p) : '—'}</strong></td>
        <td>
          <div class="fw-600">${m.name}</div>
          ${m.notes ? `<div class="text-xs text-muted">${Utils.truncate(m.notes, 50)}</div>` : ''}
        </td>
        <td>${m.dose || '—'}</td>
        <td>${m.frequency || '—'}</td>
        <td>${m.route || '—'}</td>
        <td>${Utils.formatDate(m.startDate)}</td>
        <td>${m.endDate ? Utils.formatDate(m.endDate) : '<span class="badge badge-success text-xs">Activo</span>'}</td>
        <td class="text-sm text-muted">${m.prescriber || '—'}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-icon" onclick="MedicationsModule.openForm('${m.id}')">${Utils.icon.edit}</button>
            <button class="btn btn-icon btn-danger" onclick="MedicationsModule.deleteMed('${m.id}')">${Utils.icon.trash}</button>
          </div>
        </td>
      </tr>`;
  }

  async function openForm(id) {
    const existing = id ? await DB.get('medications', id) : null;
    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select class="form-select" id="med-patient">
            <option value="">— Seleccionar —</option>
            ${_patients.map(p => `<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre del medicamento *</label>
          <input type="text" class="form-input" id="med-name" value="${existing?.name||''}" placeholder="Ej: Atorvastatina">
        </div>
      </div>
      <div class="grid-4 mb-3">
        <div class="form-group">
          <label class="form-label">Dosis</label>
          <input type="text" class="form-input" id="med-dose" value="${existing?.dose||''}" placeholder="Ej: 20 mg">
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia</label>
          <select class="form-select" id="med-frequency">
            <option value="">—</option>
            ${FREQUENCIES.map(f => `<option value="${f}" ${existing?.frequency===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Vía</label>
          <select class="form-select" id="med-route">
            <option value="">—</option>
            ${ROUTES.map(r => `<option value="${r}" ${existing?.route===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Prescriptor</label>
          <input type="text" class="form-input" id="med-prescriber" value="${existing?.prescriber||''}" placeholder="Dr. García">
        </div>
      </div>
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Fecha de inicio *</label>
          <input type="date" class="form-input" id="med-start" value="${existing?.startDate||Utils.todayISO()}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de fin (opcional)</label>
          <input type="date" class="form-input" id="med-end" value="${existing?.endDate||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Indicaciones / Notas</label>
        <textarea class="form-input" id="med-notes" rows="2">${existing?.notes||''}</textarea>
      </div>`;

    Utils.openModal(existing ? 'Editar Medicamento' : 'Nuevo Medicamento', body, async () => {
      const patientId = document.getElementById('med-patient').value;
      const name      = document.getElementById('med-name').value.trim();
      if (!patientId || !name) { Utils.toast('Paciente y medicamento son obligatorios', 'warning'); return false; }
      const record = {
        id:          existing?.id || Utils.uuid(),
        patientId,
        name,
        dose:        document.getElementById('med-dose').value,
        frequency:   document.getElementById('med-frequency').value,
        route:       document.getElementById('med-route').value,
        prescriber:  document.getElementById('med-prescriber').value,
        startDate:   document.getElementById('med-start').value,
        endDate:     document.getElementById('med-end').value || null,
        notes:       document.getElementById('med-notes').value,
        createdAt:   existing?.createdAt || Date.now(),
      };
      await DB.put('medications', record);
      _meds = await DB.getAll('medications');
      _meds.sort((a, b) => b.createdAt - a.createdAt);
      Utils.closeModal();
      Utils.toast(existing ? 'Medicamento actualizado' : 'Medicamento registrado', 'success');
      renderList(document.getElementById('module-container'));
    });
  }

  async function deleteMed(id) {
    const m = await DB.get('medications', id);
    const ok = await Utils.confirm('¿Eliminar este medicamento? Esta acción no se puede deshacer.', 'Eliminar medicamento');
    if (!ok) return;
    await DB.del('medications', id);
    _meds = await DB.getAll('medications');
    renderList(document.getElementById('module-container'));
    Utils.toastWithUndo(`Medicamento "${m.name}" eliminado`, async () => {
      await DB.put('medications', m);
      _meds = await DB.getAll('medications');
      renderList(document.getElementById('module-container'));
    });
  }

  return { render, openForm, deleteMed };
})();
