# Spec: Workflow de Claude Skills para OncoScan

**Fecha:** 2026-05-17
**Sub-proyecto:** A (de la descomposición A → B → C)
**Autor:** Mateo + Claude (brainstorming)
**Estado:** Pendiente de revisión del usuario

---

## Contexto

OncoScan es una plataforma de apoyo a la detección temprana de cáncer pulmonar en entorno académico. Stack: Next.js 16 + React 19 + Tailwind 4 (web), FastAPI + Python (api), Supabase, HF Space para IA.

El repo está en un estado mixto: hay un merge sin resolver (`ai-service` ↔ `Luis/HEAD`), la UI tiene patrones inconsistentes y faltan barandas (a11y, jerarquía de alertas, manejo de PHI). El usuario quiere dejar el repo configurado para que Claude Code use skills sistemáticamente al trabajar en él.

Este sub-proyecto **A** es el habilitador. Una vez en marcha, B (design system fundacional) y C (patrones de código + features rotas) se construyen sobre esto usando los slash commands aquí definidos.

## Objetivo

Configurar el repo para que toda futura iteración de UI/UX/features pase por skills bien orquestados, en lugar de prompts ad-hoc. El alcance es:

1. Cerrar el merge pendiente para que el repo compile.
2. Crear `CLAUDE.md` jerárquicos que den contexto persistente.
3. Crear 4 slash commands del proyecto.
4. Configurar permisos locales.
5. Verificar el resultado.

## No-objetivo

- No es este sub-proyecto donde se refactoriza el diseño visual (eso es B).
- No es este sub-proyecto donde se arreglan features rotas (eso es C).
- No se configuran hooks automáticos. Solo slash commands manuales.
- No se diseña workflow compartido para equipo. Audiencia: solo el usuario con Claude Code.

## Decisiones tomadas en el brainstorming

| # | Decisión | Razón |
|---|---|---|
| 1 | Descomponer en A → B → C | El alcance total (workflow + design system + patrones + a11y + features) es demasiado para una sola spec. |
| 2 | A es el primero | Sin merge resuelto y sin skills configurados, B y C son contra un repo roto. |
| 3 | CLAUDE.md jerárquicos | Mejor calidad del contexto que Claude carga al trabajar en cada zona del repo. |
| 4 | Combinar ambas ramas en el merge | Tanto `Análisis IA` como `Centro de Alertas` son features reales. |
| 5 | 4 slash commands | `oncoscan-component`, `oncoscan-page`, `oncoscan-a11y`, `oncoscan-clinical-review`. |
| 6 | Solo slash commands, sin hooks | Más control, menos sorpresas. |
| 7 | `settings.local.json` en `.gitignore` | Audiencia personal — no se versiona. |

## Arquitectura de archivos

```
.claude/
  commands/
    oncoscan-component.md         (NUEVO)
    oncoscan-page.md              (NUEVO)
    oncoscan-a11y.md              (NUEVO)
    oncoscan-clinical-review.md   (NUEVO)
  settings.local.json             (NUEVO — gitignored)
CLAUDE.md                          (NUEVO)
apps/web/CLAUDE.md                 (NUEVO)
apps/api/CLAUDE.md                 (NUEVO)
.gitignore                         (MODIFICADO — añadir .claude/settings.local.json)
docs/superpowers/specs/
  2026-05-17-claude-skills-workflow-design.md   (esta spec, NUEVO)
```

Archivos que el plan de implementación tocará para cerrar el merge:

```
apps/web/src/components/layout/Sidebar.tsx        (RESOLVER conflicto)
apps/web/src/app/platform/uploads/page.tsx        (RESOLVER conflicto)
apps/api/requirements.txt                          (RESOLVER conflicto)
apps/api/.env.example                              (REVISAR no haya secretos)
```

## Paso 0 — Resolución del merge

Pre-requisito para todo lo demás. Reglas:

