# Defect Log — OncoScan

Registro estructurado de defectos detectados durante revisiones, testing o producción. Cada entrada se añade tan pronto como el defecto se identifica, no al cerrarse.

## Tabla

| ID | Tipo | Fase inyección | Fase remoción | Severidad | Tiempo corrección (min) | Responsable | Commit fix | Issue Jira |
|----|------|----------------|---------------|-----------|-------------------------|-------------|------------|------------|
| D-001 | Trazabilidad / Seguridad | Coding (sub-proyecto B) | Code Review (auditoría PSP 2026-05-22) | Crítica | 12 | Juan Esteban Aldana | `cbe0fec` | KAN-56 |
| D-002 | Seguridad / Secretos | Coding (sub-proyecto B) | Code Review (auditoría PSP 2026-05-22) | Crítica | 3 | Juan Esteban Aldana | `77570e0` | KAN-57 |
| D-003 | Calidad / Observabilidad | Coding (sub-proyectos A-E) | Code Review (auditoría PSP 2026-05-22) | Crítica | 60 | Juan Esteban Aldana | `de8569f` `cbe0fec` | KAN-55 KAN-56 |
| D-004 | Trazabilidad | Planning (sub-proyecto A) | Auditoría PSP 2026-05-22 | Crítica | (en curso) | mateo salas | pendiente | pendiente (H-003) |
| D-005 | Medición | Planning (sub-proyecto A) | Auditoría PSP 2026-05-22 | Crítica | (en curso) | Other_Sotelo | n/a | pendiente (H-005) |
| D-006 | Evidencia / Testing | Coding (sub-proyectos A-E) | Auditoría PSP 2026-05-22 | Alta | (en curso) | Juan Esteban Aldana / mateo salas | pendiente | pendiente (H-006, H-011) |

## Campos

- **Tipo**: una etiqueta corta (`Trazabilidad`, `Seguridad`, `Calidad`, `Evidencia`, `Medición`, `UI`, `Funcional`, `Performance`, `Documentación`).
- **Fase inyección**: la fase PSP en la que se introdujo el defecto (`Planning`, `Design`, `Coding`, `Testing`, `Deploy`).
- **Fase remoción**: la fase en la que se detectó (no necesariamente la misma).
- **Severidad**: `Crítica` / `Alta` / `Media` / `Baja` según criterios de la sección 7 de [`psp-methodology.md`](psp-methodology.md).
- **Tiempo corrección**: minutos desde que el defecto se diagnostica hasta que se cierra. Permite calcular tiempo medio de corrección por severidad.
- **Commit fix**: hash corto cuando el cierre va por código; `n/a` si la corrección es solo Jira/docs.
- **Issue Jira**: clave del issue que tracea la corrección.

## Métricas derivadas

Calcular al cerrar cada sub-proyecto en el post-mortem:

- **Densidad de defectos por módulo** = defectos / issues entregados.
- **Eficiencia de revisión** = defectos atrapados antes de Testing / total de defectos del sub-proyecto.
- **Tiempo medio de corrección por severidad**.
- **Distribución fase inyección vs fase remoción** (idealmente la inyección > remoción significa que detectamos rápido).

Las primeras tres entradas (D-001..D-003) salen de la auditoría inicial; las próximas mediciones empiezan a calibrarse cuando se cierre el sub-proyecto F.
