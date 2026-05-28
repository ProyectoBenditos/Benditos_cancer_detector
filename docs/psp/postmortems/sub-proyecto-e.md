# Post-mortem sub-proyecto E — Asociación opcional de paciente a upload DICOM + cierre de RLS

- **Fechas**: 2026-05-21 a 2026-05-22 (retrospectivo, basado en commits y memoria operativa)
- **Responsable de cierre**: mateo salas
- **Spec**: [`docs/superpowers/specs/2026-05-21-sub-proyecto-e-design.md`](../../superpowers/specs/2026-05-21-sub-proyecto-e-design.md) (referenciado en plan, archivo en proceso de commit)
- **Plan**: [`docs/superpowers/plans/2026-05-21-sub-proyecto-e.md`](../../superpowers/plans/2026-05-21-sub-proyecto-e.md)
- **Issues cubiertos**: [no enlazado en Jira — pendiente de matriz de trazabilidad (H-012)]

## 1. Alcance entregado

- Asociación opcional de paciente a un upload DICOM (commit `bb83b40`).
- Bootstrap inicial de admin documentado.
- Fix de recursión RLS en policy de `profiles` (commit `4944908`).
- Fix de race condition en login por `router.push` previo a la propagación de sesión (commit `4944908`).
- Migración del signup a trigger `on_auth_user_created` para evitar bypass de RLS desde el cliente (commit `dac55d0`).
- Cierre de la pieza pendiente "registrar a Mateo Salas como admin" sigue pendiente (no bloqueante).

Quedó fuera del alcance original: la métrica retrospectiva de tiempo estimado vs real, porque ningún issue del sub-proyecto E tenía `originalEstimate` poblado (H-005).

## 2. Defectos por fase

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Design (RLS) | Producción local | 1 | Alta | Policy recursiva detectada al primer login post-deploy local. Corregida en `4944908`. |
| Coding (signup) | Code Review | 1 | Alta | Insert directo desde cliente bloqueado por RLS. Migrado a trigger en `dac55d0`. |
| Coding (UI login) | Code Review | 1 | Media | `router.push` antes de propagar la sesión causaba flicker / redirect doble. |

**Eficiencia de revisión** = 2 atrapados antes de Testing / 3 total = **66.7%** [retrospectivo, sin instrumentación previa].

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| (sin issue formal) | [no medido] | [no medido] | n/a |

**Total estimado**: [no medido — establecer baseline en F]. **Total real**: [no medido]. **Delta**: n/a.

Acción derivada: a partir del sub-proyecto F, todo issue lleva `originalEstimate` antes de transitar a "Desarrollo" (regla Jira pendiente de activar — ver `conventions.md`).

## 4. Calidad del producto

- [x] La rama `merge/fronted-nicolas-into-main` está limpia (cambios pendientes son artefactos PSP nuevos, no producto E).
- [ ] Sin tests vitest del flujo signup ni de la nueva policy RLS — registrado como H-011 (parcial).
- [ ] Tests pytest backend no existían al cierre — se establecen en KAN-55 + Fase 6.1.
- [x] El fix de RLS no introdujo regresiones de auth en `platform/layout.tsx`.
- [ ] Spec aún no lista "Issues cubiertos" — registrado como H-018.

## 5. Lecciones de proceso

- **Las policies RLS deben revisarse con un test de query antes de promoverse**. Detectar "infinite recursion detected in policy" en el primer login es tardío. Establecer un patrón de smoke query en cada migración (capturar `error` server-side, regla de [[rls-patterns]]).
- **Race conditions de auth se reproducen con `await supabase.auth.getSession()` antes de redireccionar**, no con `router.push` puro. Documentar este patrón en `apps/web/CLAUDE.md` cuando se haga el bundle de Fase 6.2.
- **El sub-proyecto se cerró sin defect log activo**. A partir de F, cada defecto se registra en `defect-log.md` antes de ser cerrado.

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Tests vitest para `signup/actions.ts` y server actions con efecto RLS | mateo salas | 2026-05-28 | KAN-nuevo (Fase 6.2) |
| Patrón "smoke query" tras cada policy en `supabase/migrations/` | Nicolas Chavez Oliveros | 2026-05-30 | pendiente |
| Registrar a mateo salas como admin (pieza pendiente del E) | mateo salas | 2026-05-23 | pendiente |
| Añadir "Issues cubiertos" al spec del E | mateo salas | 2026-05-23 | KAN-nuevo (Fase 4, H-018) |

## 7. Anexos

- Commits relevantes: `bb83b40`, `5d014e9`, `5691d20`, `dac55d0`, `4944908`.
- Auditoría base: [`docs/psp/audits/2026-05-22-audit.md`](../audits/2026-05-22-audit.md).
- Patrones RLS aprendidos: registrados en memoria operativa del equipo bajo el slug [[rls-patterns]].