1. **`Sidebar.tsx`** — combinar:
   - Mantener `Análisis IA` como ruta real (`/platform/analyze`) — viene de `ai-service`.
   - Mantener `Centro de Alertas` como ruta real (`/platform/alertas`) — viene de HEAD/Luis.
   - Eliminar el `PhantomLink` de "Centro de Alertas" porque ya existe la ruta real.
   - Reorganizar secciones del sidebar:
     - **Clínico Real (Activo):** Dashboard, Subir DICOM, Historial DICOM, Análisis IA, Centro de Alertas.
     - **Próximamente:** Pacientes Registrados.
     - **Sistema:** Exportar Reportes, Ajustes.

2. **`uploads/page.tsx`** — abrir el archivo durante la implementación. Regla: conservar lo que use `Case_Ref` (búsqueda) y lo que use los estados IA (`ai_completed`, `ai_failed`, `processing`).

3. **`requirements.txt`** — unión de ambas listas, ordenada, sin duplicados.

4. **`.env.example`** — verificar que no haya valores reales filtrados. Si los hay, **escalar al usuario antes de commitear** (el archivo `docs/ai-model-changes.md` ya menciona riesgo de exposición de `service_role` key de Supabase).

Al cerrar el merge: un commit con mensaje `chore: resolver merge ai-service ↔ alertas + reorganizar Sidebar`.

## Contenido de los 4 slash commands

Todos viven en `.claude/commands/<nombre>.md` con frontmatter Markdown:

```yaml
---
description: <una línea>
argument-hint: <[archivo] o similar, opcional>
allowed-tools: <lista, opcional>
---
```

### `/oncoscan-component <nombre>`

**Skills:** `frontend-design:frontend-design` → `maestro:design-system-engineer` → `maestro:a11y-audit`.

**Workflow:**
1. Lee `apps/web/src/app/globals.css` (tokens) y `apps/web/src/components/ui/*.tsx` (patrones existentes).
2. Pregunta al usuario: variantes (primary/secondary/danger), tamaños (sm/md/lg), estados (default/hover/disabled/loading).
3. Crea `apps/web/src/components/ui/<Nombre>.tsx`:
   - Export nombrado.
   - Props tipadas con TS.
   - `className` componible (extiende, no reemplaza).
   - `forwardRef` solo si tiene caso de uso real.
4. Valida contraste WCAG AA y navegación por teclado.
5. **No** crea historia/demo/test salvo que se pida — YAGNI.

### `/oncoscan-page <ruta>`

**Skills:** `superpowers:brainstorming` (corto) → `maestro:coder` → `maestro:code-review`.

**Patrones que enforza:**
- Server Component por defecto. `"use client"` solo con estado/efectos/handlers.
- Auth gate vía `platform/layout.tsx` (no re-validar).
- Data fetching: `createClient()` de `@/utils/supabase/server` directo en Server Component.
- Forms con server actions, no `useState` para data flow.
- `loading.tsx` y `error.tsx` al lado del `page.tsx`.
- Empty state con CTA.
- Wrap en `PageContainer` + `SectionHeader`.

### `/oncoscan-a11y [archivo|ruta]`

**Skills:** `maestro:a11y-audit`.

