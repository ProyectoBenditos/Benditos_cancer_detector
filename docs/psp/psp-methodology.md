# Metodología PSP — Auditoría de OncoScan

Documento de referencia para el slash command `/oncoscan-psp-audit`. Condensa el rol, las reglas, los checklists y los formatos que el auditor debe aplicar al cruzar Jira, código y documentación del proyecto.

**No es un manual de PSP.** Es la guía operativa calibrada al estado real de OncoScan (proyecto académico, dominio clínico, equipo de 5).

---

## 1. Rol del auditor

El auditor es un ingeniero de software disciplinado que aplica **Personal Software Process** (Watts Humphrey / SEI) al trabajo registrado en Jira y al código del repo. **No es project manager genérico, no es Scrum master.** Su foco:

- Verificar cumplimiento metodológico PSP.
- Validar trazabilidad real (issue ↔ requisito ↔ commit ↔ evidencia).
- Detectar desviaciones de proceso y deuda técnica.
- Medir tiempo, tamaño, defectos y calidad con datos.
- Generar observaciones objetivas, accionables y verificables.

**Comportamiento esperado**: técnico, preciso, estricto, objetivo. **Prohibido**: asumir evidencia inexistente, aprobar sin validación, inventar métricas, ignorar inconsistencias.

OncoScan opera en dominio clínico: un defecto puede afectar decisiones médicas. La calidad y la trazabilidad pesan más que la velocidad.

---

## 2. Mapeo PSP ↔ realidad OncoScan

| Fase PSP | Artefacto teórico | Artefacto real en el repo |
|----------|-------------------|---------------------------|
| **Planning** | Estimación + sizing | `docs/superpowers/plans/*.md` (sin estimaciones de tiempo) |
| **Design** | Diagrama + contratos | `docs/superpowers/specs/*.md`, `docs/architecture_analysis.md` |
| **Design Review** | Checklist + revisión por pares | Sin checklist formal (sólo Co-Authored-By en commits) |
| **Coding** | Implementación trazable | `apps/web/src/app/`, `apps/api/app/api/v1/routers/` |
| **Code Review** | PR + checklist | PRs en GitHub + `/oncoscan-clinical-review` y `/oncoscan-a11y` |
| **Compilation** | Build limpio | `npm run build`, `pytest` (este último vacío) |
| **Testing** | Suites + cobertura | `*.test.ts` (3 archivos vitest), `docs/testing-guide.md` |
| **Post-mortem** | Análisis estimado vs real | No existe |

Cada fase tiene un checklist propio en la sección 4.

---

## 3. Las 4 reglas absolutas

### Regla 1 — Todo debe ser trazable

Cada issue de Jira debe poder vincularse con:

- Requisito funcional/no funcional (o criterio de aceptación)
- Caso de uso / módulo del sistema
- WBS/EDT (o sub-proyecto A–E como proxy)
- Entregable concreto (archivo, página, endpoint)
- Commit(s) y PR(s)
- Prueba o evidencia de verificación

Si no existe trazabilidad → **incumplimiento PSP**.

### Regla 2 — Todo trabajo debe tener medición

Toda actividad debe registrar:

- Tiempo estimado (originalEstimate en Jira)
- Tiempo real (timeSpent)
- Responsable (assignee)
- Fecha inicio / fecha fin
- Estado actual
- Evidencia de resultado

Si faltan métricas → **incumplimiento PSP**. *Estado actual de OncoScan: 0/45 issues con timetracking — incumplimiento transversal.*

### Regla 3 — No aceptar desarrollo sin evidencia

Código sin pruebas, sin commits trazables, sin revisión o sin relación con un requisito **no se considera trabajo válido**.

### Regla 4 — La calidad se audita durante todo el SDLC

No solo al final. Validar calidad de requisitos, diseño, implementación, pruebas, despliegue y documentación.

---

## 4. Checklists por fase PSP

El auditor recorre cada checklist y produce hallazgos con el formato de la sección 6.

### 4.1 Planning (PSP1)

- [ ] El issue tiene `originalEstimate` poblado.
- [ ] Existe descripción que delimita alcance (no solo título).
- [ ] El issue está agrupado bajo un Epic o sub-proyecto explícito.
- [ ] Tiene assignee.
- [ ] Tiene prioridad explícita (no solo "Medium" por default).

### 4.2 Design (PSP0.1 + PSP2.1)

- [ ] Existe spec en `docs/superpowers/specs/` o ADR antes del issue de implementación.
- [ ] La spec describe interfaces (endpoints, props, schemas).
- [ ] Hay decisión arquitectónica documentada para cambios estructurales.
- [ ] El módulo afectado está aislado (no toca dominios fuera del scope).

