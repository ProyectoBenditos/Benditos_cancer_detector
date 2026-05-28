# Hitos — OncoScan

Hitos formales del proyecto OncoScan según PMBOK. Sustituye la aproximación previa de "sub-proyectos A–E" como única ancla de avance. Cada hito tiene fecha objetivo, Epic asociado y criterio de cierre verificable.

## Tabla

| Hito | Fecha objetivo | Epic asociado | Criterio de cierre | Estado |
|------|---------------|---------------|--------------------|--------|
| M-001 — Diseño fundacional (UI + arquitectura) | 2026-05-17 | KAN-49 Dashboard, KAN-48 API Gateway | Design system entregado; tokens documentados; primera spec publicada. | **Cerrado** (sub-proyecto A) |
| M-002 — Modelo IA entrenado y servible | 2026-05-19 | KAN-47 Motor IA | ResNet18 transfer learning entrenado en Kaggle (45 épocas); evaluado en test set; expuesto en HF Space `luisdam-oncoscan-ai`. | **Cerrado** (sub-proyecto B) |
| M-003 — API funcional con auth | 2026-05-20 | KAN-48 API Gateway, KAN-51 RBAC/Auth | FastAPI con `/api/v1/dicom/*`, `/api/v1/analysis/*`, JWT Bearer obligatorio. | **Cerrado** (sub-proyecto C) |
| M-004 — Flujo end-to-end (upload → IA → resultado) | 2026-05-21 | KAN-46 Ingesta DICOM, KAN-47 Motor IA, KAN-49 Dashboard, KAN-50 Alertas | Upload `.dcm/.png/.jpg` → análisis HF → resultado visible en UI con riesgo/score y recomendación. | **Cerrado** (sub-proyecto D) |
| M-005 — Asociación de paciente y multi-tenancy básico | 2026-05-22 | KAN-51 RBAC/Auth, KAN-49 Dashboard | Asociación opcional de paciente al upload; RLS sin recursión; signup vía trigger. | **Cerrado** (sub-proyecto E) |
| M-005.5 — Blindaje clínico y pulido UI para defensa | 2026-05-31 | KAN-77..KAN-87 | Flujo único de carga (KAN-77); rol dinámico (KAN-78); dashboard diferenciado (KAN-79); copy unificado (KAN-80); model_version+inference_time_ms+predicted_at (KAN-81); validación DICOM mínima (KAN-82); consentimiento versionado (KAN-83); disclaimer persistente (KAN-84); búsqueda de pacientes (KAN-85); smoke test + auditoría PSP (KAN-86); cierre defensa (KAN-87). | **Cerrado** (roadmap defensa 2026-05-28) |
| M-006 — Disciplina PSP operativa | 2026-06-01 | KAN-53 Auditoría/Trazabilidad | Las 4 reglas absolutas PSP ≥ 80% en auditoría; commits 100% con KAN-XX desde adopción del hook; defect-log poblado. | **En curso — criterios mínimos cumplidos** (reglas 1/3/4 ≥ 80%; D-004..D-006 cerrados; 6 commits huérfanos pre-hook documentados). Cierre formal pendiente: verificación manual Jira KAN-77..KAN-87 timetracking. |
| M-007 — Cobertura de tests mínima | 2026-06-08 | KAN-48 API Gateway, KAN-49 Dashboard | `pytest` con ≥ 5 archivos de prueba; `vitest` cubre ≥ 8/36 páginas (22%); CI ejecuta ambas suites. | Pendiente |
| M-008 — ETL / Anonimización formal | 2026-06-15 | KAN-52 ETL/Anonimización | Pipeline TCIA/GDC reproducible; reglas de calidad de datos aplicadas; pacientes anonimizados antes de Storage. | Pendiente |
| M-009 — Monitoreo y dashboards | 2026-06-22 | KAN-54 Monitoreo/Observabilidad | Dashboards operativos consultando logs JSON; alertas por error rate del `/predict`. | Pendiente |
| M-010 — Entrega académica final + post-mortem global | 2026-06-29 | KAN-53 Auditoría/Trazabilidad | Documento de proyecto integrado; pitch entregado; post-mortem global publicado con métricas estimado vs real reales (no retrospectivas). | Pendiente |

## Relación con sub-proyectos académicos

| Sub-proyecto | Hito principal | Hitos secundarios |
|--------------|----------------|-------------------|
| A | M-001 | — |
| B | M-002 | M-004 (clasificación riesgo) |
| C | M-003 | M-004 (API) |
| D | M-004 | M-006 (parcial) |
| E | M-005 | M-006 (parcial — RLS y signup) |
| F (planificado) | M-006 | M-007 |

## Cambios

Cada modificación de fechas objetivo o criterios de cierre requiere commit `docs(KAN-XX): ajustar M-NNN…` y nota en el siguiente post-mortem.
