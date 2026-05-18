# Spec: Design System Fundacional para OncoScan

**Fecha:** 2026-05-17
**Sub-proyecto:** B (de la descomposición A → B → C)
**Autor:** Mateo + Claude (brainstorming)
**Enfoque elegido:** 3 — Fundacional + WCAG sweep completo
**Estado:** Pendiente de revisión del usuario

---

## Contexto

Sub-proyecto A dejó configurado el workflow de Claude skills (CLAUDE.md jerárquicos, 4 slash commands, permisos locales). El repo compila pero el design system actual es inconsistente:

- 6 tokens de color bien nombrados en `globals.css`, pero violados en 4 páginas distintas con colores Tailwind hardcodeados (`rose-600`, `red-200`, `red-50`, `bg-[#1a0000]`).
- No existe componente `Button` — cada página reimplementa sus propios estilos de botón, hay 4 estilos primarios distintos dispersos.
- Las alertas clínicas críticas se renderizan con HTML hardcodeado, sin `role="alert"` ni `aria-live`. WCAG fail.
- `StatusBadge` no reconoce los valores reales que devuelve la API (`ai_failed`, `ai_completed`).
- `RiskBadge` está inline en `uploads/page.tsx`; `alertas/page.tsx` reimplementa la misma lógica con rojo hardcodeado.
- No hay escala tipográfica documentada — cada página elige su propio `text-xl` vs `text-2xl`.
- Dark mode roto a medias: solo `--background` y `--foreground` adaptan; los tokens de brand no.

Este sub-proyecto **B** corrige todo esto y deja la plataforma con un sistema visual cohesivo que el sub-proyecto C usará para activar features rotas (PhantomButtons → reales, refactor a server actions, error boundaries).

## Objetivo

Establecer un design system fundacional para OncoScan:

1. Actualizar la paleta de brand a Deep Space Blue + Raspberry Red.
2. Crear los 3 componentes que faltan (`Button`, `AlertBanner`, `RiskBadge`).
3. Arreglar las violaciones de tokens en todas las páginas.
4. Documentar la escala tipográfica semántica.
5. Sweep completo WCAG AA sobre todo lo modificado.

## No-objetivo

- No refactorizar `analyze/page.tsx` a Server Component con server actions (eso es C).
- No activar PhantomButtons (eso es C).
- No agregar `loading.tsx` / `error.tsx` por ruta (eso es C).
- No tocar el backend FastAPI ni las rutas `/api/v1/`.
- No agregar librerías nuevas (animation, CSS-in-JS, UI kits) — todo se hace con Tailwind 4 y tokens.

## Decisiones tomadas en el brainstorming

