# Labels Jira — OncoScan

Catálogo único de labels aplicables a los issues del proyecto KAN. Reemplaza el set ad-hoc previo (solo `Entrega` / `Trabajo`). Toda label nueva debe documentarse aquí antes de aplicarse en Jira.

## Catálogo

| Label | Criterio de uso |
|-------|-----------------|
| `phi` | Issue toca PHI: emails de usuarios, paths/nombres DICOM, `Case_Ref`, `result_json`, score IA, identificadores de paciente. |
| `seguridad` | Issue toca controles de seguridad: secretos, JWT, validación de inputs, cabeceras HTTP, manejo de errores con leak de info. |
| `accesibilidad` | Issue toca cumplimiento WCAG (AA), `aria-*`, navegación por teclado, contraste, lectores de pantalla. |
| `dicom` | Issue toca el pipeline DICOM: ingestión, conversión `.dcm → .png`, asociación de paciente, almacenamiento en Storage. |
| `ia` | Issue toca el modelo HF, datasets, entrenamiento, evaluación, exportación, demos o clasificación de riesgo. |
| `auth` | Issue toca autenticación (Supabase Auth, JWT Bearer, signup, login, recuperación de sesión). |
| `rbac` | Issue toca autorización por rol (paciente, médico, admin) y RLS de Supabase. |
| `psp` | Issue es trabajo PSP propiamente dicho: auditorías, metodología, métricas, calibración. Todo issue de remediación lleva esta label. |
| `remediation` | Issue cierra uno de los 21 hallazgos de la auditoría 2026-05-22. Co-existe con `psp`. |
| `dor-pending` | Issue (Historia) no cumple aún Definition of Ready (típicamente le faltan criterios de aceptación). Bloquea transición a "Desarrollo". |
| `bug` | Issue de tipo error tracking. Use además el issuetype `Error` cuando corresponda. |
| `entrega-academica` | Issue corresponde a una entrega del curso (cronograma, plan de gestión, mockups, etc.). Reemplaza el uso histórico de `Entrega` / `Trabajo`. |

## Reglas

- Toda label se escribe en minúsculas, sin espacios, separadores con `-`.
- Un issue puede llevar varias labels (típicamente 1–3).
- `Entrega` y `Trabajo` se mantienen en issues históricos por compatibilidad, pero **no se aplican** a issues nuevos. Para entregas del curso use `entrega-academica`.
- Cambios al catálogo se discuten en stand-up y se registran como commit `docs(KAN-XX):` que toque este archivo.

## Cobertura objetivo

| Métrica | Baseline 2026-05-22 | Objetivo |
|---------|---------------------|----------|
| Issues con al menos 1 label del catálogo | 5 / 42 (11.9%) | ≥ 90% |
| Labels distintas en uso | 2 (`Entrega`, `Trabajo`) | 12 (este catálogo) |
