/* ============================================================
   ClinAxis — Utils (utils.js)
   ============================================================ */

const Utils = {

  // ── IDs ──
  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  // ── Dates ──
  formatDate(str) {
    if (!str) return '—';
    const d = new Date(str.includes('T') ? str : str + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateShort(str) {
    if (!str) return '—';
    const d = new Date(str.includes('T') ? str : str + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  },

  formatDateTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  todayISO() {
    return new Date().toISOString().split('T')[0];
  },

  calcAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const b = new Date(dob + 'T12:00:00');
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age;
  },

  isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  },

  daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  },

  // ── Strings ──
  initials(name = '') {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  },

  patientLabel(p) {
    if (!p) return 'Paciente';
    const first = p.fields?.Nombre || p.fields?.f1 || '';
    const last = p.fields?.Apellidos || p.fields?.f2 || '';
    return [first, last].filter(Boolean).join(' ') || 'Sin nombre';
  },

  truncate(str, len = 60) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  },

  // ── Instrument helpers ──
  parseSelectValue(optionStr) {
    // Options like "0|Incapaz" or "10|Independiente"
    if (!optionStr) return null;
    const parts = optionStr.split('|');
    const n = parseFloat(parts[0]);
    return isNaN(n) ? null : n;
  },

  getNumericValue(field, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    if (field.type === 'number' || field.type === 'slider') return parseFloat(rawValue);
    if (field.type === 'likert') return parseInt(rawValue);
    if (field.type === 'select') return Utils.parseSelectValue(rawValue);
    return null;
  },

  calcInstrumentScore(instrument, values) {
    if (!instrument.scoring || instrument.scoring.type === 'none') return null;
    let total = 0;
    let hasValue = false;
    for (const field of instrument.fields) {
      const v = Utils.getNumericValue(field, values[field.id]);
      if (v !== null) { total += v; hasValue = true; }
    }
    return hasValue ? total : null;
  },

  // ── Trend ──
  getTrend(values, direction) {
    if (!values || values.length < 2) return 'neutral';
    const first = values[0], last = values[values.length - 1];
    if (last > first) return direction === 'higher_better' ? 'better' : direction === 'lower_better' ? 'worse' : 'neutral';
    if (last < first) return direction === 'higher_better' ? 'worse' : direction === 'lower_better' ? 'better' : 'neutral';
    return 'neutral';
  },

  trendIcon(trend) {
    if (trend === 'better') return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 10V4M4 7l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (trend === 'worse') return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 4v6M4 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  },

  // ── Toast ──
  toast(message, type = 'success', duration = 3500) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const icons = {
        success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--success)"/><path d="M5 8l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--danger)"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" fill="var(--warning)"/><path d="M8 6v4M8 11.5v.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        info: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--info)"/><path d="M8 7v4M8 5v.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`
      };
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
      container.appendChild(toast);
      requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    },
    
    toastWithUndo(message, undoCallback, duration = 5500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--info)"/><path d="M8 7v4M8 5v.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span style="flex:1">${message}</span>
      <button class="toast-undo-btn">↩ Deshacer</button>`;
    let undone = false;
    container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
    toast.querySelector('.toast-undo-btn').addEventListener('click', async () => {
      if (undone) return;
      undone = true;
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
      try {
        await undoCallback();
        Utils.toast('Acción deshecha correctamente', 'success');
      } catch (e) {
        Utils.toast('No se pudo deshacer: ' + e.message, 'error');
      }
    });
    setTimeout(() => {
      if (!undone) { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }
    }, duration);
  },

  // ── Modal (small/medium) ──
  // 3rd arg: function → save callback (auto-adds Guardar btn), null → no footer, object → {footerHTML,size,onClose}
  openModal(title, bodyHTML, saveCallbackOrOpts) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    const footer = document.getElementById('modal-footer');

    let footerHTML = '', size = '', onClose;

    if (typeof saveCallbackOrOpts === 'function') {
      footerHTML = `<button class="btn btn-ghost" onclick="Utils.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" id="modal-save-btn">Guardar</button>`;
    } else if (saveCallbackOrOpts && typeof saveCallbackOrOpts === 'object') {
      ({ footerHTML = '', size = '', onClose } = saveCallbackOrOpts);
    }

    if (footerHTML) {
      footer.innerHTML = footerHTML;
      footer.classList.remove('hidden');
      if (typeof saveCallbackOrOpts === 'function') {
        const saveBtn = document.getElementById('modal-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', async () => {
          const result = await saveCallbackOrOpts();
          if (result !== false) Utils.closeModal();
        });
      }
    } else {
      footer.classList.add('hidden');
    }

    modal.className = 'modal' + (size ? ` modal-${size}` : '');
    overlay.classList.remove('hidden');
    if (onClose) overlay._onClose = onClose;
    else delete overlay._onClose;
    document.getElementById('modal-close').onclick = () => Utils.closeModal();
    overlay.onclick = e => { if (e.target === overlay) Utils.closeModal(); };
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    if (overlay._onClose) { overlay._onClose(); delete overlay._onClose; }
  },

  // ── Large Modal ──
  // 3rd arg: function → save callback (auto-adds Guardar btn), array → [{label,action,primary}], object → {footerHTML,onClose}
  openLargeModal(title, bodyHTML, buttonsOrOpts) {
    const overlay = document.getElementById('modal-lg-overlay');
    document.getElementById('modal-lg-title').textContent = title;
    document.getElementById('modal-lg-body').innerHTML = bodyHTML;
    const footer = document.getElementById('modal-lg-footer');

    let footerHTML = '';
    let onClose;

    if (typeof buttonsOrOpts === 'function') {
      footerHTML = `<button class="btn btn-ghost" onclick="Utils.closeLargeModal()">Cancelar</button>
                    <button class="btn btn-primary" id="modal-lg-save-btn">Guardar</button>`;
    } else if (Array.isArray(buttonsOrOpts)) {
      footerHTML = buttonsOrOpts.map(b =>
        `<button class="btn ${b.primary ? 'btn-primary' : 'btn-ghost'}" id="lg-footer-btn-${b.label.replace(/\s/g,'_')}">${b.label}</button>`
      ).join('');
    } else if (buttonsOrOpts && typeof buttonsOrOpts === 'object') {
      ({ footerHTML = '', onClose } = buttonsOrOpts);
    }

    if (footerHTML) {
      footer.innerHTML = footerHTML;
      footer.classList.remove('hidden');
      if (typeof buttonsOrOpts === 'function') {
        const saveBtn = document.getElementById('modal-lg-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', async () => {
          const result = await buttonsOrOpts();
          if (result !== false) Utils.closeLargeModal();
        });
      } else if (Array.isArray(buttonsOrOpts)) {
        buttonsOrOpts.forEach(b => {
          const el = document.getElementById(`lg-footer-btn-${b.label.replace(/\s/g,'_')}`);
          if (el && b.action) el.addEventListener('click', b.action);
        });
      }
    } else {
      footer.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
    document.getElementById('modal-lg-close').onclick = () => Utils.closeLargeModal();
    overlay.onclick = e => { if (e.target === overlay) Utils.closeLargeModal(); };
    if (onClose) overlay._onClose = onClose;
    else delete overlay._onClose;
  },

  closeLargeModal() {
    const overlay = document.getElementById('modal-lg-overlay');
    overlay.classList.add('hidden');
    if (overlay._onClose) { overlay._onClose(); delete overlay._onClose; }
  },

  // ── Confirm ──
  confirm(message, title = 'Confirmar acción') {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-overlay');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      overlay.classList.remove('hidden');
      document.getElementById('confirm-ok').onclick = () => { overlay.classList.add('hidden'); resolve(true); };
      document.getElementById('confirm-cancel').onclick = () => { overlay.classList.add('hidden'); resolve(false); };
    });
  },

  // ── Form helpers ──
  getFormData(formEl) {
    const data = {};
    new FormData(formEl).forEach((v, k) => { data[k] = v; });
    return data;
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // ── Render template/instrument field ──
  renderFormField(field, value = '', opts = {}) {
    const id = `field-${field.id}`;
    const val = value !== null && value !== undefined ? value : (field.default || '');
    const req = field.required ? '<span class="required">*</span>' : '';
    const label = `<label class="form-label" for="${id}">${Utils.escapeHtml(field.name)}${req}</label>`;

    let control = '';
    switch (field.type) {
      case 'text': case 'tel': case 'email': case 'phone':
        control = `<input class="form-control" type="${field.type === 'phone' ? 'tel' : field.type}" id="${id}" name="${field.id}" value="${Utils.escapeHtml(val)}" ${field.required ? 'required' : ''}>`;
        break;
      case 'number':
        control = `<input class="form-control" type="number" id="${id}" name="${field.id}" value="${val}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} ${field.step ? `step="${field.step}"` : ''} ${field.required ? 'required' : ''}>`;
        break;
      case 'date':
        control = `<input class="form-control" type="date" id="${id}" name="${field.id}" value="${val}" ${field.required ? 'required' : ''}>`;
        break;
      case 'textarea':
        control = `<textarea class="form-control" id="${id}" name="${field.id}" rows="3" ${field.required ? 'required' : ''}>${Utils.escapeHtml(val)}</textarea>`;
        break;
      case 'select':
        const opts2 = (field.options || []).map(o => {
          const label = typeof o === 'string' ? (o.includes('|') ? o.split('|')[1] : o) : o;
          const optVal = typeof o === 'string' ? o : o;
          return `<option value="${Utils.escapeHtml(optVal)}" ${optVal === val ? 'selected' : ''}>${Utils.escapeHtml(label)}</option>`;
        }).join('');
        control = `<select class="form-control" id="${id}" name="${field.id}" ${field.required ? 'required' : ''}><option value="">— Seleccionar —</option>${opts2}</select>`;
        break;
      case 'slider':
        const sliderVal = val !== '' ? val : field.min || 0;
        control = `<div class="slider-field">
          <div class="slider-row">
            <input class="form-range" type="range" id="${id}" name="${field.id}" min="${field.min ?? 0}" max="${field.max ?? 10}" step="${field.step ?? 1}" value="${sliderVal}" oninput="this.nextElementSibling.textContent=this.value">
            <span class="slider-value">${sliderVal}${field.unit ? ' ' + field.unit : ''}</span>
          </div>
          <div class="slider-labels"><span>${field.min ?? 0}</span><span>${field.max ?? 10}</span></div>
        </div>`;
        break;
      case 'likert':
        const likertOptions = (field.options || []).map((o, i) =>
          `<label class="likert-option ${String(i) === String(val) ? 'selected' : ''}" onclick="Utils.selectLikert(this, '${field.id}')">
            <input type="radio" name="${field.id}" value="${i}" ${String(i) === String(val) ? 'checked' : ''}>
            <span class="likert-option-value">${i}</span>
            <span>${Utils.escapeHtml(o)}</span>
          </label>`
        ).join('');
        control = `<div class="likert-scale" id="${id}">
          <input type="hidden" id="${id}" name="${field.id}" value="${val !== '' ? val : ''}">
          ${likertOptions}
        </div>`;
        break;
      case 'checkbox':
        control = `<label class="checkbox-field">
          <input type="checkbox" id="${id}" name="${field.id}" value="true" ${val === 'true' || val === true ? 'checked' : ''}>
          <span>${Utils.escapeHtml(field.checkLabel || field.name)}</span>
        </label>`;
        break;
      default:
        control = `<input class="form-control" type="text" id="${id}" name="${field.id}" value="${Utils.escapeHtml(val)}">`;
    }

    if (field.type === 'checkbox') return `<div class="form-group">${control}${field.hint ? `<p class="form-hint">${field.hint}</p>` : ''}</div>`;
    return `<div class="form-group">${label}${control}${field.hint ? `<p class="form-hint">${field.hint}</p>` : ''}</div>`;
  },

  selectLikert(el, fieldId) {
    const scale = el.closest('.likert-scale');
    scale.querySelectorAll('.likert-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    const radio = el.querySelector('input[type="radio"]');
    radio.checked = true;
    const hidden = scale.querySelector(`input[type="hidden"]`);
    if (hidden) hidden.value = radio.value;
  },

  // ── Category colors ──
  categoryColor(cat) {
    const map = {
      dolor: '#EF4444', funcional: '#3B82F6', cognitivo: '#8B5CF6',
      psicológico: '#EC4899', motor: '#F59E0B', neurológico: '#06B6D4',
      general: '#6366F1', rehabilitación: '#10B981', psicología: '#EC4899',
      neurología: '#06B6D4', 'terapia ocupacional': '#F97316',
      geriatría: '#84CC16', pediatría: '#F59E0B'
    };
    return map[cat?.toLowerCase()] || '#94A3B8';
  },
  
  scoreClass(score, inst) {
    if (!inst?.scoring?.maxScore || score === null || score === undefined) return 'neutral';
    const pct = (score / inst.scoring.maxScore) * 100;
    const dir = inst.scoring?.direction || 'higher_better';
    if (dir === 'higher_better') return pct >= 70 ? 'good' : pct >= 40 ? 'warning' : 'bad';
    if (dir === 'lower_better') return pct <= 30 ? 'good' : pct <= 60 ? 'warning' : 'bad';
    return 'neutral';
  },

  chartColors: [
    '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
    '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'
  ],

  // ── Icons ──
  icon: {
    dashboard: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".6"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".6"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9"/></svg>`,
    patients: `<svg viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3.25" stroke="currentColor" stroke-width="1.5"/><path d="M2 17c0-3.314 2.686-5.5 6-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="15" cy="14" r="3.25" stroke="currentColor" stroke-width="1.5"/><path d="M15 12v2h1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    evaluations: `<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 7h6M7 10h4M7 13h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    monitoring: `<svg viewBox="0 0 20 20" fill="none"><polyline points="2,14 6,8 10,11 14,5 18,9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 18h16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    vitals: `<svg viewBox="0 0 20 20" fill="none"><path d="M2 10h3l2-6 3 12 2-8 2 4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    goals: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M18 10h-2M10 18v-2M2 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    notes: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 3h12a1 1 0 011 1v9l-4 4H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/><path d="M13 3v5l4 0" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 8h4M6 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    instruments: `<svg viewBox="0 0 20 20" fill="none"><path d="M4 15l8-8m0 0l1.5-1.5A2.121 2.121 0 0116.5 8.5l.5.5a2.121 2.121 0 010 3L15.5 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4 15l1.5 1.5L7 18l3-3-3-3-3 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    templates: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="4" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="9" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="9" width="7" height="4" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M11 16h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    reminders: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5A6 6 0 0116 8.5V13l1.5 1.5v.5H2.5V15L4 13V8.5A6 6 0 0110 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 15.5a2 2 0 004 0" stroke="currentColor" stroke-width="1.5"/></svg>`,
    reports: `<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 6h6M7 9h6M7 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13 13l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    backup: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 3v10M7 10l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15.5H3.5A2.5 2.5 0 011 13v0a2.5 2.5 0 012.5-2.5H5M15 15.5h1.5A2.5 2.5 0 0019 13v0a2.5 2.5 0 00-2.5-2.5H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    plus: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    edit: `<svg viewBox="0 0 16 16" fill="none"><path d="M11 3l2 2-7 7H4v-2l7-7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
    trash: `<svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3 4l1 9.5h8L13 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    eye: `<svg viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>`,
    search: `<svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    sun: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4l1.4-1.4M14 6l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    moon: `<svg viewBox="0 0 20 20" fill="none"><path d="M17 12A8 8 0 018 3a7 7 0 100 14 8 8 0 009-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    calendar: `<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 1.5V3M11 1.5V3M1.5 6.5h13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    check: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    download: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 7l3 3 3-3M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    upload: `<svg viewBox="0 0 16 16" fill="none"><path d="M8 10V3M5 6l3-3 3 3M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    filter: `<svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    print: `<svg viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="9" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
  },

  // ── Debounce ──
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },
  
  async globalSearch(query) {
    if (!query || query.length < 2) return {};
    const q = query.toLowerCase();
    const [patients, notes, evals, reminders] = await Promise.all([
      DB.getAll('patients'), DB.getAll('notes'),
      DB.getAll('evaluations'), DB.getAll('reminders'),
    ]);
    return {
      patients: patients.filter(p => Utils.patientLabel(p).toLowerCase().includes(q)).slice(0,4),
      notes: notes.filter(n => (n.title||'').toLowerCase().includes(q)||(n.content||'').toLowerCase().includes(q)).slice(0,4),
      evals: evals.filter(e => (e.title||'').toLowerCase().includes(q)).slice(0,4),
      reminders: reminders.filter(r => r.title.toLowerCase().includes(q)).slice(0,3),
    };
  }
};