| # | Decisión | Razón |
|---|---|---|
| 1 | Enfoque 3 (fundacional + WCAG sweep) | El usuario quiere base sólida para C, con accesibilidad cerrada en el mismo PR. |
| 2 | Paleta: Deep Space Blue (#012641) + Raspberry Red (#EE005A) | Identidad visual entregada por el usuario. Reemplaza el navy/rose actual. |
| 3 | Sidebar usa Deep Space Blue (#012641), no negro | El color de brand fluye desde el sidebar hacia los acentos del contenido. Identidad más cohesiva. |
| 4 | Button con 4 variantes (primary, secondary, ghost, danger) y 3 tamaños (sm, md, lg) | Cubre todos los usos actuales más el patrón confirm/cancel destructivo que C va a necesitar. |
| 5 | Un solo `AlertBanner` con 5 variantes | API unificada, fácil de documentar. La separación clínico vs UI se hace por variante, no por componente. |
| 6 | Escala tipográfica documentada en CLAUDE.md, sin tokens CSS nuevos | Tailwind 4 ya tiene la escala completa. Lo que faltaba era la guía semántica de cuándo usar cada nivel. |
| 7 | Dark mode solo aplica a chrome (page bg, surfaces, text base) | En plataformas clínicas el dark mode en contenido cambia la percepción de las alertas. Epic, Cerner y otros sistemas médicos no tienen dark mode en clinical content por esta razón. |

## Arquitectura de archivos

```
apps/web/src/components/ui/
  Button.tsx                                       (NUEVO)
  AlertBanner.tsx                                  (NUEVO)
  RiskBadge.tsx                                    (NUEVO)
  StatusBadge.tsx                                  (MODIFICADO)
  Input.tsx                                        (MODIFICADO)
apps/web/src/components/layout/
  Sidebar.tsx                                      (MODIFICADO)
apps/web/src/app/
  globals.css                                      (MODIFICADO)
  login/page.tsx                                   (MODIFICADO)
  platform/page.tsx                                (MODIFICADO)
  platform/alertas/page.tsx                        (MODIFICADO)
  platform/uploads/page.tsx                        (MODIFICADO)
  platform/analyze/page.tsx                        (MODIFICADO)
apps/web/CLAUDE.md                                 (MODIFICADO — tipografía + nuevos componentes)
docs/superpowers/specs/
  2026-05-17-design-system-fundacional-design.md   (esta spec, NUEVO)
```

## Sección 1 — Tokens y paleta (`globals.css`)

Cambios en hex values de los tokens de brand:

| Token | Antes | Después | Notas |
|---|---|---|---|
| `--color-brand-primary` | `#1e3a8a` | `#012641` | Deep Space Blue |
| `--color-brand-primary-hover` | `#1e40af` | `#01365e` | Ligeramente más claro |
| `--color-brand-danger` | `#e11d48` | `#EE005A` | Raspberry Red |
| `--color-brand-danger-hover` | *(no existe)* | `#c4004a` | NUEVO — hover de danger, mantiene contraste |
| `--color-brand-sidebar` | `#0a0a0a` | `#012641` | Unifica con brand-primary |
| `--color-brand-bg` | `#f8f9fa` | `#f8f9fa` | Sin cambio |
| `--color-brand-surface` | `#ffffff` | `#ffffff` | Sin cambio |

Dark mode de chrome (`prefers-color-scheme: dark`):

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #020617;        /* slate-950 */
    --foreground: #e2e8f0;        /* slate-200 */
    --color-brand-bg: #020617;
    --color-brand-surface: #0f172a; /* slate-900 */
  }
}
```

Los tokens `brand-primary`, `brand-primary-hover`, `brand-danger`, `brand-sidebar` **no cambian** en dark mode. Razón: las alertas clínicas deben preservar su perfil de color exacto para no alterar la percepción de severidad en distintos ambientes.

## Sección 2 — Componentes nuevos

### `Button` — `apps/web/src/components/ui/Button.tsx`

```ts
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;   // default: "primary"
  size?: ButtonSize;         // default: "md"
  loading?: boolean;         // disables button + shows spinner + aria-busy
}
```

Tabla de estilos:

| Variante | Default | Hover | Disabled |
|---|---|---|---|
| `primary` | `bg-brand-primary text-white` | `hover:bg-brand-primary-hover` | `opacity-50 cursor-not-allowed` |
| `secondary` | `bg-white text-slate-700 border border-slate-300` | `hover:bg-slate-50` | `opacity-50 cursor-not-allowed` |
| `ghost` | `bg-transparent text-brand-primary` | `hover:underline hover:text-brand-primary-hover` | `opacity-50 cursor-not-allowed` |
| `danger` | `bg-brand-danger text-white` | `hover:bg-brand-danger-hover` | `opacity-50 cursor-not-allowed` |

Tabla de tamaños:

| Tamaño | Padding | Texto | Border-radius |
|---|---|---|---|
| `sm` | `px-3 py-1.5` | `text-xs` | `rounded-lg` |
| `md` | `px-5 py-2.5` | `text-sm` | `rounded-xl` |
| `lg` | `px-8 py-3.5` | `text-base` | `rounded-xl` |

Reglas:
- Focus ring obligatorio: `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`
- `aria-busy={loading}` cuando `loading={true}`
- Loading state: el children se mantiene oculto visualmente, spinner inline a la izquierda. Botón queda `disabled` durante loading
- `className` componible — extiende, no reemplaza los estilos base
- No `asChild` ni `forwardRef` salvo que aparezca un caso real
- Para links que se ven como botones: exportar también `buttonVariants({ variant, size })` que devuelve la string de clases para usar con `<Link className={buttonVariants(...)}>`

### `AlertBanner` — `apps/web/src/components/ui/AlertBanner.tsx`

```ts
type AlertVariant = "critical" | "warning" | "info" | "error" | "success";

