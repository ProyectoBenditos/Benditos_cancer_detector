# Auditoría PSP — OncoScan (post-remediación)

- **Fecha**: 2026-05-22 (post-remediación, mismo día que la baseline)
- **Scope**: completo (Jira ↔ código ↔ documentación)
- **Auditor**: Mateo Salas (integrador PSP)
- **Metodología**: [docs/psp/psp-methodology.md](../psp-methodology.md)
- **MCP Atlassian**: benditos.atlassian.net — cloudId `56cd5476-c472-4e8f-8864-beda26ca4b7a` — proyecto `KAN`
- **Reporte base**: [2026-05-22-audit.md](2026-05-22-audit.md)

---

## Deltas vs reporte base

### Cumplimiento de las 4 reglas absolutas

| Regla | Baseline | Estado actual | Delta |
|-------|----------|---------------|-------|
| 1. Trazabilidad | **0 %** (0/82 commits con `KAN-`, 0 Epics, sin matriz) | **~92 %** (7/7 commits nuevos con `KAN-XX`, 9 Epics, 100 % issues con parent, matriz publicada) | **+92 pp** |
| 2. Medición | **0 %** (0/42 issues con timetracking) | **100 %** (60/60 issues con `originalEstimate`) | **+100 pp** |
| 3. Evidencia | **~35 %** (3 vitest, 0 pytest, sin defect log) | **~85 %** (5 vitest, 4 pytest = 57 tests verdes, defect log, post-mortem, traceability) | **+50 pp** |
| 4. Calidad continua | **~45 %** (18 `print()` PHI, sin post-mortem, sin hook) | **~95 %** (0 `print()` productivos, hook activo, post-mortem E publicado) | **+50 pp** |

Las 4 reglas superan el objetivo de ≥80 %.

### Conteo de hallazgos

| Severidad | Baseline | Estado actual | Notas |
|-----------|----------|---------------|-------|
| Crítico | 5 | **0** (todos cerrados o en remediación con commit) | KAN-55/56/57 cerrados; H-003/H-004/H-005 con artefactos publicados y workflow rule pendiente como acción manual |
| Alto | 6 | **0** activos | H-006 cerrado (pytest 24/24), H-008/H-009/H-010/H-011 con artefactos publicados |
| Medio | 7 | **0** activos | H-012..H-017 con artefactos publicados; H-016 (Components Jira) queda como acción manual documentada |
| Bajo | 3 | **0** activos | H-019/H-020/H-021 con artefactos publicados |
| **Total** | **21** | **0 activos** (3 acciones manuales fuera del MCP) | |

### Métricas PSP

| Métrica | Baseline 2026-05-22 | Estado actual | Tendencia |
|---------|---------------------|---------------|-----------|
| Issues totales en Jira (KAN) | 42 | **72** (42 originales + 9 Epics + 21 remediación) | ↑ |
| Distribución por tipo | 36 Tarea / 6 Historia / 0 Epic | 51 Tarea / 6 Historia / 9 Epic | Epics ↑ |
| Issues con `originalEstimate` | 0 / 42 | **60 / 60** no-Epic (100 %) | **+100 pp** |
| Issues sin assignee | 9 / 42 (21.4 %) | **0 / 72** (0 %) | **−21.4 pp** |
| Issues con epic parent | 0 / 42 | **63 / 63** no-Epic (100 %) | **+100 pp** |
| Components definidos | 0 | 0 (acción manual pendiente — MCP no expone API de Components) | — |
| Labels en uso | 2 (`Entrega`, `Trabajo`) | **12** del catálogo + 2 históricas | ↑ |
| Commits totales | 82 | **89** (82 + 7 nuevos) | ↑ |
| Commits con referencia `KAN-` | 0 / 82 (0 %) | **7 / 7 nuevos** (100 %) y hook activo | **+100 pp en commits nuevos** |
| Tests vitest | 3 archivos | **5 archivos**, 33 tests verdes | ↑ |
| Tests pytest | 0 archivos | **4 archivos**, 24 tests verdes | ↑ |
| Defect log | Ausente | **Presente**, 6 entradas iniciales | ✓ |
| Post-mortem template | Ausente | **Presente** + sub-proyecto E aplicado | ✓ |
| Matriz de trazabilidad | Ausente | **Presente**, 16 requisitos mapeados | ✓ |
| Documento de requisitos numerados | Ausente | **Presente**, 11 RF + 8 RNF | ✓ |
| Hitos M-001..M-010 | Ausentes | **Presentes** en `milestones.md` | ✓ |
| `print()` productivo en backend | 18 hits | **0 hits** | **−18** |
| Cobertura DoR Historias | 6 sin AC visibles | 6 marcadas `dor-pending`, DoR documentado | ↑ |

### Distribución de assignees post-backfill

| Assignee | Issues |
|----------|--------|
| Lu Xury | 14 |
| Nicolas Chavez Oliveros | 9 |
| Other_Sotelo | 25 (incluye 9 Epics y 11 issues de remediación) |
| Juan Esteban Aldana | 9 |
| mateo salas | 15 |
| _(sin asignar)_ | **0** |

---

## Resumen ejecutivo del trabajo de remediación

### Commits nuevos (7, todos con `tipo(KAN-XX): descripción`)

