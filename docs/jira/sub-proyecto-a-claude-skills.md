# [ONCO-A] Sub-proyecto A — Workflow de Claude skills para OncoScan

**Tipo:** Story
**Estado:** Done
**Sprint / Fase:** Sub-proyecto A
**Fecha de cierre:** 2026-05-09 (commit `dace374`)
**Labels:** `tooling`, `claude-code`, `developer-experience`, `phi`
**Depende de:** [ONCO-0] Fase 0
**Habilita:** [ONCO-B] Sub-proyecto B

---

## Summary

Configurar el workflow de Claude Code para OncoScan: instrucciones jerárquicas por área del repo (raíz / `apps/web/` / `apps/api/`), slash commands específicos del proyecto y permisos locales que reduzcan fricción sin comprometer la regla de PHI.

## Descripción

Antes de empezar el design system (B) o el refactor de patrones (C), la plataforma necesita asistencia de Claude que respete las particularidades del dominio clínico:

1. **Datos sensibles (PHI)**: emails, rutas DICOM, `Case_Ref`, `result_json`, URLs de Storage. Claude no debe loguearlos ni enviarlos en prompts innecesariamente.
2. **Stack mixto**: el frontend (Next.js + Tailwind 4) y el backend (FastAPI) tienen convenciones distintas; cada área necesita su propio `CLAUDE.md`.
3. **Tareas recurrentes**: crear componentes UI, refactorizar páginas, auditar accesibilidad y revisar seguridad clínica. Cada una debe ser un slash command repetible.

## Alcance entregado

- **CLAUDE.md jerárquico**:
  - Raíz: contexto general del proyecto, stack, reglas PHI, convenciones de commit en español.
  - `apps/web/CLAUDE.md`: tokens de diseño, componentes UI existentes, patrón de página, server vs client components, forms, toasts, iconos, PhantomButton.
  - `apps/api/CLAUDE.md`: estructura FastAPI, reglas de PHI en backend.
- **4 slash commands**:
  - `/oncoscan-component <Nombre>` — crear componente UI reutilizable siguiendo el design system.
  - `/oncoscan-page <ruta>` — crear o refactorizar página de la plataforma.
  - `/oncoscan-a11y [archivo]` — auditar WCAG AA de archivo/ruta.
  - `/oncoscan-clinical-review [archivo]` — revisar seguridad clínica, PHI, jerarquía de alertas y patrones IA.
- **`.claude/settings.local.json`** con permisos otorgados al CLI (bash, edición, lectura, etc.) sin comprometer reglas de PHI.

## Criterios de aceptación

- [x] `CLAUDE.md` raíz documenta stack, mapa del repo, PHI y convenciones de commit.
- [x] `apps/web/CLAUDE.md` lista los tokens y componentes disponibles, con regla explícita "si el componente no está, pregunta".
- [x] `apps/api/CLAUDE.md` lista las reglas de PHI en backend (no loguear emails ni rutas DICOM).
- [x] Los 4 slash commands existen en `.claude/commands/` y son invocables.
- [x] `settings.local.json` permite los comandos comunes del flujo de OncoScan sin abrir permisos peligrosos.
- [x] Mensajes de commit en español según convención del proyecto.

## Fuera de scope (queda para sub-proyectos posteriores)

- Implementar el design system en sí (→ Sub-proyecto B).
- Refactor de patrones de código y activación de PhantomButtons (→ Sub-proyecto C).
- Hooks de Claude (validación pre-commit automática, etc.).
- Slash commands adicionales para el backend FastAPI.

## Commits representativos

- `dace374` chore: configurar workflow de Claude skills para OncoScan (sub-proyecto A).

## Impacto medible

- Sub-proyecto B (design system, 18 commits, 14 archivos modificados) se ejecutó usando los slash commands y los `CLAUDE.md` jerárquicos. Sin esta base, B hubiera requerido pegar el contexto repetidamente en cada conversación.
