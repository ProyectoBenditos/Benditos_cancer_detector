# Post-mortem Hito M-005.5 — Blindaje clínico y pulido UI para defensa

- **Fechas**: 2026-05-25 a 2026-05-30
- **Responsable de cierre**: mateo salas
- **Plan/Roadmap**: [`docs/superpowers/plans/`](../../superpowers/plans/) — roadmap de 3 días registrado en commit `e9546ef` (KAN-81)
- **Issues cubiertos**: KAN-76, KAN-77, KAN-78, KAN-79, KAN-80, KAN-81, KAN-82, KAN-83, KAN-84, KAN-85, KAN-86, KAN-87

---

## 1. Alcance entregado

- **KAN-76** — Planificación y coordinación del sprint de defensa (roadmap de 3 días).
- **KAN-77** — Consolidación del flujo de carga: `/platform/upload` unificado; `/platform/analyze` retirado. Commit `075b847`.
- **KAN-78** — Rol dinámico en ajustes según `profiles.role` (sin recarga de página). Commit `89ebbf2`.
- **KAN-79** — Dashboard diferenciado por rol: admin ve métricas globales + tarjeta de médicos pendientes; médico ve sus propios análisis. Commit `d964679`.
- **KAN-80** — Copy de la página de upload actualizado para reflejar ruta única de carga y análisis. Commit `077a5df`.
- **KAN-81** — `model_version`, `inference_time_ms` y `predicted_at` persistidos en cada predicción para trazabilidad del modelo IA. Commit `b766b1b`.
- **KAN-82** — Validación de tags DICOM mínimos en upload (Modality, SOPClassUID, Rows, Columns); rechazo con mensaje claro si faltan. Commit `7a10873`.
- **KAN-83** — Flujo de consentimiento informado versionado en signup; versión aceptada almacenada para trazabilidad clínica. Commit `e2519a5`.
- **KAN-84** — Disclaimer persistente visible en todas las vistas clínicas: OncoScan no es dispositivo médico certificado. Commit `a3d91af`.
- **KAN-85** — Búsqueda de pacientes por `external_id` y alias en `/platform/pacientes`. Commit `7b0b3db`.
- **KAN-86** — Smoke test E2E: 33/33 casos pass en local y staging. Auditoría PSP pre-defensa. Commits `fec059f`, `d9d3714`, `2fa3432`.
- **KAN-87** — Cierre formal de defensa: milestones M-005.5 y M-006 actualizados, capturas de respaldo. Commit `a8594ae`.

**Quedó fuera del alcance** (registrado como deuda en H-001 de la auditoría 2026-05-30):
- Tests automatizados (vitest/pytest) para KAN-77..KAN-85. La suite existente no se extendió durante el sprint de defensa por restricción de tiempo.

---

## 2. Defectos por fase

Extraídos de [`defect-log.md`](../defect-log.md) y de la auditoría [`2026-05-30-audit-pre-defensa.md`](../audits/2026-05-30-audit-pre-defensa.md).

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Coding (KAN-86) | Code Review | 1 | Media | KAN-86 atribuía la auditoría PSP al integrador incorrecto; corregido en commit `2fa3432` (D-007). |
| Coding (KAN-77..KAN-85) | Auditoría | 1 | Alta | Ausencia de tests automatizados para 9 features del sprint; detectado en auditoría PSP pre-defensa (H-001). Deuda registrada como D-007. |

**Eficiencia de revisión** = 1 atrapado antes de testing / 2 total = **50%**.

Nota: el defecto de trazabilidad (KAN-77..KAN-87 sin issues Jira al momento de los commits) se corrigió en este cierre de post-mortem mediante la creación retroactiva de los issues con timetracking completo.

---

## 3. Estimado vs real

