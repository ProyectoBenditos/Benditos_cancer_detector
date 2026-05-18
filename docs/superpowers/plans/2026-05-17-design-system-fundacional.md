# Design System Fundacional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establecer el design system fundacional de OncoScan: nueva paleta Deep Space Blue + Raspberry Red, 3 componentes nuevos (`Button`, `AlertBanner`, `RiskBadge`), fixes a componentes existentes, migración de 5 páginas y sweep WCAG AA completo.

**Architecture:** Tokens-first. Cambiamos los `--color-brand-*` en `globals.css` y todo lo que ya use `bg-brand-*`/`text-brand-*` se actualiza automáticamente. Después creamos los componentes faltantes (`Button` + `buttonVariants`, `AlertBanner`, `RiskBadge`), arreglamos los 3 componentes existentes que tienen colores wrong (`StatusBadge`, `Input`, `Sidebar`), y migramos las 5 páginas eliminando todo hex hardcoded y toda clase `rose-*` / `red-[0-9]` ilegítima. Cierre con WCAG sweep usando el slash command `/oncoscan-a11y`.

**Tech Stack:** Next.js 16 (App Router) + React 19 + Tailwind 4 con `@theme inline` y tokens CSS, TypeScript, lucide-react para iconos. Sin librerías nuevas.

**Spec source:** `docs/superpowers/specs/2026-05-17-design-system-fundacional-design.md` — léela antes de empezar; este plan es la transcripción ejecutable.

**Project conventions de verificación:** Este repo no tiene Vitest/Jest. La verificación es `cd apps/web && npm run build` + `npm run lint` + greps de los success criteria + slash command `/oncoscan-a11y` + test manual visual. No agregar tests unitarios — fuera de scope.

**Commits:** Mensajes en español, formato `tipo: descripción breve` según `CLAUDE.md` raíz.

---

## Checkpoints

Este plan tiene **5 checkpoints**. En cada checkpoint pausar y reportar progreso al usuario antes de avanzar:

1. **Checkpoint 1** — después de Sección 1 (tokens en `globals.css`)
2. **Checkpoint 2** — después de Sección 2 (componentes nuevos: Button, AlertBanner, RiskBadge)
3. **Checkpoint 3** — después de Sección 3 (fixes a StatusBadge, Input, Sidebar)
4. **Checkpoint 4** — después de Sección 4 (migración de las 5 páginas + actualización de `apps/web/CLAUDE.md`)
5. **Checkpoint 5 / FINAL** — después de Sección 5 (WCAG sweep + verificación de criterios + commit final)

---

# Sección 1 — Tokens y paleta (`globals.css`)

## Task 1: Actualizar tokens de brand y dark mode chrome

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Reemplazar bloque `:root` y `@theme inline` con la nueva paleta**

Abrir [apps/web/src/app/globals.css](apps/web/src/app/globals.css) y reemplazar todo el contenido entre las líneas `:root {` y el cierre del `@media (prefers-color-scheme: dark)` con esto:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;

  /* OncoScan Design System Tokens — Deep Space Blue + Raspberry Red */
  --color-brand-primary: #012641;
  --color-brand-primary-hover: #01365e;
  --color-brand-danger: #EE005A;
  --color-brand-danger-hover: #c4004a;
  --color-brand-sidebar: #012641;
  --color-brand-bg: #f8f9fa;
  --color-brand-surface: #ffffff;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);

  --color-brand-primary: var(--color-brand-primary);
  --color-brand-primary-hover: var(--color-brand-primary-hover);
  --color-brand-danger: var(--color-brand-danger);
  --color-brand-danger-hover: var(--color-brand-danger-hover);
  --color-brand-sidebar: var(--color-brand-sidebar);
  --color-brand-bg: var(--color-brand-bg);
  --color-brand-surface: var(--color-brand-surface);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #020617;
    --foreground: #e2e8f0;
    --color-brand-bg: #020617;
    --color-brand-surface: #0f172a;
    /* Brand colors NO cambian en dark — preservan el perfil clínico */
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), Arial, Helvetica, sans-serif;
}
```

**Cambios clave vs estado actual:**
- `--color-brand-primary`: `#1e3a8a` → `#012641` (Deep Space Blue)
- `--color-brand-primary-hover`: `#1e40af` → `#01365e`
- `--color-brand-danger`: `#e11d48` → `#EE005A` (Raspberry Red)
- `--color-brand-danger-hover`: NUEVO (`#c4004a`)
- `--color-brand-sidebar`: `#0a0a0a` → `#012641` (unifica con primary)
- Dark mode: ahora también adapta `--color-brand-bg` y `--color-brand-surface`. Los brand colors NO cambian.

- [ ] **Step 2: Verificar que el build sigue verde**

