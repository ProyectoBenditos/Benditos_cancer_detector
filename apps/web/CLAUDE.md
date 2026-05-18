# apps/web — Contexto de UI para Claude Code

## Tokens de diseño disponibles (`globals.css`)

| Token Tailwind | Valor | Uso semántico |
|---------------|-------|---------------|
| `brand-primary` | `#012641` (Deep Space Blue) | Acción principal, iconos de navegación activos |
| `brand-primary-hover` | `#01365e` | Estado hover de acciones principales |
| `brand-danger` | `#EE005A` (Raspberry Red) | **Solo alertas clínicas críticas.** Errores genéricos de UI: `slate`. |
| `brand-danger-hover` | `#c4004a` | Estado hover de variantes danger |
| `brand-sidebar` | `#012641` | Fondo del sidebar (unificado con brand-primary) |
| `brand-bg` | `#f8f9fa` | Fondo de página |
| `brand-surface` | `#ffffff` | Fondo de tarjetas/paneles |

**Regla de color:** El rojo (`brand-danger`) está reservado para alertas clínicas. Un error de validación de formulario, un 404, o un toast de error genérico usan `slate` o variantes neutras.

## Componentes UI existentes

Antes de crear un componente nuevo, revisar esta tabla:

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

**Regla:** Si el componente que necesitas no está aquí, pregunta antes de inventar uno nuevo.

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

## Patrón de página

```tsx
// Estructura obligatoria de toda página de plataforma
export default function MiPagina() {
  return (
    <PageContainer>
      <SectionHeader title="Título" description="Descripción opcional" />
      {/* contenido */}
    </PageContainer>
  );
}
```

## Server vs Client Components

- **Server Component por defecto.** Sin `"use client"` a menos que haya estado local, efectos o event handlers.
- Auth gate ya está en `platform/layout.tsx` — no re-validar en cada página.
- Data fetching: usar `createClient()` de `@/utils/supabase/server` directamente en el Server Component. No agregar react-query ni SWR sin discutir.

## Forms

Usar **server actions**, no `useState` para flujo de datos. Ejemplo:

```tsx
// ✅ Correcto
async function submitForm(formData: FormData) {
  "use server";
  // ...
}

// ❌ Evitar para data flow
const [data, setData] = useState(null);
```

## Loading / Error / Empty states

Cada ruta debe tener al lado del `page.tsx`:

- `loading.tsx` — skeleton o spinner
- `error.tsx` — mensaje de error con botón de retry
- Empty state con CTA dentro del `page.tsx`

## Toasts (sonner)

| Severidad | Función sonner | ARIA |
|----------|---------------|------|
| Info / Éxito | `toast.success()` / `toast.info()` | `role="status"` |
| Error genérico | `toast.error()` | `role="alert"` |
| Alerta clínica crítica | **NO usar toast** — usar componente de alerta inline con `role="alert"` + `aria-live="assertive"` |

## Iconos

Solo `lucide-react`. No agregar otras librerías de iconos.

Regla de accesibilidad:
- Icono decorativo: `aria-hidden="true"`
- Icono como única etiqueta visual: `aria-label="descripción"`

## PhantomButton / PhantomLink

Son botones/links de features no implementadas que muestran un toast informativo. **No hacerlos funcionales sin pedirlo al usuario.** Confirmar siempre antes de convertir un Phantom en funcionalidad real.

## No agregar sin discutir

- Librerías de animación (Framer Motion, etc.)
- CSS-in-JS
- UI kits (shadcn/ui, MUI, Ant Design, etc.)
- Nuevas librerías de estado (Zustand, Jotai, etc.)