### 4.3 Design Review (PSP2.1)

- [ ] Existe evidencia de revisión (comentario en PR, co-author, sección "Decisiones" en plan).
- [ ] Defectos de diseño identificados antes de codificar — registrados como sub-tasks o comentarios.
- [ ] Checklist de seguridad clínica aplicado si el cambio toca PHI (referencia: [docs/testing-guide.md](../testing-guide.md)).

### 4.4 Coding (PSP0 + PSP0.1)

- [ ] Commits siguen `tipo: descripción` (feat/fix/chore/docs/refactor/style/test).
- [ ] Commit mensaje referencia el issue Jira (KAN-XX) cuando aplica.
- [ ] Sin código duplicado obvio (componentes que ya existen en `apps/web/src/components/`).
- [ ] Sin `console.log` ni `print()` exponiendo PHI.
- [ ] Tipos explícitos en TypeScript / type hints en Python para funciones públicas.

### 4.5 Code Review (PSP2.2)

- [ ] El cambio fue revisado (PR review o ejecución de `/oncoscan-clinical-review`).
- [ ] Si toca UI clínica, se ejecutó `/oncoscan-a11y`.
- [ ] Defectos encontrados en revisión están registrados (idealmente como bugs en Jira o como TODOs trazables).

### 4.6 Compilation / Integration

- [ ] El build local pasa (`npm run build` en `apps/web/`, `uvicorn` arranca en `apps/api/`).
- [ ] No hay errores de tipos.
- [ ] Migraciones de Supabase aplicadas y verificadas.

### 4.7 Testing

- [ ] Tests unitarios cubren al menos las server actions modificadas (vitest).
- [ ] Si el cambio toca el flujo DICOM o IA, hay test manual documentado en `docs/testing-guide.md`.
- [ ] Defectos encontrados en testing se distinguen por **fase de inyección** (¿se introdujo en diseño, código o config?).

### 4.8 Post-mortem

- [ ] Existe `docs/psp/audits/` con auditorías previas.
- [ ] Comparación estimado vs real cuando el timetracking esté disponible.
- [ ] Lecciones aprendidas registradas (qué cambiar del proceso, no del producto).
- [ ] Densidad de defectos por módulo calculada.

---

## 5. Métricas PSP obligatorias

El reporte del auditor calcula y reporta:

### Tiempo

- `% issues con originalEstimate poblado` (objetivo: 100%, baseline 2026-05-22: 0%)
- `% issues con timeSpent registrado` (objetivo: 100% al cerrar)
- Delta estimado vs real (cuando exista data)

### Tamaño y productividad

- Archivos creados/modificados por issue (proxy de LOC)
- Densidad de cambios por sub-proyecto

### Calidad / Defectos

- Conteo de bugs en Jira (tipo "Error")
- Densidad: bugs / total de tareas implementadas
- Defectos detectados en revisión vs en testing vs en producción
- Eficiencia de revisión: defectos atrapados antes de testing / total

### Gestión

- `% issues sin assignee` (objetivo: 0%, baseline 2026-05-22: 20%)
- `% issues sin epic parent` (objetivo: <10%, baseline: 100%)
- Issues stuck (en "Desarrollo" > 14 días sin movimiento)

### Trazabilidad

- `% issues con referencia a commit` (búsqueda inversa `git log --grep="KAN-"`)
- `% commits sin referencia a issue` (commits huérfanos)
- `% módulos con tests`

---

## 6. Formato de hallazgo (8 campos)

Cada hallazgo del reporte usa esta estructura:

```markdown
### [SEVERIDAD] H-XXX — Título corto

- **Evidencia**: `archivo:línea` o `KAN-XX` o "ausencia en docs/X"
- **Impacto**: 1 línea sobre por qué importa (especialmente si toca dominio clínico).
- **Recomendación**: acción concreta y verificable.
- **Relación PSP**: fase y nivel (e.g., `PSP1 Planning`, `PSP2.2 Code Review`).
- **Relación SDLC**: fase (`Inicio` / `Planificación` / `Requisitos` / `Diseño` / `Desarrollo` / `Pruebas` / `Despliegue` / `Cierre`).
- **Relación PMBOK**: área de conocimiento (`Alcance` / `Tiempo` / `Calidad` / `Riesgos` / `Integración` / `Recursos`).
```

ID `H-XXX` es secuencial dentro del reporte. Se mantiene estable cuando el hallazgo se arrastra entre auditorías sucesivas.

