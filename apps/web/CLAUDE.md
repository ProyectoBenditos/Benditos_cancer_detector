# apps/web — Contexto de UI para Claude Code

## Tokens de diseño disponibles (`globals.css`)

| Token Tailwind | Valor | Uso semántico |
|---------------|-------|---------------|
| `brand-primary` | `#1e3a8a` | Acción principal, iconos de navegación activos |
| `brand-primary-hover` | `#1e40af` | Estado hover de acciones principales |
| `brand-danger` | `#e11d48` | **Solo alertas clínicas críticas.** Errores genéricos de UI: `slate`. |
| `brand-sidebar` | `#0a0a0a` | Fondo del sidebar |
| `brand-bg` | `#f8f9fa` | Fondo de página |
| `brand-surface` | `#ffffff` | Fondo de tarjetas/paneles |

**Regla de color:** El rojo (`brand-danger`) está reservado para alertas clínicas. Un error de validación de formulario, un 404, o un toast de error genérico usan `slate` o variantes neutras.

## Componentes UI existentes

Antes de crear un componente nuevo, revisar esta tabla:

| Componente | Ubicación | Cuándo usarlo |
|-----------|-----------|--------------|
| `Card` | `src/components/ui/Card.tsx` | Contenedor de panel con borde y sombra |
| `Input` | `src/components/ui/Input.tsx` | Campos de texto del formulario |
| `PageContainer` | `src/components/ui/PageContainer.tsx` | Wrapper de página con padding y max-width |
| `PhantomButton` | `src/components/ui/PhantomButton.tsx` | Botón/link de feature no implementada (muestra toast) |
| `PhantomLink` | `src/components/ui/PhantomButton.tsx` | Link de feature no implementada |
| `SectionHeader` | `src/components/ui/SectionHeader.tsx` | Título + descripción de sección |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Badge de estado IA (`processing`, `ai_completed`, `ai_failed`) |
| `Table` | `src/components/ui/Table.tsx` | Tabla de datos con estilos consistentes |

**Regla:** Si el componente que necesitas no está aquí, pregunta antes de inventar uno nuevo.

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