interface AlertBannerProps {
  variant: AlertVariant;
  title: string;
  description?: string;
  className?: string;
}
```

Tabla de variantes:

| Variante | Fondo | Borde | Texto | Icono | ARIA |
|---|---|---|---|---|---|
| `critical` | `bg-brand-danger/5` | `border-brand-danger border-2` | `text-brand-primary` con título en `text-brand-danger` | `AlertTriangle` | `role="alert"` `aria-live="assertive"` `aria-atomic="true"` |
| `warning` | `bg-amber-50` | `border-amber-500 border-2` | `text-amber-900` | `AlertCircle` | `role="status"` `aria-live="polite"` |
| `info` | `bg-blue-50` | `border-brand-primary` | `text-brand-primary` | `Info` | `role="status"` `aria-live="polite"` |
| `error` | `bg-slate-50` | `border-slate-400` | `text-slate-700` | `XCircle` | `role="alert"` |
| `success` | `bg-emerald-50` | `border-emerald-500` | `text-emerald-800` | `CheckCircle` | `role="status"` `aria-live="polite"` |

Reglas:
- Iconos siempre con `aria-hidden="true"` (la información está en el `role` y el `title`)
- `error` usa slate, NO `brand-danger`. Razón: errores genéricos de UI no son alertas clínicas
- No tiene botón de cerrar — los banners son persistentes hasta que el estado cambia
- No reemplaza a `sonner` (toasts) — sonner sigue para notificaciones transitorias

### `RiskBadge` — `apps/web/src/components/ui/RiskBadge.tsx`

```ts
interface RiskBadgeProps {
  level: "ALTO" | "MEDIO" | "BAJO" | null;
}
```

Tabla:

| Level | Fondo | Borde | Texto | aria-label |
|---|---|---|---|---|
| `ALTO` | `bg-brand-danger/10` | `border-brand-danger/20` | `text-brand-danger` | `"Riesgo alto"` |
| `MEDIO` | `bg-amber-100` | `border-amber-200` | `text-amber-700` | `"Riesgo medio"` |
| `BAJO` | `bg-emerald-100` | `border-emerald-200` | `text-emerald-700` | `"Riesgo bajo"` |
| `null` | `text-slate-400 text-xs` (sin badge, solo texto "Sin análisis") | — | — | `"Sin análisis"` |

Es extracción exacta de la función `RiskBadge` que hoy vive inline en `uploads/page.tsx`, más `aria-label` y uso del token `brand-danger` (en vez de `red-100`).

## Sección 3 — Fixes a componentes existentes

### `StatusBadge` (`src/components/ui/StatusBadge.tsx`)

- Ampliar string matching para reconocer los valores reales de Supabase:
  - `"ai_completed"` → emerald (además del actual `"completed"`)
  - `"ai_failed"` → brand-danger (además del actual `"failed"`)
  - `"processing"` → amber (ya funciona)
  - `"pending"` → amber (ya funciona)
- Añadir `aria-label={\`Estado: ${status}\`}` al `<span>`
- Mantener fallback slate para valores desconocidos

### `Input` (`src/components/ui/Input.tsx`)

- Color del mensaje de error (`error` prop):
  - `text-brand-danger` → `text-slate-700 font-medium`
  - `border-brand-danger focus:border-brand-danger focus:ring-brand-danger` → `border-slate-400 focus:border-slate-500 focus:ring-slate-400`
- Razón: errores de validación de formulario no son alertas clínicas. El rojo queda reservado para `brand-danger` semántico.

### `Sidebar` (`src/components/layout/Sidebar.tsx`)

- `text-red-400` en el ícono Bell de Centro de Alertas → `text-brand-danger`
- Verificar que `bg-brand-sidebar` siga aplicándose (ahora con valor #012641 será automático)
- Color de items activos: revisar contraste con nuevo fondo Deep Space Blue
  - Antes: `bg-slate-800` (sobre #0a0a0a)
  - Nuevo: `bg-white/15` o `bg-white/20` (sobre #012641 — mejor armonía y contraste suficiente)
- Border de separación `border-slate-900` → `border-white/10` (más legible sobre Deep Space Blue)

## Sección 4 — Migración de páginas

### `login/page.tsx`

- Background del `<main>`: `bg-[#1a0000]` → `bg-brand-sidebar`
- Input focus: `focus:border-rose-300 focus:ring-rose-300` → `focus:border-brand-primary focus:ring-brand-primary`
- Botón "Iniciar Sesión": reemplazar `<button>` raw por `<Button variant="primary" size="lg" loading={loading} className="w-full">`
- Eliminar `shadow-rose-200` del botón
- Error de login: `<p className="text-rose-500 bg-rose-50 p-3 rounded-lg border border-rose-100">` → `<AlertBanner variant="error" title="No pudimos iniciar sesión" description={errorMsg} />`

### `platform/page.tsx` (dashboard)

- CTA "Seleccionar archivo y subir" y "Auditar historial completo": convertir a `<Link className={buttonVariants({ variant: "primary", size: "lg" })}>` y `secondary` respectivamente
- `PhantomButton` de "Configurar Reportes": **no se toca** (sub-proyecto C lo activa)
- Cards de stats: mantener layout, verificar que las pequeñas pinceladas de `bg-brand-danger/5` sigan funcionando con el nuevo Raspberry Red

### `platform/alertas/page.tsx`

- Banner contador con hardcoded red (`border-red-200 bg-red-50`) → `<AlertBanner variant="critical" title="{total} estudios requieren evaluación urgente" description="Casos clasificados con riesgo ALTO por el modelo IA" />` cuando `total > 0`; cuando `total === 0` no se renderiza
- Error de Supabase (`border-red-200 bg-red-50 text-red-600`) → `<AlertBanner variant="error" title="Error cargando alertas" description={error.message} />`
- Score IA `<span className="text-red-600">` → `<span className="text-brand-danger font-bold">`
- Link "Ver detalle": de `text-red-600 hover:text-red-700` → `text-brand-danger hover:text-brand-danger/80`
- Botón "Volver": `<Link>` raw → `<Link className={buttonVariants({ variant: "secondary" })}>`

### `platform/uploads/page.tsx`

- Eliminar función local `RiskBadge`, importar el componente compartido de `@/components/ui/RiskBadge`
- Error de Supabase → `<AlertBanner variant="error">`
- Botones del header (`Subir DICOM`, `Análisis IA`, `Volver`) → `<Link className={buttonVariants({...})}>`
- Botón "Buscar" del form → `<Button variant="primary" size="md" type="submit">`
- Link "Limpiar" → `<Link className={buttonVariants({ variant: "secondary", size: "md" })}>`
- Botón "Realizar la primera carga" (empty state) → `<Link className={buttonVariants({ variant: "primary", size: "lg" })}>`
- Badge IA / DICOM inline: revisar contraste; mantener `brand-primary/10` y `brand-primary/20`

### `platform/analyze/page.tsx`

- Error message (`border-brand-danger/30 bg-brand-danger/5`) → `<AlertBanner variant="error" title="No pudimos iniciar el análisis" description={errorMsg} />`
- Botón "Ejecutar análisis" → `<Button variant="primary" size="lg" loading={loading} type="submit">`
- Botón "Cancelar y Volver" → `<Link className={buttonVariants({ variant: "secondary" })}>`
- File input: mantener estilos actuales (file:* selectors no aplican a Button); solo cambiar focus de `brand-primary` (que ya estaba bien) y verificar que el bg `bg-brand-primary/10` del botón file selector sigue legible

### `apps/web/CLAUDE.md` — actualización

Añadir sección de tipografía:

```markdown
## Escala tipográfica semántica

| Rol | Clases Tailwind |
|-----|----------------|
| H1 de página | `text-2xl font-bold text-slate-800` |
| H2 de sección | `text-sm font-semibold uppercase tracking-wider text-slate-500` |
| Título de card | `text-xl font-bold text-slate-800` |
| Body | `text-sm text-slate-600` |
| Caption / metadata | `text-xs text-slate-500` |
| Label de formulario | `text-sm font-medium text-slate-700` |
```

Y añadir a la tabla de componentes existentes:

| Componente | Ubicación | Cuándo usarlo |
|-----------|-----------|--------------|
| `Button` | `src/components/ui/Button.tsx` | Toda acción interactiva. Variantes primary/secondary/ghost/danger, tamaños sm/md/lg |
| `buttonVariants` | `src/components/ui/Button.tsx` | Helper para aplicar estilos de Button a `<Link>` u otros elementos |
| `AlertBanner` | `src/components/ui/AlertBanner.tsx` | Mensaje persistente inline (no transitorio). Variantes critical/warning/info/error/success |
| `RiskBadge` | `src/components/ui/RiskBadge.tsx` | Badge para nivel de riesgo IA (ALTO/MEDIO/BAJO) |

## Sección 5 — WCAG sweep completo

Después de implementar 1-4, correr `/oncoscan-a11y` sobre cada archivo modificado. Checklist de verificación obligatoria:

### Contraste

| Combinación | Ratio esperado | Acción si falla |
|---|---|---|
| `brand-danger` (#EE005A) sobre blanco — texto pequeño | ~4.1:1 (falla AA texto normal) | **Regla: nunca usar como `text-brand-danger` en texto < 18px.** Solo como fondo con texto blanco o en badges/banners |
| `brand-danger` como fondo con texto blanco | ~4.1:1 (pasa AA UI) | Si el audit detecta texto pequeño sobre fondo `brand-danger`, ajustar texto a `text-white font-bold` para subir percepción |
| `brand-primary` (#012641) sobre blanco | >7:1 (pasa AAA) | OK sin acción |
| Texto blanco sobre `brand-sidebar` (#012641) | >7:1 (pasa AAA) | OK sin acción |
| `text-slate-500` sobre `brand-bg` | verificar | Si falla → `text-slate-600` |
| Texto oscuro sobre tints claros de `AlertBanner` (todas las variantes) | ≥4.5:1 | Ajustar shade del texto si falla |

Si después del audit `brand-danger` falla en algún uso legítimo de texto pequeño, ajustar el token `--color-brand-danger` globalmente a `#D4004F` (~4.6:1, mantiene la identidad visual). La propagación es automática vía el token; ningún archivo de página necesita cambiar.

### Focus rings

- `Button` todas las variantes: `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`
- `Input`: ya tiene `focus:ring-1` — actualizar a `focus-visible:ring-2 focus-visible:ring-brand-primary`
- Links de navegación en Sidebar: añadir `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar`
- `PhantomButton` / `PhantomLink`: añadir ring (hoy no tienen)
- `AlertBanner`: sin acciones → no necesita ring

### ARIA

- `AlertBanner critical`: `role="alert"` + `aria-live="assertive"` + `aria-atomic="true"`
- `AlertBanner error`: `role="alert"`
- `AlertBanner warning/info/success`: `role="status"` + `aria-live="polite"`
- `RiskBadge`: `aria-label="Riesgo {level}"`
- `StatusBadge`: `aria-label="Estado: {status}"`
- `Sidebar <nav>`: añadir `aria-label="Navegación principal"`
- `Sidebar <aside>`: añadir `aria-label="Menú lateral"`
- Iconos lucide-react decorativos (los que acompañan texto): `aria-hidden="true"` en todos

### Teclado

- Test manual en cada página modificada: navegar con Tab y Shift+Tab, verificar orden lógico
- Submit con Enter en login y analyze
- Activación de `<Button>` con Space y Enter

## Criterios de éxito

1. `cd apps/web && npm run build` pasa sin errores ni warnings de TypeScript.
2. `cd apps/web && npm run lint` pasa sin errores.
3. `grep -rn "rose-" apps/web/src` no devuelve nada.
4. `grep -rn "red-[0-9]" apps/web/src` solo aparece en `RiskBadge.tsx`, `StatusBadge.tsx`, `AlertBanner.tsx` (lugares legítimos donde el rojo es semántico vía Tailwind shades).
5. `grep -rn "bg-\[#" apps/web/src` no devuelve nada (cero hex hardcoded — todo via tokens).
6. Los 3 componentes nuevos (`Button`, `AlertBanner`, `RiskBadge`) están listados en `apps/web/CLAUDE.md`.
7. Dashboard, login, alertas, uploads, analyze renderizan correctamente y muestran la nueva paleta.
8. `/oncoscan-a11y` sobre cada página modificada reporta cero hallazgos críticos. Mayores y menores documentados como follow-up si los hay.
9. Test manual de navegación por teclado en cada página: foco visible y orden lógico.
10. Commit final con todos los archivos nuevos/modificados, mensaje `feat: design system fundacional con paleta Deep Space Blue + Raspberry Red`.

## Próximo sub-proyecto (fuera del alcance de esta spec)

- **Sub-proyecto C** — Patrones de código + features rotas:
  - Refactor de `analyze/page.tsx` a Server Component con server actions
  - PhantomButton / PhantomLink convirtiéndose en features reales (con confirmación previa al usuario)
  - `error.tsx` y `loading.tsx` por ruta
  - Cualquier otra deuda técnica en `apps/web/`
