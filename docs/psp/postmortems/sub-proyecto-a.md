# Post-mortem Hito M-001 (sub-proyecto A) — Diseño fundacional: workflow de skills + design system + arquitectura UI

- **Fechas**: 2026-05-15 a 2026-05-17 (retrospectivo, reconstruido a partir de specs, commits y el acta de cierre 2026-05-24)
- **Responsable de cierre**: mateo salas
- **Spec**: [`docs/superpowers/specs/2026-05-17-design-system-fundacional-design.md`](../../superpowers/specs/2026-05-17-design-system-fundacional-design.md), [`docs/superpowers/specs/2026-05-17-claude-skills-workflow-design.md`](../../superpowers/specs/2026-05-17-claude-skills-workflow-design.md)
- **Plan**: [`docs/superpowers/plans/2026-05-17-design-system-fundacional.md`](../../superpowers/plans/2026-05-17-design-system-fundacional.md)
- **Issues cubiertos**: KAN-45 (sistema de diseño + WCAG), KAN-49 (Dashboard — base UI), KAN-48 (API Gateway — base de arquitectura). Requisitos: RNF-007 (WCAG AA en alertas clínicas), RF-009 (búsqueda en historial, legacy). Ver [matriz de trazabilidad](../traceability-matrix.md).

> **Nota retrospectiva**: este post-mortem se redacta el 2026-06-01, después del cierre del hito. El sub-proyecto A se ejecutó **antes** de la adopción de la disciplina PSP (auditoría de remediación 2026-05-22), por lo que no hubo defect log ni timetracking en tiempo real. Los campos sin instrumentación se marcan explícitamente como `[no medido]` en lugar de reconstruirse a ojo.

## 1. Alcance entregado

- Workflow de Claude skills del proyecto: `CLAUDE.md` jerárquicos (raíz + `apps/web` + `apps/api`), 4 slash commands (`/oncoscan-component`, `/oncoscan-page`, `/oncoscan-a11y`, `/oncoscan-clinical-review`) y permisos locales.
- Design system fundacional: paleta Deep Space Blue (`#012641`) + Raspberry Red (`#EE005A`), tokens de brand en `globals.css`, dark mode limitado a chrome.
- Tres componentes UI nuevos: `Button` (4 variantes × 3 tamaños), `AlertBanner` (5 variantes con ARIA por variante), `RiskBadge` (ALTO/MEDIO/BAJO/null).
- Escala tipográfica semántica documentada en `apps/web/CLAUDE.md`.
- Sweep WCAG AA sobre todas las páginas modificadas (login, dashboard, alertas, uploads, analyze).

**Quedó fuera del alcance original** (diferido a hitos posteriores por diseño):
- Refactor de `analyze/page.tsx` a Server Component y activación de PhantomButtons (M-003/C).
- Tests automatizados — no existía test runner en el repo al cierre de A.
- Trazabilidad formal Requisito↔Issue↔Commit↔Test, que solo se reconstruyó en la remediación de 2026-05-22 (defecto D-004).

## 2. Defectos por fase

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Planning (A) | Auditoría PSP 2026-05-22 | 1 | Crítica | **D-004** — Trazabilidad ausente desde Planning. Sin matriz Requisito↔Issue↔Commit. Cerrado 2026-05-22 (commits `aa2e13c`, `0ee72a3`; KAN-53). |
| Planning (A) | Auditoría PSP 2026-05-22 | 1 | Crítica | **D-005** — Medición ausente: ningún issue con `originalEstimate`. Cerrado 2026-05-22 (100% issues con estimate verificado post-remediación; KAN-53). |
| Coding (A–E, transversal) | Auditoría PSP 2026-05-22 | (transversal) | Crítica/Alta | **D-003** (observabilidad/logging) y **D-006** (testing) son defectos transversales A–E; se contabilizan una sola vez a nivel programa, no por hito. |

**Eficiencia de revisión del hito** = 0 atrapados antes de Testing / 2 propios = **0%** [retrospectivo]. Ambos defectos propios son de **proceso** (trazabilidad y medición), detectados solo cuando la disciplina PSP se adoptó a mitad de proyecto — exactamente la causa raíz registrada en el acta de cierre.

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| KAN-45 / KAN-48 / KAN-49 | [no medido — D-005] | [no medido] | n/a |

**Total estimado**: [no medido]. **Total real**: [no medido]. **Delta**: n/a.

El sub-proyecto A se planificó sin `originalEstimate` en Jira (defecto D-005). La regla de estimación obligatoria no estaba activa. Baseline de medición se establece a partir del hito M-005.5 (primer hito con timetracking completo, delta −20%).

## 4. Calidad del producto

- [x] `npm run build` pasaba al cierre (verificación manual; no había CI).
- [ ] Sin tests vitest/pytest — no existía test runner al cierre de A (origen de D-006).
- [x] Cero hex hardcodeado y cero `rose-*` tras el sweep (criterios de éxito de la spec, gates `grep`).
- [x] `/oncoscan-a11y` ejecutado sobre cada página modificada; sin hallazgos críticos al cierre.
- [ ] Spec sin sección "Issues cubiertos" formal en tiempo real (añadida retroactivamente; relación con H-018 del historial PSP).
- [ ] Cada commit con KAN-XX — **no** garantizado en A (la convención del hook se adoptó después; ver D-004).

## 5. Lecciones de proceso

- **La disciplina PSP debió arrancar en A, no a mitad de proyecto.** D-004 y D-005 (trazabilidad y medición ausentes desde Planning) son consecuencia directa de no tener matriz ni `originalEstimate` desde el día 1. Es la lección central del acta de cierre.
- **Un design system es infraestructura, no UI decorativa.** Centralizar `AlertBanner`/`RiskBadge` con ARIA por variante desde A evitó que cada página reimplementara alertas clínicas inconsistentes — pero el disclaimer clínico persistente faltó hasta M-005.5 (KAN-84), señal de que el checklist de dominio clínico no estaba en la Definition of Ready.
- **Sin test runner no hay red de seguridad.** Arrancar A sin Vitest/pytest fijó la deuda D-006 que arrastró todo el MVP.

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Activar `originalEstimate` obligatorio en Jira antes de transitar a "Desarrollo" | mateo salas | 2026-06-08 | KAN nuevo (M-006/M-007) |
| Incluir checklist de dominio clínico (PHI, disclaimer, consentimiento) en la Definition of Ready de vistas clínicas | mateo salas | 2026-06-08 | — |
| Mantener la matriz de trazabilidad actualizada al cierre de cada hito (no a posteriori) | Nicolas Chavez Oliveros | recurrente | KAN-53 |

## 7. Anexos

- Defectos: [`defect-log.md`](../defect-log.md) D-003, D-004, D-005, D-006.
- Auditoría base: [`docs/psp/audits/2026-05-22-audit.md`](../audits/2026-05-22-audit.md) y [post-remediación](../audits/2026-05-22-audit-postremediation.md).
- Lecciones a nivel proyecto: [`acta-cierre-proyecto.md`](../acta-cierre-proyecto.md), sección "¿Qué podríamos haber hecho mejor?".
- Nota de nomenclatura: la spec del design system se autodenomina internamente "sub-proyecto B" por una renumeración previa; según [milestones.md](../milestones.md) corresponde al **hito M-001 / sub-proyecto A**.
