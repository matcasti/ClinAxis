/* ============================================================
   ClinAxis — Backup Module
   ============================================================ */

const BackupModule = (() => {

  async function render(container) {
    document.getElementById('topbar-actions').innerHTML = '';
    document.getElementById('page-subtitle').textContent = 'Exporta e importa todos tus datos';

    const counts = await Promise.all([
      DB.count('patients'),
      DB.count('evaluations'),
      DB.count('instruments'),
      DB.count('templates'),
      DB.count('notes'),
      DB.count('reminders'),
    ]);

    container.innerHTML = `
      <div class="grid-2 mb-6">
        <!-- Export -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Utils.icon.download} Exportar Datos</h3>
          </div>
          <p class="text-sm text-muted mb-4">
            Descarga todos tus datos en formato JSON para hacer un respaldo completo o transferirlos a otro dispositivo.
          </p>
          <div class="detail-grid mb-4">
            ${[['Pacientes',counts[0]],['Evaluaciones',counts[1]],['Instrumentos',counts[2]],
               ['Plantillas',counts[3]],['Notas',counts[4]],['Recordatorios',counts[5]]].map(([label,count]) => `
              <div class="detail-item">
                <div class="detail-label">${label}</div>
                <div class="detail-value">${count}</div>
              </div>`).join('')}
          </div>
          <button class="btn btn-primary" id="btn-export">
            ${Utils.icon.download} Descargar Respaldo JSON
          </button>
        </div>

        <!-- Import -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Utils.icon.upload} Importar Datos</h3>
          </div>
          <p class="text-sm text-muted mb-4">
            Restaura un respaldo JSON previamente exportado. <strong class="text-danger">Atención:</strong> esto reemplazará todos los datos actuales.
          </p>
          <div class="form-group mb-4">
            <label class="form-label">Archivo de respaldo (.json)</label>
            <input type="file" class="form-input" id="import-file" accept=".json">
          </div>
          <button class="btn btn-danger" id="btn-import">
            ${Utils.icon.upload} Importar y Restaurar
          </button>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="card border-danger">
        <div class="card-header">
          <h3 class="card-title text-danger">Zona de Peligro</h3>
        </div>
        <p class="text-sm text-muted mb-3">Elimina todos los datos de la aplicación de forma permanente. No se puede deshacer.</p>
        <button class="btn btn-danger" id="btn-reset">
          Borrar todos los datos
        </button>
      </div>
    `;

    document.getElementById('btn-export')?.addEventListener('click', exportData);
    document.getElementById('btn-import')?.addEventListener('click', importData);
    document.getElementById('btn-reset')?.addEventListener('click', resetData);
  }

  async function exportData() {
    try {
      const data = await DB.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `clinaxis-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Utils.toast('Respaldo descargado correctamente', 'success');
    } catch (e) {
      Utils.toast('Error al exportar: ' + e.message, 'error');
    }
  }

  async function importData() {
    const file = document.getElementById('import-file').files[0];
    if (!file) { Utils.toast('Selecciona un archivo JSON', 'warning'); return; }

    const ok = await Utils.confirm(
      '¿Restaurar desde respaldo?',
      'Esto reemplazará TODOS los datos actuales con los del archivo seleccionado. Esta acción no se puede deshacer.'
    );
    if (!ok) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await DB.importAll(data);
      Utils.toast('Datos restaurados correctamente. Recargando…', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      Utils.toast('Error al importar: ' + e.message, 'error');
    }
  }

  async function resetData() {
    const ok = await Utils.confirm(
      '¿Borrar todos los datos?',
      'ATENCIÓN: Esta acción eliminará permanentemente todos los pacientes, evaluaciones, notas y configuraciones. Es irreversible.'
    );
    if (!ok) return;
    const ok2 = await Utils.confirm('¿Estás seguro?', 'Escribe la confirmación final para continuar.');
    if (!ok2) return;

    try {
      await Promise.all([
        DB.clearStore('patients'),
        DB.clearStore('evaluations'),
        DB.clearStore('instruments'),
        DB.clearStore('templates'),
        DB.clearStore('notes'),
        DB.clearStore('reminders'),
      ]);
      Utils.toast('Todos los datos han sido eliminados. Recargando…', 'info');
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  }

  return { render };
})();
