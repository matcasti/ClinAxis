/* ============================================================
   ClinAxis — Evaluations Module
   ============================================================ */

const EvaluationsModule = (() => {

  let _evals = [];
  let _patients = [];
  let _instruments = [];
  let _searchTerm = '';
  let _filterPatient = '';

  async function render(container) {
    [_evals, _patients, _instruments] = await Promise.all([
      DB.getAll('evaluations'),
      DB.getAll('patients'),
      DB.getAll('instruments'),
    ]);
    _evals.sort((a,b) => b.date.localeCompare(a.date));

    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-eval">
        ${Utils.icon.plus} Nueva Evaluación
      </button>`;
    document.getElementById('btn-new-eval')?.addEventListener('click', () => openForm(null));

    renderList(container);
  }

  function renderList(container) {
    const filtered = _evals.filter(e => {
      const p = _patients.find(x => x.id === e.patientId);
      const name = p ? Utils.patientLabel(p).toLowerCase() : '';
      const title = (e.title || '').toLowerCase();
      const s = _searchTerm.toLowerCase();
      const matchSearch = !s || name.includes(s) || title.includes(s);
      const matchPatient = !_filterPatient || e.patientId === _filterPatient;
      return matchSearch && matchPatient;
    });

    container.innerHTML = `
      <div class="toolbar mb-4">
        <div class="search-box">
          ${Utils.icon.search}
          <input type="text" id="eval-search" placeholder="Buscar evaluaciones…" value="${_searchTerm}">
        </div>
        <select class="form-select" id="eval-filter-patient" style="max-width:200px">
          <option value="">Todos los pacientes</option>
          ${_patients.map(p => `<option value="${p.id}" ${_filterPatient===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
        </select>
        <span class="text-muted text-sm">${filtered.length} evaluación(es)</span>
      </div>

      ${filtered.length ? `
        <div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Título</th>
                <th>Fecha</th>
                <th>Instrumentos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(e => evalRow(e)).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          ${Utils.icon.evaluations}
          <h3>Sin evaluaciones</h3>
          <p>Registra la primera evaluación de un paciente</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-eval').click()">
            ${Utils.icon.plus} Nueva Evaluación
          </button>
        </div>`}
    `;

    document.getElementById('eval-search')?.addEventListener('input', Utils.debounce(e => {
      _searchTerm = e.target.value;
      renderList(container);
    }, 250));
    document.getElementById('eval-filter-patient')?.addEventListener('change', e => {
      _filterPatient = e.target.value;
      renderList(container);
    });
  }

  function evalRow(e) {
    const p = _patients.find(x => x.id === e.patientId);
    const pName = p ? Utils.patientLabel(p) : '—';
    const instNames = (e.instruments || []).map(i => i.instrumentName || '').join(', ');
    return `
      <tr>
        <td><strong>${pName}</strong></td>
        <td>${Utils.truncate(e.title || 'Evaluación', 40)}</td>
        <td>${Utils.formatDate(e.date)}</td>
        <td><span class="text-sm text-muted">${Utils.truncate(instNames, 50) || '—'}</span></td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-icon" title="Ver" onclick="EvaluationsModule.openDetail('${e.id}')">
              ${Utils.icon.eye}
            </button>
            <button class="btn btn-icon" title="Editar" onclick="EvaluationsModule.openForm('${e.id}')">
              ${Utils.icon.edit}
            </button>
            <button class="btn btn-icon btn-danger" title="Eliminar" onclick="EvaluationsModule.deleteEval('${e.id}')">
              ${Utils.icon.trash}
            </button>
          </div>
        </td>
      </tr>`;
  }

  // ── Detail view ──
  async function openDetail(id) {
    const e = await DB.get('evaluations', id);
    if (!e) return;
    const p = _patients.find(x => x.id === e.patientId);
    const pName = p ? Utils.patientLabel(p) : 'Paciente';

    let instHTML = '';
    for (const inst of (e.instruments || [])) {
      const instDef = _instruments.find(i => i.id === inst.instrumentId);
      const score = instDef ? Utils.calcInstrumentScore(instDef, inst.values) : null;
      instHTML += `
        <div class="card mb-3">
          <div class="card-header">
            <h4 class="card-title">${inst.instrumentName}</h4>
            ${score !== null ? `<div class="score-display score-${Utils.categoryColor(score, instDef)}">${score} ${instDef?.scoring?.label||'pts'}</div>` : ''}
          </div>
          <div class="detail-grid">
            ${(instDef?.fields||[]).map(f => {
              const val = inst.values?.[f.id];
              if (val === undefined || val === '') return '';
              return `<div class="detail-item">
                <div class="detail-label">${f.name}</div>
                <div class="detail-value">${formatFieldVal(f, val)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    Utils.openLargeModal(`Evaluación — ${pName}`, `
      <div class="detail-grid mb-4">
        <div class="detail-item"><div class="detail-label">Paciente</div><div class="detail-value">${pName}</div></div>
        <div class="detail-item"><div class="detail-label">Fecha</div><div class="detail-value">${Utils.formatDate(e.date)}</div></div>
        <div class="detail-item"><div class="detail-label">Título</div><div class="detail-value">${e.title||'—'}</div></div>
      </div>
      ${e.notes ? `<div class="mb-4"><strong>Notas:</strong><p class="text-sm mt-1">${e.notes}</p></div>` : ''}
      <h4 class="mb-3">Instrumentos aplicados</h4>
      ${instHTML || '<p class="text-muted">Sin instrumentos</p>'}
    `, [
      { label: 'Editar', action: () => { Utils.closeLargeModal(); openForm(id); }},
    ]);
  }

  function formatFieldVal(f, val) {
    if (f.type === 'select' && f.options) {
      const opt = f.options.find(o => o.startsWith(val + '|'));
      return opt ? opt.split('|')[1] : val;
    }
    if (f.type === 'checkbox') return val === 'true' || val === true ? 'Sí' : 'No';
    return val;
  }

  // ── Form ──
  async function openForm(id) {
    const existing = id ? await DB.get('evaluations', id) : null;
    let selectedInstruments = existing ? JSON.parse(JSON.stringify(existing.instruments || [])) : [];

    function buildForm() {
      return `
        <div class="grid-2 mb-3">
          <div class="form-group">
            <label class="form-label">Paciente *</label>
            <select class="form-select" id="eval-patient" required>
              <option value="">— Seleccionar —</option>
              ${_patients.map(p => `<option value="${p.id}" ${existing?.patientId===p.id?'selected':''}>${Utils.patientLabel(p)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input type="date" class="form-input" id="eval-date" value="${existing?.date || Utils.todayISO()}" required>
          </div>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Título</label>
          <input type="text" class="form-input" id="eval-title" placeholder="Ej: Evaluación inicial" value="${existing?.title||''}">
        </div>

        <div class="mb-3">
          <div class="flex-between mb-2">
            <label class="form-label mb-0">Instrumentos</label>
            <button type="button" class="btn btn-accent btn-sm" id="add-instrument-btn">
              ${Utils.icon.plus} Añadir instrumento
            </button>
          </div>
          <div id="instruments-list">
            ${selectedInstruments.map((si, idx) => instrumentBlock(si, idx)).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas clínicas</label>
          <textarea class="form-input" id="eval-notes" rows="3" placeholder="Observaciones…">${existing?.notes||''}</textarea>
        </div>`;
    }

    function instrumentBlock(si, idx) {
      const instDef = _instruments.find(i => i.id === si.instrumentId);
      return `
        <div class="card mb-2 instrument-block" data-idx="${idx}">
          <div class="card-header">
            <strong>${si.instrumentName}</strong>
            <button type="button" class="btn btn-icon btn-danger btn-sm" onclick="EvaluationsModule.removeInst(${idx})">
              ${Utils.icon.trash}
            </button>
          </div>
          ${instDef ? `<div class="instrument-fields">
            ${instDef.fields.map(f => Utils.renderFormField(f, si.values?.[f.id] ?? '')).join('')}
          </div>` : '<p class="text-muted text-sm">Instrumento no encontrado</p>'}
        </div>`;
    }

    Utils.openLargeModal(existing ? 'Editar Evaluación' : 'Nueva Evaluación', buildForm(), async () => {
      const patientId = document.getElementById('eval-patient').value;
      const date = document.getElementById('eval-date').value;
      if (!patientId || !date) { Utils.toast('Completa los campos obligatorios', 'warning'); return false; }

      // collect field values for each instrument
      selectedInstruments.forEach((si, idx) => {
        const instDef = _instruments.find(i => i.id === si.instrumentId);
        if (!instDef) return;
        const values = {};
        instDef.fields.forEach(f => {
          const el = document.getElementById(`field-${f.id}`);
          if (el) values[f.id] = el.value;
        });
        si.values = values;
      });

      const now = Date.now();
      const record = {
        id: existing?.id || Utils.uuid(),
        patientId,
        date,
        title: document.getElementById('eval-title').value || 'Evaluación',
        instruments: selectedInstruments,
        notes: document.getElementById('eval-notes').value,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await DB.put('evaluations', record);
      _evals = await DB.getAll('evaluations');
      _evals.sort((a,b) => b.date.localeCompare(a.date));
      Utils.closeLargeModal();
      Utils.toast(existing ? 'Evaluación actualizada' : 'Evaluación registrada', 'success');
      renderList(document.getElementById('module-container'));
    });

    // Bind add instrument button
    document.getElementById('add-instrument-btn')?.addEventListener('click', () => {
      showInstrumentPicker(selectedInstruments, () => {
        document.getElementById('instruments-list').innerHTML =
          selectedInstruments.map((si, idx) => instrumentBlock(si, idx)).join('');
      });
    });

    // Expose removeInst
    EvaluationsModule._removeInst = (idx) => {
      selectedInstruments.splice(idx, 1);
      document.getElementById('instruments-list').innerHTML =
        selectedInstruments.map((si, i) => instrumentBlock(si, i)).join('');
    };
  }

  function showInstrumentPicker(selectedInstruments, onAdd) {
    const body = `
      <div class="search-box mb-3">
        ${Utils.icon.search}
        <input type="text" id="inst-pick-search" placeholder="Buscar instrumento…">
      </div>
      <div id="inst-pick-list">
        ${_instruments.map(i => `
          <div class="card mb-2" style="cursor:pointer" onclick="EvaluationsModule._pickInstrument('${i.id}')">
            <div class="flex-between">
              <div>
                <strong>${i.name}</strong>
                <div class="text-sm text-muted">${i.description||''} · ${i.fields?.length||0} campo(s)</div>
              </div>
              <span class="badge badge-neutral">${i.category||''}</span>
            </div>
          </div>`).join('')}
      </div>`;

    Utils.openModal('Seleccionar Instrumento', body, null);

    EvaluationsModule._pickInstrument = (instId) => {
      const inst = _instruments.find(i => i.id === instId);
      if (!inst) return;
      selectedInstruments.push({
        instrumentId: inst.id,
        instrumentName: inst.name,
        values: {},
      });
      Utils.closeModal();
      onAdd();
    };

    document.getElementById('inst-pick-search')?.addEventListener('input', Utils.debounce(e => {
      const s = e.target.value.toLowerCase();
      document.querySelectorAll('#inst-pick-list .card').forEach(card => {
        const txt = card.textContent.toLowerCase();
        card.style.display = txt.includes(s) ? '' : 'none';
      });
    }, 200));
  }

  async function deleteEval(id) {
    const ok = await Utils.confirm('¿Eliminar evaluación?', 'Esta acción no se puede deshacer.');
    if (!ok) return;
    await DB.del('evaluations', id);
    _evals = await DB.getAll('evaluations');
    _evals.sort((a,b) => b.date.localeCompare(a.date));
    Utils.toast('Evaluación eliminada', 'info');
    renderList(document.getElementById('module-container'));
  }

  function removeInst(idx) {
    if (EvaluationsModule._removeInst) EvaluationsModule._removeInst(idx);
  }

  return { render, openDetail, openForm, deleteEval, removeInst };
})();