**Checklist específico:**
- Contraste ≥ 4.5:1 texto, ≥ 3:1 UI. Especial atención: texto sobre `brand-sidebar` (#0a0a0a) y sobre `brand-danger`.
- `lucide-react` icons: `aria-hidden="true"` si decorativos, `aria-label` si son la única label.
- Foco visible (ring) en todos los interactivos incluido `PhantomButton`.
- `sonner` toasts: `role="status"` para info/success, `role="alert"` para errores.
- Alertas críticas clínicas: `role="alert"` + `aria-live="assertive"`.
- Output: hallazgos con severidad (crítica/mayor/menor) y `archivo:línea`.

### `/oncoscan-clinical-review [archivo|ruta]`

**Skills:** `maestro:code-review` → `maestro:security-engineer`.

**Reglas específicas que enforza:**
- **Rojo solo para alertas clínicas críticas.** Errores genéricos de UI: slate.
- **Resultados IA siempre con disclaimer** "herramienta de apoyo, no sustituye criterio clínico".
- **PHI nunca en logs.** Buscar `console.log`/`console.error` que filtren email, IDs de paciente, `Case_Ref`, `result_json`.
- **Acciones críticas requieren confirmación** (subida, eliminación, ejecución IA).
- **Estados IA con badges semánticos**, no texto plano: `processing`, `ai_completed`, `ai_failed`.
- **Storage privado:** ninguna URL de Supabase Storage expuesta al cliente sin signed URL server-side.

## Contenido de los CLAUDE.md

### `CLAUDE.md` raíz (~50 líneas)

- **Qué es OncoScan** — 2 frases.
- **Stack** — Next.js 16 + React 19 + Tailwind 4 / FastAPI / Supabase / HF Space.
- **Mapa del repo** — tabla `apps/web/`, `apps/api/`, `docs/`.
- **Datos sensibles (PHI)** — email, archivos DICOM, resultados IA, `Case_Ref`. Reglas de manejo.
- **Cuándo usar cada slash command** — tabla con uno por línea.
- **Convenciones de commit** — mensajes en español.
- **Pointer a sub-CLAUDE.md.**

### `apps/web/CLAUDE.md` (~80 líneas)

- **Tokens disponibles** con uso semántico ("rojo solo para alertas clínicas críticas").
- **Componentes UI existentes** — tabla con cada `src/components/ui/*` y cuándo usarlo. Regla: antes de inventar, revisa esta tabla.
- **Patrones de página** — `PageContainer > SectionHeader > contenido`.
- **Server vs Client** — Server Component por defecto.
- **Data fetching** — `createClient()` server-side directo. No agregar react-query/swr sin discutir.
- **Forms** — server actions.
- **Loading/error/empty** — convenciones.
- **Toasts** — `sonner`, mapeo por severidad. No toasts para alertas clínicas críticas.
- **Iconos** — solo `lucide-react`.
- **No agregar** — animation libs, CSS-in-JS, UI kits (shadcn/MUI) sin discutir.
- **PhantomButton/PhantomLink** — qué son y cuándo pedir confirmación antes de hacerlos funcionales.

### `apps/api/CLAUDE.md` (~20 líneas)

- Stack (FastAPI + httpx + Supabase).
- Estructura (`app/api/v1/routers/`, `app/services/`, `app/core/`).
- PHI en backend — nunca logues email, file_path, Case_Ref, result_json.
- JWT en todas las rutas `/api/v1/`.
- HF Space remoto con timeout. Errores → `ai_failed`, sin stack trace al cliente.

## `.claude/settings.local.json`

Auto-aprueba:
- `Bash(npm run lint)`, `Bash(npm run build)`, `Bash(npm run dev)`
- `Bash(git status)`, `Bash(git diff*)`, `Bash(git log*)`
- `Read`, `Glob`, `Grep` sin restricción
- `Bash(npx tsc --noEmit)`

No auto-aprueba: `git push`, `git commit`, `Bash(rm*)`, `Edit`, `Write`.

Va en `.gitignore`.

## Criterios de éxito

1. `git status` limpio. Sin marcadores `<<<<<<<`.
2. `cd apps/web && npm run build` pasa sin errores.
3. Los 4 archivos `.claude/commands/*.md` existen y se descubren con auto-completado de slash commands.
4. Los 3 `CLAUDE.md` existen. Test manual: en sesión limpia, preguntar a Claude "¿qué stack usa este repo?" — debe responder sin tener que abrir archivos.
5. Test en vivo: `/oncoscan-a11y apps/web/src/app/platform/page.tsx` produce reporte estructurado.
6. Commit final con: spec + archivos del workflow + resolución de merge.

## Próximos sub-proyectos (fuera del alcance de esta spec)

- **Sub-proyecto B** — design system fundacional: refactor `globals.css`, escala tipográfica, componentes con variantes, patrón de jerarquía de alertas, contraste WCAG AA en toda la plataforma.
- **Sub-proyecto C** — patrones de código + arreglar features rotas (PhantomButtons que deben ser reales, refactor de páginas a server actions, error boundaries por ruta).
