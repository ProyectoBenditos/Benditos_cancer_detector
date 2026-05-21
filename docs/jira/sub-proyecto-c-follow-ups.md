# [ONCO-C] Sub-proyecto C — Cierre de follow-ups + merge fronted-nicolas

**Tipo:** Story
**Estado:** Done
**Sprint / Fase:** Sub-proyecto C
**Fecha de cierre:** 2026-05-21 (commits `70b62eb` → `3d12f39`)
**Labels:** `design-system`, `accessibility`, `merge`, `server-actions`, `error-boundaries`
**Depende de:** [ONCO-B] Sub-proyecto B
**Habilita:** [ONCO-D] Sub-proyecto D

---

## Summary

Cerrar los follow-ups del sub-proyecto B y simultáneamente incorporar el trabajo paralelo de `fronted-nicolas` (3 páginas nuevas: Modelo, Reportes, Reportes/download + mejoras a uploads). Estrategia: merge conceptual sobre `main` en la rama `merge/fronted-nicolas-into-main` (sin `git merge` literal, cero drag de código pre-design-system). Resultado: 26 archivos modificados / creados, 12 commits, design system intacto.

## Descripción

La rama `fronted-nicolas` aportó 3 páginas nuevas (Modelo IA, Reportes, endpoint CSV) y mejoras al historial de uploads (búsqueda + case_ref). Esas páginas usaban paleta oscura (`bg-slate-900`, `sky-400`, `red-50`) incompatible con el design system establecido en el sub-proyecto B. En vez de un `git merge` literal, se copiaron manualmente los archivos y se reskineron al sistema de tokens, eliminando toda dependencia de colores hardcoded.

Además se cerraron todos los follow-ups del sub-proyecto B documentados en `docs/jira/sub-proyecto-b-design-system.md`: LogoutButton sin estilo, Phantom Ajustes sin página real, `uploads/[id]` en dark theme, `analyze/page.tsx` como Client Component con fetch directo al backend, y la landing pública con 17 instancias de colores hardcoded.

## Alcance entregado

### Sección 0 — Merge conceptual de fronted-nicolas (Checkpoints 0-1)

- `modelo/page.tsx`: portado desde `fronted-nicolas` + reskin al design system + disclaimer de contenido pendiente de validación clínica.
- `reportes/page.tsx`: reescritura completa en light theme con `Card`, `buttonVariants`, KPIs reales desde Supabase.
- `reportes/download/route.ts`: portado + cambiado `redirect()` a `401` (es endpoint de descarga, no HTML).
- `platform/page.tsx` (dashboard): rediseñado adoptando estructura de Nicolás + design system, KPIs reales.
- `Header.tsx`: eliminado ícono de notificaciones y `LogoutButton`.
- `Sidebar.tsx`: links reales a Modelo IA y Reportes (dejaron de ser Phantom).
- `uploads/page.tsx`: búsqueda por nombre y `case_ref` via `.or()` server-side con escape de input (fix de filter injection).

### Sección 1 — Página `/platform/ajustes` (Checkpoint 3)

- Nueva página Server Component con perfil (`email`, rol), bloque Sesión con `LogoutButton`, y bloque Preferencias (próximamente via `AlertBanner variant="info"`).
- `LogoutButton` migrado a `Button variant="secondary" size="sm"` con estado `loading` e ícono `LogOut`.
- `Header.tsx` simplificado: eliminado `"use client"`, eliminado `LogoutButton`.
- Sidebar: Phantom "Ajustes" reemplazado por `Link` real a `/platform/ajustes`.

### Sección 2 — Boundaries de error y loading (Checkpoint 4)

- `error.tsx` global en `/platform/` con `AlertBanner variant="error"` + botones Reintentar / Ir al Dashboard. Solo loguea el `digest` (no-PHI).
- 10 `loading.tsx` con skeletons específicos por ruta: dashboard, uploads, uploads/[id], upload, analyze, analyze/[id], alertas, ajustes, reportes, modelo.

### Sección 3 — `analyze/page.tsx` Server Component (Checkpoint 5)

- `page.tsx` convertido a Server Component puro (sin `"use client"`, sin `useState`).
- `AnalyzeForm.tsx` (nuevo): Client Component con `useActionState` de React 19.
- `actions.ts` (nuevo): server action `analyzeAction` que valida input, llama FastAPI server-side con bearer del session de Supabase, y hace `redirect()` al resultado. El `access_token` nunca sale al navegador del usuario.

