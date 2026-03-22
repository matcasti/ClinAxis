/* ============================================================
   ClinAxis — App Controller (app.js)
   ============================================================ */

const App = (() => {

  let currentModule = null;

  const NAV_ITEMS = [
    { id: 'dashboard',    label: 'Dashboard',        icon: 'dashboard',    module: () => DashboardModule },
    { id: 'alerts',       label: 'Alertas',          icon: 'reminders',    module: () => AlertsModule },
    null,
    { id: 'patients',     label: 'Pacientes',        icon: 'patients',     module: () => PatientsModule },
    { id: 'history360',   label: 'Historia 360°',    icon: 'evaluations',  module: () => History360Module },
    { id: 'evaluations',  label: 'Evaluaciones',     icon: 'evaluations',  module: () => EvaluationsModule },
    { id: 'monitoring',   label: 'Monitoreo',        icon: 'monitoring',   module: () => MonitoringModule },
    { id: 'vitals',       label: 'Signos Vitales',   icon: 'vitals',       module: () => VitalsModule },
    { id: 'medications',  label: 'Medicamentos',     icon: 'notes',        module: () => MedicationsModule },
    { id: 'goals',        label: 'Metas',            icon: 'goals',        module: () => GoalsModule },
    { id: 'notes',        label: 'Notas',            icon: 'notes',        module: () => NotesModule },
    null,
    { id: 'instruments',  label: 'Instrumentos',     icon: 'instruments',  module: () => InstrumentsModule },
    { id: 'templates',    label: 'Plantillas',       icon: 'templates',    module: () => TemplatesModule },
    null,
    { id: 'reminders',    label: 'Recordatorios',    icon: 'reminders',    module: () => RemindersModule },
    { id: 'analytics',    label: 'Analítica',        icon: 'monitoring',   module: () => AnalyticsModule },
    { id: 'export',       label: 'Exportar Reporte', icon: 'reports',      module: () => ExportModule },
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
    await showWelcomeIfNeeded();
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
        ${item.id === 'alerts' ? '<span class="nav-badge" id="alerts-nav-badge" style="display:none;margin-left:auto;background:var(--danger);color:white;border-radius:999px;font-size:.65rem;padding:.1rem .4rem;font-weight:700"></span>' : ''}
      `;
      btn.addEventListener('click', () => navigateTo(item.id));
      nav.appendChild(btn);
    });

    // Load alert count badge async
    AlertsModule.getCount().then(count => {
      const badge = document.getElementById('alerts-nav-badge');
      if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline';
      }
    }).catch(() => {});
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
    if (App._closeMobileMenu) {
      App._closeMobileMenu();
    } else {
      document.getElementById('sidebar').classList.remove('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');
    }
  }

  function bindGlobalEvents() {
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Mobile menu
    const _sidebar = document.getElementById('sidebar');
    const _backdrop = document.getElementById('sidebar-backdrop');

    function _openMobileMenu() {
      _sidebar.classList.add('mobile-open');
      _backdrop.classList.add('active');
      document.body.style.overflow = 'hidden'; // evitar scroll del body
    }
    function _closeMobileMenu() {
      _sidebar.classList.remove('mobile-open');
      _backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      _sidebar.classList.contains('mobile-open') ? _closeMobileMenu() : _openMobileMenu();
    });

    _backdrop.addEventListener('click', _closeMobileMenu);

    // Exponer para uso en navigateTo
    App._closeMobileMenu = _closeMobileMenu;

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
  
  // ── Welcome Modal ──
  async function showWelcomeIfNeeded() {
    const suppressed = await DB.getSetting('welcome_shown', false);
    if (suppressed) return;

    const FEATURES = [
      { icon: '👥', color: '#EBF3FF', title: 'Pacientes & Historia 360°', desc: 'Fichas clínicas por especialidad con vista longitudinal completa del historial.' },
      { icon: '📋', color: '#E6FAF8', title: 'Instrumentos Validados', desc: 'Barthel, PHQ-9, MMSE, EVA, MRC y más. Crea y personaliza los tuyos.' },
      { icon: '📈', color: '#EFF6FF', title: 'Monitoreo de Evolución', desc: 'Gráficos de progreso individual y grupal con comparativas entre pacientes.' },
      { icon: '🎯', color: '#ECFDF5', title: 'Metas Terapéuticas', desc: 'Objetivos con actualización automática de progreso según evaluaciones.' },
      { icon: '🔔', color: '#FFFBEB', title: 'Alertas Inteligentes', desc: 'Detección automática de deterioro clínico, metas vencidas y signos críticos.' },
      { icon: '💾', color: '#F0FDF4', title: 'Privacidad Total', desc: 'Todo se almacena localmente en tu navegador. Sin servidores, sin internet requerido.' },
    ];

    const grid = document.getElementById('welcome-features-grid');
    if (grid) {
      grid.innerHTML = FEATURES.map(f => `
        <div style="display:flex;align-items:flex-start;gap:0.75rem;padding:0.875rem;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border);transition:border-color var(--transition)">
          <div style="width:38px;height:38px;border-radius:var(--radius-sm);background:${f.color};display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0">${f.icon}</div>
          <div>
            <div style="font-family:var(--font-display);font-weight:600;font-size:0.855rem;color:var(--text-1);margin-bottom:0.2rem">${f.title}</div>
            <div style="font-size:0.775rem;color:var(--text-3);line-height:1.45">${f.desc}</div>
          </div>
        </div>`).join('');
    }

    const overlay = document.getElementById('welcome-overlay');
    overlay.classList.remove('hidden');

    const _closeWelcome = async () => {
      if (document.getElementById('welcome-dont-show')?.checked) {
        await DB.setSetting('welcome_shown', true);
      }
      overlay.classList.add('hidden');
    };

    document.getElementById('welcome-start').addEventListener('click', _closeWelcome);

    document.getElementById('welcome-load-data').addEventListener('click', async () => {
      const btn = document.getElementById('welcome-load-data');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px;animation:spin 0.6s linear infinite"><path d="M8 2a6 6 0 110 12A6 6 0 018 2z" stroke="currentColor" stroke-width="1.5" stroke-dasharray="18 6"/></svg> Cargando…`;
      try {
        await loadSampleData();
        await _closeWelcome();
        Utils.toast('✅ Datos de ejemplo cargados. ¡Explora la app!', 'success', 5000);
        await navigateTo('dashboard');
      } catch (e) {
        Utils.toast('Error al cargar datos: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) _closeWelcome(); });
  }

  async function loadSampleData() {
    if (typeof SAMPLE_DATA === 'undefined') {
      throw new Error('sample-data.js no encontrado. Asegúrate de incluirlo antes de app.js.');
    }
    const stores = ['patients','evaluations','notes','reminders','vitals','goals','medications','assessmentPackages'];
    for (const store of stores) {
      const records = SAMPLE_DATA[store];
      if (Array.isArray(records)) {
        for (const record of records) {
          await DB.put(store, record);
        }
      }
    }
  }

  return { init, navigateTo, getCurrentModule: () => currentModule, loadSampleData };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
