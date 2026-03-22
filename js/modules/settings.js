/* ============================================================
   ClinAxis — Settings Module
   ============================================================ */

const SettingsModule = (() => {

  async function render(container) {
    document.getElementById('topbar-actions').innerHTML = '';
    document.getElementById('page-subtitle').textContent = 'Configuración de la aplicación';

    const savedKey = await DB.getSetting('anthropic_api_key', '');

    container.innerHTML = `
      <!-- IA -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">✨ Inteligencia Artificial</h3>
        </div>
        <div class="card-body">
          <p class="text-sm text-muted mb-4">
            Las funciones de IA (resúmenes de historial, borradores de notas, análisis clínico) requieren
            una API key personal de Anthropic. Tu key se almacena <strong>únicamente en tu navegador</strong>
            y nunca es compartida.
          </p>

          <div class="card mb-4" style="background:var(--surface-2);border-color:var(--border)">
            <div class="card-body">
              <div class="flex gap-3" style="flex-wrap:wrap">
                <div style="font-size:1.5rem">1️⃣</div>
                <div>
                  <div class="fw-600 text-sm">Obtén tu API key gratuita</div>
                  <div class="text-xs text-muted mt-1">Visita <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>, crea una cuenta y genera una API key desde la sección <em>API Keys</em>.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">API Key de Anthropic</label>
            <div class="flex gap-2">
              <input type="password" class="form-input" id="api-key-input"
                placeholder="sk-ant-api03-..."
                value="${savedKey}"
                autocomplete="off"
                style="font-family:var(--font-mono);letter-spacing:0.04em;flex:1">
              <button class="btn btn-ghost btn-sm" id="btn-toggle-key" title="Mostrar/ocultar">
                ${Utils.icon.eye}
              </button>
            </div>
            <p class="form-hint">Comienza con <code>sk-ant-</code>. Se guarda en tu navegador con IndexedDB.</p>
          </div>

          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-primary" id="btn-save-key">
              Guardar API key
            </button>
            ${savedKey ? `
              <button class="btn btn-ghost" id="btn-test-key">
                Probar conexión
              </button>
              <button class="btn btn-danger-ghost btn-sm" id="btn-delete-key">
                ${Utils.icon.trash} Eliminar key
              </button>` : ''}
          </div>
          <div id="key-status" class="mt-3"></div>
        </div>
      </div>

      <!-- Apariencia -->
      <div class="card mb-4">
        <div class="card-header"><h3 class="card-title">🎨 Apariencia</h3></div>
        <div class="card-body">
          <div class="flex gap-3 items-center">
            <span class="text-sm">Tema de color</span>
            <div class="toggle-group">
              <button class="toggle-btn ${document.documentElement.dataset.theme === 'light' ? 'active' : ''}"
                onclick="App._setTheme('light')">
                ${Utils.icon.sun} Claro
              </button>
              <button class="toggle-btn ${document.documentElement.dataset.theme === 'dark' ? 'active' : ''}"
                onclick="App._setTheme('dark')">
                ${Utils.icon.moon} Oscuro
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Privacidad -->
      <div class="card">
        <div class="card-header"><h3 class="card-title">🔒 Privacidad y datos</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-0">
            ClinAxis almacena todos tus datos <strong>localmente en tu navegador</strong> mediante IndexedDB.
            Ningún dato clínico se envía a servidores externos. Las llamadas a la IA solo envían
            el contexto mínimo necesario directamente a la API de Anthropic usando tu propia key.
          </p>
        </div>
      </div>
    `;

    _bindEvents(container);
  }

  function _bindEvents(container) {
    // Toggle visibilidad key
    document.getElementById('btn-toggle-key')?.addEventListener('click', () => {
      const input = document.getElementById('api-key-input');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Guardar
    document.getElementById('btn-save-key')?.addEventListener('click', async () => {
      const key = document.getElementById('api-key-input').value.trim();
      const statusEl = document.getElementById('key-status');
      if (!key) {
        statusEl.innerHTML = `<span class="text-danger text-sm">Ingresa una API key válida.</span>`;
        return;
      }
      if (!key.startsWith('sk-ant-')) {
        statusEl.innerHTML = `<span class="text-danger text-sm">La key debe comenzar con <code>sk-ant-</code>.</span>`;
        return;
      }
      await DB.setSetting('anthropic_api_key', key);
      statusEl.innerHTML = `<span class="text-success text-sm">✓ API key guardada correctamente.</span>`;
      Utils.toast('API key guardada', 'success');
      // Re-render para mostrar botones de probar/eliminar
      setTimeout(() => render(container), 800);
    });

    // Probar conexión
    document.getElementById('btn-test-key')?.addEventListener('click', async () => {
      const statusEl = document.getElementById('key-status');
      statusEl.innerHTML = `<span class="text-muted text-sm">Probando conexión…</span>`;
      try {
        const text = await Utils.callClaude({
          system: 'Responde solo con "ok".',
          userMessage: 'test',
          maxTokens: 5,
        });
        statusEl.innerHTML = `<span class="text-success text-sm">✓ Conexión exitosa. La IA está lista.</span>`;
      } catch (e) {
        const msg = e.message === 'no_key'
          ? 'No hay API key guardada.'
          : `Error: ${e.message}`;
        statusEl.innerHTML = `<span class="text-danger text-sm">✗ ${msg}</span>`;
      }
    });

    // Eliminar
    document.getElementById('btn-delete-key')?.addEventListener('click', async () => {
      const ok = await Utils.confirm('¿Eliminar la API key guardada?', 'Eliminar API key');
      if (!ok) return;
      await DB.setSetting('anthropic_api_key', '');
      Utils.toast('API key eliminada', 'info');
      render(container);
    });
  }

  return { render };
})();