### Sección 4 — `uploads/[id]/page.tsx` rediseño a light theme (Checkpoint 6)

- Eliminado `<main className="min-h-screen bg-slate-950 text-white">`.
- Usa `PageContainer`, `SectionHeader`, `Card`, `RiskBadge`, `StatusBadge`, `AlertBanner`, `buttonVariants`.
- Campo `case_ref` desde `metadata_json` integrado como `InfoItem` destacado con badge brand-primary.
- Semántica `dl/dt/dd` en la info del archivo.
- Maneja `upload_status` legacy (`"analyzed"`, `"error"`) y nuevo (`"ai_completed"`, `"ai_failed"`).

### Sección 5 — Landing `app/page.tsx` adopta tokens platform (Checkpoint 7)

- 17+ instancias de `bg-[#...]` hardcoded eliminadas.
- Paleta marketing (navy `#020B2D` + cyan `#22AFFF`) reemplazada por tokens clínicos (`bg-brand-primary` + `bg-brand-danger`).
- Gradient del título: `from-brand-danger to-rose-300`.
- `aria-hidden="true"` agregado a todos los íconos decorativos.
- Footer: `bg-black`.

## Criterios de aceptación

- [x] `cd apps/web && npm run build` pasa sin errores TypeScript.
- [x] `cd apps/web && npm run lint` pasa sin errores.
- [x] `grep -rn "rose-" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -rn "red-[0-9]" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -rn "bg-\[#" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login` → 0 hits.
- [x] `grep -n "bg-\[#" apps/web/src/app/page.tsx` → 0 hits.
- [x] Cada ruta de `/platform/*` tiene `loading.tsx`.
- [x] `/platform/` tiene `error.tsx` global.
- [x] `/platform/analyze` es Server Component sin `useState`.
- [x] Bearer token del session de Supabase no sale al navegador en el flujo de análisis.

## Pendientes para Sub-proyecto D

