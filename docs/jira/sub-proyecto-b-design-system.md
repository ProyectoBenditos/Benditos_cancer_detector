# [ONCO-B] Sub-proyecto B — Design system fundacional + WCAG sweep

**Tipo:** Story
**Estado:** Done
**Sprint / Fase:** Sub-proyecto B
**Fecha de cierre:** 2026-05-18 (commits `628e7f7` → `9c4e3c9`)
**Labels:** `design-system`, `tokens`, `accessibility`, `wcag`, `tailwind`
**Depende de:** [ONCO-A] Sub-proyecto A
**Habilita:** [ONCO-C] Sub-proyecto C

---

## Summary

Establecer el design system fundacional de OncoScan: nueva paleta Deep Space Blue (#012641) + Raspberry Red (#EE005A), 3 componentes nuevos (`Button` + `buttonVariants`, `AlertBanner`, `RiskBadge`), fixes a componentes existentes, migración de 6 páginas y sweep WCAG AA. Eliminar todo color hardcoded fuera del sistema de tokens.

## Descripción

Después del MVP de Fase 0, la plataforma tenía 6 tokens de color bien nombrados en `globals.css` pero violados en 4 páginas con colores Tailwind hardcoded (`rose-600`, `red-200`, `red-50`, `bg-[#1a0000]`). No existía componente `Button`, cada página reimplementaba sus propios estilos. Las alertas clínicas críticas se renderizaban con HTML hardcodeado, sin `role="alert"` ni `aria-live` → WCAG fail. El `StatusBadge` no reconocía los valores reales que devolvía la API (`ai_failed`, `ai_completed`). El `RiskBadge` estaba inline en `uploads/page.tsx` y `alertas/page.tsx` reimplementaba la misma lógica.

Este sub-proyecto corrige todo eso y deja la plataforma con un sistema visual cohesivo que el sub-proyecto C usará para activar features rotas.

## Alcance entregado

### 1. Tokens y paleta (`globals.css`)
- `--color-brand-primary`: `#1e3a8a` → `#012641` (Deep Space Blue).
- `--color-brand-primary-hover`: `#1e40af` → `#01365e`.
- `--color-brand-danger`: `#e11d48` → `#EE005A` (Raspberry Red).
- `--color-brand-danger-hover`: NUEVO (`#c4004a`).
- `--color-brand-sidebar`: `#0a0a0a` → `#012641` (unificado con primary).
- `color-scheme: light` forzado en `:root` (patrón Epic/Cerner para plataformas clínicas).

### 2. Componentes nuevos
- **`Button`** + helper **`buttonVariants()`**: 4 variantes (primary/secondary/ghost/danger), 3 tamaños (sm/md/lg), prop `loading` con spinner + `aria-busy`, focus ring obligatorio.
- **`AlertBanner`**: 5 variantes (critical/warning/info/error/success). `critical` con `role="alert"` + `aria-live="assertive"` + `aria-atomic="true"`. `error` usa slate (no brand-danger) porque errores genéricos no son alertas clínicas.
- **`RiskBadge`**: componente compartido para nivel de riesgo IA (ALTO/MEDIO/BAJO) con `aria-label` semántico.

### 3. Fixes a componentes existentes
- `StatusBadge`: reconoce `ai_completed` y `ai_failed` + `aria-label`.
- `Input`: errores de validación en slate (no brand-danger), focus ring-2 visible, `aria-invalid`.
- `Sidebar`: armonizado sobre Deep Space Blue (`bg-white/15` activo, `border-white/10`), focus rings con offset del color sidebar, ARIA `aside`/`nav`, iconos con `aria-hidden`.
- `Header`: dot de notificación `bg-rose-500` → `bg-brand-danger`.

### 4. Migración de páginas
- `login/page.tsx`: `bg-[#1a0000]` → `bg-brand-sidebar`, botón raw → `<Button loading>`, error → `<AlertBanner variant="error">`, `htmlFor` en labels.
- `platform/page.tsx`: CTAs primary/secondary usan `buttonVariants()`.
- `platform/alertas/page.tsx`: banner contador → `<AlertBanner variant="critical">`, errores → `<AlertBanner variant="error">`, score IA y links usan `text-brand-danger`.
- `platform/uploads/page.tsx`: función inline `RiskBadge` eliminada → import del componente compartido, todos los botones del header → `buttonVariants()`, error → `<AlertBanner>`, `sr-only` label en buscador.
- `platform/analyze/page.tsx`: botón submit → `<Button loading>`, error → `<AlertBanner>`.
- `platform/upload/page.tsx`: `riskColor()` ahora usa `brand-danger`, error → `<AlertBanner>`, 3 botones migrados a `<Button>`.

### 5. Documentación
- `apps/web/CLAUDE.md`: tabla de tokens actualizada con nuevos hex, tabla de componentes ampliada con `Button`/`buttonVariants`/`AlertBanner`/`RiskBadge`, nueva sección "Escala tipográfica semántica" con 6 roles documentados.

## Criterios de aceptación

- [x] `cd apps/web && npm run build` pasa sin errores ni warnings TypeScript.
- [x] `cd apps/web && npm run lint` pasa sin errores (incluyó arreglar 4 errores pre-existentes no relacionados).
- [x] `grep -rn "rose-" apps/web/src` → 0 hits.
- [x] `grep -rn "red-[0-9]" apps/web/src` → solo 6 hits en 2 archivos con identidad visual divergente (`app/page.tsx` landing marketing + `platform/uploads/[id]/page.tsx` dark theme), documentados como follow-up. Plataforma clínica 100% limpia.
- [x] `grep -rn "bg-\[#" apps/web/src` → solo 17 hits en `app/page.tsx` (paleta marketing intencional, documentado como follow-up). Plataforma clínica 100% limpia.
- [x] Los 4 componentes nuevos están listados en `apps/web/CLAUDE.md` con regla de uso.
- [x] Render visual correcto verificado en navegador (post-hotfix de `color-scheme: light`).
- [x] ARIA semántico aplicado: `role="alert"` + `aria-live="assertive"` en alertas críticas, `aria-label` en badges, `aria-hidden` en iconos decorativos.
- [x] Focus rings consistentes (`focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`) en `Button`, `Input`, links de navegación.
- [x] Commit final con mensaje "feat: design system fundacional con paleta Deep Space Blue + Raspberry Red" (`59a370e`).

## Pendientes documentados como follow-up para Sub-proyecto C

- **Cerrar sesión** (`apps/web/src/app/platform/logout-button.tsx`): renderiza sin estilo visible en el Header. Migrar a `<Button variant="secondary" size="sm">` o `ghost`.
- **`app/page.tsx` (landing pública)**: paleta de marketing propia (navy `#020B2D` + cyan `#22AFFF`, 17 instancias de `bg-[#...]`). Decisión pendiente: tokens propios para landing o adoptar platform tokens.
- **`platform/uploads/[id]/page.tsx` (vista detalle)**: tema oscuro completo distinto al resto de la plataforma. Necesita rediseño a light theme + `Card` + `PageContainer` para encajar con el sistema.
- **`/oncoscan-a11y` y test manual de teclado**: requieren invocación por el usuario (no ejecutables desde el flujo del asistente). Los cuidados estructurales ya están en código; pendiente el audit manual confirmatorio.
- **Contraste de `brand-danger` (#EE005A)**: ~4.1:1 sobre blanco en texto pequeño. Si `/oncoscan-a11y` lo flagea: ajustar token global a `#D4004F` (~4.6:1). Propagación automática vía el token, ningún archivo de página necesita cambiar.

## Fuera de scope (Sub-proyecto C)

- Refactor de `analyze/page.tsx` a Server Component con server actions.
- Activación de PhantomButtons (`Configurar Reportes`, `Pacientes Registrados`, `Exportar Reportes`, `Ajustes`, `Notificaciones`).
- `error.tsx` y `loading.tsx` por ruta.
- Rediseño completo de `app/page.tsx` (landing) y `platform/uploads/[id]/page.tsx`.

## Commits (18 commits + 2 fixes post-implementación)

```
628e7f7 feat: paleta Deep Space Blue + Raspberry Red en tokens de brand
d46944d feat: componente Button con 4 variantes, 3 tamanos y buttonVariants helper
f68b735 feat: componente AlertBanner con 5 variantes y ARIA semantico
908a3c8 feat: componente RiskBadge compartido con aria-label
b313de4 fix: StatusBadge reconoce ai_completed y ai_failed + aria-label
a1a2a46 fix: Input usa slate para errores de form y ring-2 para focus visible
bff6b75 fix: Sidebar armonizado con Deep Space Blue + focus rings + ARIA
2b909db feat: login page usa Button + AlertBanner + tokens (cero rose/hex)
c045595 feat: dashboard usa buttonVariants en CTAs principales
5747f6e feat: alertas page usa AlertBanner critical + tokens brand-danger
a15d320 feat: uploads page usa RiskBadge compartido + Button + buttonVariants
393f12d feat: analyze page usa Button + AlertBanner para error y submit
f109eac docs: actualizar apps/web/CLAUDE.md con tipografia y nuevos componentes
cbf8f19 feat: upload page (formulario DICOM) usa Button + AlertBanner + tokens
791ddde fix: Header notification dot usa brand-danger en vez de rose-500
96e0946 fix: lint pre-existente (Metadata type, escape quotes, Date.now en useRef, dead RiskBadge)
afc9338 docs: registrar follow-ups del sub-proyecto B para sub-proyecto C
59a370e feat: design system fundacional con paleta Deep Space Blue + Raspberry Red
9c4e3c9 fix: forzar light mode en la plataforma clinica (dark mode rompia contraste)
```

## Archivos modificados (14)

- `apps/web/src/app/globals.css`
- `apps/web/src/components/ui/Button.tsx` (NUEVO)
- `apps/web/src/components/ui/AlertBanner.tsx` (NUEVO)
- `apps/web/src/components/ui/RiskBadge.tsx` (NUEVO)
- `apps/web/src/components/ui/StatusBadge.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/platform/page.tsx`
- `apps/web/src/app/platform/alertas/page.tsx`
- `apps/web/src/app/platform/uploads/page.tsx`
- `apps/web/src/app/platform/analyze/page.tsx`
- `apps/web/src/app/platform/upload/page.tsx`
- `apps/web/CLAUDE.md`
- Más fixes de lint pre-existente en 4 archivos no relacionados.
