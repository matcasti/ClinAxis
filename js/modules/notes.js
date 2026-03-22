/* ============================================================
   ClinAxis — Notes Module
   ============================================================ */

const NotesModule = (() => {

  let _notes = [];
  let _patients = [];
  let _searchTerm = '';
  let _filterPatient = '';
  let _filterType = '';

  const NOTE_TYPES = ['Evolución', 'Interconsulta', 'Procedimiento', 'Observación', 'Alta', 'Otra'];

  async function render(container) {
    [_notes, _patients] = await Promise.all([
      DB.getAll('notes'),
      DB.getAll('patients'),
    ]);
    _notes.sort((a,b) => b.createdAt - a.createdAt);

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-note">
        ${Utils.icon.plus} Nueva Nota
      </button>`;
    document.getElementById('btn-new-note')?.addEventListener('click', () => openForm(null));

    renderList(container);
  }

  function renderList(container) {
    const filtered = _notes.filter(n => {
      const s = _searchTerm.toLowerCase();
      const matchSearch = !s || (n.title||'').toLowerCase().includes(s) || (n.content||'').toLowerCase().includes(s);
      const matchPatient = !_filterPatient || n.patientId === _filterPatient;
      const matchType = !_filterType || n.type === _filterType;
      return matchSearch && matchPatient && matchType;
    });

    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="search-box">
          ${Utils.icon.search}
          <input type="text" id="note-search" placeholder="Buscar notas…" value="${_searchTerm}">
        </div>
        <select class="form-select" id="note-filter-patient" style="max-width:200px">
          <option value="">Todos los pacientes</option>
          ${_patients.map(p => `<option value="${p.id}" ${_filterPatient===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
        </select>
        <select class="form-select" id="note-filter-type" style="max-width:160px">
          <option value="">Todos los tipos</option>
          ${NOTE_TYPES.map(t => `<option value="${t}" ${_filterType===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <span class="text-muted text-sm">${filtered.length} nota(s)</span>
      </div>

      ${filtered.length ? `
        <div class="grid-2" id="notes-grid">
          ${filtered.map(n => noteCard(n)).join('')}
        </div>` : `
        <div class="empty-state">
          ${Utils.icon.notes}
          <h3>Sin notas</h3>
          <p>Registra notas clínicas de tus pacientes</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-note').click()">
            ${Utils.icon.plus} Nueva Nota
          </button>
        </div>`}
    `;

    document.getElementById('note-search')?.addEventListener('input', Utils.debounce(e => {
      _searchTerm = e.target.value;
      renderList(container);
    }, 250));
    document.getElementById('note-filter-patient')?.addEventListener('change', e => {
      _filterPatient = e.target.value;
      renderList(container);
    });
    document.getElementById('note-filter-type')?.addEventListener('change', e => {
      _filterType = e.target.value;
      renderList(container);
    });
  }

  function noteCard(n) {
    const p = _patients.find(x => x.id === n.patientId);
    const pName = p ? Utils.patientLabel(p) : '';
    const tags = (n.tags || []).map(t => `<span class="chip">${t}</span>`).join('');
    return `
      <div class="card note-card">
        <div class="card-header">
          <div>
            <div class="note-title">${Utils.truncate(n.title||'Sin título', 45)}</div>
            <div class="text-xs text-muted">${pName ? pName + ' · ' : ''}${Utils.formatDate(n.date)}</div>
          </div>
          <div class="flex gap-1">
            ${n.type ? `<span class="badge badge-neutral text-xs">${n.type}</span>` : ''}
          </div>
        </div>
        <div class="note-content text-sm">${Utils.truncate(n.content||'', 140)}</div>
        ${tags ? `<div class="chips mt-2">${tags}</div>` : ''}
        <div class="flex gap-1 mt-3">
          <button class="btn btn-ghost btn-sm" onclick="NotesModule.openDetail('${n.id}')">
            ${Utils.icon.eye} Ver
          </button>
          <button class="btn btn-ghost btn-sm" onclick="NotesModule.openForm('${n.id}')">
            ${Utils.icon.edit} Editar
          </button>
          <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="NotesModule.deleteNote('${n.id}')">
            ${Utils.icon.trash}
          </button>
        </div>
      </div>`;
  }

  async function openDetail(id) {
    const n = await DB.get('notes', id);
    if (!n) return;
    const p = _patients.find(x => x.id === n.patientId);
    const pName = p ? Utils.patientLabel(p) : '—';
    const tags = (n.tags || []).map(t => `<span class="chip">${t}</span>`).join('');
    Utils.openLargeModal(n.title || 'Nota', `
      <div class="detail-grid mb-4">
        <div class="detail-item"><div class="detail-label">Paciente</div><div class="detail-value">${pName}</div></div>
        <div class="detail-item"><div class="detail-label">Fecha</div><div class="detail-value">${Utils.formatDate(n.date)}</div></div>
        <div class="detail-item"><div class="detail-label">Tipo</div><div class="detail-value">${n.type||'—'}</div></div>
      </div>
      ${tags ? `<div class="chips mb-4">${tags}</div>` : ''}
      <div class="note-full-content" style="white-space:pre-wrap;line-height:1.7">${n.content||''}</div>
    `, [
      { label: 'Editar', action: () => { Utils.closeLargeModal(); openForm(id); }},
    ]);
  }

  async function openForm(id) {
    const existing = id ? await DB.get('notes', id) : null;
    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select class="form-select" id="note-patient" required>
            <option value="">— Seleccionar —</option>
            ${_patients.map(p => `<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de nota</label>
          <select class="form-select" id="note-type">
            <option value="">Sin tipo</option>
            ${NOTE_TYPES.map(t => `<option value="${t}" ${existing?.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Título</label>
          <input type="text" class="form-input" id="note-title" placeholder="Título de la nota" value="${existing?.title||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input type="date" class="form-input" id="note-date" value="${existing?.date||Utils.todayISO()}">
        </div>
      </div>
      <div class="form-group mb-3">
        <label class="form-label">Contenido</label>
        <textarea class="form-input" id="note-content" rows="8" placeholder="Escribe tu nota clínica…">${existing?.content||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Etiquetas (separadas por coma)</label>
        <input type="text" class="form-input" id="note-tags" placeholder="ej: seguimiento, dolor, funcional" value="${(existing?.tags||[]).join(', ')}">
      </div>`;

    Utils.openLargeModal(existing ? 'Editar Nota' : 'Nueva Nota', body, async () => {
      const patientId = document.getElementById('note-patient').value;
      if (!patientId) { Utils.toast('Selecciona un paciente', 'warning'); return false; }
      const now = Date.now();
      const tags = document.getElementById('note-tags').value
        .split(',').map(t => t.trim()).filter(Boolean);
      const record = {
        id: existing?.id || Utils.uuid(),
        patientId,
        date: document.getElementById('note-date').value || Utils.todayISO(),
        title: document.getElementById('note-title').value,
        content: document.getElementById('note-content').value,
        tags,
        type: document.getElementById('note-type').value,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await DB.put('notes', record);
      _notes = await DB.getAll('notes');
      _notes.sort((a,b) => b.createdAt - a.createdAt);
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Nota actualizada' : 'Nota registrada', 'success');
      renderList(document.getElementById('module-container'));
    });
  }

  async function deleteNote(id) {
    const ok = await Utils.confirm('¿Eliminar nota?', 'Esta acción no se puede deshacer.');
    if (!ok) return;
    await DB.del('notes', id);
    _notes = await DB.getAll('notes');
    _notes.sort((a,b) => b.createdAt - a.createdAt);
    Utils.toast('Nota eliminada', 'info');
    renderList(document.getElementById('module-container'));
  }

  return { render, openDetail, openForm, deleteNote };
})();