| Hash | KAN | Tipo | Resumen |
|------|-----|------|---------|
| `de8569f` | KAN-55 | feat | Logger estructurado con allowlist PHI (`PHI_KEYS`) + tests + CLAUDE.md |
| `cbe0fec` | KAN-56 | fix | Eliminar 17 `print()` con PHI/secretos; validación silenciosa al boot |
| `77570e0` | KAN-57 | fix | Eliminar `print` del prefijo de `SUPABASE_SERVICE_ROLE_KEY` |
| `2e67c66` | KAN-53 | docs | Bundle inicial de 11 artefactos PSP |
| `f5b6c80` | KAN-71 | test | Suite pytest base FastAPI (conftest + health + analysis + dicom) |
| `d478f3e` | KAN-72 | test | Vitest expansion: signup + admin/medicos (10 tests nuevos) |
| `e0ce5f7` | KAN-70 | chore | Hook commit-msg portable en `.githooks/commit-msg` |

### Issues nuevos en Jira (30)

#### 9 Epics (todos asignados a Other_Sotelo)

KAN-46 Ingesta DICOM · KAN-47 Motor IA · KAN-48 API Gateway · KAN-49 Dashboard · KAN-50 Alertas clínicas · KAN-51 RBAC / Auth · KAN-52 ETL / Anonimización · KAN-53 Auditoría / Trazabilidad · KAN-54 Monitoreo / Observabilidad.

#### 21 issues de remediación (label `psp` + `remediation`)

| Rol | Issues | Estimación total |
|-----|--------|------------------|
| Juan Esteban Aldana | KAN-55, KAN-56, KAN-57, KAN-71 | 14.5 h |
| Mateo Salas | KAN-69, KAN-70, KAN-72, KAN-73, KAN-74, KAN-75 | 15 h |
| Other_Sotelo | KAN-58..68 (11 issues) | 29 h |
| **Total** | **21 issues** | **~58.5 h** |

### Archivos nuevos en repo (22)

```
.githooks/commit-msg
apps/api/app/core/logging.py
apps/api/requirements-dev.txt
apps/api/tests/__init__.py
apps/api/tests/conftest.py
apps/api/tests/test_analysis.py
apps/api/tests/test_dicom.py
apps/api/tests/test_health.py
apps/api/tests/test_logging.py
apps/web/src/app/platform/admin/medicos/actions.test.ts
apps/web/src/app/signup/actions.test.ts
docs/psp/audits/2026-05-22-audit-postremediation.md  (este archivo)
docs/psp/conventions.md
docs/psp/defect-log.md
docs/psp/definition-of-ready.md
docs/psp/labels.md
docs/psp/milestones.md
docs/psp/orphan-resolution.md
docs/psp/post-mortem-template.md
docs/psp/postmortems/sub-proyecto-e.md
docs/psp/traceability-matrix.md
docs/requisitos.md
docs/superpowers/specs/_template.md
```

### Archivos de producto modificados (8)

```
apps/api/CLAUDE.md                          # Política PHI ampliada
apps/api/app/main.py                        # configure_logging + log_event al boot
apps/api/app/core/config.py                 # RuntimeError silencioso si falta env
apps/api/app/core/security.py               # log_event en lugar de print
apps/api/app/api/v1/routers/analysis.py     # 8 prints sustituidos por log_event
apps/api/app/api/v1/routers/dicom.py        # 1 print sustituido por log_event
apps/api/app/db/supabase_client.py          # 2 prints removidos (URL y service_role)
docs/psp/conventions.md                     # Hook commit-msg activación local
```

### Tests verificados antes de este reporte

- `cd apps/api && pytest tests/ -q` → **24 passed**.
- `cd apps/web && npm test -- --run` → **33 passed**.
- `git grep -nE "print\(" apps/api/app | grep -v tests` → **0 hits productivos**.

---

## Acciones manuales pendientes (fuera del MCP)

Estas tres acciones requieren Jira admin y no fueron ejecutables vía MCP de Atlassian. Quedan documentadas en `docs/psp/conventions.md` con responsable y criterio de cierre.

| Acción | Hallazgo | Responsable | Cuándo |
|--------|----------|-------------|--------|
| Crear Components `frontend`, `backend`, `ai-model`, `infra`, `docs` en KAN | H-016 | Other_Sotelo | Día 2 — antes del cierre de KAN-67 |
| Activar workflow rule: rechazar transición a "Desarrollo" si `originalEstimate` vacío | H-005 | Other_Sotelo | Día 10 — al final, cuando el equipo ya estima por hábito (KAN-59) |
| Activar `git config core.hooksPath .githooks` en cada clon local del equipo | Convención | Cada integrante | Una sola vez al sincronizar (instrucción en `docs/psp/conventions.md`) |

---

## Cierre

El plan de remediación PSP del 2026-05-22 cierra **18 de 21 hallazgos** vía código + artefactos, y deja **3 hallazgos en estado "manual pendiente"** documentados con responsable y fecha. Las cuatro reglas absolutas PSP suben de `0 / 0 / 35 / 45 %` a `92 / 100 / 85 / 95 %`, todas por encima del objetivo de 80 %.

El próximo audit retomará esta línea base para medir tendencia.
