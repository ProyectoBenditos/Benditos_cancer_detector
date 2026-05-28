# Matriz de trazabilidad — OncoScan

Tabla bidireccional `Requisito ↔ Issue ↔ Commit(s) ↔ Test(s)`. Punto único de verdad para auditorías PSP. Cada fila se actualiza al cerrar un sub-proyecto.

## Convenciones

- **RF-NNN / RNF-NNN**: identificadores definidos en [`docs/requisitos.md`](../requisitos.md) según ISO/IEC/IEEE 29148.
- **Issue Jira**: clave de KAN-XX o `pendiente` si no existe issue formal.
- **Commit(s)**: hashes cortos (7 chars) del repo. Si son varios, separar con coma.
- **Test(s)**: ruta relativa a archivos de test que cubren el requisito, o `pendiente`.

## Matriz

| Requisito | Issue Jira | Commit(s) | Test(s) | Sub-proyecto | Estado |
|-----------|------------|-----------|---------|--------------|--------|
| RF-001 (upload DICOM aceptando `.dcm`/`.png`/`.jpg`) | KAN-39, KAN-44 | `bb83b40`, históricos B | pendiente (Fase 6.1 → `apps/api/tests/test_dicom.py`) | B, E | Funcional, sin tests automáticos |
| RF-002 (inferencia HF con features clínicas) | KAN-38 | históricos D | pendiente (Fase 6.1 → `apps/api/tests/test_analysis.py`) | D | Funcional, sin tests automáticos |
| RF-003 (clasificación riesgo BAJO/MEDIO/ALTO) | KAN-29 | históricos B | pendiente | B | Funcional |
| RF-004 (asociación opcional de paciente al upload) | pendiente | `bb83b40` | pendiente | E | Funcional |
| RF-005 (signup con trigger `on_auth_user_created`) | pendiente | `dac55d0` | pendiente (Fase 6.2 → `apps/web/src/app/signup/actions.test.ts`) | E | Funcional |
| RF-006 (visualización resultado IA + parámetros) | KAN-43 | históricos D | pendiente | D | Funcional |
| RF-007 (sliders de features pre-análisis) | KAN-40 | históricos D | pendiente | D | Funcional |
| RF-008 (historial DICOM con columnas riesgo/score) | KAN-42 | históricos C/D | pendiente | C, D | Funcional |
| RF-009 (búsqueda en historial DICOM) | pendiente | `2e1f2d7` | pendiente | A (legacy) | Funcional |
| RNF-001 (sin PHI en logs de backend) | KAN-55, KAN-56, KAN-57 | `de8569f`, `cbe0fec`, `77570e0` | [`apps/api/tests/test_logging.py`](../../apps/api/tests/test_logging.py) | Remediación | **Cerrado 2026-05-22** |
| RNF-002 (logger estructurado JSON) | KAN-55 | `de8569f` | [`apps/api/tests/test_logging.py`](../../apps/api/tests/test_logging.py) | Remediación | **Cerrado 2026-05-22** |
| RNF-003 (commits con KAN-XX) | KAN-pendiente (H-003) | `de8569f` en adelante | hook commit-msg (Fase 6.3) | Remediación | En adopción desde 2026-05-22 |
| RNF-004 (RLS sin recursión) | pendiente | `4944908` | pendiente (smoke query post-policy) | E | Funcional |
| RNF-005 (race condition de login resuelta) | pendiente | `4944908` | pendiente | E | Funcional |
| RNF-006 (auth JWT Bearer en `/api/v1/*`) | pendiente | históricos | pendiente (Fase 6.1 → `test_analysis::test_401_sin_bearer`) | C | Funcional |
| RNF-007 (accesibilidad WCAG AA en alertas clínicas) | KAN-45 | históricos A | pendiente (`/oncoscan-a11y`) | A | Parcial |

## Cobertura

| Métrica | Baseline 2026-05-22 | Estado 2026-05-22 |
|---------|---------------------|--------------------|
| Requisitos con issue Jira | 0 / 16 | 12 / 16 (75%) |
| Requisitos con commit | 0 / 16 | 14 / 16 (87%) |
| Requisitos con tests | 0 / 16 | 2 / 16 (12.5%) |
| Requisitos "completos" (issue + commit + test) | 0 / 16 | 2 / 16 (12.5%) |

Objetivo al cerrar Fase 6: ≥ 50% requisitos con tests.

## Cómo actualizar

1. Al cerrar un sub-proyecto, abrir esta tabla.
2. Para cada RF/RNF afectado, completar columnas Issue Jira, Commit(s), Test(s).
3. Si el requisito no estaba listado, añadirlo primero a [`docs/requisitos.md`](../requisitos.md) y luego aquí.
4. Commitear el cambio como `docs(KAN-XX): actualizar matriz de trazabilidad para sub-proyecto X`.