Run: `cd apps/web && npm run build`
Expected: build pasa sin errores (warnings de Next pre-existentes son aceptables, pero NO debe aparecer ningún error de Tailwind/PostCSS/TypeScript nuevo).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat: paleta Deep Space Blue + Raspberry Red en tokens de brand"
```

---

## ⏸️ Checkpoint 1

**Reportar al usuario:**
- ✅ Tokens actualizados a Deep Space Blue (#012641) + Raspberry Red (#EE005A)
- ✅ `brand-sidebar` unificado con `brand-primary`
- ✅ `brand-danger-hover` agregado
- ✅ Dark mode aplica solo a chrome (bg/surface), no a brand
- ✅ `npm run build` verde
- Visualmente: el sidebar y los botones primary ya se ven Deep Space Blue, los acentos rojos ya son Raspberry Red. Las páginas con hex hardcoded (`bg-[#1a0000]` en login, `rose-*` en login, `red-200/red-50/red-600` en alertas y uploads) **aún muestran los colores viejos** — se arreglan en Sección 4.

**Esperar OK del usuario antes de avanzar a Sección 2.**

---

# Sección 2 — Componentes nuevos

## Task 2: Crear `Button` + `buttonVariants`

**Files:**
- Create: `apps/web/src/components/ui/Button.tsx`

- [ ] **Step 1: Crear el archivo con el componente y el helper**

Crear [apps/web/src/components/ui/Button.tsx](apps/web/src/components/ui/Button.tsx) con este contenido completo:

```tsx
import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-brand-primary hover:underline hover:text-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-brand-danger text-white hover:bg-brand-danger-hover disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-8 py-3.5 text-base rounded-xl",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2";

export function buttonVariants({
  variant = "primary",
  size = "md",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
} = {}) {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${buttonVariants({ variant, size })} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      <span className={loading ? "opacity-0" : ""}>{children}</span>
    </button>
  );
}
```

**Notas de diseño:**
- `buttonVariants()` exporta la string de clases para aplicar a `<Link>` u otros: `<Link className={buttonVariants({ variant: "primary", size: "lg" })}>`.
- Loading state: spinner inline + children oculto visualmente (mantiene el ancho del botón) + `aria-busy`.
- No `forwardRef` (la spec dice "no salvo que aparezca un caso real").
- Focus ring obligatorio incluido en BASE_CLASSES → aplica a Button y a cualquier `<Link>` que use `buttonVariants()`.

- [ ] **Step 2: Verificar tipos y build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores. Si TypeScript reclama por algo, leer el error y arreglar antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Button.tsx
git commit -m "feat: componente Button con 4 variantes, 3 tamaños y buttonVariants helper"
```

---

## Task 3: Crear `AlertBanner`

**Files:**
- Create: `apps/web/src/components/ui/AlertBanner.tsx`

- [ ] **Step 1: Crear el archivo con el componente**

Crear [apps/web/src/components/ui/AlertBanner.tsx](apps/web/src/components/ui/AlertBanner.tsx) con este contenido:

```tsx
import React from "react";
import { AlertTriangle, AlertCircle, Info, XCircle, CheckCircle } from "lucide-react";

export type AlertVariant = "critical" | "warning" | "info" | "error" | "success";

export interface AlertBannerProps {
  variant: AlertVariant;
  title: string;
  description?: string;
  className?: string;
}

type VariantConfig = {
  container: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  role: "alert" | "status";
  ariaLive?: "assertive" | "polite";
  ariaAtomic?: boolean;
};

const VARIANTS: Record<AlertVariant, VariantConfig> = {
  critical: {
    container: "bg-brand-danger/5 border-brand-danger border-2",
    title: "text-brand-danger font-bold",
    description: "text-brand-primary",
    icon: AlertTriangle,
    iconColor: "text-brand-danger",
    role: "alert",
    ariaLive: "assertive",
    ariaAtomic: true,
  },
  warning: {
    container: "bg-amber-50 border-amber-500 border-2",
    title: "text-amber-900 font-bold",
    description: "text-amber-900",
    icon: AlertCircle,
    iconColor: "text-amber-700",
    role: "status",
    ariaLive: "polite",
  },
  info: {
    container: "bg-blue-50 border-brand-primary border",
    title: "text-brand-primary font-bold",
    description: "text-brand-primary",
    icon: Info,
    iconColor: "text-brand-primary",
    role: "status",
    ariaLive: "polite",
  },
  error: {
    container: "bg-slate-50 border-slate-400 border",
    title: "text-slate-700 font-bold",
    description: "text-slate-700",
    icon: XCircle,
    iconColor: "text-slate-600",
    role: "alert",
  },
  success: {
    container: "bg-emerald-50 border-emerald-500 border",
    title: "text-emerald-800 font-bold",
    description: "text-emerald-800",
    icon: CheckCircle,
    iconColor: "text-emerald-700",
    role: "status",
    ariaLive: "polite",
  },
};

export function AlertBanner({
  variant,
  title,
  description,
  className = "",
}: AlertBannerProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      aria-atomic={config.ariaAtomic}
      className={`flex items-start gap-3 rounded-xl px-5 py-4 ${config.container} ${className}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.title}`}>{title}</p>
        {description && (
          <p className={`text-xs mt-1 ${config.description}`}>{description}</p>
        )}
      </div>
    </div>
  );
}
```

**Notas:**
- 5 variantes con ARIA semántico correcto (critical = `role="alert"` + `aria-live="assertive"` + `aria-atomic`).
- `error` usa slate (no brand-danger) según la regla del proyecto: errores genéricos de UI no son alertas clínicas.
- Iconos con `aria-hidden="true"` (la info está en role/title).
- Sin botón de cerrar — los banners son persistentes hasta que el estado cambia.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/AlertBanner.tsx
git commit -m "feat: componente AlertBanner con 5 variantes y ARIA semántico"
```

---

## Task 4: Crear `RiskBadge`

**Files:**
- Create: `apps/web/src/components/ui/RiskBadge.tsx`

- [ ] **Step 1: Crear el archivo con el componente**

Crear [apps/web/src/components/ui/RiskBadge.tsx](apps/web/src/components/ui/RiskBadge.tsx) con este contenido:

```tsx
import React from "react";

export type RiskLevel = "ALTO" | "MEDIO" | "BAJO";

export interface RiskBadgeProps {
  level: RiskLevel | null;
}

const STYLES: Record<RiskLevel, { classes: string; label: string }> = {
  ALTO: {
    classes: "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
    label: "Riesgo alto",
  },
  MEDIO: {
    classes: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Riesgo medio",
  },
  BAJO: {
    classes: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "Riesgo bajo",
  },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  if (!level) {
    return (
      <span className="text-slate-400 text-xs" aria-label="Sin análisis">
        Sin análisis
      </span>
    );
  }

  const style = STYLES[level];

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-bold border ${style.classes}`}
      aria-label={style.label}
    >
      {level}
    </span>
  );
}
```

**Notas:**
- Extracción de la función inline en `uploads/page.tsx` con dos cambios: `bg-red-100/text-red-700/border-red-200` → `bg-brand-danger/10 text-brand-danger border-brand-danger/20`, y `aria-label` añadido.
- Tipo `RiskLevel` exportado para que las páginas puedan tipar las props que pasan.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/RiskBadge.tsx
git commit -m "feat: componente RiskBadge compartido con aria-label"
```

---

## ⏸️ Checkpoint 2

**Reportar al usuario:**
- ✅ `Button` creado con 4 variantes (primary/secondary/ghost/danger), 3 tamaños (sm/md/lg), prop `loading`, focus ring obligatorio
- ✅ `buttonVariants()` helper exportado para `<Link>`
- ✅ `AlertBanner` creado con 5 variantes y ARIA correcto
- ✅ `RiskBadge` creado con `aria-label`
- ✅ `npm run build` verde después de cada componente
- Los componentes existen pero aún no se usan en las páginas (eso es Sección 4).

**Esperar OK del usuario antes de avanzar a Sección 3.**

---

# Sección 3 — Fixes a componentes existentes

## Task 5: Ampliar `StatusBadge` a estados reales + aria-label

