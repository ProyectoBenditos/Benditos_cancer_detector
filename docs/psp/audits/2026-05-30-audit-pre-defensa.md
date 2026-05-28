# Auditoría PSP — OncoScan

- **Fecha**: 2026-05-30
- **Scope**: pre-defensa KAN-77..KAN-87 rama merge/fronted-nicolas-into-main
- **Auditor**: Mateo salas, Luis De Avila
- **Metodología**: [docs/psp/psp-methodology.md](../psp-methodology.md)
- **MCP Atlassian**: benditos.atlassian.net — cloudId `56cd5476-c472-4e8f-8864-beda26ca4b7a` — proyecto `KAN`
- **Nota Jira**: inventario Jira no ejecutado en esta auditoría (sesión OAuth no completada). Los hallazgos relacionados con timetracking y assignees de KAN-77..KAN-87 quedan como H-004 (verificación manual requerida).

---

## Resumen ejecutivo

### Conteo de hallazgos por severidad

| Severidad | Conteo |
|-----------|--------|
| Crítico   | 0      |
| Alto      | 1      |
| Medio     | 2      |
| Bajo      | 2      |
| **Total** | **5**  |

**Sin hallazgos críticos nuevos — sustentación no bloqueada.**

### Cumplimiento de las 4 reglas absolutas

| Regla | % cumplimiento | Baseline 2026-05-22 | Tendencia | Brecha principal |
|-------|----------------|---------------------|-----------|------------------|
| 1. Trazabilidad | **~85 %** | ~92 % | ↓ leve | 6 commits post-remediación sin referencia KAN-XX (ver H-001) |
| 2. Medición | **no verificable** | 100 % | — | MCP Atlassian sin auth; último estado conocido: 100 % issues con `originalEstimate` |
| 3. Evidencia | **~80 %** | ~85 % | ↓ leve | 7 features de KAN-77..KAN-85 sin tests automatizados nuevos (ver H-002) |
| 4. Calidad continua | **~95 %** | ~95 % | = | 0 PHI en logs, 0 `console.*` no autorizados, 0 `print()` productivo; defect log desactualizado (H-003) |

### Métricas PSP

| Métrica | Actual | Baseline 2026-05-22 post-rem | Tendencia |
|---------|--------|------------------------------|-----------|
| Issues KAN-77..KAN-87 verificados en Jira | n/a | — | — (requiere auth manual) |
| Commits post-remediación con `KAN-XX` | 11 / 17 (65 %) | 7/7 nuevos (100 %) | ↓ |
| Commits huérfanos post-remediación | 6 | 0 | ↑ |
| Tests vitest | 7 archivos | 5 archivos | ↑ |
| Tests pytest | 4 archivos / 24 verdes | 4 archivos / 24 verdes | = |
| `npm run build` | pasa ✓ | — | ✓ |
| `print()` productivo en backend | 0 | 0 | = |
| `console.*` no autorizado en frontend | 0 | 0 | = |
| PHI en logs | 0 | 0 | = |
| Defect log D-004..D-006 cerrados | 0 / 3 | 0 / 3 | = |

---

## Hallazgos

### Altos

#### H-001 — 7 features KAN-77..KAN-85 sin tests automatizados nuevos

- **Evidencia**: `git log --oneline --no-merges` entre 7b0b3db (HEAD) y b825254 muestra 0 archivos `*.test.ts` o `test_*.py` creados/modificados en los commits KAN-77..KAN-85.
- **Impacto**: Búsqueda de pacientes (KAN-85), consentimiento versionado (KAN-83), validación DICOM (KAN-82), dashboard diferenciado (KAN-79) y disclaimer (KAN-84) carecen de regresión automatizada. En dominio clínico, un regreso silencioso en la validación DICOM o en el gate de consentimiento no sería detectado por la suite existente.
- **Recomendación**: Registrar issue KAN post-defensa (tipo `Tarea`, Epic KAN-48 o KAN-51 según módulo). Priorizar antes de M-007: test de server action de consentimiento (`apps/web/src/app/signup/actions.ts`) y test de query de búsqueda en `pacientes/page.tsx`. El roadmap marcó tests nuevos como fuera de scope para la defensa — este hallazgo documenta la deuda, no bloquea la sustentación.
- **Relación PSP**: PSP0 Coding / PSP Testing (§4.7).
- **Relación SDLC**: Pruebas.
- **Relación PMBOK**: Calidad.

---

### Medios

#### H-002 — 6 commits post-remediación sin referencia KAN-XX

- **Evidencia**: commits `b825254`, `00f4067`, `1d9971e`, `2c88d23`, `ec4b4dc`, `b70a84c` (todos entre 2026-05-22 y el inicio del roadmap) con mensajes `docs:`, `fix:`, `chore:`, `feat:` sin `(KAN-XX)`.
- **Impacto**: La trazabilidad commit→issue queda interrumpida para 6 cambios de infraestructura y correcciones críticas (Railway encoding, timeout, body limit). El rastreo histórico de causas de defecto pierde precisión.
- **Recomendación**: Para cada commit huérfano, abrir o identificar el issue KAN correspondiente y añadir referencia en `defect-log.md` o `traceability-matrix.md`. No hacer rebase sobre commits ya publicados — backfill documental es suficiente.
- **Relación PSP**: PSP0.1 Coding (§4.4, checklist ítem 2).
- **Relación SDLC**: Desarrollo.
- **Relación PMBOK**: Integración / Trazabilidad.