- **Contenido de `modelo/page.tsx`**: habla de ISIC/EfficientNet (cáncer de piel) cuando el dataset real es LIDC-IDRI (CT torácico). Pendiente validación por Luis (AI Engineer).
- **`NEXT_PUBLIC_API_URL`**: debería ser `API_URL` (server-only) para no exponer la URL del backend al cliente. Migrar en sub-proyecto D.
- **Pacientes Registrados**: requiere schema de Supabase (fuera de scope hasta que el equipo defina el modelo de datos).
- **Preferencias en `/platform/ajustes`**: tema, idioma, notificaciones — requiere schema de usuario.
- **Tests automatizados**: el repo no tiene Vitest/Jest. Evaluar en sub-proyecto D.
- **RLS de `dicom_uploads`**: verificar y endurecer (afecta export CSV de reportes).
- **A11y sweep `/oncoscan-a11y`**: ejecutar sobre los archivos modificados en este sub-proyecto. Contingencia de contraste `brand-danger` (#EE005A ~4.1:1 sobre blanco para texto pequeño) → candidato a ajustar a `#D4004F` (~4.6:1) si el audit lo confirma.
- **`app/page.tsx`** (landing): las secciones `bg-slate-950` del About, Architecture, Team y Roadmap usan un token fuera del sistema (`slate-950` no tiene alias de token). Evaluar si merece token `brand-surface-dark`.

## Commits (12)

```
70b62eb feat: pagina Modelo IA portada desde fronted-nicolas y reskineada
5e24c6a feat: pagina Reportes portada desde fronted-nicolas y reskineada
80c968e feat: endpoint de descarga CSV de reportes desde fronted-nicolas
f639d87 feat: rediseno del dashboard adoptando estructura de fronted-nicolas
7763e8a feat: eliminar icono de notificaciones del Header
b865866 feat: sidebar agrega links a Modelo IA y Reportes reales
9f72cc0 feat: busqueda en historial DICOM por nombre y referencia con escape seguro
561a6b3 feat: pagina /platform/ajustes + LogoutButton migrado al design system
6c2ac78 feat: error.tsx global + loading.tsx por ruta en /platform
ba3d41c refactor: analyze page a Server Component + server action
ef1f83e feat: redisenar uploads/[id] de dark theme a light theme + design system
3d12f39 feat: landing publica adopta tokens platform (Deep Space Blue + Raspberry)
```

## Archivos modificados / creados (26)

```
 README.md                                          |  77 ++++--
 apps/web/src/app/page.tsx                          | 113 +++++----
 apps/web/src/app/platform/ajustes/loading.tsx      |  16 ++
 apps/web/src/app/platform/ajustes/page.tsx         |  61 +++++
 apps/web/src/app/platform/alertas/loading.tsx      |  18 ++
 apps/web/src/app/platform/analyze/AnalyzeForm.tsx  |  94 +++++++
 apps/web/src/app/platform/analyze/[id]/loading.tsx |  16 ++
 apps/web/src/app/platform/analyze/actions.ts       |  96 +++++++
 apps/web/src/app/platform/analyze/loading.tsx      |  21 ++
 apps/web/src/app/platform/analyze/page.tsx         | 192 +-------------
 apps/web/src/app/platform/error.tsx                |  50 ++++
 apps/web/src/app/platform/loading.tsx              |  31 +++
 apps/web/src/app/platform/logout-button.tsx        |  19 +-
 apps/web/src/app/platform/modelo/loading.tsx       |  18 ++
 apps/web/src/app/platform/modelo/page.tsx          | 141 +++++++++++
 apps/web/src/app/platform/page.tsx                 | 280 ++++++++++++++-------
 apps/web/src/app/platform/reportes/download/route.ts |  59 +++++
 apps/web/src/app/platform/reportes/loading.tsx     |  22 ++
 apps/web/src/app/platform/reportes/page.tsx        | 157 ++++++++++++
 apps/web/src/app/platform/upload/loading.tsx       |  18 ++
 apps/web/src/app/platform/uploads/[id]/loading.tsx |  17 ++
 apps/web/src/app/platform/uploads/[id]/page.tsx    | 228 +++++++++--------
 apps/web/src/app/platform/uploads/loading.tsx      |  19 ++
 apps/web/src/app/platform/uploads/page.tsx         |  19 +-
 apps/web/src/components/layout/Header.tsx          |  31 +--
 apps/web/src/components/layout/Sidebar.tsx         |  26 +-
 26 files changed, 1330 insertions(+), 509 deletions(-)
```

## A11y findings pendientes para Sub-proyecto D

Findings identificados en el sweep WCAG AA del 2026-05-21. Los que eran triviales se aplicaron directamente (ver commits `fix: a11y`). Los que requieren refactor se listan aquí.

### Mayor — `modelo/page.tsx:130-138` — Bloque "Aviso Clínico" raw `<div>` (WCAG 1.3.1, Nivel A)

El bloque de aviso clínico al final de la página usa un `<div>` con `<AlertTriangle>` + texto manual en vez del componente `AlertBanner`:

```tsx
<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
  <div>
    <p className="text-sm font-bold text-amber-800 mb-1">Aviso Clínico Importante</p>
    <p className="text-sm text-amber-700">...</p>
  </div>
</div>
```

**Solución**: Reemplazar por `<AlertBanner variant="warning" title="Aviso Clínico Importante" description="..." />`. Además de consistencia con el design system, el componente ya incluye `role="status"` + `aria-live="polite"`.

**Impacto**: 1 archivo, 10 líneas → 1 línea. Bajo riesgo.

### Menor — `AnalyzeForm.tsx` — inputs de features sin `<fieldset>`/`<legend>` (best practice, no WCAG failure)

Los 8 inputs de features clínicas (Subtlety, Calcification, etc.) están agrupados bajo un `<h3>` pero sin `<fieldset>` + `<legend>`. Cada input tiene su propio `<label>` correctamente asociado (corregido en este sweep), por lo que no es fallo WCAG. Sin embargo, un `<fieldset>` mejoraría la navegación por AT en formularios con múltiples grupos.

**Solución**: Envolver el grid de features en `<fieldset><legend className="sr-only">Features clínicas LIDC-IDRI</legend>...grid...</fieldset>`.

---

## Co-authorship de fronted-nicolas

Commits que adoptan trabajo de Nicolás Chávez Oliveros (`nicolaker031@gmail.com`):
- `modelo/page.tsx` — Checkpoint 0
- `reportes/page.tsx` — Checkpoint 0
- `reportes/download/route.ts` — Checkpoint 0
- `platform/page.tsx` (dashboard) — Checkpoint 1
- `uploads/page.tsx` (búsqueda) — Checkpoint 2
- `uploads/[id]/page.tsx` (case_ref) — Checkpoint 6
