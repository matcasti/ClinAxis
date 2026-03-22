/* ============================================================
   ClinAxis — Sample Data (sample-data.js)
   5 pacientes · 20 evaluaciones · 15 notas · 10 recordatorios
   15 signos vitales · 10 metas · 14 medicamentos · 2 paquetes
   ============================================================ */

const SAMPLE_DATA = {
  _version: 1,
  _exportedAt: "2026-03-22T00:00:00.000Z",

  /* ═══════════════════════════════════════
     PACIENTES
  ═══════════════════════════════════════ */
  patients: [
    {
      id: "p-001",
      templateId: "tmpl-neuro",
      fields: {
        f1: "María", f2: "González Pérez",
        f3: "1960-03-15", f4: "Femenino",
        f5: "ACV isquémico territorio ACM derecha (12/2024). Hemiparesia izquierda, afasia de expresión moderada.",
        f6: "G60.9", f7: "2024-12-10",
        f8: "Izquierdo", f9: "Alerta",
        f10: "RM cerebral: infarto en territorio ACM derecha con transformación hemorrágica.",
        f11: "HTA, DM2 en tratamiento con insulina.",
        f12: "Aspirina, Atorvastatina, Insulina glargina, Losartán.",
        f13: "Hija: Carmen González 9-8765-4321"
      },
      createdAt: 1729036800000
    },
    {
      id: "p-002",
      templateId: "tmpl-rehab",
      fields: {
        f1: "Carlos", f2: "Rodríguez Muñoz",
        f3: "1967-07-22", 
        f4: "Fractura pertrocantérea cadera derecha (10/2025). Osteosíntesis con clavo endomedular.",
        f5: "Dr. Andrés Pérez — Traumatología HCSBA",
        f6: "2025-11-08",
        f7: "Cadera derecha, región trocantérea",
        f8: "Osteosíntesis cadera derecha 29/10/2025. Sin cirugías previas.",
        f9: "Recuperar marcha independiente y retorno a actividad laboral (operador de maquinaria).",
        f10: "Descarga parcial según tolerancia. Control dolor previo a terapia.",
        f11: "3x/semana",
        f12: "Deambulación con andador. Dolor 8/10 EVA en reposo inicial. ROM cadera limitado por dolor."
      },
      createdAt: 1730851200000
    },
    {
      id: "p-003",
      templateId: "tmpl-psico",
      fields: {
        f1: "Elena", f2: "Martínez Soto",
        f3: "1991-11-08", f4: "Femenino",
        f5: "Episodio depresivo mayor, moderado-severo. Ideación pasiva de muerte sin plan. Antecedente episodio previo 2019.",
        f6: "F32.1 CIE-11",
        f7: "Episodio depresivo 2019 — remisión completa con TCC + Fluoxetina.",
        f8: "Madre con diagnóstico de TAB tipo II.",
        f9: "TCC individual 2019-2020 (alta con remisión). Primera vez con psiquiatría.",
        f10: "Sertralina 100mg/día (inicio 10/2025). Clonazepam 0.5mg PRN.",
        f11: "Pareja e hija (4 años). Madre disponible.",
        f12: "Ideación pasiva ocasional sin plan ni intención. Sin conductas autolesivas.",
        f13: "TCC"
      },
      createdAt: 1729900800000
    },
    {
      id: "p-004",
      templateId: "tmpl-general",
      fields: {
        f1: "Roberto", f2: "Sánchez Torres",
        f3: "1953-04-30", f4: "Masculino",
        f5: "18.765.432-1",
        f6: "+56 9 4567 8901",
        f7: "roberto.sanchez@email.com",
        f8: "Av. Providencia 2345, Santiago",
        f9: "FONASA A",
        f10: "Lumbalgia crónica inespecífica de 8 años evolución. Hipertensión arterial esencial. DM2.",
        f11: "Control dolor lumbar crónico y manejo multidisciplinario.",
        f12: "Lumbalgia crónica desde 2017. HTA diagnosticada 2015. DM2 desde 2018.",
        f13: "Metformina 850mg c/12h, Losartán 50mg/día, Omeprazol 20mg/día, Amitriptilina 25mg/noche.",
        f14: "AINES (úlcera gástrica 2016)"
      },
      createdAt: 1730419200000
    },
    {
      id: "p-005",
      templateId: "tmpl-to",
      fields: {
        f1: "Ana", f2: "López Vargas",
        f3: "1980-09-17", f4: "Femenino",
        f5: "ACV isquémico silviano izquierdo (09/2025). Hemiparesia derecha, disfagia leve resuelta.",
        f6: "Reintegración en ABVD y retorno a trabajo administrativo part-time.",
        f7: "ABVD básicas con supervisión. AIVD dependiente. Uso silla de ruedas en exteriores.",
        f8: "Necesita adaptaciones en domicilio: barras baño, rampa acceso. Vive en piso 2 sin ascensor (en gestión).",
        f9: "Trabajo administrativo (secretaria) suspendido desde ACV. Objetivo: retorno part-time.",
        f10: "AVDI restringidas. Participación social reducida. Aislamiento por limitaciones motoras.",
        f11: "Mejorar autonomía en ABVD, adaptación del entorno, retorno laboral gradual."
      },
      createdAt: 1731628800000
    }
  ],

  /* ═══════════════════════════════════════
     EVALUACIONES (4 por paciente)
  ═══════════════════════════════════════ */
  evaluations: [

    /* ── María — Barthel + MMSE + MRC ── */
    {
      id: "ev-001", patientId: "p-001",
      date: "2025-10-20", title: "Evaluación inicial post-ACV",
      notes: "Paciente con 10 días post-ACV. Hemiparesia izquierda severa. Inicia programa de rehabilitación intensivo.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"5|Necesita ayuda", f2:"5|Independiente", f3:"5|Necesita ayuda", f4:"0|Dependiente", f5:"5|Accidente ocasional", f6:"5|Accidente ocasional", f7:"0|Dependiente", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"3", f2:"3", f3:"2", f4:"3", f5:"1", f6:"5" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"3|Contra gravedad", f2:"4|Contra resistencia parcial", f3:"2|Movimiento sin gravedad", f4:"3|Contra gravedad" }
        }
      ],
      createdAt: 1729468800000, updatedAt: 1729468800000
    },
    {
      id: "ev-002", patientId: "p-001",
      date: "2025-12-01", title: "Control 6 semanas",
      notes: "Progreso notable en transferencias y AVD. Mejora en expresión verbal. Inicia marcha con andador.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"5|Necesita ayuda", f4:"5|Independiente", f5:"5|Accidente ocasional", f6:"5|Accidente ocasional", f7:"5|Necesita ayuda", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"2", f4:"4", f5:"2", f6:"6" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"4|Contra resistencia parcial", f2:"4|Contra resistencia parcial", f3:"3|Contra gravedad", f4:"3|Contra gravedad" }
        }
      ],
      createdAt: 1733011200000, updatedAt: 1733011200000
    },
    {
      id: "ev-003", patientId: "p-001",
      date: "2026-01-15", title: "Control 3 meses",
      notes: "Excelente evolución. Marcha con bastón en interiores. Comunicación fluida con leve anomia residual.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"10|Continente", f6:"5|Accidente ocasional", f7:"5|Necesita ayuda", f8:"10|Mínima ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"3", f4:"4", f5:"2", f6:"7" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"4|Contra resistencia parcial", f2:"5|Fuerza normal", f3:"3|Contra gravedad", f4:"4|Contra resistencia parcial" }
        }
      ],
      createdAt: 1736899200000, updatedAt: 1736899200000
    },
    {
      id: "ev-004", patientId: "p-001",
      date: "2026-03-01", title: "Control 4 meses — alta parcial",
      notes: "Función alcanzada supera objetivos iniciales. Alta parcial. Continúa terapia ambulatoria 1x/semana.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"10|Continente", f6:"10|Continente", f7:"10|Independiente", f8:"10|Mínima ayuda", f9:"10|Camina con ayuda", f10:"5|Necesita ayuda" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"5", f2:"5", f3:"3", f4:"4", f5:"3", f6:"7" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"5|Fuerza normal", f2:"5|Fuerza normal", f3:"4|Contra resistencia parcial", f4:"4|Contra resistencia parcial" }
        }
      ],
      createdAt: 1740787200000, updatedAt: 1740787200000
    },

    /* ── Carlos — Barthel + EVA + Movilidad ── */
    {
      id: "ev-005", patientId: "p-002",
      date: "2025-11-08", title: "Evaluación inicial post-quirúrgica",
      notes: "Día 10 post-osteosíntesis. Descarga parcial. Dolor importante al movimiento. Fuerza cuadriceps disminuida.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"5|Necesita ayuda", f4:"5|Independiente", f5:"5|Accidente ocasional", f6:"5|Accidente ocasional", f7:"0|Dependiente", f8:"5|Gran ayuda", f9:"0|Inmóvil", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "Escala Visual Analógica (EVA)",
          values: { f1:"8" }
        },
        {
          instrumentId: "inst-mobility", instrumentName: "Evaluación de Movilidad Funcional",
          values: { f1:"0.3", f2:"15", f3:"9", f4:"2|Andador" }
        }
      ],
      createdAt: 1731024000000, updatedAt: 1731024000000
    },
    {
      id: "ev-006", patientId: "p-002",
      date: "2025-12-10", title: "Control 5 semanas",
      notes: "Descarga completa autorizada. Progreso significativo en marcha. Dolor controlado con analgesia.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"5|Accidente ocasional", f6:"10|Continente", f7:"5|Necesita ayuda", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "Escala Visual Analógica (EVA)",
          values: { f1:"5" }
        },
        {
          instrumentId: "inst-mobility", instrumentName: "Evaluación de Movilidad Funcional",
          values: { f1:"0.6", f2:"40", f3:"6", f4:"1|Bastón" }
        }
      ],
      createdAt: 1733788800000, updatedAt: 1733788800000
    },
    {
      id: "ev-007", patientId: "p-002",
      date: "2026-01-20", title: "Control 10 semanas",
      notes: "Marcha con bastón en exteriores. Sube escaleras con apoyo. Dolor bien controlado.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"10|Continente", f6:"10|Continente", f7:"10|Independiente", f8:"10|Mínima ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "Escala Visual Analógica (EVA)",
          values: { f1:"3" }
        },
        {
          instrumentId: "inst-mobility", instrumentName: "Evaluación de Movilidad Funcional",
          values: { f1:"0.9", f2:"100", f3:"4", f4:"1|Bastón" }
        }
      ],
      createdAt: 1737331200000, updatedAt: 1737331200000
    },
    {
      id: "ev-008", patientId: "p-002",
      date: "2026-03-05", title: "Control final — alta rehabilitación",
      notes: "Marcha independiente sin ayuda técnica. Retorno laboral programado para abril. Alta de rehabilitación.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"10|Continente", f6:"10|Continente", f7:"10|Independiente", f8:"10|Mínima ayuda", f9:"10|Camina con ayuda", f10:"5|Necesita ayuda" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "Escala Visual Analógica (EVA)",
          values: { f1:"2" }
        },
        {
          instrumentId: "inst-mobility", instrumentName: "Evaluación de Movilidad Funcional",
          values: { f1:"1.1", f2:"200", f3:"2", f4:"0|Sin ayuda" }
        }
      ],
      createdAt: 1741132800000, updatedAt: 1741132800000
    },

    /* ── Elena — PHQ-9 + EVA estado ánimo ── */
    {
      id: "ev-009", patientId: "p-003",
      date: "2025-10-28", title: "Evaluación inicial — depresión",
      notes: "Primera evaluación. Sintomatología severa. Riesgo bajo-moderado. Inicia TCC + Sertralina.",
      instruments: [
        {
          instrumentId: "inst-phq9", instrumentName: "PHQ-9",
          values: { f1:"3", f2:"3", f3:"2", f4:"3", f5:"2", f6:"3", f7:"2", f8:"2", f9:"1" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Estado Anímico",
          values: { f1:"8" }
        }
      ],
      createdAt: 1730073600000, updatedAt: 1730073600000
    },
    {
      id: "ev-010", patientId: "p-003",
      date: "2025-12-05", title: "Control 5 semanas TCC",
      notes: "Mejora en ritmo sueño-vigilia. Sigue con anhedonia marcada. Adherencia a Sertralina completa.",
      instruments: [
        {
          instrumentId: "inst-phq9", instrumentName: "PHQ-9",
          values: { f1:"2", f2:"3", f3:"2", f4:"2", f5:"2", f6:"2", f7:"1", f8:"1", f9:"1" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Estado Anímico",
          values: { f1:"6" }
        }
      ],
      createdAt: 1733356800000, updatedAt: 1733356800000
    },
    {
      id: "ev-011", patientId: "p-003",
      date: "2026-01-12", title: "Control 10 semanas — mejoría moderada",
      notes: "Recuperación parcial del placer en actividades. Retomó caminatas. Sigue trabajo en pensamientos automáticos.",
      instruments: [
        {
          instrumentId: "inst-phq9", instrumentName: "PHQ-9",
          values: { f1:"1", f2:"2", f3:"1", f4:"2", f5:"1", f6:"1", f7:"1", f8:"1", f9:"0" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Estado Anímico",
          values: { f1:"4" }
        }
      ],
      createdAt: 1736640000000, updatedAt: 1736640000000
    },
    {
      id: "ev-012", patientId: "p-003",
      date: "2026-02-20", title: "Control 16 semanas — remisión parcial",
      notes: "PHQ-9 en rango leve. Retomó actividades sociales. Inicio de fase de consolidación TCC.",
      instruments: [
        {
          instrumentId: "inst-phq9", instrumentName: "PHQ-9",
          values: { f1:"1", f2:"1", f3:"1", f4:"1", f5:"0", f6:"1", f7:"0", f8:"1", f9:"0" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Estado Anímico",
          values: { f1:"3" }
        }
      ],
      createdAt: 1740009600000, updatedAt: 1740009600000
    },

    /* ── Roberto — EVA + MMSE ── */
    {
      id: "ev-013", patientId: "p-004",
      date: "2025-11-03", title: "Evaluación inicial dolor crónico",
      notes: "Dolor lumbar 8/10. Funcionalidad muy limitada. Ajuste analgesia: agregar Amitriptilina.",
      instruments: [
        {
          instrumentId: "inst-eva", instrumentName: "Escala EVA Dolor",
          values: { f1:"8" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"3", f4:"4", f5:"3", f6:"9" }
        }
      ],
      createdAt: 1730592000000, updatedAt: 1730592000000
    },
    {
      id: "ev-014", patientId: "p-004",
      date: "2025-12-15", title: "Control mensual",
      notes: "Mejora leve con Amitriptilina. Requiere ejercicio supervisado. Derivación a kinesiología.",
      instruments: [
        {
          instrumentId: "inst-eva", instrumentName: "Escala EVA Dolor",
          values: { f1:"7" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"3", f4:"4", f5:"3", f6:"9" }
        }
      ],
      createdAt: 1734220800000, updatedAt: 1734220800000
    },
    {
      id: "ev-015", patientId: "p-004",
      date: "2026-02-01", title: "Control bimensual",
      notes: "Mejora funcional con ejercicio terapéutico. Dolor más controlado. Leve descenso MMSE a vigilar.",
      instruments: [
        {
          instrumentId: "inst-eva", instrumentName: "Escala EVA Dolor",
          values: { f1:"5" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"3", f4:"4", f5:"2", f6:"8" }
        }
      ],
      createdAt: 1738368000000, updatedAt: 1738368000000
    },
    {
      id: "ev-016", patientId: "p-004",
      date: "2026-03-10", title: "Control trimestral + alerta cognitiva",
      notes: "MMSE 24 — deterioro de 3 puntos en 4 meses. Solicitar evaluación neurológica y neuroimagen. Dolor en rango moderado.",
      instruments: [
        {
          instrumentId: "inst-eva", instrumentName: "Escala EVA Dolor",
          values: { f1:"4" }
        },
        {
          instrumentId: "inst-mmse", instrumentName: "Mini-Mental State (MMSE)",
          values: { f1:"4", f2:"4", f3:"2", f4:"4", f5:"2", f6:"8" }
        }
      ],
      createdAt: 1741564800000, updatedAt: 1741564800000
    },

    /* ── Ana — Barthel + MRC + EVA ── */
    {
      id: "ev-017", patientId: "p-005",
      date: "2025-11-18", title: "Evaluación inicial TO — post-ACV",
      notes: "ABVD totalmente dependiente excepto alimentación con supervisión. Hemiparesia derecha marcada.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"5|Necesita ayuda", f2:"0|Dependiente", f3:"5|Necesita ayuda", f4:"5|Independiente", f5:"0|Incontinente", f6:"5|Accidente ocasional", f7:"0|Dependiente", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"3|Contra gravedad", f2:"4|Contra resistencia parcial", f3:"1|Contracción sin movimiento", f4:"2|Movimiento sin gravedad" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Espasticidad/Dolor",
          values: { f1:"6" }
        }
      ],
      createdAt: 1731888000000, updatedAt: 1731888000000
    },
    {
      id: "ev-018", patientId: "p-005",
      date: "2025-12-22", title: "Control 5 semanas TO",
      notes: "Mejora en vestido tren superior con adaptaciones. Inicia entrenamiento en cocina adaptada.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"5|Necesita ayuda", f2:"5|Independiente", f3:"5|Necesita ayuda", f4:"5|Independiente", f5:"5|Accidente ocasional", f6:"5|Accidente ocasional", f7:"0|Dependiente", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"3|Contra gravedad", f2:"4|Contra resistencia parcial", f3:"2|Movimiento sin gravedad", f4:"3|Contra gravedad" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Espasticidad/Dolor",
          values: { f1:"4" }
        }
      ],
      createdAt: 1735171200000, updatedAt: 1735171200000
    },
    {
      id: "ev-019", patientId: "p-005",
      date: "2026-02-05", title: "Control 11 semanas — progreso ABVD",
      notes: "Ducha independiente con silla y barras. Vestido tren inferior con mínima ayuda. Marcha con bastón en interiores.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"5|Necesita ayuda", f4:"5|Independiente", f5:"5|Accidente ocasional", f6:"5|Accidente ocasional", f7:"5|Necesita ayuda", f8:"5|Gran ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"4|Contra resistencia parcial", f2:"5|Fuerza normal", f3:"3|Contra gravedad", f4:"4|Contra resistencia parcial" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Espasticidad/Dolor",
          values: { f1:"3" }
        }
      ],
      createdAt: 1738713600000, updatedAt: 1738713600000
    },
    {
      id: "ev-020", patientId: "p-005",
      date: "2026-03-15", title: "Control 4 meses — preparación retorno laboral",
      notes: "Independencia en ABVD básicas lograda. Inicia simulación de tareas administrativas. Gestión adaptaciones pc.",
      instruments: [
        {
          instrumentId: "inst-barthel", instrumentName: "Índice de Barthel",
          values: { f1:"10|Independiente", f2:"5|Independiente", f3:"10|Independiente", f4:"5|Independiente", f5:"10|Continente", f6:"5|Accidente ocasional", f7:"5|Necesita ayuda", f8:"10|Mínima ayuda", f9:"5|En silla de ruedas", f10:"0|Incapaz" }
        },
        {
          instrumentId: "inst-mrc", instrumentName: "Escala de Fuerza MRC",
          values: { f1:"4|Contra resistencia parcial", f2:"5|Fuerza normal", f3:"3|Contra gravedad", f4:"4|Contra resistencia parcial" }
        },
        {
          instrumentId: "inst-eva", instrumentName: "EVA Espasticidad/Dolor",
          values: { f1:"2" }
        }
      ],
      createdAt: 1742000000000, updatedAt: 1742000000000
    }
  ],

  /* ═══════════════════════════════════════
     NOTAS CLÍNICAS
  ═══════════════════════════════════════ */
  notes: [
    {
      id: "nt-001", patientId: "p-001",
      date: "2025-10-21", type: "Evolución",
      title: "Nota de ingreso — evaluación inicial",
      content: "Paciente femenina de 65 años ingresa a programa de rehabilitación post-ACV isquémico derecho (10 días evolución).\n\nS: Refiere dificultad para comunicarse y mover extremidades izquierdas. Familia reporta cambios conductuales.\n\nO: Hemiparesia izquierda severa. Afasia de expresión moderada. Marcha imposible sin asistencia. Barthel 35/100.\n\nA: ACV isquémico ACM derecha con déficit motor y cognitivo-comunicativo significativo. Pronóstico moderado-favorable dado inicio precoz de rehabilitación.\n\nP: Rehabilitación intensiva 5 días/semana. Objetivos: marcha con asistencia a 3 meses, independencia AVD básicas a 4 meses. Coordinación con fonoaudiología y neuropsicología.",
      tags: ["ACV", "ingreso", "hemiparesia", "afasia"],
      createdAt: 1729555200000, updatedAt: 1729555200000
    },
    {
      id: "nt-002", patientId: "p-001",
      date: "2025-12-02", type: "Evolución",
      title: "Evolución — 6 semanas rehabilitación",
      content: "S: Paciente refiere sentirse más segura al caminar con andador. Familia nota mejoría en comunicación.\n\nO: Barthel 50/100. Inicia marcha con andador en interiores (10-15m). Expresión verbal mejorada — frases cortas comprensibles. MMSE 22/30.\n\nA: Evolución favorable. Mejora motora y comunicativa por encima de lo esperado para el período.\n\nP: Progresión a bastón en próximas 4 semanas. Continuar fonoaudiología 3x/semana. Control en 6 semanas.",
      tags: ["evolución", "marcha", "mejora"],
      createdAt: 1733097600000, updatedAt: 1733097600000
    },
    {
      id: "nt-003", patientId: "p-001",
      date: "2026-03-02", type: "Alta",
      title: "Nota de alta parcial — continuación ambulatoria",
      content: "Tras 4 meses de rehabilitación intensiva, paciente alcanza Barthel 85/100 y MMSE 27/30.\n\nLogros: marcha independiente con bastón en interior/exterior, AVD básicas independiente excepto escaleras, comunicación funcional con anomia residual leve.\n\nAlta de programa intensivo. Continúa fisioterapia ambulatoria 1x/semana y fonoaudiología 2x/semana.\n\nPróximo control neurológico: abril 2026.",
      tags: ["alta", "logros", "ambulatoria"],
      createdAt: 1740873600000, updatedAt: 1740873600000
    },
    {
      id: "nt-004", patientId: "p-002",
      date: "2025-11-09", type: "Evolución",
      title: "Evaluación inicial kinesiología post-quirúrgica",
      content: "Paciente masculino 58 años, día 11 post-osteosíntesis cadera derecha.\n\nDolor 8/10 en reposo, 10/10 al movimiento. ROM activo cadera muy limitado. Fuerza cuadriceps 3/5 bilateral. Edema moderado muslo y rodilla derechos.\n\nInicia protocolo: ejercicios activos tobillo, isométricos cuadriceps e glúteos, transferencias supervisadas. Descarga parcial autorizada por traumatólogo (50%).\n\nObjetivos semana 1-4: control dolor, reducir edema, prevenir TVP, iniciar descarga progresiva.",
      tags: ["post-quirúrgico", "cadera", "dolor", "movilización"],
      createdAt: 1731110400000, updatedAt: 1731110400000
    },
    {
      id: "nt-005", patientId: "p-002",
      date: "2026-01-21", type: "Evolución",
      title: "Evolución rehabilitación — 10 semanas",
      content: "Progreso significativo. Carlos inicia marcha en exteriores con bastón esta semana.\n\nEVA dolor 3/10. Marcha 100m sin descanso. Sube 1 tramo escaleras con apoyo bilateral.\n\nRetorno laboral discutido: programado para abril 2026 con modificaciones temporales (trabajo administrativo). Derivación a médico laboral.",
      tags: ["evolución", "marcha", "retorno laboral"],
      createdAt: 1737417600000, updatedAt: 1737417600000
    },
    {
      id: "nt-006", patientId: "p-003",
      date: "2025-10-29", type: "Evolución",
      title: "Sesión inicial — evaluación y plan TCC",
      content: "Primera sesión. Elena acude sola, aspectos formales adecuados. Relata historia de depresión actual iniciada hace 3 meses tras pérdida laboral inesperada.\n\nAspectos clínicos: ánimo depresivo persistente, anhedonia severa, insomnio de mantenimiento, ideas de desesperanza sin ideación activa de suicidio.\n\nPHQ-9 = 21 (depresión severa). Se explica modelo cognitivo y se acuerda frecuencia de sesiones (semanal).\n\nPlan: Psicoeducación semanas 1-3. Activación conductual semanas 4-8. Reestructuración cognitiva semanas 9-16.",
      tags: ["evaluación", "TCC", "depresión severa"],
      createdAt: 1730160000000, updatedAt: 1730160000000
    },
    {
      id: "nt-007", patientId: "p-003",
      date: "2025-12-10", type: "Evolución",
      title: "Sesión 6 — activación conductual",
      content: "Elena reporta mejora parcial. Retomó caminatas diarias (20 min). Duerme mejor con Sertralina.\n\nTrabajamos en registro de actividades y nivel de satisfacción. Identifica que el trabajo doméstico y el cuidado de su hija le generan algo de satisfacción.\n\nPHQ-9 = 16. Sigue con anhedonia para actividades que antes disfrutaba (lectura, amigos).\n\nTarea: planificar 2 actividades placenteras por semana.",
      tags: ["activación conductual", "mejora parcial"],
      createdAt: 1733788800000, updatedAt: 1733788800000
    },
    {
      id: "nt-008", patientId: "p-003",
      date: "2026-02-25", type: "Evolución",
      title: "Sesión 16 — consolidación y proyección",
      content: "Excelente sesión de cierre de fase activa. PHQ-9 = 6 (sintomatología leve residual).\n\nElena retomó clases de yoga, mantiene contacto regular con amigas. Inicio proceso búsqueda empleo esta semana.\n\nTrabajamos en plan de prevención de recaídas: identificación de señales de alerta tempranas y estrategias de afrontamiento consolidadas.\n\nPróximas sesiones en modalidad de seguimiento (quincenal x 2 meses, luego mensual).",
      tags: ["remisión", "prevención recaída", "alta fase activa"],
      createdAt: 1740441600000, updatedAt: 1740441600000
    },
    {
      id: "nt-009", patientId: "p-004",
      date: "2025-11-04", type: "Evolución",
      title: "Evaluación inicial — dolor lumbar crónico",
      content: "Roberto, 72 años, con 8 años de lumbalgia crónica inespecífica. EVA 8/10 en actividad. Limitación funcional severa: no puede caminar más de 200m ni permanecer de pie >15 min.\n\nAntecedentes relevantes: HTA controlada con Losartán. DM2 con Metformina. Sed analgésicos múltiples sin eficio sostenido.\n\nPlan: Agregar Amitriptilina 25mg/noche (efecto analgésico coadyuvante). Derivar a kinesiología. MMSE 27/30 (normal para edad).\n\nSeguimiento mensual.",
      tags: ["lumbalgia", "crónico", "evaluación", "analgesia"],
      createdAt: 1730678400000, updatedAt: 1730678400000
    },
    {
      id: "nt-010", patientId: "p-004",
      date: "2026-03-11", type: "Observación",
      title: "⚠ Alerta cognitiva — derivación urgente neurología",
      content: "Control de rutina. Familia reporta que Roberto 'olvida cosas recientes' con mayor frecuencia en los últimos 2 meses.\n\nMMSE hoy: 24/30 (descenso de 3 puntos respecto a noviembre). Falla especialmente en evocación diferida y registro.\n\nACCIÓN: Se solicita evaluación neurológica urgente-preferente. Solicitar RM cerebral con gadolinio. Derivar a neuropsicólogo para evaluación cognitiva completa.\n\nFamilia informada de hallazgos y plan de acción. Control en 3 semanas.",
      tags: ["alerta cognitiva", "MMSE descenso", "derivación neurología", "urgente"],
      createdAt: 1741651200000, updatedAt: 1741651200000
    },
    {
      id: "nt-011", patientId: "p-005",
      date: "2025-11-19", type: "Evolución",
      title: "Evaluación inicial TO — post-ACV izquierdo",
      content: "Ana, 45 años, 2 meses post-ACV isquémico silviano izquierdo. Hemiparesia derecha moderada-severa.\n\nEvaluación ABVD: totalmente dependiente en baño, vestido tren inferior y transferencias. Alimentación con supervisión.\n\nFuerza MRC: MMSS D 3/5, MMSS I 4/5, MMII D 1/5, MMII I 3/5.\n\nMetas TO: independencia en ABVD básicas a 3 meses, preparación retorno laboral a 6 meses.\n\nInicio adaptaciones domicilio: solicitud de barras ducha, silla de ducha y rampa acceso (en coordinación con asistente social).",
      tags: ["evaluación inicial", "ABVD", "adaptaciones", "hemiparesia"],
      createdAt: 1731974400000, updatedAt: 1731974400000
    },
    {
      id: "nt-012", patientId: "p-005",
      date: "2026-02-06", type: "Evolución",
      title: "Progreso ABVD — inicio fase laboral",
      content: "Excelente evolución en autonomía. Ana realiza ducha completa con barras instaladas (sin supervisión desde hace 2 semanas). Viste tren superior de forma independiente.\n\nBarthel 55/100. Marcha en interior con bastón (20-30m). Continúa trabajo en mano dominante (derecha).\n\nInicia esta sesión módulo de preparación laboral: simulación tareas administrativas con adaptaciones (mouse vertical, soporte muneca).\n\nCoordinación con empleador para evaluar retorno part-time en abril.",
      tags: ["ABVD", "autonomía", "retorno laboral", "adaptaciones laborales"],
      createdAt: 1738800000000, updatedAt: 1738800000000
    },
    {
      id: "nt-013", patientId: "p-005",
      date: "2026-03-16", type: "Interconsulta",
      title: "Interconsulta médico laboral — planificación retorno",
      content: "Derivación a médico laboral para evaluación de capacidad funcional laboral.\n\nResumen para evaluador: Ana López, 45 años, secretaria administrativa. Post-ACV isquémico 6 meses. Hemiparesia derecha, actualmente Barthel 70/100.\n\nCapacidades actuales: uso computador con adaptaciones (mouse izquierdo + teclado estándar lento), comunicación oral y escrita preservada, tolerancia sedente 2-3 horas.\n\nLimitaciones: no puede manejar, transporte público con acompañamiento, fatiga moderada post-esfuerzo.\n\nRecomendación TO: retorno gradual 4h/día presencial, con adaptaciones ergonómicas y descansos programados.",
      tags: ["interconsulta", "retorno laboral", "capacidad funcional"],
      createdAt: 1742083200000, updatedAt: 1742083200000
    }
  ],

  /* ═══════════════════════════════════════
     RECORDATORIOS
  ═══════════════════════════════════════ */
  reminders: [
    {
      id: "rm-001", patientId: "p-001",
      title: "Control neurológico post-alta", type: "Cita",
      date: "2026-04-10", description: "Control con neurólogo tratante. Llevar resumen rehabilitación y últimas evaluaciones.",
      completed: false, createdAt: 1740873600000
    },
    {
      id: "rm-002", patientId: "p-002",
      title: "Radiografía control cadera derecha", type: "Evaluación",
      date: "2026-04-05", description: "Rx AP y lateral cadera derecha. Evaluar consolidación y posición implante.",
      completed: false, createdAt: 1741132800000
    },
    {
      id: "rm-003", patientId: "p-003",
      title: "Sesión seguimiento quincenal", type: "Cita",
      date: "2026-04-01", description: "Primera sesión de seguimiento post-fase activa TCC. Revisar plan prevención recaídas.",
      completed: false, createdAt: 1740441600000
    },
    {
      id: "rm-004", patientId: "p-004",
      title: "⚠ Evaluación neurológica URGENTE", type: "Evaluación",
      date: "2026-03-28", description: "Control neurológico por descenso MMSE. Traer resultados RM cerebral si ya disponibles.",
      completed: false, createdAt: 1741651200000
    },
    {
      id: "rm-005", patientId: "p-005",
      title: "Evaluación médico laboral", type: "Evaluación",
      date: "2026-04-03", description: "Certificación capacidad laboral para retorno part-time. Llevar informe TO.",
      completed: false, createdAt: 1742083200000
    },
    {
      id: "rm-006", patientId: "p-001",
      title: "Sesión fonoaudiología — refuerzo", type: "Seguimiento",
      date: "2026-03-25", description: "Sesión de refuerzo comunicativo. Ejercicios denominación y fluidez verbal.",
      completed: false, createdAt: 1740873600000
    },
    {
      id: "rm-007", patientId: "p-004",
      title: "Control hemoglobina glicosilada (HbA1c)", type: "Evaluación",
      date: "2026-01-15", description: "Control trimestral DM2. HbA1c objetivo < 7%.",
      completed: true, createdAt: 1730592000000
    },
    {
      id: "rm-008", patientId: "p-002",
      title: "Inicio kinesioterapia ambulatoria", type: "Seguimiento",
      date: "2025-12-01", description: "Primera sesión kinesiología ambulatoria post-alta hospitalaria.",
      completed: true, createdAt: 1730851200000
    },
    {
      id: "rm-009", patientId: "p-003",
      title: "Control psiquiátrico — ajuste Sertralina", type: "Medicación",
      date: "2025-12-20", description: "Evaluar respuesta a Sertralina 100mg. PHQ-9 = 16 en último control.",
      completed: true, createdAt: 1730073600000
    },
    {
      id: "rm-010", patientId: "p-004",
      title: "⚠ Hemograma y perfil renal pendiente", type: "Evaluación",
      date: "2026-02-10", description: "Control laboratorio: hemograma, creatinina, ELP. Solicitado hace 6 semanas — SIN RESULTADO AÚN.",
      completed: false, createdAt: 1738368000000
    }
  ],

  /* ═══════════════════════════════════════
     SIGNOS VITALES
  ═══════════════════════════════════════ */
  vitals: [
    /* María (post-ACV: control PA y FC) */
    {
      id: "vt-001", patientId: "p-001",
      datetime: "2025-10-20T09:30", notes: "Ingreso rehabilitación",
      values: { sbp:"145", dbp:"88", hr:"82", spo2:"97", temp:"36.5" },
      createdAt: 1729468800000
    },
    {
      id: "vt-002", patientId: "p-001",
      datetime: "2025-12-01T10:00", notes: "Control 6 semanas",
      values: { sbp:"138", dbp:"84", hr:"78", spo2:"98", temp:"36.4" },
      createdAt: 1733011200000
    },
    {
      id: "vt-003", patientId: "p-001",
      datetime: "2026-01-15T09:45", notes: "Control 3 meses",
      values: { sbp:"130", dbp:"80", hr:"74", spo2:"98", temp:"36.3" },
      createdAt: 1736899200000
    },
    {
      id: "vt-004", patientId: "p-001",
      datetime: "2026-03-01T10:15", notes: "Alta parcial",
      values: { sbp:"125", dbp:"78", hr:"72", spo2:"99", temp:"36.4" },
      createdAt: 1740787200000
    },
    /* Carlos (fractura cadera: control PA post-quirúrgico) */
    {
      id: "vt-005", patientId: "p-002",
      datetime: "2025-11-08T08:30", notes: "Post-quirúrgico precoz",
      values: { sbp:"118", dbp:"74", hr:"92", spo2:"96", temp:"37.2" },
      createdAt: 1731024000000
    },
    {
      id: "vt-006", patientId: "p-002",
      datetime: "2025-12-10T09:00", notes: "Control semana 5",
      values: { sbp:"115", dbp:"72", hr:"80", spo2:"97", temp:"36.6" },
      createdAt: 1733788800000
    },
    {
      id: "vt-007", patientId: "p-002",
      datetime: "2026-03-05T10:30", notes: "Alta rehabilitación",
      values: { sbp:"112", dbp:"70", hr:"74", spo2:"98", temp:"36.5" },
      createdAt: 1741132800000
    },
    /* Roberto (HTA + DM2: monitoreo intensivo) */
    {
      id: "vt-008", patientId: "p-004",
      datetime: "2025-11-03T08:00", notes: "Ingreso programa dolor. HTA no controlada.",
      values: { sbp:"168", dbp:"98", hr:"84", spo2:"96", temp:"36.7", weight:"88", glucose:"142" },
      createdAt: 1730592000000
    },
    {
      id: "vt-009", patientId: "p-004",
      datetime: "2025-12-15T08:15", notes: "Ajuste Losartán a 100mg. Glucosa en ayunas elevada.",
      values: { sbp:"155", dbp:"92", hr:"80", spo2:"97", temp:"36.5", weight:"87", glucose:"128" },
      createdAt: 1734220800000
    },
    {
      id: "vt-010", patientId: "p-004",
      datetime: "2026-02-01T08:00", notes: "Buena respuesta a ajuste terapéutico.",
      values: { sbp:"142", dbp:"86", hr:"76", spo2:"97", temp:"36.4", weight:"85", glucose:"112" },
      createdAt: 1738368000000
    },
    {
      id: "vt-011", patientId: "p-004",
      datetime: "2026-03-10T08:30", notes: "PA en objetivo. Glucosa casi normal.",
      values: { sbp:"134", dbp:"82", hr:"74", spo2:"98", temp:"36.3", weight:"84", glucose:"105" },
      createdAt: 1741564800000
    },
    /* Ana (post-ACV: monitoreo anticoagulación) */
    {
      id: "vt-012", patientId: "p-005",
      datetime: "2025-11-18T09:00", notes: "Inicio TO. INR pendiente.",
      values: { sbp:"128", dbp:"78", hr:"78", spo2:"98", temp:"36.5", weight:"68" },
      createdAt: 1731888000000
    },
    {
      id: "vt-013", patientId: "p-005",
      datetime: "2026-02-05T09:15", notes: "INR en rango. Buena evolución.",
      values: { sbp:"122", dbp:"76", hr:"74", spo2:"99", temp:"36.4", weight:"67" },
      createdAt: 1738713600000
    },
    /* Elena (seguimiento básico) */
    {
      id: "vt-014", patientId: "p-003",
      datetime: "2025-10-28T10:00", notes: "Evaluación inicial. FC elevada por ansiedad.",
      values: { sbp:"112", dbp:"70", hr:"98", spo2:"99", temp:"36.6", weight:"62" },
      createdAt: 1730073600000
    },
    {
      id: "vt-015", patientId: "p-003",
      datetime: "2026-02-20T10:30", notes: "Mejoría anímica evidente. FC normalizada.",
      values: { sbp:"110", dbp:"68", hr:"76", spo2:"99", temp:"36.5", weight:"63" },
      createdAt: 1740009600000
    }
  ],

  /* ═══════════════════════════════════════
     METAS TERAPÉUTICAS
  ═══════════════════════════════════════ */
  goals: [
    {
      id: "gl-001", patientId: "p-001",
      title: "Independencia en AVD básicas (Barthel ≥ 80)",
      measure: "Índice de Barthel ≥ 80/100 en evaluación estandarizada",
      targetDate: "2026-03-31", progress: 85,
      status: "Logrado", priority: "Alta",
      linkedInstrumentId: "inst-barthel",
      notes: "Meta superada: Barthel 85 en control de marzo. Alta parcial de programa intensivo.",
      createdAt: 1729468800000, updatedAt: 1740787200000
    },
    {
      id: "gl-002", patientId: "p-001",
      title: "Comunicación verbal funcional en entorno familiar",
      measure: "Conversación espontánea comprensible ≥ 80% del tiempo según reporte familiar",
      targetDate: "2026-06-30", progress: 70,
      status: "Activo", priority: "Media",
      linkedInstrumentId: null,
      notes: "Continúa fonoaudiología ambulatoria. Anomia residual leve persiste.",
      createdAt: 1729468800000, updatedAt: 1740787200000
    },
    {
      id: "gl-003", patientId: "p-002",
      title: "Marcha independiente sin ayuda técnica (200m)",
      measure: "Velocidad marcha ≥ 1.0 m/s y distancia ≥ 200m sin bastón",
      targetDate: "2026-03-31", progress: 90,
      status: "Logrado", priority: "Alta",
      linkedInstrumentId: "inst-barthel",
      notes: "Marcha independiente lograda a los 4 meses. Alta de rehabilitación.",
      createdAt: 1731024000000, updatedAt: 1741132800000
    },
    {
      id: "gl-004", patientId: "p-002",
      title: "Retorno laboral a actividad habitual",
      measure: "Reincorporación a trabajo como operador de maquinaria (con certificación médica laboral)",
      targetDate: "2026-05-01", progress: 60,
      status: "Activo", priority: "Alta",
      linkedInstrumentId: null,
      notes: "Retorno programado para abril. Pendiente certificación médico laboral.",
      createdAt: 1731024000000, updatedAt: 1741132800000
    },
    {
      id: "gl-005", patientId: "p-003",
      title: "Remisión sintomatología depresiva (PHQ-9 < 5)",
      measure: "PHQ-9 < 5 en dos evaluaciones consecutivas con 4 semanas de diferencia",
      targetDate: "2026-04-30", progress: 75,
      status: "Activo", priority: "Alta",
      linkedInstrumentId: "inst-phq9",
      notes: "PHQ-9 actual = 6. Muy cerca del objetivo. Fase de consolidación.",
      createdAt: 1730073600000, updatedAt: 1740009600000
    },
    {
      id: "gl-006", patientId: "p-003",
      title: "Reintegración social y búsqueda activa de empleo",
      measure: "Participación en ≥2 actividades sociales semanales y postulación activa a empleos",
      targetDate: "2026-06-30", progress: 55,
      status: "Activo", priority: "Media",
      linkedInstrumentId: null,
      notes: "Retomó contacto con amigas. Inicio búsqueda empleo esta semana.",
      createdAt: 1730073600000, updatedAt: 1740441600000
    },
    {
      id: "gl-007", patientId: "p-004",
      title: "Reducción dolor lumbar a EVA ≤ 3/10",
      measure: "EVA en actividad moderada ≤ 3/10 de forma sostenida",
      targetDate: "2026-06-30", progress: 50,
      status: "Activo", priority: "Alta",
      linkedInstrumentId: "inst-eva",
      notes: "EVA actual 4/10. Mejoría sostenida con ejercicio terapéutico y Amitriptilina.",
      createdAt: 1730592000000, updatedAt: 1741564800000
    },
    {
      id: "gl-008", patientId: "p-004",
      title: "Control presión arterial (PA < 135/85)",
      measure: "3 mediciones consecutivas < 135/85 mmHg en controles médicos",
      targetDate: "2026-04-30", progress: 70,
      status: "Activo", priority: "Alta",
      linkedInstrumentId: null,
      notes: "Última PA: 134/82. Muy cerca del objetivo. Ajuste Losartán efectivo.",
      createdAt: 1730592000000, updatedAt: 1741564800000
    },
    {
      id: "gl-009", patientId: "p-005",
      title: "Independencia completa en ABVD (Barthel ≥ 75)",
      measure: "Índice de Barthel ≥ 75/100 sin supervisión",
      targetDate: "2026-04-30", progress: 65,
      status: "Activo", priority: "Alta",
      linkedInstrumentId: "inst-barthel",
      notes: "Barthel actual 70. Falta escaleras y micción continente para alcanzar objetivo.",
      createdAt: 1731888000000, updatedAt: 1742000000000
    },
    {
      id: "gl-010", patientId: "p-005",
      title: "Retorno laboral part-time (secretaria 4h/día)",
      measure: "Reincorporación laboral certificada por médico del trabajo con adaptaciones",
      targetDate: "2026-05-01", progress: 40,
      status: "Activo", priority: "Media",
      linkedInstrumentId: null,
      notes: "Simulación tareas laborales en marcha. Pendiente evaluación médico laboral.",
      createdAt: 1731888000000, updatedAt: 1742083200000
    }
  ],

  /* ═══════════════════════════════════════
     MEDICAMENTOS
  ═══════════════════════════════════════ */
  medications: [
    { id: "md-001", patientId: "p-001", name: "Ácido acetilsalicílico (AAS)", dose: "100 mg", frequency: "1x/día", route: "Oral", prescriber: "Dr. Ramírez — Neurología", startDate: "2024-12-15", endDate: null, notes: "Antiagregante plaquetario post-ACV. Tomar con desayuno.", createdAt: 1729036800000 },
    { id: "md-002", patientId: "p-001", name: "Atorvastatina", dose: "40 mg", frequency: "1x/día", route: "Oral", prescriber: "Dr. Ramírez — Neurología", startDate: "2024-12-15", endDate: null, notes: "Estabilización placa aterosclerótica. Tomar en la noche.", createdAt: 1729036800000 },
    { id: "md-003", patientId: "p-001", name: "Losartán", dose: "50 mg", frequency: "1x/día", route: "Oral", prescriber: "Dr. Ramírez — Neurología", startDate: "2024-12-15", endDate: null, notes: "Control HTA. Meta PA < 130/80 mmHg.", createdAt: 1729036800000 },
    { id: "md-004", patientId: "p-002", name: "Tramadol", dose: "50 mg", frequency: "Cada 8h", route: "Oral", prescriber: "Dr. Pérez — Traumatología", startDate: "2025-10-29", endDate: "2025-12-31", notes: "Analgesia post-quirúrgica. Retirar progresivamente según tolerancia.", createdAt: 1730851200000 },
    { id: "md-005", patientId: "p-002", name: "Calcio 600mg + Vitamina D3 400UI", dose: "1 comprimido", frequency: "2x/día", route: "Oral", prescriber: "Dr. Pérez — Traumatología", startDate: "2025-10-29", endDate: null, notes: "Suplementación para consolidación ósea. Tomar con comidas.", createdAt: 1730851200000 },
    { id: "md-006", patientId: "p-002", name: "Ibuprofeno", dose: "400 mg", frequency: "Según necesidad", route: "Oral", prescriber: "Dr. Pérez — Traumatología", startDate: "2025-12-01", endDate: null, notes: "Analgesia de rescate. Máximo 3 veces al día. No usar con estómago vacío.", createdAt: 1733011200000 },
    { id: "md-007", patientId: "p-003", name: "Sertralina", dose: "100 mg", frequency: "1x/día", route: "Oral", prescriber: "Dra. Torres — Psiquiatría", startDate: "2025-10-15", endDate: null, notes: "Antidepresivo ISRS. Inicio 50mg x 2 semanas, luego 100mg. Tomar en la mañana.", createdAt: 1729900800000 },
    { id: "md-008", patientId: "p-003", name: "Clonazepam", dose: "0.5 mg", frequency: "Según necesidad", route: "Oral", prescriber: "Dra. Torres — Psiquiatría", startDate: "2025-10-15", endDate: null, notes: "Para crisis ansiosas agudas. Máximo 1 comprimido/día. No usar diariamente.", createdAt: 1729900800000 },
    { id: "md-009", patientId: "p-004", name: "Metformina", dose: "850 mg", frequency: "Cada 12h", route: "Oral", prescriber: "Dra. Vega — Medicina Interna", startDate: "2018-03-10", endDate: null, notes: "DM2. Tomar con las comidas para reducir efectos GI.", createdAt: 1730419200000 },
    { id: "md-010", patientId: "p-004", name: "Losartán", dose: "100 mg", frequency: "1x/día", route: "Oral", prescriber: "Dra. Vega — Medicina Interna", startDate: "2015-06-20", endDate: null, notes: "HTA. Ajustado a 100mg en diciembre 2025 por PA no controlada.", createdAt: 1730419200000 },
    { id: "md-011", patientId: "p-004", name: "Omeprazol", dose: "20 mg", frequency: "1x/día", route: "Oral", prescriber: "Dra. Vega — Medicina Interna", startDate: "2016-01-15", endDate: null, notes: "Protección gástrica. Antecedente úlcera 2016. Tomar en ayunas.", createdAt: 1730419200000 },
    { id: "md-012", patientId: "p-004", name: "Amitriptilina", dose: "25 mg", frequency: "1x/día", route: "Oral", prescriber: "Dra. Vega — Medicina Interna", startDate: "2025-11-04", endDate: null, notes: "Coadyuvante analgésico dolor crónico. Tomar 1 hora antes de dormir.", createdAt: 1730592000000 },
    { id: "md-013", patientId: "p-005", name: "Warfarina", dose: "5 mg", frequency: "1x/día", route: "Oral", prescriber: "Dr. Fuentes — Neurología", startDate: "2025-09-20", endDate: null, notes: "Anticoagulación post-ACV. INR objetivo 2.0-3.0. Control quincenal.", createdAt: 1731628800000 },
    { id: "md-014", patientId: "p-005", name: "Ramipril", dose: "5 mg", frequency: "1x/día", route: "Oral", prescriber: "Dr. Fuentes — Neurología", startDate: "2025-09-20", endDate: null, notes: "Control PA. Meta < 130/80 mmHg en paciente con ACV.", createdAt: 1731628800000 }
  ],

  /* ═══════════════════════════════════════
     PAQUETES DE EVALUACIÓN
  ═══════════════════════════════════════ */
  assessmentPackages: [
    {
      id: "pk-001",
      name: "Evaluación Neurológica Completa",
      description: "Batería estándar para pacientes neurológicos: funcionalidad, cognición y fuerza motora.",
      instruments: ["inst-barthel", "inst-mmse", "inst-mrc"],
      createdAt: 1729036800000
    },
    {
      id: "pk-002",
      name: "Screening Salud Mental + Dolor",
      description: "Evaluación rápida de estado anímico y dolor para cualquier especialidad.",
      instruments: ["inst-phq9", "inst-eva"],
      createdAt: 1729036800000
    }
  ],

  settings: []
};
