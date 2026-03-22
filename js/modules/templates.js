/* ============================================================
   ClinAxis — Templates Module
   ============================================================ */

const TemplatesModule = (() => {

  let _templates = [];
  let _editingFields = [];

  const FIELD_TYPES = [
    { value: 'text', label: 'Texto corto' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'date', label: 'Fecha' },
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Selección' },
    { value: 'tel', label: 'Teléfono' },
    { value: 'email', label: 'Email' },
    { value: 'checkbox', label: 'Casilla' },
  ];

  const CATEGORIES = ['General', 'Médica', 'Psicológica', 'Neurológica', 'Rehabilitación', 'Pediátrica', 'Geriátrica', 'TO', 'Otra'];

  async function render(container) {
    _templates = await DB.getAll('templates');
    _templates.sort((a,b) => a.name.localeCompare(b.name));

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-tpl">
        ${Utils.icon.plus} Nueva Plantilla
      </button>`;
    document.getElementById('btn-new-tpl')?.addEventListener('click', () => openForm(null));

    renderList(container);
  }

  function renderList(container) {
    container.innerHTML = _templates.length ? `
      <div class="grid-2">
        ${_templates.map(t => templateCard(t)).join('')}
      </div>` : `
      <div class="empty-state">
        ${Utils.icon.templates}
        <h3>Sin plantillas</h3>
        <p>Crea plantillas de fichas clínicas personalizables</p>
        <button class="btn btn-primary" onclick="document.getElementById('btn-new-tpl').click()">
          ${Utils.icon.plus} Nueva Plantilla
        </button>
      </div>`;
  }

  function templateCard(t) {
    const requiredCount = (t.fields||[]).filter(f => f.required).length;
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="font-semibold">${t.name}</div>
            <div class="text-xs text-muted">${t.category||'Sin categoría'} · ${t.fields?.length||0} campo(s) · ${requiredCount} obligatorio(s)</div>
          </div>
        </div>
        <div class="card-body">
          ${t.description ? `<p class="text-sm text-muted mb-3">${Utils.truncate(t.description, 80)}</p>` : ''}
          <div class="flex flex-wrap gap-1 mb-3">
            ${(t.fields||[]).slice(0,5).map(f => `<span class="chip">${f.name}</span>`).join('')}
            ${(t.fields||[]).length > 5 ? `<span class="chip">+${(t.fields||[]).length-5} más</span>` : ''}
          </div>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="TemplatesModule.openForm('${t.id}')">
              ${Utils.icon.edit} Editar
            </button>
            <button class="btn btn-ghost btn-sm" onclick="TemplatesModule.duplicateTemplate('${t.id}')">
              Duplicar
            </button>
            <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="TemplatesModule.deleteTemplate('${t.id}')">
              ${Utils.icon.trash}
            </button>
          </div>
        </div>
      </div>`;
  }

  async function openForm(id) {
    const existing = id ? _templates.find(t => t.id === id) : null;
    _editingFields = existing ? JSON.parse(JSON.stringify(existing.fields || [])) : defaultFields();

    function buildForm() {
      return `
        <div class="grid-2 mb-3">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" id="tpl-name" value="${existing?.name||''}" placeholder="Ej: Ficha Neurológica">
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-select" id="tpl-category">
              ${CATEGORIES.map(c => `<option value="${c}" ${existing?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Descripción</label>
          <textarea class="form-input" id="tpl-desc" rows="2" placeholder="Descripción de la plantilla">${existing?.description||''}</textarea>
        </div>
        <div class="flex-between mb-2">
          <h4>Campos de la ficha</h4>
          <button type="button" class="btn btn-accent btn-sm" id="add-tpl-field-btn">${Utils.icon.plus} Añadir campo</button>
        </div>
        <div id="tpl-field-list">
          ${_editingFields.map((f, i) => tplFieldRow(f, i)).join('')}
        </div>`;
    }

    Utils.openLargeModal(existing ? `Editar: ${existing.name}` : 'Nueva Plantilla', buildForm(), async () => {
      const name = document.getElementById('tpl-name').value.trim();
      if (!name) { Utils.toast('El nombre es obligatorio', 'warning'); return false; }

      _editingFields.forEach((f, i) => {
        const nameEl = document.getElementById(`tf-name-${i}`);
        const typeEl = document.getElementById(`tf-type-${i}`);
        const reqEl = document.getElementById(`tf-req-${i}`);
        const optsEl = document.getElementById(`tf-opts-${i}`);
        if (nameEl) f.name = nameEl.value;
        if (typeEl) f.type = typeEl.value;
        if (reqEl) f.required = reqEl.checked;
        if (optsEl) f.options = optsEl.value.split('\n').map(l=>l.trim()).filter(Boolean);
      });

      const record = {
        id: existing?.id || Utils.uuid(),
        name,
        category: document.getElementById('tpl-category').value,
        description: document.getElementById('tpl-desc').value,
        fields: _editingFields.filter(f => f.name),
        createdAt: existing?.createdAt || Date.now(),
      };
      await DB.put('templates', record);
      _templates = await DB.getAll('templates');
      _templates.sort((a,b) => a.name.localeCompare(b.name));
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Plantilla actualizada' : 'Plantilla creada', 'success');
      renderList(document.getElementById('module-container'));
    });

    document.getElementById('add-tpl-field-btn')?.addEventListener('click', () => {
      _editingFields.push({ id: Utils.uuid().slice(0,8), name: '', type: 'text', required: false, options: [] });
      document.getElementById('tpl-field-list').innerHTML =
        _editingFields.map((f, i) => tplFieldRow(f, i)).join('');
      bindTypeListeners();
    });

    bindTypeListeners();
  }

  function tplFieldRow(f, i) {
    const showOpts = f.type === 'select';
    return `
      <div class="card mb-2">
        <div class="grid-4 mb-2">
          <div class="form-group mb-0">
            <label class="form-label text-xs">Nombre del campo</label>
            <input type="text" class="form-input" id="tf-name-${i}" value="${f.name}" placeholder="Ej: Nombre">
          </div>
          <div class="form-group mb-0">
            <label class="form-label text-xs">Tipo</label>
            <select class="form-select tf-type-sel" id="tf-type-${i}" data-idx="${i}">
              ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type===t.value?'selected':''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-0 flex items-center gap-2" style="padding-top:1.5rem">
            <input type="checkbox" id="tf-req-${i}" ${f.required?'checked':''}>
            <label for="tf-req-${i}" class="text-sm">Obligatorio</label>
          </div>
          <div class="flex items-end">
            <button type="button" class="btn btn-icon btn-danger" onclick="TemplatesModule.removeField(${i})">
              ${Utils.icon.trash}
            </button>
          </div>
        </div>
        <div class="form-group mb-0" id="tf-opts-wrap-${i}" style="${showOpts?'':'display:none'}">
          <label class="form-label text-xs">Opciones (una por línea)</label>
          <textarea class="form-input" id="tf-opts-${i}" rows="2" placeholder="Opción 1\nOpción 2">${(f.options||[]).join('\n')}</textarea>
        </div>
      </div>`;
  }

  function bindTypeListeners() {
    document.querySelectorAll('.tf-type-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const i = e.target.dataset.idx;
        const wrap = document.getElementById(`tf-opts-wrap-${i}`);
        if (wrap) wrap.style.display = e.target.value === 'select' ? '' : 'none';
      });
    });
  }

  function removeField(i) {
    _editingFields.splice(i, 1);
    document.getElementById('tpl-field-list').innerHTML =
      _editingFields.map((f, idx) => tplFieldRow(f, idx)).join('');
    bindTypeListeners();
  }

  async function duplicateTemplate(id) {
    const tpl = _templates.find(t => t.id === id);
    if (!tpl) return;
    const copy = JSON.parse(JSON.stringify(tpl));
    copy.id = Utils.uuid();
    copy.name = tpl.name + ' (copia)';
    copy.createdAt = Date.now();
    await DB.put('templates', copy);
    _templates = await DB.getAll('templates');
    _templates.sort((a,b) => a.name.localeCompare(b.name));
    Utils.toast('Plantilla duplicada', 'success');
    renderList(document.getElementById('module-container'));
  }

  async function deleteTemplate(id) {
    const ok = await Utils.confirm('¿Eliminar plantilla?', 'Los pacientes que la usen mantendrán sus datos.');
    if (!ok) return;
    await DB.del('templates', id);
    _templates = await DB.getAll('templates');
    Utils.toast('Plantilla eliminada', 'info');
    renderList(document.getElementById('module-container'));
  }

  function defaultFields() {
    return [
      { id: 'f1', name: 'Nombre', type: 'text', required: true, options: [] },
      { id: 'f2', name: 'Apellidos', type: 'text', required: true, options: [] },
      { id: 'f3', name: 'Fecha de nacimiento', type: 'date', required: false, options: [] },
      { id: 'f4', name: 'Sexo', type: 'select', required: false, options: ['Masculino', 'Femenino', 'Otro'] },
      { id: 'f5', name: 'Teléfono', type: 'tel', required: false, options: [] },
      { id: 'f6', name: 'Motivo de consulta', type: 'textarea', required: false, options: [] },
    ];
  }

  return { render, openForm, removeField, duplicateTemplate, deleteTemplate };
})();
