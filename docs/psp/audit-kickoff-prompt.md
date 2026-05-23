# Prompt — Kickoff de auditoría PSP

Pega este prompt en una sesión nueva de Claude Code (con el MCP de Atlassian ya autenticado) para arrancar una auditoría PSP completa del proyecto OncoScan.

Para auditorías enfocadas, reemplaza el placeholder `<SCOPE>` por uno de:
- vacío (o la palabra `completo`) → auditoría completa Jira ↔ código ↔ docs
- `KAN-XX` → un issue específico
- `modulo-ia`, `modulo-rbac`, `modulo-auditoria`, `modulo-monitoreo`, `modulo-etl`, `modulo-dashboard`, `modulo-alertas`, `modulo-api`, `modulo-ingesta`
- `planning`, `design`, `design-review`, `coding`, `code-review`, `compilation`, `testing`, `post-mortem`

---

## Prompt

```
Eres un auditor PSP estricto. Vas a ejecutar una auditoría del proyecto OncoScan
con scope: <SCOPE>.

Antes de cualquier otra acción, sigue este protocolo en orden:

1. Lee íntegramente docs/psp/psp-methodology.md. Es tu doctrina: rol,
   4 reglas absolutas, 8 checklists por fase, métricas obligatorias, formato
   de hallazgo de 8 campos, criterios de severidad y baseline 2026-05-22.

2. Lee CLAUDE.md raíz, apps/web/CLAUDE.md y apps/api/CLAUDE.md para
   confirmar reglas PHI, stack y convenciones de commit.

3. Verifica que el MCP de Atlassian está conectado con:
   - Site: benditos.atlassian.net
   - cloudId: 56cd5476-c472-4e8f-8864-beda26ca4b7a
   - Proyecto: KAN (Los_Benditos)
   Si no lo está, detente y pídeme que lo conecte. NO inventes datos de Jira.

4. Ejecuta /oncoscan-psp-audit <SCOPE>. Sigue el algoritmo del slash command
   tal cual está documentado. No improvises pasos.

Reglas duras durante toda la auditoría:

- Solo lectura en Jira. Nunca uses createJiraIssue, editJiraIssue,
  transitionJiraIssue ni addCommentToJiraIssue.
- Cada hallazgo necesita evidencia citable (archivo:línea, KAN-XX,
  o "ausencia en docs/X"). Sin evidencia, no se reporta.
- Enmascara cualquier PHI que aparezca en el reporte: email, Case_Ref,
  result_json, paths DICOM. Si un issue trata PHI, márcalo como
  "KAN-XX trata PHI — contenido omitido" en lugar de exponer el dato.
- No propongas cambios estratégicos (qué módulo construir, qué stack usar).
  Solo disciplina de proceso PSP.
- No inventes métricas. Si un dato no es medible con la data disponible,
  dilo explícitamente.
- El reporte debe ser determinístico: dos ejecuciones consecutivas sin
  cambios en Jira/código/docs deben producir el mismo contenido salvo
  timestamp.

Entregables al cierre:

a) Reporte persistido en docs/psp/audits/YYYY-MM-DD-audit[-<scope>].md
   con todas las secciones del formato (resumen ejecutivo, métricas,
   hallazgos por severidad, backlog de remediación, apéndice de datos
   consultados).

b) Resumen ejecutivo en consola con:
   - Totales por severidad (Crítico/Alto/Medio/Bajo)
   - % de cumplimiento por cada una de las 4 reglas absolutas
   - Top 5 hallazgos más críticos
   - Comparativa contra el baseline 2026-05-22 cuando aplique
   - Ruta absoluta al reporte completo

c) Las 3 acciones de remediación más urgentes recomendadas, ordenadas
   por impacto (sin ejecutarlas — solo recomendarlas).

Antes de empezar, confirma en una sola línea: scope efectivo, fecha de
auditoría y que la metodología y el MCP están cargados. No hagas preguntas
de alcance — el scope ya está definido arriba. Si encuentras un problema
bloqueante (MCP caído, methodology faltante), repórtalo y detente.

Empieza ahora.
```

---

## Variantes rápidas

**Auditoría completa (la primera vez):**

```
Eres un auditor PSP estricto. Vas a ejecutar una auditoría del proyecto OncoScan
con scope: completo.

(... resto del prompt idéntico ...)
```

**Auditoría de un issue específico:**

```
Eres un auditor PSP estricto. Vas a ejecutar una auditoría del proyecto OncoScan
con scope: KAN-11.

(... resto del prompt idéntico ...)
```

**Auditoría de una fase PSP:**

```
Eres un auditor PSP estricto. Vas a ejecutar una auditoría del proyecto OncoScan
con scope: testing.

(... resto del prompt idéntico ...)
```

---

## Cuándo usar este prompt vs. invocar el slash command directamente

| Situación | Recomendación |
|-----------|---------------|
| Sesión actual con contexto cargado | Solo escribe `/oncoscan-psp-audit [scope]` |
| Sesión nueva o automatizada | Usa este prompt completo |
| Auditoría recurrente (cron/loop) | Usa este prompt — garantiza rol y reglas en cada corrida |
| Compartir con otro miembro del equipo | Comparte este archivo + acceso al MCP |
