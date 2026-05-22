# Requisitos — OncoScan

Catálogo numerado de requisitos funcionales (RF) y no funcionales (RNF) según [ISO/IEC/IEEE 29148](https://www.iso.org/standard/72089.html). Punto único de verdad para la matriz de trazabilidad ([`docs/psp/traceability-matrix.md`](psp/traceability-matrix.md)).

## Convenciones

- Identificador `RF-NNN` para funcionales, `RNF-NNN` para no funcionales.
- Estado: `Propuesto` / `Aprobado` / `Implementado` / `Verificado`.
- Cada requisito enlaza al menos un issue Jira y un módulo del sistema.
- Cambios al texto de un requisito requieren commit `docs(KAN-XX): refinar RF-NNN`.

## Requisitos funcionales

### Módulo Ingesta DICOM

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RF-001 | El sistema debe aceptar archivos `.dcm`, `.png` y `.jpg` en el endpoint `/api/v1/dicom/upload`, con tamaño máximo de 10 MB. | Implementado | KAN-39, KAN-44 |
| RF-004 | El sistema debe permitir asociar opcionalmente un paciente al upload mediante `patient_id`. | Implementado | (E, sin issue formal) |

### Módulo Motor IA

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RF-002 | El sistema debe ejecutar inferencia contra el Hugging Face Space `luisdam-oncoscan-ai` enviando imagen y 8 features clínicas. | Implementado | KAN-38 |
| RF-003 | El sistema debe clasificar el riesgo del resultado IA en `BAJO`, `MEDIO` o `ALTO` y producir una recomendación textual. | Implementado | KAN-29 |
| RF-010 | El modelo entrenado debe ser exportable y reejecutable localmente vía `demo.py`. | Implementado | KAN-30, KAN-31, KAN-32 |

### Módulo Dashboard

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RF-006 | El dashboard debe mostrar el resultado IA completo (score, nivel de riesgo, recomendación, versión del modelo) junto con los parámetros que el usuario ingresó. | Implementado | KAN-43 |
| RF-007 | El usuario debe poder ingresar las 8 features clínicas mediante sliders antes de disparar el análisis. | Implementado | KAN-40 |
| RF-008 | El historial DICOM debe mostrar columnas de riesgo y score para cada análisis del usuario. | Implementado | KAN-42 |
| RF-009 | El usuario debe poder buscar en el historial DICOM por nombre de caso. | Implementado | (legacy, sin issue formal) |

### Módulo RBAC / Auth

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RF-005 | El signup debe crear el perfil del usuario mediante el trigger `on_auth_user_created` en Supabase. | Implementado | (E, sin issue formal) |

### Módulo Alertas clínicas

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RF-011 | Las alertas de riesgo deben renderizarse con jerarquía visual (rojo solo para alertas clínicas) y semántica accesible (`role="alert"`, `aria-live="assertive"` para crítico). | Implementado parcial | KAN-41 |

## Requisitos no funcionales

### Seguridad / PHI

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RNF-001 | Ningún campo PHI (`email`, `file_path`, `case_ref`, `result_json`, `score`, `patient_id`, `external_id`, `display_alias`) puede aparecer en stdout, stderr o respuesta al cliente. | Verificado | KAN-55, KAN-56, KAN-57 |
| RNF-002 | El backend debe emitir logs en JSON estructurado, con campos `timestamp`, `level`, `logger`, `event`, `extra`. | Verificado | KAN-55 |
| RNF-004 | Las policies RLS de Supabase no deben recursar consultando la propia tabla protegida. | Verificado | (E) |
| RNF-006 | Toda ruta bajo `/api/v1/*` debe exigir Bearer JWT válido emitido por Supabase Auth. | Implementado | (C, sin issue formal) |

### Calidad / Procesos

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RNF-003 | Todo commit a partir de 2026-05-22 debe seguir la convención `tipo(KAN-XX): descripción`, validada por hook commit-msg. | En adopción | KAN-pendiente (H-003) |
| RNF-005 | Tras login exitoso, el redirect debe esperar la propagación de la sesión antes de invocar `router.push` para evitar race conditions. | Verificado | (E) |

### Accesibilidad

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RNF-007 | Cada componente UI clínico debe cumplir WCAG AA verificable con `/oncoscan-a11y`. | Implementado parcial | KAN-45 |

### Performance

| ID | Texto | Estado | Issue(s) Jira |
|----|-------|--------|---------------|
| RNF-008 | El timeout del HF Space `/predict` debe ser configurable y por defecto 120 segundos (el Space tiene cold start). | Implementado | (legacy) |

## Mantenimiento

- Al cerrar un sub-proyecto, marcar los requisitos relacionados como `Verificado` si los tests existen, o como `Implementado` si solo hay verificación manual.
- Al introducir un requisito nuevo, añadirlo aquí antes de crear el issue Jira.
- La matriz de trazabilidad ([`docs/psp/traceability-matrix.md`](psp/traceability-matrix.md)) se mantiene como vista compacta de esta misma información.