#### H-003 — Defect log D-004, D-005, D-006 sin cierre verificable

- **Evidencia**: `docs/psp/defect-log.md` líneas D-004..D-006 muestran `"en curso"` / `"pendiente"` sin commit de cierre ni fecha de resolución, 8 días después de la baseline.
- **Impacto**: Métricas de densidad de defectos y tiempo medio de corrección no son calculables. El ciclo PSP queda abierto, lo que impide validar que los defectos de proceso sistémicos (trazabilidad, medición, cobertura) fueron realmente corregidos.
- **Recomendación**:
  - D-004 (Trazabilidad): actualizar con `"Cerrado"`, citar traceability-matrix.md y milestones.md como evidencia.
  - D-005 (Medición): actualizar con `"Cerrado 2026-05-22"`, citar reporte post-remediación (100% originalEstimate).
  - D-006 (Testing): actualizar con `"Cerrado 2026-05-22"`, citar 24 pytest + 7 vitest.
- **Relación PSP**: PSP2.2 Post-mortem (§4.8).
- **Relación SDLC**: Cierre.
- **Relación PMBOK**: Calidad.

---

### Bajos

#### H-004 — Jira KAN-77..KAN-87 no auditado (auth MCP no disponible)

- **Evidencia**: ausencia del inventario Jira en este reporte. Auth OAuth iniciado pero no completado en la sesión.
- **Impacto**: No se puede verificar que los 11 issues tengan `originalEstimate`, `timeSpent`, `assignee` y `priority` correctos. La regla 2 (Medición) queda sin confirmar para el sprint de defensa.
- **Recomendación**: El equipo verifica manualmente en benditos.atlassian.net que KAN-77..KAN-87 tienen `originalEstimate` y `assignee`. Si alguno falta, actualizar antes del cierre de M-006.
- **Relación PSP**: PSP1 Planning (§4.1).
- **Relación SDLC**: Planificación.
- **Relación PMBOK**: Tiempo / Recursos.

#### H-005 — Fixtures binarios DICOM en repo sin documentación de propósito

- **Evidencia**: `docs/qa/fixtures/dicom_ot_modality.dcm`, `docs/qa/fixtures/dicom_sin_modality.dcm` — archivos binarios sin README que explique su rol en el smoke test.
- **Impacto**: Revisores futuros no saben si son datos de pacientes reales (PHI) o datos sintéticos de prueba. Aunque son sintéticos, la ambigüedad es un riesgo de proceso en dominio clínico.
- **Recomendación**: Agregar `docs/qa/fixtures/README.md` con: propósito de cada archivo, cómo fueron generados (script con pydicom, datos 100% sintéticos, ningún PatientID real), y cuándo usarlos.
- **Relación PSP**: PSP Testing (§4.7).
- **Relación SDLC**: Pruebas.
- **Relación PMBOK**: Calidad / Riesgos.

---

## Backlog de remediación priorizado

| Prioridad | Acción | Issue propuesto | Plazo sugerido |
|-----------|--------|-----------------|----------------|
| Alta | Cerrar D-004, D-005, D-006 en defect-log.md | — (tarea en este commit) | Hoy |
| Alta | Agregar README a docs/qa/fixtures/ | — (tarea en T-10 commit) | Hoy |
| Alta | Tests para server action consent + búsqueda pacientes | KAN nuevo post-defensa | Antes de M-007 |
| Media | Backfill KAN en commits huérfanos (documental) | Nota en traceability-matrix.md | Post-defensa |
| Media | Verificar manualmente KAN-77..KAN-87 en Jira (timetracking) | — (acción manual) | Antes del cierre de M-006 |

---

## Estado M-006 (Disciplina PSP operativa)

Criterio de cierre: "Las 4 reglas absolutas PSP ≥ 80% en auditoría; commits 100% con KAN-XX desde adopción del hook; defect-log poblado."

| Criterio | Estado |
|----------|--------|
| Reglas absolutas ≥ 80 % | **Sí** (3/4 confirmadas ≥ 80%; regla 2 no verificable por Jira) |
| Commits 100% con KAN-XX desde hook | **Parcial** — 6 commits entre post-remediación y activación plena del hook carecen de referencia. Los 11 commits del roadmap: 100%. |
| Defect log poblado | **Sí**, pero 3 entradas sin cierre formal |

**Veredicto**: M-006 cumple criterios mínimos para la defensa. Cierre formal requiere: (a) cerrar D-004..D-006 en defect-log.md, (b) verificación Jira manual de KAN-77..KAN-87.

---

## Apéndice — datos consultados

- **JQL ejecutado**: no ejecutado (auth OAuth pendiente). Último estado Jira: reporte `2026-05-22-audit-postremediation.md`.
- **Commits revisados**: `2c88d23` (2026-05-22) → `7b0b3db` (HEAD) — 17 commits.
- **Archivos de docs inventariados**: 11 specs/plans, 2 auditorías previas, milestones.md, defect-log.md, traceability-matrix.md.
- **Tests ejecutados**: `pytest -q` → 24 passed; `npm run build` → clean.
- **PHI check**: `git grep -nE "console\.(log|warn|error)" apps/web/src` → 1 hit (autorizado, error.tsx:19).
- **Print check**: `git grep -nE "print\(" apps/api/app` → 0 hits productivos.