| Issue | Descripción | originalEstimate | timeSpent | Delta (%) |
|-------|-------------|-----------------|-----------|-----------|
| KAN-76 | Planificación sprint | 1h | 1h | 0% |
| KAN-77 | Consolidar upload | 3h | 2h | −33% |
| KAN-78 | Rol dinámico ajustes | 2h | 1h 30m | −25% |
| KAN-79 | Dashboard por rol | 4h | 3h 30m | −13% |
| KAN-80 | Copy upload | 1h | 30m | −50% |
| KAN-81 | model_version + timing | 3h | 2h 30m | −17% |
| KAN-82 | Validación DICOM | 4h | 3h | −25% |
| KAN-83 | Consentimiento versionado | 5h | 4h | −20% |
| KAN-84 | Disclaimer persistente | 2h | 1h 30m | −25% |
| KAN-85 | Búsqueda pacientes | 4h | 3h 30m | −13% |
| KAN-86 | Smoke test + auditoría PSP | 6h | 5h | −17% |
| KAN-87 | Cierre defensa | 2h | 1h 30m | −25% |

**Total estimado**: 37h. **Total real**: 29h 30m. **Delta acumulado**: −7h 30m (−20%).

El sprint se completó un 20% por debajo del estimado, consistente con un equipo en etapa final con foco claro. No hay issue individual con delta superior a ±25% que requiera análisis de proceso (KAN-80 en −50% es una tarea de copy, no de ingeniería).

---

## 4. Calidad del producto

- [x] `npm run build` pasa sin errores de tipos (verificado en KAN-86).
- [x] `pytest -q` → 24 passed, 0 failed (sin regresiones en backend).
- [x] Smoke test E2E: 33/33 casos pass en local y staging (KAN-86).
- [x] 0 `print()` productivo en `apps/api/app/` (verificado en auditoría 2026-05-30).
- [x] 0 `console.*` no autorizado en frontend (verificado en auditoría 2026-05-30).
- [x] PHI: 0 exposiciones en logs (verificado en auditoría 2026-05-30).
- [x] Cada commit del sprint referencia un KAN-XX (100% — commits `075b847` a `a8594ae`).
- [ ] Tests vitest para KAN-77..KAN-85 — **ausentes**. Deuda registrada como D-007; acción de mejora en sección 6.

---

## 5. Lecciones de proceso

- **Los issues Jira deben crearse antes de hacer el commit**, no después. En este sprint los commits referenciaron KAN-77..KAN-87 que no existían en Jira; la trazabilidad se corrigió retroactivamente en el cierre del post-mortem, pero el esfuerzo de corrección es evitable.
- **El smoke test como gate de cierre de sprint funciona bien**: 33/33 casos pass es un criterio objetivo y verificable que reemplazó parcialmente la ausencia de tests automatizados para el sprint de defensa. Mantener este patrón para sprints futuros.
- **La ausencia de tests en un sprint de features clínicas es la deuda de mayor riesgo**: KAN-82 (validación DICOM) y KAN-83 (consentimiento) son módulos donde un regreso silencioso tendría impacto clínico. Tests antes de cualquier refactorización futura son obligatorios.
- **El disclaimer KAN-84 debió haberse incluido desde M-001**: es un requisito de dominio clínico obvio que apareció tardío. Para sprints futuros, incluir checklists de dominio (PHI, disclaimer, consentimiento) en la Definition of Ready de cualquier vista clínica.

---

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Tests vitest para server action de consentimiento (`signup/actions.ts`) y query de búsqueda pacientes | mateo salas | 2026-06-08 | KAN nuevo (M-007) |
| Tests vitest para validación DICOM (KAN-82) en frontend | Juan Esteban Aldana | 2026-06-08 | KAN nuevo (M-007) |
| Añadir "smoke test DICOM" a Definition of Ready de cualquier issue que toque `apps/api/app/api/v1/routers/dicom.py` | Nicolas Chavez Oliveros | 2026-06-08 | — |
| Incluir checklist clínico (PHI, disclaimer, consentimiento) en DoR de vistas clínicas | mateo salas | 2026-06-08 | — |

---

## 7. Anexos

- Commits del sprint: `075b847` (KAN-77) → `a8594ae` (KAN-87), 14 commits totales.
- Auditoría PSP pre-defensa: [`docs/psp/audits/2026-05-30-audit-pre-defensa.md`](../audits/2026-05-30-audit-pre-defensa.md).
- Smoke test: 33/33 pass verificado en commits `fec059f` y `d9d3714`.
- Milestones cerrados: M-005.5 (Finalizado 2026-05-30), M-006 (criterios mínimos cumplidos 2026-06-01).
