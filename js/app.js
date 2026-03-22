/* ============================================================
   ClinAxis — App Controller (app.js)
   ============================================================ */

const App = (() => {

  let currentModule = null;

  const NAV_ITEMS = [
    { id: 'dashboard',    label: 'Dashboard',       icon: 'dashboard',    module: () => DashboardModule },
    { id: 'patients',     label: 'Pacientes',        icon: 'patients',     module: () => PatientsModule },
    { id: 'evaluations',  label: 'Evaluaciones',     icon: 'evaluations',  module: () => EvaluationsModule },
    { id: 'monitoring',   label: 'Monitoreo',        icon: 'monitoring',   module: () => MonitoringModule },
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
  }

  return { init, navigateTo, getCurrentModule: () => currentModule };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
