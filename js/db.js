/* ============================================================
   ClinAxis — IndexedDB Data Layer (db.js)
   ============================================================ */

const DB = (() => {
  const DB_NAME = 'ClinAxisDB';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    patients:    { keyPath: 'id', indexes: [['createdAt','createdAt']] },
    evaluations: { keyPath: 'id', indexes: [['patientId','patientId'],['date','date']] },
    instruments: { keyPath: 'id', indexes: [['category','category']] },
    templates:   { keyPath: 'id', indexes: [['category','category']] },
    notes:       { keyPath: 'id', indexes: [['patientId','patientId'],['date','date']] },
    reminders:   { keyPath: 'id', indexes: [['date','date']] },
    vitals:      { keyPath: 'id', indexes: [['patientId','patientId'],['date','date']] },
    goals:       { keyPath: 'id', indexes: [['patientId','patientId'],['status','status']] },
    settings:    { keyPath: 'id' }
  };

  function open() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const database = e.target.result;
        Object.entries(STORES).forEach(([name, cfg]) => {
          if (!database.objectStoreNames.contains(name)) {
            const store = database.createObjectStore(name, { keyPath: cfg.keyPath });
            (cfg.indexes || []).forEach(([idx, kp]) => store.createIndex(idx, kp, { unique: false }));
          }
        });
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function getAll(storeName) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName).objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(storeName, id) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName).objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, data) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(storeName, id) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getByIndex(storeName, indexName, value) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName).objectStore(storeName).index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function count(storeName) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName).objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearStore(storeName) {
    await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
  }

  async function getSetting(key, defaultVal = null) {
    const s = await get('settings', key);
    return s ? s.value : defaultVal;
  }

  async function setSetting(key, value) {
    return put('settings', { id: key, value });
  }

  async function exportAll() {
    await open();
    const data = { _version: 1, _exportedAt: new Date().toISOString() };
    for (const name of Object.keys(STORES)) data[name] = await getAll(name);
    return data;
  }

  async function importAll(data) {
    await open();
    for (const name of Object.keys(STORES)) {
      if (!data[name] || !Array.isArray(data[name])) continue;
      await clearStore(name);
      for (const record of data[name]) await put(name, record);
    }
  }

  async function seedDefaults() {
    const instCount = await count('instruments');
    if (instCount > 0) return;

    const now = Date.now();

    const instruments = [
      {
        id: 'inst-eva', name: 'Escala Visual Analógica del Dolor (EVA)',
        description: 'Medida subjetiva del dolor mediante escala numérica del 0 al 10.',
        category: 'dolor',
        fields: [
          { id: 'f1', name: 'Intensidad del Dolor', type: 'slider', min: 0, max: 10, step: 1, unit: '/10', direction: 'lower_better' }
        ],
        scoring: { type: 'none' }, createdAt: now
      },
      {
        id: 'inst-barthel', name: 'Índice de Barthel',
        description: 'Medida de independencia funcional en actividades de la vida diaria (0-100).',
        category: 'funcional',
        fields: [
          { id: 'f1', name: 'Alimentación', type: 'select', options: ['0|Incapaz','5|Necesita ayuda','10|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f2', name: 'Baño', type: 'select', options: ['0|Dependiente','5|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f3', name: 'Vestido', type: 'select', options: ['0|Dependiente','5|Necesita ayuda','10|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f4', name: 'Arreglo personal', type: 'select', options: ['0|Dependiente','5|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f5', name: 'Deposición', type: 'select', options: ['0|Incontinente','5|Accidente ocasional','10|Continente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f6', name: 'Micción', type: 'select', options: ['0|Incontinente','5|Accidente ocasional','10|Continente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f7', name: 'Ir al retrete', type: 'select', options: ['0|Dependiente','5|Necesita ayuda','10|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f8', name: 'Transferencias', type: 'select', options: ['0|Incapaz','5|Gran ayuda','10|Mínima ayuda','15|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f9', name: 'Deambulación', type: 'select', options: ['0|Inmóvil','5|En silla de ruedas','10|Camina con ayuda','15|Independiente'], direction: 'higher_better', unit: 'pts' },
          { id: 'f10', name: 'Escaleras', type: 'select', options: ['0|Incapaz','5|Necesita ayuda','10|Independiente'], direction: 'higher_better', unit: 'pts' }
        ],
        scoring: { type: 'sum', label: 'Puntuación Total Barthel', maxScore: 100 }, createdAt: now
      },
      {
        id: 'inst-phq9', name: 'PHQ-9 (Cuestionario de Salud del Paciente)',
        description: 'Cuestionario de 9 ítems para cribado de depresión (0-27).',
        category: 'psicológico',
        fields: [
          { id: 'f1', name: 'Pérdida de interés o placer', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f2', name: 'Humor deprimido o sin esperanza', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f3', name: 'Problemas para dormir', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f4', name: 'Cansancio o poca energía', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f5', name: 'Problemas con el apetito', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f6', name: 'Sentimientos de fracaso', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f7', name: 'Dificultad para concentrarse', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f8', name: 'Agitación o enlentecimiento psicomotor', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' },
          { id: 'f9', name: 'Pensamientos de autolesión', type: 'likert', options: ['Ningún día (0)','Varios días (1)','Más de la mitad (2)','Casi todos los días (3)'], min: 0, max: 3, direction: 'lower_better' }
        ],
        scoring: { type: 'sum', label: 'Puntuación Total PHQ-9', maxScore: 27 }, createdAt: now
      },
      {
        id: 'inst-mmse', name: 'Mini-Mental State Examination (MMSE)',
        description: 'Evaluación cognitiva breve (0-30). Punto de corte: <24 sugiere deterioro.',
        category: 'cognitivo',
        fields: [
          { id: 'f1', name: 'Orientación temporal', type: 'number', min: 0, max: 5, unit: 'pts', direction: 'higher_better' },
          { id: 'f2', name: 'Orientación espacial', type: 'number', min: 0, max: 5, unit: 'pts', direction: 'higher_better' },
          { id: 'f3', name: 'Registro (3 palabras)', type: 'number', min: 0, max: 3, unit: 'pts', direction: 'higher_better' },
          { id: 'f4', name: 'Atención y cálculo', type: 'number', min: 0, max: 5, unit: 'pts', direction: 'higher_better' },
          { id: 'f5', name: 'Memoria (evocación)', type: 'number', min: 0, max: 3, unit: 'pts', direction: 'higher_better' },
          { id: 'f6', name: 'Lenguaje y praxis', type: 'number', min: 0, max: 9, unit: 'pts', direction: 'higher_better' }
        ],
        scoring: { type: 'sum', label: 'Puntuación Total MMSE', maxScore: 30 }, createdAt: now
      },
      {
        id: 'inst-mobility', name: 'Evaluación de Movilidad Funcional',
        description: 'Medidas cuantitativas y cualitativas de la movilidad del paciente.',
        category: 'funcional',
        fields: [
          { id: 'f1', name: 'Velocidad de marcha (m/s)', type: 'number', min: 0, max: 5, step: 0.01, unit: 'm/s', direction: 'higher_better' },
          { id: 'f2', name: 'Distancia recorrida (m)', type: 'number', min: 0, max: 2000, unit: 'm', direction: 'higher_better' },
          { id: 'f3', name: 'Dificultad percibida', type: 'slider', min: 0, max: 10, step: 1, unit: '/10', direction: 'lower_better' },
          { id: 'f4', name: 'Ayudas técnicas', type: 'select', options: ['0|Sin ayuda','1|Bastón','2|Andador','3|Muletas','4|Silla de ruedas'], direction: 'lower_better', unit: '' }
        ],
        scoring: { type: 'none' }, createdAt: now
      },
      {
        id: 'inst-mrc', name: 'Escala de Fuerza MRC',
        description: 'Medical Research Council - Evaluación de fuerza muscular por grupos.',
        category: 'motor',
        fields: [
          { id: 'f1', name: 'MMSS Derecho', type: 'select', options: ['0|Sin contracción','1|Contracción sin movimiento','2|Movimiento sin gravedad','3|Contra gravedad','4|Contra resistencia parcial','5|Fuerza normal'], direction: 'higher_better', unit: 'MRC' },
          { id: 'f2', name: 'MMSS Izquierdo', type: 'select', options: ['0|Sin contracción','1|Contracción sin movimiento','2|Movimiento sin gravedad','3|Contra gravedad','4|Contra resistencia parcial','5|Fuerza normal'], direction: 'higher_better', unit: 'MRC' },
          { id: 'f3', name: 'MMII Derecho', type: 'select', options: ['0|Sin contracción','1|Contracción sin movimiento','2|Movimiento sin gravedad','3|Contra gravedad','4|Contra resistencia parcial','5|Fuerza normal'], direction: 'higher_better', unit: 'MRC' },
          { id: 'f4', name: 'MMII Izquierdo', type: 'select', options: ['0|Sin contracción','1|Contracción sin movimiento','2|Movimiento sin gravedad','3|Contra gravedad','4|Contra resistencia parcial','5|Fuerza normal'], direction: 'higher_better', unit: 'MRC' }
        ],
        scoring: { type: 'sum', label: 'Puntuación Total MRC', maxScore: 20 }, createdAt: now
      }
    ];

    for (const inst of instruments) await put('instruments', inst);

    const templates = [
      {
        id: 'tmpl-general', name: 'Ficha Clínica General',
        description: 'Plantilla universal para registro de pacientes en cualquier especialidad.',
        category: 'general',
        fields: [
          { id: 'f1', name: 'Nombre', type: 'text', required: true },
          { id: 'f2', name: 'Apellidos', type: 'text', required: true },
          { id: 'f3', name: 'Fecha de Nacimiento', type: 'date', required: true },
          { id: 'f4', name: 'Género', type: 'select', required: false, options: ['Masculino','Femenino','Otro','Prefiero no indicar'] },
          { id: 'f5', name: 'RUT / DNI', type: 'text', required: false },
          { id: 'f6', name: 'Teléfono', type: 'tel', required: false },
          { id: 'f7', name: 'Email', type: 'email', required: false },
          { id: 'f8', name: 'Dirección', type: 'text', required: false },
          { id: 'f9', name: 'Previsión / Seguro', type: 'text', required: false },
          { id: 'f10', name: 'Diagnóstico Principal', type: 'textarea', required: false },
          { id: 'f11', name: 'Motivo de Consulta', type: 'textarea', required: false },
          { id: 'f12', name: 'Antecedentes Médicos', type: 'textarea', required: false },
          { id: 'f13', name: 'Medicamentos Actuales', type: 'textarea', required: false },
          { id: 'f14', name: 'Alergias', type: 'text', required: false }
        ],
        createdAt: now
      },
      {
        id: 'tmpl-neuro', name: 'Ficha Neurológica',
        description: 'Para pacientes con patología neurológica (ACV, TEC, EM, etc.).',
        category: 'neurología',
        fields: [
          { id: 'f1', name: 'Nombre', type: 'text', required: true },
          { id: 'f2', name: 'Apellidos', type: 'text', required: true },
          { id: 'f3', name: 'Fecha de Nacimiento', type: 'date', required: true },
          { id: 'f4', name: 'Género', type: 'select', required: false, options: ['Masculino','Femenino','Otro'] },
          { id: 'f5', name: 'Diagnóstico Neurológico', type: 'textarea', required: true },
          { id: 'f6', name: 'CIE-10 / CIE-11', type: 'text', required: false },
          { id: 'f7', name: 'Fecha de Inicio de Síntomas', type: 'date', required: false },
          { id: 'f8', name: 'Lado Afectado', type: 'select', required: false, options: ['Derecho','Izquierdo','Bilateral','N/A'] },
          { id: 'f9', name: 'Nivel de Conciencia', type: 'select', required: false, options: ['Alerta','Letárgico','Obnubilado','Estupor','Coma'] },
          { id: 'f10', name: 'Resultados de Neuroimagen', type: 'textarea', required: false },
          { id: 'f11', name: 'Antecedentes Neurológicos', type: 'textarea', required: false },
          { id: 'f12', name: 'Medicación Neurológica', type: 'textarea', required: false },
          { id: 'f13', name: 'Contacto de Emergencia', type: 'text', required: false }
        ],
        createdAt: now
      },
      {
        id: 'tmpl-rehab', name: 'Ficha de Rehabilitación Física',
        description: 'Para fisioterapia, kinesiología y rehabilitación física.',
        category: 'rehabilitación',
        fields: [
          { id: 'f1', name: 'Nombre', type: 'text', required: true },
          { id: 'f2', name: 'Apellidos', type: 'text', required: true },
          { id: 'f3', name: 'Fecha de Nacimiento', type: 'date', required: true },
          { id: 'f4', name: 'Diagnóstico Médico', type: 'textarea', required: true },
          { id: 'f5', name: 'Médico Derivante', type: 'text', required: false },
          { id: 'f6', name: 'Fecha Inicio de Tratamiento', type: 'date', required: false },
          { id: 'f7', name: 'Región Anatómica Afectada', type: 'text', required: false },
          { id: 'f8', name: 'Cirugías Previas', type: 'textarea', required: false },
          { id: 'f9', name: 'Objetivos del Tratamiento', type: 'textarea', required: false },
          { id: 'f10', name: 'Restricciones / Precauciones', type: 'textarea', required: false },
          { id: 'f11', name: 'Frecuencia de Sesiones', type: 'select', required: false, options: ['1x/semana','2x/semana','3x/semana','Diario','Variable'] },
          { id: 'f12', name: 'Estado Funcional Inicial', type: 'textarea', required: false }
        ],
        createdAt: now
      },
      {
        id: 'tmpl-psico', name: 'Ficha Psicológica',
        description: 'Para atención en salud mental y psicología clínica.',
        category: 'psicología',
        fields: [
          { id: 'f1', name: 'Nombre', type: 'text', required: true },
          { id: 'f2', name: 'Apellidos', type: 'text', required: true },
          { id: 'f3', name: 'Fecha de Nacimiento', type: 'date', required: true },
          { id: 'f4', name: 'Género', type: 'select', required: false, options: ['Masculino','Femenino','No binario','Prefiero no indicar'] },
          { id: 'f5', name: 'Motivo de Consulta', type: 'textarea', required: true },
          { id: 'f6', name: 'Diagnóstico DSM-5 / CIE-11', type: 'text', required: false },
          { id: 'f7', name: 'Historia Psiquiátrica Personal', type: 'textarea', required: false },
          { id: 'f8', name: 'Historia Familiar de Salud Mental', type: 'textarea', required: false },
          { id: 'f9', name: 'Tratamientos Psicológicos Previos', type: 'textarea', required: false },
          { id: 'f10', name: 'Psicofármacos Actuales', type: 'textarea', required: false },
          { id: 'f11', name: 'Red de Apoyo Social', type: 'textarea', required: false },
          { id: 'f12', name: 'Factores de Riesgo', type: 'textarea', required: false },
          { id: 'f13', name: 'Enfoque Terapéutico', type: 'select', required: false, options: ['TCC','ACT','DBT','Psicodinámica','Sistémica','Humanista','Gestalt','EMDR','Otro'] }
        ],
        createdAt: now
      },
      {
        id: 'tmpl-to', name: 'Ficha de Terapia Ocupacional',
        description: 'Para evaluación y seguimiento en terapia ocupacional.',
        category: 'terapia ocupacional',
        fields: [
          { id: 'f1', name: 'Nombre', type: 'text', required: true },
          { id: 'f2', name: 'Apellidos', type: 'text', required: true },
          { id: 'f3', name: 'Fecha de Nacimiento', type: 'date', required: true },
          { id: 'f4', name: 'Diagnóstico', type: 'textarea', required: true },
          { id: 'f5', name: 'Motivo de Derivación a TO', type: 'textarea', required: true },
          { id: 'f6', name: 'Ocupaciones Principales', type: 'textarea', required: false },
          { id: 'f7', name: 'Capacidad de AVD Básicas', type: 'textarea', required: false },
          { id: 'f8', name: 'Capacidad de AIVD', type: 'textarea', required: false },
          { id: 'f9', name: 'Entorno / Contexto', type: 'textarea', required: false },
          { id: 'f10', name: 'Participación Social y Laboral', type: 'textarea', required: false },
          { id: 'f11', name: 'Objetivos Ocupacionales', type: 'textarea', required: false }
        ],
        createdAt: now
      }
    ];

    for (const tmpl of templates) await put('templates', tmpl);
  }

  return { open, getAll, get, put, del, getByIndex, count, clearStore, getSetting, setSetting, exportAll, importAll, seedDefaults };
})();
