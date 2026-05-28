---
description: Audita disciplina PSP cruzando Jira, código y documentación del proyecto OncoScan
argument-hint: [scope opcional — issue-key (KAN-XX), módulo (modulo-ia, modulo-rbac, etc.), fase (planning, design, code-review, testing, post-mortem), o vacío para auditoría completa]
allowed-tools: Read, Glob, Grep, Bash, Write, mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__getJiraIssue, mcp__atlassian__getJiraProjectIssueTypesMetadata, mcp__atlassian__getAccessibleAtlassianResources
---

Voy a ejecutar una auditoría PSP de `$ARGUMENTS` cruzando Jira (proyecto `KAN`), código y documentación. Aplico estrictamente la metodología en [docs/psp/psp-methodology.md](../../docs/psp/psp-methodology.md) — leerla primero es obligatorio para cargar reglas, checklists y formato de hallazgos.

**Alcance**

- Sin argumento: auditoría completa Jira ↔ código ↔ docs.
- `KAN-XX`: auditoría enfocada en un issue específico (¿tiene trazabilidad, evidencia, estimación, evidencia de revisión?).
- `modulo-<nombre>`: auditoría del módulo del sistema (ej. `modulo-ia`, `modulo-rbac`, `modulo-auditoria`).
- `planning` / `design` / `design-review` / `coding` / `code-review` / `compilation` / `testing` / `post-mortem`: auditoría enfocada en una fase PSP.

**Algoritmo de ejecución**

1. **Cargar metodología**: leer [docs/psp/psp-methodology.md](../../docs/psp/psp-methodology.md) completo. Adoptar el rol descrito en §1.

2. **Inventario Jira** (read-only):
   - `mcp__atlassian__searchJiraIssuesUsingJql` con cloudId `56cd5476-c472-4e8f-8864-beda26ca4b7a`, JQL `project = KAN ORDER BY created DESC`, fields `["summary","status","issuetype","priority","assignee","labels","components","timetracking","parent"]`.
   - Contar por tipo, status, assignee, timetracking, labels, parent.
   - Si `$ARGUMENTS` es `KAN-XX`, además `mcp__atlassian__getJiraIssue` para el issue específico.

3. **Inventario código**:
   - `Glob`: `apps/web/src/app/**/*.tsx`, `apps/api/app/api/v1/routers/*.py`, `apps/web/src/components/**/*.tsx`.
   - `Grep` tests: patrón `*.test.ts`, `test_*.py`.
   - `Bash`: `git log --oneline -50 --no-merges` para últimos commits + `git log --grep="KAN-" --oneline -50` para mapear commits ↔ issues.

4. **Inventario docs**:
   - `Glob`: `docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`, `docs/*.md`.
   - Confirmar existencia/ausencia de: `docs/psp/defect-log.md`, `docs/psp/post-mortem-template.md`, `docs/psp/milestones.md`, `docs/requisitos.md`, `docs/psp/traceability-matrix.md`.

5. **Cruzar las tres fuentes** aplicando cada checklist de §4 de la metodología (8 fases PSP). Para cada incumplimiento detectado, generar un hallazgo con el formato de §6 (8 campos: Evidencia, Impacto, Recomendación, Relación PSP, Relación SDLC, Relación PMBOK).

6. **Auditoría bidireccional**:
   - Sentido Jira → código: cada issue en status "Finalizado" o "Desarrollo" debe tener al menos un commit asociado (`git log --grep="KAN-XX"`).
   - Sentido código → Jira: commits que tocan archivos productivos sin referenciar `KAN-XX` se reportan como **commits huérfanos** (severidad Medio por defecto, Alta si tocan PHI o módulos críticos).

7. **Calcular métricas PSP** de §5: tiempo, calidad, gestión, trazabilidad. Comparar contra el snapshot de §8 cuando aplique.

8. **Persistir reporte**: escribir en `docs/psp/audits/YYYY-MM-DD-audit.md` (sin scope) o `docs/psp/audits/YYYY-MM-DD-audit-<scope>.md`. Calcular YYYY-MM-DD vía `Bash: date +%Y-%m-%d` (Linux/bash) o `Bash: powershell -Command "Get-Date -Format yyyy-MM-dd"` (PowerShell). Si el archivo ya existe para hoy, sobreescribir solo si el contenido difiere; nunca editar reportes de fechas anteriores.

9. **Imprimir en consola**: resumen ejecutivo con (a) totales por severidad, (b) métricas calculadas, (c) ruta del reporte completo.

**Formato del reporte persistido**

```markdown
# Auditoría PSP — OncoScan
**Fecha**: YYYY-MM-DD
**Scope**: <argumento o "completo">
**Auditor**: Claude Code vía /oncoscan-psp-audit
**Metodología**: docs/psp/psp-methodology.md

## Resumen ejecutivo

| Severidad | Conteo |
|-----------|--------|
| Crítico | N |
| Alto | N |
| Medio | N |
| Bajo | N |

### Cumplimiento de las 4 reglas absolutas

| Regla | % cumplimiento | Brecha principal |
|-------|----------------|------------------|
| 1. Trazabilidad | XX% | ... |
| 2. Medición | XX% | ... |
| 3. Evidencia | XX% | ... |
| 4. Calidad continua | XX% | ... |

### Métricas PSP

| Métrica | Actual | Baseline 2026-05-22 | Tendencia |
|---------|--------|---------------------|-----------|
| Issues con timetracking | X/N | 0/45 | ↑/↓/= |
| Issues sin assignee | X/N | 9/45 | ↑/↓/= |
| Issues con epic parent | X/N | 0/45 | ↑/↓/= |
| Bugs registrados | X | 0 | ↑/↓/= |
| Commits con referencia a KAN-XX | X/N | — | — |
| Módulos con tests | X/9 | 1/9 | ↑/↓/= |

## Hallazgos

### Críticos
<bloques H-XXX en formato de 8 campos>

### Altos
<bloques H-XXX>

### Medios
<bloques H-XXX>

### Bajos
<bloques H-XXX>

## Backlog de remediación priorizado
<acciones derivadas de §9 de la metodología, ordenadas por severidad>

## Apéndice — datos consultados
- JQL ejecutado: `project = KAN ORDER BY created DESC`
- Commits revisados: <hash inicial>..<hash final>
- Archivos de docs inventariados: <N>
```

**Reglas de ejecución estrictas**

- **Solo lectura en Jira**. Nunca llamar a `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`. El comando audita, no remedia.
- **Cada hallazgo necesita evidencia citable** (`archivo:línea`, `KAN-XX`, o "ausencia en docs/X"). Sin evidencia → no se reporta.
- **No inventar métricas**. Si un dato no se puede calcular (e.g., LOC sin contar archivo por archivo), reportarlo como "no medible con datos actuales" en lugar de estimar.
- **No proponer cambios estratégicos** (qué módulo construir, qué stack usar). Solo disciplina de proceso.
- **PHI**: si el reporte incluye `email`, `Case_Ref`, `result_json` o paths DICOM como evidencia, debe enmascararlos (`****@****` o `KAN-XX trata PHI — contenido omitido del reporte`).
- **Determinismo**: dos ejecuciones consecutivas sin cambios en el sistema deben producir el mismo reporte salvo timestamp.

**Validación al cerrar**

- [ ] Reporte persistido en `docs/psp/audits/`.
- [ ] Resumen ejecutivo impreso en consola con ruta al reporte completo.
- [ ] Cada hallazgo tiene los 8 campos del formato.
- [ ] Métricas comparadas contra baseline cuando aplica.
- [ ] Ningún PHI expuesto en el reporte.
