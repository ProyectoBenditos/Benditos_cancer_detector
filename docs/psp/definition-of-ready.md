# Definition of Ready (DoR) — OncoScan

Un issue Jira está "Ready" cuando cumple los criterios siguientes. Antes de cumplirlos lleva la label `dor-pending` y no puede transitar a "Desarrollo".

## DoR para Tareas (issuetype `Tarea`)

- [ ] **Resumen** describe un cambio verificable (no un objetivo genérico).
- [ ] **Descripción** sigue la plantilla de [`conventions.md`](conventions.md):
  - Sección `## Contexto` (1–2 líneas).
  - Sección `## Objetivo` (resultado verificable).
  - Sección `## Criterios de aceptación` con al menos 1 checklist item.
  - Sección `## Trazabilidad` con módulo + sub-proyecto + spec (si aplica).
  - Sección `## Estimación` con `originalEstimate`.
- [ ] **Assignee** asignado.
- [ ] **Parent** (Epic) seleccionado del catálogo (KAN-46 a KAN-54).
- [ ] **Labels** del catálogo aplicadas (al menos 1 si aplica).
- [ ] **Component** asignado cuando los Components estén creados en Jira (acción manual pendiente — ver `conventions.md`).
- [ ] **originalEstimate** poblado (horas o minutos).

## DoR para Historias (issuetype `Historia`)

Las Historias son user stories y exigen criterios de aceptación explícitos.

- [ ] **Resumen** en formato narrativo: `Como <rol>, quiero <capacidad>, para <beneficio>`.
- [ ] **Descripción** sigue la plantilla y obligatoriamente incluye:
  - Sección `## Como/Quiero/Para` (el texto narrativo expandido).
  - Sección `## Criterios de aceptación` con al menos 2 ítems verificables.
  - Sección `## Trazabilidad` con módulo + sub-proyecto + RF/RNF asociado.
  - Sección `## Estimación` con `originalEstimate`.
- [ ] **Issue hijo / subtask** existe para la implementación cuando la historia es grande (≥ 4h).
- [ ] **Assignee** asignado.
- [ ] **Parent** (Epic) seleccionado.

## DoR para Errores (issuetype `Error`)

- [ ] **Resumen** describe el comportamiento defectuoso (`<componente>: <síntoma>`).
- [ ] **Descripción** incluye:
  - Sección `## Pasos para reproducir`.
  - Sección `## Comportamiento esperado`.
  - Sección `## Comportamiento actual`.
  - Sección `## Severidad` (`Crítica` / `Alta` / `Media` / `Baja`).
  - Sección `## Trazabilidad` apuntando al commit/issue donde se introdujo si se conoce.
- [ ] **Label** `bug` aplicada (además de las labels del módulo afectado).
- [ ] **Component** del sistema impactado.
- [ ] Cada Error queda registrado adicionalmente en [`defect-log.md`](defect-log.md).

## Excepciones

- Issues históricos cerrados (status `Finalizado`) no se les exige cumplir DoR retroactivamente, pero sí se les añade `parent` + `labels` + `originalEstimate` retrospectivo en Fase 3 del plan de remediación.
- Issues que solo documentan no requieren `Component` ni `originalEstimate` formal — pueden marcarse 30m por defecto.

## Cómo aplica

- **Workflow rule pendiente** (acción manual, ver `conventions.md`): bloquear transición a "Desarrollo" si `originalEstimate` está vacío.
- **Revisión de DoR** se hace en el stand-up diario antes de mover el ticket en el board.
- Issues con `dor-pending` se mantienen visibles en el board pero no se trabajan.