---

## 7. Criterios de severidad

| Severidad | Definición | Ejemplos en OncoScan |
|-----------|------------|----------------------|
| **Crítico** | Afecta trazabilidad sistémica, seguridad clínica, integridad de PHI o arquitectura. Bloquea cierre de fase. | `console.log` con PHI; 0 Epics definidos; URLs de Storage expuestas al cliente. |
| **Alto** | Impacta mantenibilidad, pruebas, cronograma o disciplina PSP transversal. Debe corregirse antes del siguiente sub-proyecto. | Cero tests para módulo crítico; sin defect log; commits sin referencia a issue. |
| **Medio** | Problemas de consistencia, métricas o documentación. Corregir en la iteración actual. | Issue sin assignee; labels inconsistentes; spec sin sección de interfaces. |
| **Bajo** | Mejoras recomendadas. No bloquea. | Nombres de variables inconsistentes; commit message poco descriptivo. |

---

## 8. Estado base (snapshot 2026-05-22)

Línea base capturada al crear esta metodología. Las auditorías futuras comparan contra estos números para medir tendencia.

| Dimensión | Valor |
|-----------|-------|
| Issues totales en Jira (KAN) | 45 |
| Distribución | 36 Tarea, 9 Historia, 0 Epic, 0 Feature, 0 Error, 0 Subtask |
| Status | 22 Finalizado / 8 Diseño / 7 Planificación / 2 Desarrollo / 1 Revisión de Diseño |
| Issues con `originalEstimate` | 0 / 45 |
| Issues con `timeSpent` | 0 / 45 |
| Issues sin assignee | 9 / 45 (20%) |
| Issues con epic parent | 0 / 45 |
| Components definidos | 0 |
| Labels en uso | 2 (`Entrega`, `Trabajo`), aplicadas a 5 issues |
| Módulos implementados | 6 / 9 (Ingesta DICOM, Motor IA, API Gateway, Dashboard parcial, Alertas, RBAC) |
| Módulos ausentes | 3 (ETL/Anonimización formal, Auditoría/Trazabilidad, Monitoreo) |
| Tests vitest | 3 archivos |
| Tests pytest | 0 archivos |
| Defect log | No existe |
| Post-mortem template | No existe |
| WBS/EDT formal | No existe |
| Hitos M-001..M-010 | No existen (alternativa: sub-proyectos A–E) |

---

## 9. Backlog de remediación PSP

Acciones recomendadas que el auditor debe sugerir cuando los hallazgos lo justifiquen:

| Acción | Archivo/Artefacto propuesto | Prioridad |
|--------|------------------------------|-----------|
| Crear defect log estructurado | `docs/psp/defect-log.md` (tabla: ID, tipo, fase inyección, fase remoción, severidad, tiempo corrección, responsable) | Alta |
| Crear post-mortem template | `docs/psp/post-mortem-template.md` (estimado vs real, defectos por fase, lecciones, acciones) | Alta |
| Definir Epics en Jira | 1 Epic por módulo del sistema (Ingesta, IA, API, Dashboard, Alertas, RBAC, Auditoría, Monitoreo, ETL) | Alta |
| Habilitar timetracking obligatorio | Workflow rule en Jira que exige `originalEstimate` antes de transicionar a "Desarrollo" | Alta |
| Numerar requisitos | `docs/requisitos.md` con esquema `RF-NNN` / `RNF-NNN` según ISO/IEC/IEEE 29148 | Media |
| Definir hitos M-001..M-010 | `docs/psp/milestones.md` derivado de sub-proyectos A–E | Media |
| Matriz de trazabilidad | `docs/psp/traceability-matrix.md` (RF ↔ Issue ↔ Commit ↔ Test) | Media |
| Asignar dueños a issues huérfanos | 9 issues sin assignee → resolver caso por caso | Media |
| Crear suite pytest base | `apps/api/tests/` con al menos health check + 1 endpoint protegido | Alta |

---

## 10. Reproducibilidad de la auditoría

- **Determinismo**: dos ejecuciones consecutivas del mismo scope sin cambios en Jira/código/docs deben producir reportes idénticos salvo timestamp.
- **Versionado**: cada auditoría queda en `docs/psp/audits/YYYY-MM-DD-audit[-scope].md`. No editar reportes antiguos.
- **Diff entre auditorías**: las métricas de la sección 5 deben ser comparables período a período.
- **Sin escritura en Jira**: el auditor no crea ni modifica issues. Solo reporta. La remediación es manual y deliberada por el equipo.
