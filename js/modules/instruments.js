/* ============================================================
   ClinAxis — Instruments Module
   ============================================================ */

const InstrumentsModule = (() => {

  let _instruments = [];
  let _searchTerm = '';
  let _packages = [];
  let _activeTab = 'instruments'; // 'instruments' | 'packages'
  let _editingFields = [];

  const FIELD_TYPES = [
    { value: 'number', label: 'Número' },
    { value: 'slider', label: 'Slider' },
    { value: 'select', label: 'Selección (opciones)' },
    { value: 'likert', label: 'Escala Likert' },
    { value: 'text', label: 'Texto libre' },
    { value: 'checkbox', label: 'Casilla (Sí/No)' },
    { value: 'textarea', label: 'Texto largo' },
  ];

  const CATEGORIES = ['Dolor', 'Funcional', 'Cognitivo', 'Psicológico', 'Físico', 'Motor', 'Calidad de vida', 'Otro'];
  const SCORE_TYPES = ['sum', 'average', 'none'];
  const DIRECTIONS = [
    { value: 'higher_better', label: 'Mayor = mejor' },
    { value: 'lower_better', label: 'Menor = mejor' },
    { value: 'neutral', label: 'Neutro' },
  ];

  async function render(container) {
    [_instruments, _packages] = await Promise.all([
      DB.getAll('instruments'),
      DB.getAll('assessmentPackages'),
    ]);
    _instruments.sort((a,b) => a.name.localeCompare(b.name));

    document.getElementById('topbar-actions').innerHTML = `
      <div class="toggle-group mr-2">
        <button class="toggle-btn ${_activeTab==='instruments'?'active':''}" onclick="InstrumentsModule._switchTab('instruments')">Instrumentos</button>
        <button class="toggle-btn ${_activeTab==='packages'?'active':''}" onclick="InstrumentsModule._switchTab('packages')">Paquetes</button>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-new-inst-action">
        ${Utils.icon.plus} ${_activeTab==='instruments'?'Nuevo Instrumento':'Nuevo Paquete'}
      </button>`;
    document.getElementById('btn-new-inst-action')?.addEventListener('click', () => {
      if (_activeTab === 'instruments') openForm(null);
      else openPackageForm(null);
    });

    if (_activeTab === 'instruments') renderList(container);
    else renderPackages(container);
  }

  function renderList(container) {
    const filtered = _instruments.filter(i => {
      const s = _searchTerm.toLowerCase();
      return !s || i.name.toLowerCase().includes(s) || (i.description||'').toLowerCase().includes(s);
    });

    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="search-box">
          ${Utils.icon.search}
          <input type="text" id="inst-search" placeholder="Buscar instrumentos…" value="${_searchTerm}">
        </div>
        <span class="text-muted text-sm">${filtered.length} instrumento(s)</span>
      </div>

      ${filtered.length ? `
        <div class="grid-2" id="inst-grid">
          ${filtered.map(i => instrumentCard(i)).join('')}
        </div>` : `
        <div class="empty-state">
          ${Utils.icon.instruments}
          <h3>Sin instrumentos</h3>
          <p>Crea instrumentos clínicos reutilizables</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-inst').click()">
            ${Utils.icon.plus} Nuevo Instrumento
          </button>
        </div>`}
    `;

    document.getElementById('inst-search')?.addEventListener('input', Utils.debounce(e => {
      _searchTerm = e.target.value;
      renderList(container);
    }, 250));
  }

  function instrumentCard(inst) {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="font-semibold">${inst.name}</div>
            <div class="text-xs text-muted">${inst.category||'Sin categoría'} · ${inst.fields?.length||0} campo(s)</div>
          </div>
          <span class="badge badge-neutral">${inst.scoring?.type||'none'}</span>
        </div>
        <div class="card-body">
          ${inst.description ? `<p class="text-sm text-muted mb-2">${Utils.truncate(inst.description, 80)}</p>` : ''}
          <div class="text-xs text-muted mb-3">
            Dirección: ${DIRECTIONS.find(d=>d.value===inst.scoring?.direction)?.label||'—'} ·
            Puntuación máx: ${inst.scoring?.maxScore||'—'}
          </div>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="InstrumentsModule.openDetail('${inst.id}')">
              ${Utils.icon.eye} Ver campos
            </button>
            <button class="btn btn-ghost btn-sm" onclick="InstrumentsModule.openForm('${inst.id}')">
              ${Utils.icon.edit} Editar
            </button>
            <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="InstrumentsModule.deleteInstrument('${inst.id}')">
              ${Utils.icon.trash}
            </button>
          </div>
        </div>
      </div>`;
  }

  async function openDetail(id) {
    const inst = _instruments.find(i => i.id === id);
    if (!inst) return;
    Utils.openLargeModal(inst.name, `
      <div class="detail-grid mb-4">
        <div class="detail-item"><div class="detail-label">Categoría</div><div class="detail-value">${inst.category||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Tipo de puntuación</div><div class="detail-value">${inst.scoring?.type||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Dirección</div><div class="detail-value">${DIRECTIONS.find(d=>d.value===inst.scoring?.direction)?.label||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Puntuación máx.</div><div class="detail-value">${inst.scoring?.maxScore||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Etiqueta score</div><div class="detail-value">${inst.scoring?.label||'pts'}</div></div>
      </div>
      ${inst.description ? `<p class="mb-4">${inst.description}</p>` : ''}
      <h4 class="mb-3">Campos (${inst.fields?.length||0})</h4>
      <div class="card">
        <table class="table">
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Min</th><th>Max</th><th>Opciones</th></tr></thead>
          <tbody>
            ${(inst.fields||[]).map(f => `
              <tr>
                <td><strong>${f.name}</strong></td>
                <td>${FIELD_TYPES.find(t=>t.value===f.type)?.label||f.type}</td>
                <td>${f.min ?? '—'}</td>
                <td>${f.max ?? '—'}</td>
                <td class="text-xs text-muted">${(f.options||[]).slice(0,3).join(', ')}${(f.options||[]).length>3?'…':''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `, [{ label: 'Editar', action: () => { Utils.closeLargeModal(); openForm(id); }}]);
  }

  // ── Form & Field Builder ──
  async function openForm(id) {
    const existing = id ? _instruments.find(i => i.id === id) : null;
    _editingFields = existing ? JSON.parse(JSON.stringify(existing.fields || [])) : [];

    function buildForm() {
      return `
        <div class="grid-2 mb-3">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" id="inst-name" value="${existing?.name||''}" placeholder="Ej: Índice de Barthel" required>
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-select" id="inst-category">
              ${CATEGORIES.map(c => `<option value="${c}" ${existing?.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Descripción</label>
          <textarea class="form-input" id="inst-desc" rows="2">${existing?.description||''}</textarea>
        </div>
        <div class="grid-4 mb-4">
          <div class="form-group">
            <label class="form-label">Tipo puntuación</label>
            <select class="form-select" id="inst-score-type">
              ${SCORE_TYPES.map(t => `<option value="${t}" ${existing?.scoring?.type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <select class="form-select" id="inst-direction">
              ${DIRECTIONS.map(d => `<option value="${d.value}" ${existing?.scoring?.direction===d.value?'selected':''}>${d.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Puntuación máx.</label>
            <input type="number" class="form-input" id="inst-max-score" value="${existing?.scoring?.maxScore||''}" placeholder="100">
          </div>
          <div class="form-group">
            <label class="form-label">Etiqueta score</label>
            <input type="text" class="form-input" id="inst-score-label" value="${existing?.scoring?.label||'pts'}" placeholder="pts">
          </div>
        </div>

        <!-- Field builder -->
        <div class="flex-between mb-2">
          <h4>Campos</h4>
          <button type="button" class="btn btn-accent btn-sm" id="add-field-btn">${Utils.icon.plus} Añadir campo</button>
        </div>
        <div id="field-builder-list">
          ${_editingFields.map((f, i) => fieldBuilderRow(f, i)).join('')}
        </div>`;
    }

    Utils.openLargeModal(existing ? `Editar: ${existing.name}` : 'Nuevo Instrumento', buildForm(), async () => {
      const name = document.getElementById('inst-name').value.trim();
      if (!name) { Utils.toast('El nombre es obligatorio', 'warning'); return false; }
      // Collect field data from builder
      _editingFields.forEach((f, i) => {
        const nameEl = document.getElementById(`bf-name-${i}`);
        const typeEl = document.getElementById(`bf-type-${i}`);
        const minEl = document.getElementById(`bf-min-${i}`);
        const maxEl = document.getElementById(`bf-max-${i}`);
        const optsEl = document.getElementById(`bf-opts-${i}`);
        if (nameEl) f.name = nameEl.value;
        if (typeEl) f.type = typeEl.value;
        if (minEl) f.min = minEl.value !== '' ? +minEl.value : undefined;
        if (maxEl) f.max = maxEl.value !== '' ? +maxEl.value : undefined;
        if (optsEl) f.options = optsEl.value.split('\n').map(l=>l.trim()).filter(Boolean);
      });

      const record = {
        id: existing?.id || Utils.uuid(),
        name,
        category: document.getElementById('inst-category').value,
        description: document.getElementById('inst-desc').value,
        fields: _editingFields,
        scoring: {
          type: document.getElementById('inst-score-type').value,
          direction: document.getElementById('inst-direction').value,
          maxScore: +document.getElementById('inst-max-score').value || null,
          label: document.getElementById('inst-score-label').value || 'pts',
        },
        createdAt: existing?.createdAt || Date.now(),
      };
      await DB.put('instruments', record);
      _instruments = await DB.getAll('instruments');
      _instruments.sort((a,b) => a.name.localeCompare(b.name));
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Instrumento actualizado' : 'Instrumento creado', 'success');
      renderList(document.getElementById('module-container'));
    });

    document.getElementById('add-field-btn')?.addEventListener('click', () => {
      _editingFields.push({ id: Utils.uuid().slice(0,8), name: '', type: 'number', min: 0, max: 10, options: [] });
      document.getElementById('field-builder-list').innerHTML =
        _editingFields.map((f, i) => fieldBuilderRow(f, i)).join('');
      bindFieldTypeListeners();
    });

    bindFieldTypeListeners();
  }

  function fieldBuilderRow(f, i) {
    const showMinMax = ['number','slider','likert'].includes(f.type);
    const showOpts = ['select','likert'].includes(f.type);
    return `
      <div class="card mb-2 field-builder-row" data-idx="${i}">
        <div class="card-body" style="padding:.75rem">
          <div class="grid-4 mb-2">
            <div class="form-group mb-0">
              <label class="form-label text-xs">Nombre</label>
              <input type="text" class="form-input" id="bf-name-${i}" value="${f.name}" placeholder="Ej: Dolor">
            </div>
            <div class="form-group mb-0">
              <label class="form-label text-xs">Tipo</label>
              <select class="form-select bf-type-sel" id="bf-type-${i}" data-idx="${i}">
                ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type===t.value?'selected':''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group mb-0" id="bf-minmax-${i}" style="${showMinMax?'':'display:none'}">
              <label class="form-label text-xs">Min / Max</label>
              <div class="flex gap-1">
                <input type="number" class="form-input" id="bf-min-${i}" value="${f.min??''}" placeholder="0" style="width:60px">
                <input type="number" class="form-input" id="bf-max-${i}" value="${f.max??''}" placeholder="10" style="width:60px">
              </div>
            </div>
            <div class="flex items-end">
              <button type="button" class="btn btn-icon btn-danger" onclick="InstrumentsModule.removeField(${i})">
                ${Utils.icon.trash}
              </button>
            </div>
          </div>
          <div class="form-group mb-0" id="bf-opts-wrap-${i}" style="${showOpts?'':'display:none'}">
            <label class="form-label text-xs">Opciones (una por línea, formato: valor|etiqueta)</label>
            <textarea class="form-input" id="bf-opts-${i}" rows="3" placeholder="0|Nada\n5|Moderado\n10|Máximo">${(f.options||[]).join('\n')}</textarea>
          </div>
        </div>
      </div>`;
  }

  function bindFieldTypeListeners() {
    document.querySelectorAll('.bf-type-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const i = e.target.dataset.idx;
        const type = e.target.value;
        const showMinMax = ['number','slider','likert'].includes(type);
        const showOpts = ['select','likert'].includes(type);
        const mmEl = document.getElementById(`bf-minmax-${i}`);
        const opEl = document.getElementById(`bf-opts-wrap-${i}`);
        if (mmEl) mmEl.style.display = showMinMax ? '' : 'none';
        if (opEl) opEl.style.display = showOpts ? '' : 'none';
      });
    });
  }

  function removeField(i) {
    _editingFields.splice(i, 1);
    document.getElementById('field-builder-list').innerHTML =
      _editingFields.map((f, idx) => fieldBuilderRow(f, idx)).join('');
    bindFieldTypeListeners();
  }

  async function deleteInstrument(id) {
    const ok = await Utils.confirm('¿Eliminar instrumento?', 'Las evaluaciones que lo usen mantendrán sus datos.');
    if (!ok) return;
    await DB.del('instruments', id);
    _instruments = await DB.getAll('instruments');
    Utils.toast('Instrumento eliminado', 'info');
    renderList(document.getElementById('module-container'));
  }

  function _switchTab(tab) {
    _activeTab = tab;
    render(document.getElementById('module-container'));
  }

  function renderPackages(container) {
    container.innerHTML = _packages.length ? `
      <div class="grid-2">
        ${_packages.map(pkg => `
          <div class="card">
            <div class="card-header">
              <div>
                <div class="font-semibold">${pkg.name}</div>
                <div class="text-xs text-muted">${(pkg.instruments||[]).length} instrumento(s)</div>
              </div>
            </div>
            <div class="card-body">
              ${pkg.description ? `<p class="text-sm text-muted mb-3">${Utils.truncate(pkg.description,80)}</p>` : ''}
              <div class="chips mb-3">
                ${(pkg.instruments||[]).map(iid => {
                  const inst = _instruments.find(i=>i.id===iid);
                  return inst ? `<span class="chip">${inst.name}</span>` : '';
                }).join('')}
              </div>
              <div class="flex gap-1">
                <button class="btn btn-ghost btn-sm" onclick="InstrumentsModule.openPackageForm('${pkg.id}')">
                  ${Utils.icon.edit} Editar
                </button>
                <button class="btn btn-icon btn-danger btn-sm ml-auto" onclick="InstrumentsModule.deletePackage('${pkg.id}')">
                  ${Utils.icon.trash}
                </button>
              </div>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="empty-state">
        ${Utils.icon.instruments}
        <h3>Sin paquetes</h3>
        <p>Crea conjuntos de instrumentos para aplicar juntos en una evaluación</p>
        <button class="btn btn-primary" onclick="InstrumentsModule.openPackageForm(null)">
          ${Utils.icon.plus} Nuevo Paquete
        </button>
      </div>`;
  }

  async function openPackageForm(id) {
    const existing = id ? _packages.find(p => p.id === id) : null;
    const selected = new Set(existing?.instruments || []);

    const body = `
      <div class="grid-2 mb-3">
        <div class="form-group">
          <label class="form-label">Nombre del paquete *</label>
          <input type="text" class="form-input" id="pkg-name" value="${existing?.name||''}" placeholder="Ej: Evaluación inicial neurológica">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <input type="text" class="form-input" id="pkg-desc" value="${existing?.description||''}" placeholder="Descripción breve">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Instrumentos incluidos</label>
        <div class="grid-2" style="max-height:350px;overflow-y:auto;padding:.25rem">
          ${_instruments.map(i => `
            <label class="checkbox-field" style="padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer">
              <input type="checkbox" id="pkg-inst-${i.id}" ${selected.has(i.id)?'checked':''}>
              <div>
                <div class="text-sm fw-600">${i.name}</div>
                <div class="text-xs text-muted">${i.category||''} · ${i.fields?.length||0} campos</div>
              </div>
            </label>`).join('')}
        </div>
      </div>`;

    Utils.openLargeModal(existing ? 'Editar Paquete' : 'Nuevo Paquete de Evaluación', body, async () => {
      const name = document.getElementById('pkg-name').value.trim();
      if (!name) { Utils.toast('El nombre es obligatorio', 'warning'); return false; }
      const instruments = _instruments.filter(i => document.getElementById(`pkg-inst-${i.id}`)?.checked).map(i => i.id);
      if (!instruments.length) { Utils.toast('Selecciona al menos un instrumento', 'warning'); return false; }
      const record = {
        id:          existing?.id || Utils.uuid(),
        name,
        description: document.getElementById('pkg-desc').value,
        instruments,
        createdAt:   existing?.createdAt || Date.now(),
      };
      await DB.put('assessmentPackages', record);
      _packages = await DB.getAll('assessmentPackages');
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Paquete actualizado' : 'Paquete creado', 'success');
      renderPackages(document.getElementById('module-container'));
    });
  }

  async function deletePackage(id) {
    const ok = await Utils.confirm('¿Eliminar paquete?', '');
    if (!ok) return;
    await DB.del('assessmentPackages', id);
    _packages = await DB.getAll('assessmentPackages');
    Utils.toast('Paquete eliminado', 'info');
    renderPackages(document.getElementById('module-container'));
  }

  return { render, openDetail, openForm, deleteInstrument, removeField };
})();
