/* ============================================================
   ClinAxis — App Controller (app.js)
   ============================================================ */

const App = (() => {

  let currentModule = null;

  const NAV_ITEMS = [
    { id: 'dashboard',    label: 'Dashboard',        icon: 'dashboard',    module: () => DashboardModule },
    { id: 'patients',     label: 'Pacientes',        icon: 'patients',     module: () => PatientsModule },
    { id: 'evaluations',  label: 'Evaluaciones',     icon: 'evaluations',  module: () => EvaluationsModule },
    { id: 'monitoring',   label: 'Monitoreo',        icon: 'monitoring',   module: () => MonitoringModule },
    { id: 'vitals',       label: 'Signos Vitales',   icon: 'vitals',       module: () => VitalsModule },
    { id: 'goals',        label: 'Metas',            icon: 'goals',        module: () => GoalsModule },
    { id: 'notes',        label: 'Notas',            icon: 'notes',        module: () => NotesModule },
    null,
    { id: 'instruments',  label: 'Instrumentos',     icon: 'instruments',  module: () => InstrumentsModule },
    { id: 'templates',    label: 'Plantillas',       icon: 'templates',    module: () => TemplatesModule },
    null,
    { id: 'reminders',    label: 'Recordatorios',    icon: 'reminders',    module: () => RemindersModule },
    { id: 'reports',      label: 'Reportes',         icon: 'reports',      module: () => ReportsModule },
    null,
    { id: 'backup',       label: 'Respaldo',         icon: 'backup',       module: () => BackupModule },
  ];

  async function init() {
    await DB.open();
    await DB.seedDefaults();
    await loadTheme();
    buildNav();
    bindGlobalEvents();

    const hash = location.hash.replace('#','') || 'dashboard';
    await navigateTo(hash);
  }

  async function loadTheme() {
    const saved = await DB.getSetting('theme', 'light');
    applyTheme(saved);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) icon.innerHTML = theme === 'dark' ? Utils.icon.sun : Utils.icon.moon;
    if (label) label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
  }

  async function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    await DB.setSetting('theme', next);
    // Refresh charts if monitoring module is active
    if (currentModule && currentModule.onThemeChange) currentModule.onThemeChange();
  }

  function buildNav() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    NAV_ITEMS.forEach(item => {
      if (!item) {
        const sep = document.createElement('div');
        sep.className = 'sidebar-separator';
        nav.appendChild(sep);
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'sidebar-item';
      btn.dataset.module = item.id;
      btn.title = item.label;
      btn.innerHTML = `
        <span class="nav-icon">${Utils.icon[item.icon] || ''}</span>
        <span class="nav-label">${item.label}</span>
      `;
      btn.addEventListener('click', () => navigateTo(item.id));
      nav.appendChild(btn);
    });
  }

  function setActiveNav(id) {
    document.querySelectorAll('.sidebar-item[data-module]').forEach(el => {
      el.classList.toggle('active', el.dataset.module === id);
    });
  }

  async function navigateTo(id) {
    const navItem = NAV_ITEMS.filter(Boolean).find(n => n.id === id) || NAV_ITEMS[0];
    if (!navItem) return;

    setActiveNav(navItem.id);
    location.hash = navItem.id;

    const container = document.getElementById('module-container');
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    // Cleanup previous
    Charts.destroyAll();

    const mod = navItem.module();
    currentModule = mod;

    document.getElementById('page-title').textContent = navItem.label;
    document.getElementById('page-subtitle').textContent = '';
    document.getElementById('topbar-actions').innerHTML = '';

    try {
      await mod.render(container);
    } catch(e) {
      console.error('Module error:', e);
      container.innerHTML = `<div class="empty-state"><p class="text-danger">Error al cargar el módulo: ${e.message}</p></div>`;
    }

    // Close mobile sidebar after navigation
    document.getElementById('sidebar').classList.remove('mobile-open');
  }

  function bindGlobalEvents() {
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });

    // Hash change
    window.addEventListener('hashchange', () => {
      const id = location.hash.replace('#','');
      if (id && NAV_ITEMS.filter(Boolean).some(n => n.id === id)) {
        const activeItem = document.querySelector(`.sidebar-item[data-module="${id}"]`);
        if (activeItem) navigateTo(id);
      }
    });

    // Escape closes modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        Utils.closeModal();
        Utils.closeLargeModal();
        document.getElementById('confirm-overlay').classList.add('hidden');
      }
    });

    // Global search (Cmd/Ctrl+K)
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-overlay').classList.toggle('hidden');
        if (!document.getElementById('search-overlay').classList.contains('hidden')) {
          setTimeout(() => document.getElementById('global-search-input').focus(), 50);
        }
      }
    });
    
    document.getElementById('search-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('search-overlay'))
        document.getElementById('search-overlay').classList.add('hidden');
    });
    
    const searchInput = document.getElementById('global-search-input');
    searchInput.addEventListener('input', Utils.debounce(async e => {
      const results = await Utils.globalSearch(e.target.value);
      const container = document.getElementById('global-search-results');
      if (!e.target.value) { container.innerHTML = ''; return; }
    
      const allPatients = await DB.getAll('patients');
      const pName = (id) => { const p = allPatients.find(x=>x.id===id); return p?Utils.patientLabel(p):''; };
    
      let html = '';
      if (results.patients?.length) {
        html += `<div class="text-xs fw-600 text-muted px-1 mb-1 mt-2">PACIENTES</div>`;
        html += results.patients.map(p => `
          <div class="search-result-item" onclick="App.navigateTo('patients');document.getElementById('search-overlay').classList.add('hidden')">
            <div class="patient-avatar" style="width:28px;height:28px;font-size:.7rem">${Utils.initials(Utils.patientLabel(p))}</div>
            <div><div class="text-sm fw-600">${Utils.patientLabel(p)}</div></div>
          </div>`).join('');
      }
      if (results.notes?.length) {
        html += `<div class="text-xs fw-600 text-muted px-1 mb-1 mt-2">NOTAS</div>`;
        html += results.notes.map(n => `
          <div class="search-result-item" onclick="App.navigateTo('notes');document.getElementById('search-overlay').classList.add('hidden')">
            ${Utils.icon.notes}
            <div><div class="text-sm fw-600">${Utils.truncate(n.title||'Nota',40)}</div>
            <div class="text-xs text-muted">${pName(n.patientId)} · ${Utils.formatDate(n.date)}</div></div>
          </div>`).join('');
      }
      if (results.evals?.length) {
        html += `<div class="text-xs fw-600 text-muted px-1 mb-1 mt-2">EVALUACIONES</div>`;
        html += results.evals.map(ev => `
          <div class="search-result-item" onclick="App.navigateTo('evaluations');document.getElementById('search-overlay').classList.add('hidden')">
            ${Utils.icon.evaluations}
            <div><div class="text-sm fw-600">${Utils.truncate(ev.title||'Evaluación',40)}</div>
            <div class="text-xs text-muted">${pName(ev.patientId)} · ${Utils.formatDate(ev.date)}</div></div>
          </div>`).join('');
      }
      container.innerHTML = html || `<div class="text-muted text-sm p-4 text-center">Sin resultados para "${e.target.value}"</div>`;
    }, 200));
  }

  return { init, navigateTo, getCurrentModule: () => currentModule };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