**Files:**
- Modify: `apps/web/src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplazar [apps/web/src/components/ui/StatusBadge.tsx](apps/web/src/components/ui/StatusBadge.tsx) con:

```tsx
import React from "react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200"; // fallback

  if (
    normalizedStatus === "completed" ||
    normalizedStatus === "completado" ||
    normalizedStatus === "success" ||
    normalizedStatus === "ai_completed"
  ) {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (
    normalizedStatus === "pending" ||
    normalizedStatus === "pendiente" ||
    normalizedStatus === "processing"
  ) {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (
    normalizedStatus === "failed" ||
    normalizedStatus === "error" ||
    normalizedStatus === "critical" ||
    normalizedStatus === "ai_failed"
  ) {
    styles = "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles}`}
      aria-label={`Estado: ${status}`}
    >
      {status}
    </span>
  );
}
```

**Cambios:**
- `ai_completed` agregado a emerald (junto con `completed`).
- `ai_failed` agregado a brand-danger (junto con `failed`).
- `aria-label` añadido al `<span>`.
- Fallback slate intacto.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/StatusBadge.tsx
git commit -m "fix: StatusBadge reconoce ai_completed y ai_failed + aria-label"
```

---

## Task 6: Despinkar `Input` (errores en slate, no brand-danger)

**Files:**
- Modify: `apps/web/src/components/ui/Input.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

Reemplazar [apps/web/src/components/ui/Input.tsx](apps/web/src/components/ui/Input.tsx) con:

```tsx
import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus:border-brand-primary ${
            error
              ? "border-slate-400 focus:border-slate-500 focus-visible:ring-slate-400"
              : "border-slate-300"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-slate-700 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
```

**Cambios:**
- Error border: `border-brand-danger focus:border-brand-danger focus:ring-brand-danger` → `border-slate-400 focus:border-slate-500 focus-visible:ring-slate-400`.
- Error message: `text-brand-danger font-medium` → `text-slate-700 font-medium`.
- Focus general: `focus:ring-1 focus:ring-brand-primary` → `focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1` (WCAG sweep, ring más visible).
- `aria-invalid` añadido cuando hay error.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Input.tsx
git commit -m "fix: Input usa slate para errores de form y ring-2 para focus visible"
```

---

## Task 7: Re-armonizar `Sidebar` con Deep Space Blue

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

Reemplazar [apps/web/src/components/layout/Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx) con:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, Bell, Brain, FileText, Settings, Upload, FileStack } from "lucide-react";
import { PhantomLink } from "../ui/PhantomButton";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/platform" && pathname === "/platform") return true;
    if (path !== "/platform" && pathname?.startsWith(path)) return true;
    return false;
  };

  const linkBase =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar";
  const linkActive = "bg-white/15 text-white shadow-sm";
  const linkInactive = "hover:bg-white/10 hover:text-white";

  return (
    <aside
      aria-label="Menú lateral"
      className="w-64 bg-brand-sidebar text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-white/10"
    >
      <div className="p-6 border-b border-white/10 flex items-center">
        <Image
          src="/images/brand/logo-oncascan.png"
          alt="OncaScan Logo"
          width={160}
          height={42}
          style={{ width: "auto", height: "1.75rem" }}
          priority
          className="object-contain"
        />
      </div>

      <nav aria-label="Navegación principal" className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Clínico Real (Activo)
        </p>

        <Link
          href="/platform"
          className={`${linkBase} ${isActive("/platform") && pathname === "/platform" ? linkActive : linkInactive}`}
        >
          <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
          Dashboard General
        </Link>

        <Link
          href="/platform/upload"
          className={`${linkBase} ${isActive("/platform/upload") ? linkActive : linkInactive}`}
        >
          <Upload className="w-5 h-5" aria-hidden="true" />
          Subir DICOM
        </Link>

        <Link
          href="/platform/uploads"
          className={`${linkBase} ${isActive("/platform/uploads") ? linkActive : linkInactive}`}
        >
          <FileStack className="w-5 h-5" aria-hidden="true" />
          Historial DICOM
        </Link>

        <Link
          href="/platform/analyze"
          className={`${linkBase} ${isActive("/platform/analyze") ? linkActive : linkInactive}`}
        >
          <Brain className="w-5 h-5" aria-hidden="true" />
          Análisis IA
        </Link>

        <Link
          href="/platform/alertas"
          className={`${linkBase} ${isActive("/platform/alertas") ? linkActive : linkInactive}`}
        >
          <Bell className="w-5 h-5 text-brand-danger" aria-hidden="true" />
          Centro de Alertas
        </Link>

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Expedientes (Próximamente)
        </p>

        <PhantomLink
          featureName="Módulo de Pacientes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <Users className="w-5 h-5" aria-hidden="true" />
          Pacientes Registrados
        </PhantomLink>

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Sistema
        </p>

        <PhantomLink
          featureName="Exportación de Reportes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          Exportar Reportes
        </PhantomLink>

        <PhantomLink
          featureName="Ajustes de Plataforma"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          Ajustes
        </PhantomLink>
      </nav>

      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            OncaScan MVP v1.0
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" aria-hidden="true"></span>
        </div>
      </div>
    </aside>
  );
}
```

**Cambios resumidos:**
- Ícono Bell de Alertas: `text-red-400` → `text-brand-danger`.
- Item activo: `bg-slate-800 text-white` → `bg-white/15 text-white` (mejor armonía sobre Deep Space Blue).
- Hover: `hover:bg-slate-800 hover:text-slate-200` → `hover:bg-white/10 hover:text-white`.
- Bordes de sección: `border-slate-900` / `border-slate-800/50` → `border-white/10` (más legible sobre #012641).
- Footer bg `bg-[#060606]` → `bg-black/20` (elimina hex hardcoded — éste fallaba el grep de criterio 5).
- `<aside aria-label="Menú lateral">` + `<nav aria-label="Navegación principal">`.
- Focus rings añadidos a todos los `<Link>` y `<PhantomLink>` (ring blanco con offset del color sidebar).
- Iconos lucide con `aria-hidden="true"`.
- Headers de sección: `text-slate-500/text-slate-600` → `text-slate-400` (contraste sobre #012641).

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "fix: Sidebar armonizado con Deep Space Blue + focus rings + ARIA"
```

---

## ⏸️ Checkpoint 3

**Reportar al usuario:**
- ✅ `StatusBadge` reconoce `ai_completed`/`ai_failed` + `aria-label`
- ✅ `Input` despinkado (errores en slate, focus ring-2 visible, `aria-invalid`)
- ✅ `Sidebar` re-armonizado: items activos `bg-white/15`, bordes `border-white/10`, ícono Alertas en `brand-danger`, focus rings, ARIA `aside`/`nav`, hex `bg-[#060606]` eliminado
- ✅ `npm run build` verde
- Visualmente: el sidebar ya respira bien con la nueva paleta. Las páginas aún tienen sus problemas pendientes.

**Esperar OK del usuario antes de avanzar a Sección 4.**

---

# Sección 4 — Migración de páginas + docs

## Task 8: Migrar `login/page.tsx`

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

Reemplazar [apps/web/src/app/login/page.tsx](apps/web/src/app/login/page.tsx) con:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setErrorMsg(error.message);
            return;
        }

        router.push("/platform");
        router.refresh();
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-brand-sidebar px-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
                <div className="mb-8 text-center flex flex-col items-center">
                    <Image
                        src="/images/brand/logo-oncascan.png"
                        alt="OncaScan Logo"
                        width={200}
                        height={50}
                        style={{ width: 'auto', height: '2.5rem' }}
                        priority
                        className="object-contain mb-2"
                    />
                    <p className="text-sm text-slate-500">
                        Acceso seguro a la plataforma médica
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Correo Electrónico</label>
                        <input
                            id="login-email"
                            type="email"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="usuario@institucion.edu"
                        />
                    </div>

                    <div>
                        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            id="login-password"
                            type="password"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg ? (
                        <AlertBanner
                            variant="error"
                            title="No pudimos iniciar sesión"
                            description={errorMsg}
                        />
                    ) : null}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        className="w-full"
                    >
                        {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </Button>

                    <p className="text-xs text-center text-slate-400 mt-6">Sistema exclusivo de uso académico controlado</p>
                </form>
            </div>
        </main>
    );
}
```

**Cambios resumidos:**
- `bg-[#1a0000]` → `bg-brand-sidebar` (hex eliminado).
- Focus de inputs: `focus:border-rose-300 focus:ring-rose-300` → `focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary`.
- Botón raw → `<Button variant="primary" size="lg" loading={loading} className="w-full">`. `shadow-rose-200` eliminado.
- Error: `<p className="text-rose-500 bg-rose-50 border-rose-100">` → `<AlertBanner variant="error" title="No pudimos iniciar sesión" description={errorMsg} />`.
- `htmlFor` añadido a labels (a11y).

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat: login page usa Button + AlertBanner + tokens (cero rose/hex)"
```

---

## Task 9: Migrar `platform/page.tsx` (dashboard)

**Files:**
- Modify: `apps/web/src/app/platform/page.tsx`

- [ ] **Step 1: Reemplazar las dos `<Link>` raw por `<Link className={buttonVariants(...)}>`**

Abrir [apps/web/src/app/platform/page.tsx](apps/web/src/app/platform/page.tsx).

Agregar al import block (junto a los otros imports de `@/components/ui/...`):

```tsx
import { buttonVariants } from "@/components/ui/Button";
```

Reemplazar el `<Link>` "Seleccionar archivo y subir" (líneas ~82-87):

```tsx
<Link
    href="/platform/upload"
    className="mt-6 w-full text-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover hover:shadow-md transition-all"
>
    Seleccionar archivo y subir
</Link>
```

Por:

```tsx
<Link
    href="/platform/upload"
    className={`${buttonVariants({ variant: "primary", size: "lg" })} mt-6 w-full`}
>
    Seleccionar archivo y subir
</Link>
```

Reemplazar el `<Link>` "Auditar historial completo" (líneas ~106-111):

```tsx
<Link
    href="/platform/uploads"
    className="mt-6 w-full text-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all"
>
    Auditar historial completo
</Link>
```

Por:

```tsx
<Link
    href="/platform/uploads"
    className={`${buttonVariants({ variant: "secondary", size: "lg" })} mt-6 w-full`}
>
    Auditar historial completo
</Link>
```

- [ ] **Step 2: NO tocar las cards de stats**

Las cards de stats (Pacientes, Precisión, Alertas Críticas, Configurar Reportes) **no se modifican**. Los acentos `bg-brand-danger/5`, `text-brand-danger`, `border-brand-danger`, `bg-brand-primary/10` ya están bien — los nuevos hex de los tokens se propagan automáticamente. PhantomButton sigue intacto (lo activa sub-proyecto C).

- [ ] **Step 3: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/platform/page.tsx
git commit -m "feat: dashboard usa buttonVariants en CTAs principales"
```

---

## Task 10: Migrar `platform/alertas/page.tsx`

**Files:**
- Modify: `apps/web/src/app/platform/alertas/page.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

Reemplazar [apps/web/src/app/platform/alertas/page.tsx](apps/web/src/app/platform/alertas/page.tsx) con:

```tsx
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { buttonVariants } from "@/components/ui/Button";

export default async function AlertasPage() {
    const supabase = await createClient();

    const { data: alertas, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, ai_score, ai_risk_level, ai_recommendation, ai_processed_at, patient_id_dicom")
        .eq("ai_risk_level", "ALTO")
        .order("ai_processed_at", { ascending: false });

    const total = alertas?.length ?? 0;

    return (
        <PageContainer>
            <SectionHeader
                title="Centro de Alertas"
                description="Estudios con riesgo ALTO que requieren atención urgente."
                action={
                    <Link
                        href="/platform"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Volver
                    </Link>
                }
            />

            {total > 0 && (
                <div className="mb-6">
                    <AlertBanner
                        variant="critical"
                        title={total === 1
                            ? "1 estudio requiere evaluación urgente"
                            : `${total} estudios requieren evaluación urgente`}
                        description="Casos clasificados con riesgo ALTO por el modelo IA"
                    />
                </div>
            )}

            {error && (
                <div className="mb-6">
                    <AlertBanner
                        variant="error"
                        title="Error cargando alertas"
                        description={error.message}
                    />
                </div>
            )}

            {total === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <span className="text-2xl" aria-hidden="true">✅</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Sin alertas críticas</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            No hay estudios con riesgo ALTO en este momento.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <TableWrapper>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Archivo</TableHeaderCell>
                            <TableHeaderCell>Patient ID</TableHeaderCell>
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Score IA</TableHeaderCell>
                            <TableHeaderCell>Recomendación</TableHeaderCell>
                            <TableHeaderCell>Analizado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {alertas!.map((alerta) => (
                            <TableRow key={alerta.id}>
                                <TableCell className="font-bold text-slate-800 truncate max-w-[160px]" title={alerta.original_name}>
                                    {alerta.original_name}
                                </TableCell>
                                <TableCell>
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold border border-slate-200 uppercase tracking-widest">
                                        {alerta.patient_id_dicom ?? "N/D"}
                                    </span>
                                </TableCell>
                                <TableCell>{alerta.modality ?? "N/D"}</TableCell>
                                <TableCell>
                                    <span className="font-bold text-brand-danger">
                                        {alerta.ai_score != null
                                            ? `${(alerta.ai_score * 100).toFixed(1)}%`
                                            : "N/D"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-600 max-w-[200px] truncate" title={alerta.ai_recommendation ?? ""}>
                                    {alerta.ai_recommendation ?? "N/D"}
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                    {alerta.ai_processed_at
                                        ? new Date(alerta.ai_processed_at).toLocaleString()
                                        : "N/D"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link
                                        href={`/platform/uploads/${alerta.id}`}
                                        className="text-brand-danger hover:text-brand-danger-hover hover:underline font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded"
                                    >
                                        Ver detalle
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TableWrapper>
            )}
        </PageContainer>
    );
}
```

**Cambios resumidos:**
- Banner contador con `border-red-200 bg-red-50` → `<AlertBanner variant="critical">` (solo cuando `total > 0`).
- Error de Supabase con `border-red-200 bg-red-50 text-red-600` → `<AlertBanner variant="error">`.
- Score IA `text-red-600` → `text-brand-danger`.
- Link "Ver detalle" `text-red-600 hover:text-red-700` → `text-brand-danger hover:text-brand-danger-hover` + focus ring.
- Botón "Volver" raw → `<Link className={buttonVariants({ variant: "secondary", size: "md" })}>`.
- Icono ✅ con `aria-hidden="true"` (es decorativo, el `<h3>` ya comunica).

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/platform/alertas/page.tsx
git commit -m "feat: alertas page usa AlertBanner critical + tokens brand-danger"
```

---

## Task 11: Migrar `platform/uploads/page.tsx`

**Files:**
- Modify: `apps/web/src/app/platform/uploads/page.tsx`

- [ ] **Step 1: Reemplazar el contenido del archivo**

Reemplazar [apps/web/src/app/platform/uploads/page.tsx](apps/web/src/app/platform/uploads/page.tsx) con:

```tsx
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

type PageProps = {
    searchParams: Promise<{ q?: string }>;
};

export default async function UploadsPage({ searchParams }: PageProps) {
    const { q } = await searchParams;
    const supabase = await createClient();

    let query = supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, file_type, ai_score, ai_risk_level, metadata_json")
        .order("created_at", { ascending: false });

    if (q && q.trim()) {
        query = query.ilike("original_name", `%${q.trim()}%`);
    }

    const { data: uploads, error } = await query;

    const filtered = q && q.trim()
        ? uploads?.filter(u =>
            u.original_name.toLowerCase().includes(q.toLowerCase()) ||
            (u.metadata_json?.case_ref ?? "").toLowerCase().includes(q.toLowerCase())
          )
        : uploads;

    return (
        <PageContainer>
            <SectionHeader
                title="Historial de cargas y análisis"
                description="Listado centralizado de estudios DICOM y análisis IA."
                action={
                    <>
                        <Link
                            href="/platform/upload"
                            className={buttonVariants({ variant: "primary", size: "md" })}
                        >
                            Subir DICOM
                        </Link>
                        <Link
                            href="/platform/analyze"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Análisis IA
                        </Link>
                        <Link
                            href="/platform"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Volver
                        </Link>
                    </>
                }
            />

            {/* Buscador */}
            <form method="GET" className="mb-6">
                <div className="flex gap-3">
                    <label htmlFor="uploads-search" className="sr-only">Buscar estudios</label>
                    <input
                        id="uploads-search"
                        type="text"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Buscar por nombre de archivo o referencia del caso..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none transition-all shadow-sm"
                    />
                    <Button type="submit" variant="primary" size="md">
                        Buscar
                    </Button>
                    {q && (
                        <Link
                            href="/platform/uploads"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Limpiar
                        </Link>
                    )}
                </div>
                {q && (
                    <p className="text-xs text-slate-500 mt-2">
                        {filtered?.length ?? 0} resultado(s) para &quot;{q}&quot;
                    </p>
                )}
            </form>

            {error && (
                <div className="mb-6">
                    <AlertBanner
                        variant="error"
                        title="Error cargando historial"
                        description={error.message}
                    />
                </div>
            )}

            {!filtered || filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <span className="text-2xl" aria-hidden="true">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {q ? "Sin resultados" : "No hay estudios registrados"}
                        </h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {q
                                ? `No se encontraron estudios que coincidan con "${q}".`
                                : "Aún no se ha realizado ninguna carga exitosa."}
                        </p>
                        {!q && (
                            <Link
                                href="/platform/upload"
                                className={buttonVariants({ variant: "primary", size: "lg" })}
                            >
                                Realizar la primera carga
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <TableWrapper>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Archivo</TableHeaderCell>
                            <TableHeaderCell>Tipo</TableHeaderCell>
                            <TableHeaderCell>Referencia</TableHeaderCell>
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Fecha Estudio</TableHeaderCell>
                            <TableHeaderCell>Riesgo IA</TableHeaderCell>
                            <TableHeaderCell>Score IA</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Ingresado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {filtered.map((upload) => {
                            const isAnalysis = upload.file_type === "png_analysis";
                            const detailHref = isAnalysis
                                ? `/platform/analyze/${upload.id}`
                                : `/platform/uploads/${upload.id}`;
                            return (
                                <TableRow key={upload.id}>
                                    <TableCell className="font-bold text-slate-800 truncate max-w-[150px]" title={upload.original_name}>
                                        {upload.original_name}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                                            isAnalysis
                                                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        }`}>
                                            {isAnalysis ? "IA" : "DICOM"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-600 truncate max-w-[120px]" title={upload.metadata_json?.case_ref ?? ""}>
                                        {upload.metadata_json?.case_ref
                                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium">{upload.metadata_json.case_ref}</span>
                                            : <span className="text-slate-400 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>{upload.modality ?? "N/D"}</TableCell>
                                    <TableCell className="text-slate-500">{upload.study_date ?? "N/D"}</TableCell>
                                    <TableCell>
                                        <RiskBadge level={upload.ai_risk_level as RiskLevel | null} />
                                    </TableCell>
                                    <TableCell className="text-slate-700 font-medium">
                                        {upload.ai_score != null
                                            ? `${(upload.ai_score * 100).toFixed(1)}%`
                                            : <span className="text-slate-400 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={upload.upload_status} />
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs">
                                        {new Date(upload.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <Link
                                            href={detailHref}
                                            className="text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded"
                                        >
                                            {isAnalysis ? "Ver IA" : "Ver detalle"}
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </TableWrapper>
            )}
        </PageContainer>
    );
}
```

**Cambios resumidos:**
- Función local `RiskBadge` **eliminada**; `import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge"`.
- Error de Supabase con `border-red-200 bg-red-50 text-red-600` → `<AlertBanner variant="error">`.
- Botones del header `Subir DICOM` / `Análisis IA` / `Volver` → `<Link className={buttonVariants(...)}>`.
- Botón "Buscar" → `<Button variant="primary" size="md" type="submit">`.
- Link "Limpiar" → `<Link className={buttonVariants({ variant: "secondary", size: "md" })}>`.
- Botón "Realizar la primera carga" → `<Link className={buttonVariants({ variant: "primary", size: "lg" })}>`.
- Focus ring añadido al link "Ver detalle / Ver IA".
- `<label htmlFor="uploads-search" className="sr-only">` añadido (a11y — el placeholder no es label).
- Icono 📋 con `aria-hidden="true"`.
- Cast explícito `upload.ai_risk_level as RiskLevel | null` para tipar contra el componente nuevo.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores. Si TypeScript reclama sobre el cast de `ai_risk_level`, validar que el tipo es realmente string nullable desde Supabase.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/platform/uploads/page.tsx
git commit -m "feat: uploads page usa RiskBadge compartido + Button + buttonVariants"
```

---

## Task 12: Migrar `platform/analyze/page.tsx`

**Files:**
- Modify: `apps/web/src/app/platform/analyze/page.tsx`

- [ ] **Step 1: Aplicar 3 cambios puntuales (sin reescribir toda la página)**

Abrir [apps/web/src/app/platform/analyze/page.tsx](apps/web/src/app/platform/analyze/page.tsx). El refactor a Server Component es sub-proyecto C — aquí solo se migran los chrome UI.

**1a.** Agregar imports junto a los existentes de `@/components/ui/...`:

```tsx
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
```

**1b.** Reemplazar el `<Link>` "Cancelar y Volver" en el `action` del `SectionHeader` (líneas ~141-146):

```tsx
<Link
    href="/platform"
    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-medium"
>
    Cancelar y Volver
</Link>
```

Por:

```tsx
<Link
    href="/platform"
    className={buttonVariants({ variant: "secondary", size: "md" })}
>
    Cancelar y Volver
</Link>
```

**1c.** Reemplazar el `<button>` "Ejecutar análisis" (líneas ~192-198):

```tsx
<button
    type="submit"
    disabled={loading}
    className="rounded-xl bg-brand-primary px-8 py-3.5 font-medium text-white hover:bg-brand-primary-hover disabled:opacity-60 transition-colors shadow-sm"
>
    {loading ? "Iniciando analisis..." : "Ejecutar analisis"}
</button>
```

Por:

```tsx
<Button type="submit" variant="primary" size="lg" loading={loading}>
    {loading ? "Iniciando analisis..." : "Ejecutar analisis"}
</Button>
```

**1d.** Reemplazar el bloque de error (líneas ~201-205):

```tsx
{errorMsg && (
    <div className="mt-8 rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-sm text-brand-danger font-medium">
        {errorMsg}
    </div>
)}
```

Por:

```tsx
{errorMsg && (
    <div className="mt-8">
        <AlertBanner
            variant="error"
            title="No pudimos iniciar el análisis"
            description={errorMsg}
        />
    </div>
)}
```

**1e.** No tocar el `<input type="file">` — los `file:*` selectors no son compatibles con `<Button>`. Solo verificar visualmente que el botón file selector con `bg-brand-primary/10` sigue legible sobre la nueva paleta.

- [ ] **Step 2: Verificar build**

Run: `cd apps/web && npm run build`
Expected: pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/platform/analyze/page.tsx
git commit -m "feat: analyze page usa Button + AlertBanner para error y submit"
```

---

## Task 13: Actualizar `apps/web/CLAUDE.md` con tipografía y nuevos componentes

**Files:**
- Modify: `apps/web/CLAUDE.md`

- [ ] **Step 1: Actualizar la tabla "Tokens de diseño disponibles" con los nuevos hex**

En [apps/web/CLAUDE.md](apps/web/CLAUDE.md), reemplazar la tabla actual de tokens por:

```markdown
| Token Tailwind | Valor | Uso semántico |
|---------------|-------|---------------|
| `brand-primary` | `#012641` (Deep Space Blue) | Acción principal, iconos de navegación activos |
| `brand-primary-hover` | `#01365e` | Estado hover de acciones principales |
| `brand-danger` | `#EE005A` (Raspberry Red) | **Solo alertas clínicas críticas.** Errores genéricos de UI: `slate`. |
| `brand-danger-hover` | `#c4004a` | Estado hover de variantes danger |
| `brand-sidebar` | `#012641` | Fondo del sidebar (unificado con brand-primary) |
| `brand-bg` | `#f8f9fa` | Fondo de página |
| `brand-surface` | `#ffffff` | Fondo de tarjetas/paneles |
```

- [ ] **Step 2: Reemplazar la tabla "Componentes UI existentes" con la versión ampliada**

Reemplazar la tabla completa por:

```markdown
| Componente | Ubicación | Cuándo usarlo |
|-----------|-----------|--------------|
| `Button` | `src/components/ui/Button.tsx` | Toda acción interactiva. Variantes `primary` / `secondary` / `ghost` / `danger`, tamaños `sm` / `md` / `lg`. Prop `loading` para spinner + `aria-busy`. |
| `buttonVariants` | `src/components/ui/Button.tsx` | Helper para aplicar estilos de Button a `<Link>` u otros: `<Link className={buttonVariants({ variant: "primary", size: "lg" })}>`. |
| `AlertBanner` | `src/components/ui/AlertBanner.tsx` | Mensaje persistente inline (no transitorio). Variantes `critical` / `warning` / `info` / `error` / `success`. `critical` usa `role="alert"` + `aria-live="assertive"`. |
| `RiskBadge` | `src/components/ui/RiskBadge.tsx` | Badge para nivel de riesgo IA (`ALTO` / `MEDIO` / `BAJO`). `null` renderiza "Sin análisis". |
| `Card` | `src/components/ui/Card.tsx` | Contenedor de panel con borde y sombra |
| `Input` | `src/components/ui/Input.tsx` | Campos de texto del formulario |
| `PageContainer` | `src/components/ui/PageContainer.tsx` | Wrapper de página con padding y max-width |
| `PhantomButton` | `src/components/ui/PhantomButton.tsx` | Botón/link de feature no implementada (muestra toast) |
| `PhantomLink` | `src/components/ui/PhantomButton.tsx` | Link de feature no implementada |
| `SectionHeader` | `src/components/ui/SectionHeader.tsx` | Título + descripción de sección |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Badge de estado IA (`processing`, `ai_completed`, `ai_failed`, etc.) |
| `Table` | `src/components/ui/Table.tsx` | Tabla de datos con estilos consistentes |
```

- [ ] **Step 3: Insertar la sección de escala tipográfica**

Insertar este bloque nuevo **después** de la sección "Componentes UI existentes" y **antes** de "Patrón de página":

```markdown
## Escala tipográfica semántica

Tailwind 4 ya provee la escala completa. Esta guía indica **cuándo usar cada nivel**:

| Rol | Clases Tailwind |
|-----|----------------|
| H1 de página | `text-2xl font-bold text-slate-800` |
| H2 de sección | `text-sm font-semibold uppercase tracking-wider text-slate-500` |
| Título de card | `text-xl font-bold text-slate-800` |
| Body | `text-sm text-slate-600` |
| Caption / metadata | `text-xs text-slate-500` |
| Label de formulario | `text-sm font-medium text-slate-700` |

Si necesitas un nivel fuera de esta tabla, primero pregunta.
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/CLAUDE.md
git commit -m "docs: actualizar apps/web/CLAUDE.md con tipografía y nuevos componentes"
```

---

## ⏸️ Checkpoint 4

**Reportar al usuario:**
- ✅ 5 páginas migradas: login, dashboard, alertas, uploads, analyze
- ✅ `apps/web/CLAUDE.md` actualizado con escala tipográfica y `Button`/`buttonVariants`/`AlertBanner`/`RiskBadge`
- ✅ `RiskBadge` inline eliminado de `uploads/page.tsx` y reemplazado por import del componente compartido
- ✅ Todos los errores genéricos de UI ahora usan `<AlertBanner variant="error">` (slate, no rojo)
- ✅ Alertas clínicas usan `<AlertBanner variant="critical">` con `role="alert"` + `aria-live="assertive"`
- ✅ `npm run build` verde después de cada migración

**Esperar OK del usuario antes de avanzar a Sección 5 (WCAG sweep + verificación final).**

---

# Sección 5 — WCAG sweep + verificación de criterios

## Task 14: WCAG sweep con `/oncoscan-a11y` sobre cada archivo modificado

**Files a auditar (todos modificados en sub-proyecto B):**
- `apps/web/src/app/globals.css`
- `apps/web/src/components/ui/Button.tsx`
- `apps/web/src/components/ui/AlertBanner.tsx`
- `apps/web/src/components/ui/RiskBadge.tsx`
- `apps/web/src/components/ui/StatusBadge.tsx`
- `apps/web/src/components/ui/Input.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/platform/page.tsx`
- `apps/web/src/app/platform/alertas/page.tsx`
- `apps/web/src/app/platform/uploads/page.tsx`
- `apps/web/src/app/platform/analyze/page.tsx`

- [ ] **Step 1: Ejecutar `/oncoscan-a11y` archivo por archivo**

Para cada archivo de la lista, invocar el slash command:

```
/oncoscan-a11y <ruta-del-archivo>
```

Recopilar todos los hallazgos por severidad: **críticos**, **mayores**, **menores**.

- [ ] **Step 2: Resolver TODOS los hallazgos críticos antes de continuar**

Por cada hallazgo crítico:
1. Aplicar el fix recomendado.
2. Re-ejecutar `/oncoscan-a11y` sobre el archivo para confirmar.
3. `npm run build` para confirmar que el fix compila.

Hallazgos esperados que ya fueron prevenidos en las Tasks 2-13 (revisar que sigan así):
- Todos los iconos lucide decorativos: `aria-hidden="true"`
- AlertBanner critical: `role="alert"` + `aria-live="assertive"` + `aria-atomic="true"`
- RiskBadge: `aria-label="Riesgo {level}"`
- StatusBadge: `aria-label="Estado: {status}"`
- Sidebar: `<aside aria-label>` + `<nav aria-label>`
- Focus rings: Button, Input, Sidebar links, links de tabla

Hallazgos posibles que pueden surgir:
- **Contraste de `brand-danger` (#EE005A) como `text-brand-danger` sobre blanco en texto pequeño**. Ratio ≈ 4.1:1 → falla AA texto normal (necesita 4.5:1).
  - **Fix correcto:** si el audit lo flagea como crítico en algún uso legítimo (ej. el "Ver detalle" en `alertas/page.tsx` o el Score IA), ajustar el token `--color-brand-danger` globalmente en `globals.css` a `#D4004F` (~4.6:1, mantiene la identidad visual). Como todo usa el token, la propagación es automática.
  - **NO fix:** cambiar a `red-700` u otra variante Tailwind — eso reintroduce el problema que esta refactor resolvió.
- **Sidebar text-slate-400 sobre #012641**: verificar contraste. Si falla → `text-slate-300`.

- [ ] **Step 3: Documentar hallazgos menores como follow-up**

Para hallazgos menores/no críticos, anotarlos al final de este plan como "Follow-up post-implementación". No bloquean el sub-proyecto B.

- [ ] **Step 4: Test manual de navegación por teclado**

En cada una de las 5 páginas migradas (login, dashboard, alertas, uploads, analyze), correr `cd apps/web && npm run dev` y validar manualmente con el navegador:
1. Tab + Shift+Tab: orden lógico, foco siempre visible (anillo `brand-primary` o `white` sobre sidebar).
2. Enter sobre `<Button>` y `<Link>` ejecuta la acción.
3. Submit con Enter en formularios login y analyze.
4. Sidebar navegable enteramente por teclado.

Si algo falla, regresar y arreglar antes de continuar.

- [ ] **Step 5: (no commit aquí — el commit es Task 16, final)**

---

## Task 15: Verificación de los 10 criterios de éxito de la spec

- [ ] **Criterio 1: `npm run build` verde**

Run: `cd apps/web && npm run build`
Expected: build exitoso, sin errores TypeScript ni warnings nuevos.

- [ ] **Criterio 2: `npm run lint` verde**

Run: `cd apps/web && npm run lint`
Expected: lint exitoso, sin errores.

- [ ] **Criterio 3: cero `rose-*` en código**

Run: `grep -rn "rose-" apps/web/src` (desde la raíz del repo)
Expected: sin resultados. Si aparece algo, regresar y reemplazar.

- [ ] **Criterio 4: `red-[0-9]` solo en archivos legítimos**

Run: `grep -rn "red-[0-9]" apps/web/src`
Expected: si aparece algo, debe ser SOLO en `RiskBadge.tsx`, `StatusBadge.tsx` o `AlertBanner.tsx`. Cualquier ocurrencia en una página o en otros componentes debe migrarse a `brand-danger` o a `slate-*` según corresponda.

**Nota:** Revisar también que ninguno de los 3 componentes legítimos use shades de `red-*` Tailwind — `RiskBadge` usa `brand-danger`, `StatusBadge` usa `brand-danger`, `AlertBanner` usa `brand-danger` para critical y `slate-*` para error. Si el grep no devuelve nada en ningún sitio, mejor todavía.

- [ ] **Criterio 5: cero `bg-[#` hex hardcoded**

Run: `grep -rn "bg-\[#" apps/web/src`
Expected: sin resultados (eliminados `bg-[#1a0000]` de login y `bg-[#060606]` de sidebar).

- [ ] **Criterio 6: Componentes nuevos listados en `apps/web/CLAUDE.md`**

Verificar manualmente que `Button`, `buttonVariants`, `AlertBanner`, `RiskBadge` aparecen en la tabla de componentes del archivo `apps/web/CLAUDE.md`.

- [ ] **Criterio 7: render visual correcto**

`cd apps/web && npm run dev` y validar manualmente en navegador:
1. Login: sidebar-bg (Deep Space Blue) detrás del card, botón Iniciar Sesión Deep Space Blue.
2. Dashboard: sidebar Deep Space Blue, CTAs primary Deep Space Blue, card "Alertas Críticas" con acento Raspberry Red.
3. Alertas: banner contador con borde Raspberry Red e ícono AlertTriangle (cuando hay alertas).
4. Uploads: RiskBadge ALTO en Raspberry Red, botones header con variantes primary/secondary.
5. Analyze: botón Ejecutar análisis Deep Space Blue, error con AlertBanner slate.

- [ ] **Criterio 8: `/oncoscan-a11y` reporta cero críticos** (cubierto en Task 14)

- [ ] **Criterio 9: navegación por teclado funciona** (cubierto en Task 14 Step 4)

- [ ] **Criterio 10: commit final** (Task 16)

---

## Task 16: Commit final del sub-proyecto B

- [ ] **Step 1: Verificar que no quedan cambios sueltos sin commitear**

Run: `git status`
Expected: si hay cambios sin commitear de los fixes de Task 14, agregarlos.

```bash
git add -A apps/web/
git commit -m "feat: design system fundacional con paleta Deep Space Blue + Raspberry Red"
```

**Nota:** El sub-proyecto B se ha desarrollado en commits incrementales (uno por task). Este commit final solo agrupa los ajustes derivados del WCAG sweep que no hayan tenido su propio commit. Si todos los fixes ya están commiteados, este step es no-op (no crear commit vacío).

**Mensaje del commit alternativo si ya estaba todo commiteado:**

Si todos los WCAG fixes ya tienen commit, hacer un commit final consolidado **vacío en cambios pero documentado** con `git commit --allow-empty`:

```bash
git commit --allow-empty -m "feat: design system fundacional con paleta Deep Space Blue + Raspberry Red"
```

Esto deja un marcador claro de cierre del sub-proyecto B en el historial.

- [ ] **Step 2: Verificar el log**

Run: `git log --oneline -20`
Expected: ver la secuencia de commits del sub-proyecto B (tokens → Button → AlertBanner → RiskBadge → fixes → migraciones → docs → final).

---

## ⏸️ Checkpoint 5 (FINAL)

**Reportar al usuario:**
- ✅ Sweep WCAG completo sobre 12 archivos, hallazgos críticos resueltos
- ✅ Test manual de navegación por teclado en las 5 páginas migradas
- ✅ 10 criterios de éxito verificados:
  1. `npm run build` ✓
  2. `npm run lint` ✓
  3. `grep "rose-"` ✓ (vacío)
  4. `grep "red-[0-9]"` ✓ (solo en componentes legítimos o vacío)
  5. `grep "bg-\[#"` ✓ (vacío)
  6. Componentes nuevos documentados en `apps/web/CLAUDE.md` ✓
  7. Render visual ✓
  8. `/oncoscan-a11y` sin críticos ✓
  9. Navegación por teclado ✓
  10. Commit final ✓
- ✅ Sub-proyecto B completo. Sub-proyecto C (PhantomButtons → reales, server actions, error/loading boundaries) listo para empezar sobre esta base.

---

# Follow-up post-implementación (detectados durante ejecución 2026-05-17)

**Archivos fuera del scope original de la spec con `red-*` / hex hardcoded — pertenecen a sub-proyecto C:**

1. **`apps/web/src/app/page.tsx`** (landing pública). Tiene su propio sistema visual de marketing (navy `#020B2D` + cyan `#22AFFF`, 17 instancias de `bg-[#...]`, 1 de `red-*`). Decisión pendiente para C: ¿el landing usa los platform tokens o mantiene identidad de marketing separada? Si lo segundo, definir tokens `--color-landing-*` o documentar la excepción.
2. **`apps/web/src/app/platform/uploads/[id]/page.tsx`** (vista de detalle). Tema oscuro (`bg-slate-950`, white text, cards dark) — distinto al resto de la plataforma que es light. Tiene 5 ocurrencias de `red-*` y una función local `RiskBadge` (eliminada como dead code durante el sweep porque no se usaba). La página necesita rediseño completo a light theme + uso de `Card` + `PageContainer` para encajar con el resto. Trabajo de C.

**Componentes pendientes de migrar para sub-proyecto C (detectados visualmente con el dev server arriba):**

- `apps/web/src/app/platform/logout-button.tsx` ("Cerrar sesión" en el Header). Renderiza casi sin estilo visible (parece texto plano). Debe migrarse a `<Button variant="secondary" size="sm">` o `ghost` según el peso visual deseado en el Header.

**Cambios extra hechos durante el sweep (más allá de la spec original):**

- `apps/web/src/components/layout/Header.tsx`: `bg-rose-500` del indicador de notificación → `bg-brand-danger`. Estaba fuera de la lista de la spec pero violaba criterio 3 (cero `rose-*`).
- `apps/web/src/app/platform/upload/page.tsx`: migración completa (Link → buttonVariants, button raw → Button, error div → AlertBanner, `riskColor()` ahora usa `brand-danger` en vez de `red-*`). Estaba fuera de la lista de la spec pero pertenece visualmente al mismo sistema que las otras páginas de la plataforma.
- **Hotfix post-implementación**: el bloque `@media (prefers-color-scheme: dark)` que adaptaba `--color-brand-bg` y `--color-brand-surface` se eliminó. Razón: las páginas usan clases Tailwind hardcoded (`text-slate-800`, `text-slate-600`) sobre tokens que cambiaban a oscuro → texto invisible cuando el OS del usuario tiene dark mode. Se forzó `color-scheme: light` en `:root` siguiendo la decisión #7 de la spec (Epic/Cerner pattern: plataformas clínicas no aplican dark mode al contenido). Commit `9c4e3c9`.
- Fixes de lint pre-existentes (no relacionados al design system pero bloqueaban el criterio 2):
  - `apps/web/src/app/layout.tsx`: `Metadata` ahora tipa la exportación en vez de quedar import unused.
  - `apps/web/src/app/page.tsx`: comillas escapadas a `&ldquo;`/`&rdquo;`.
  - `apps/web/src/app/platform/analyze/[id]/page.tsx`: `useRef(Date.now())` impuro → `useRef(0)` con asignación en `useEffect`.
  - `apps/web/src/app/platform/uploads/[id]/page.tsx`: función local `RiskBadge` (dead code) eliminada.

**Lo que NO se hizo del WCAG sweep planificado en Task 14:**

- No se invocó el slash command `/oncoscan-a11y` archivo por archivo (es invocable por el usuario, no por el asistente desde el flujo). El usuario puede correrlo manualmente sobre los 12 archivos modificados; los cuidados estructurales (ARIA roles, aria-labels, aria-hidden en iconos, focus rings) ya están en el código.
- No se hizo test manual de teclado documentado (requiere interacción del usuario en el navegador con el dev server arriba).

Si el `/oncoscan-a11y` posterior flagea contraste de `brand-danger` (#EE005A, ~4.1:1 sobre blanco en texto pequeño): el fix recomendado en la spec es ajustar el token global a `#D4004F` (~4.6:1). Propagación automática vía el token.
