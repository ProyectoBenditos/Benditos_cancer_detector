# Plantilla de post-mortem — OncoScan

Cierre obligatorio de cada sub-proyecto. Archivar en `docs/psp/postmortems/sub-proyecto-X.md`. Mantener tono institucional, sin atribuir éxito o fracaso a personas individuales — el foco es el proceso.

---

# Post-mortem sub-proyecto X — <Título>

- **Fechas**: <YYYY-MM-DD a YYYY-MM-DD>
- **Responsable de cierre**: <Nombre>
- **Spec / Plan**: [enlace a docs/superpowers/specs/...] / [enlace a docs/superpowers/plans/...]
- **Issues cubiertos**: KAN-AA, KAN-BB, ...

## 1. Alcance entregado

- <Bullet 1: qué quedó funcional al cierre>
- <Bullet 2>
- <Bullet 3>

Mencionar qué quedó fuera del alcance original y por qué.

## 2. Defectos por fase

Extraer de [`defect-log.md`](../defect-log.md) las entradas asociadas al sub-proyecto.

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Planning | Auditoría | 0 | — | — |
| Design | Code Review | 0 | — | — |
| Coding | Code Review | 0 | — | — |
| Coding | Testing | 0 | — | — |
| Coding | Producción | 0 | — | — |

**Eficiencia de revisión** = defectos atrapados antes de Testing / total = <X/Y> = <Z%>.

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| KAN-NN | <Xh> | <Yh> | <±Z%> |

**Total estimado**: <Xh>. **Total real**: <Yh>. **Delta acumulado**: <±Z%>.

Si delta > ±25%, registrar en la sección 5 (Lecciones).

## 4. Calidad del producto

- [ ] Tests vitest pasan en CI (rama del sub-proyecto).
- [ ] Tests pytest backend pasan.
- [ ] `git grep -n "print(" apps/api/app | grep -v tests | grep -v scripts` devuelve 0.
- [ ] Ningún `console.*` introducido fuera de `error.tsx`.
- [ ] Spec del sub-proyecto tiene sección "Issues cubiertos".
- [ ] Cada commit del sub-proyecto referencia un KAN-XX.

## 5. Lecciones de proceso

Foco: **proceso, no producto**. ¿Qué cambiar del proceso del próximo sub-proyecto?

- <Lección 1>
- <Lección 2>

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| <Acción 1> | <Nombre> | <YYYY-MM-DD> | KAN-NN |

## 7. Anexos

- Capturas / dashboards si los hay.
- Enlace a la auditoría PSP correspondiente.
- Enlaces a PRs cerrados durante el sub-proyecto.

---

**Convenciones**:

- Marcar campos sin datos como `[no medido — establecer baseline]` en lugar de inventarlos.
- Todo dato cuantitativo se ancla al defect-log o al timetracking de Jira; nada de "más o menos".
- Lecciones que apliquen a todo el proyecto se promueven a `docs/psp/conventions.md`.
