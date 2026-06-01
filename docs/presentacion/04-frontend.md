# Rol: Frontend

> **Leer primero:** [00-comun.md](00-comun.md)

---

## Misión en la defensa

Explicar **la arquitectura de la UI**, el sistema de rutas de Next.js App Router, los componentes reutilizables, cómo funciona la autenticación en el cliente, y los patrones de diseño (tokens, Server Components, Server Actions).

---

## Archivos / rutas clave

| Archivo / carpeta | Descripción |
|-------------------|-------------|
| [apps/web/src/app/](../../apps/web/src/app/) | App Router — todas las rutas y páginas |
| [apps/web/src/app/platform/layout.tsx](../../apps/web/src/app/platform/layout.tsx) | Auth gate + Sidebar + Header para toda la plataforma |
| [apps/web/src/app/platform/upload/page.tsx](../../apps/web/src/app/platform/upload/page.tsx) | Flujo principal: subir DICOM + análisis IA |
| [apps/web/src/app/platform/uploads/page.tsx](../../apps/web/src/app/platform/uploads/page.tsx) | Historial de estudios subidos |
| [apps/web/src/app/platform/pacientes/](../../apps/web/src/app/platform/pacientes/) | Gestión de pacientes |
| [apps/web/src/components/ui/](../../apps/web/src/components/ui/) | Componentes UI reutilizables |
| [apps/web/src/app/globals.css](../../apps/web/src/app/globals.css) | Design tokens (CSS custom properties) |
| [apps/web/CLAUDE.md](../../apps/web/CLAUDE.md) | Convenciones de UI del proyecto |

---

## Mapa de rutas

| Ruta | Descripción | Auth |
|------|-------------|------|
| `/` | Landing page pública | No |
| `/login` | Inicio de sesión | No |
| `/signup` | Registro de médico | No |
| `/cuenta-pendiente` | Médico registrado, esperando aprobación | No |
| `/platform` | Dashboard principal | Sí (aprobado) |
| `/platform/upload` | **Flujo principal:** subir DICOM + análisis IA | Sí |
| `/platform/analyze` | Redirige a `/platform/upload` | Sí |
| `/platform/analyze/[id]` | Resultado de análisis por ID | Sí |
| `/platform/uploads` | Historial de estudios | Sí |
| `/platform/uploads/[id]` | Detalle de un estudio | Sí |
| `/platform/alertas` | Alertas clínicas | Sí |
| `/platform/reportes` | Reportes | Sí |
| `/platform/modelo` | Info del modelo IA activo | Sí |
| `/platform/ajustes` | Ajustes de cuenta | Sí |
| `/platform/pacientes` | Lista de pacientes | Sí |
| `/platform/pacientes/nuevo` | Registrar nuevo paciente | Sí |
| `/platform/pacientes/[id]` | Detalle de paciente | Sí |
| `/platform/admin/medicos` | Admin: lista de médicos | Admin |
| `/platform/admin/medicos/[id]` | Admin: aprobar/rechazar médico | Admin |

---

## Auth gate (platform/layout.tsx)

```tsx
// Verifica sesión server-side en CADA petición a /platform/*
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const { data: profile } = await supabase.from("profiles").select("role, status")...
if (!profile || (profile.status !== "approved" && profile.role !== "admin"))
  redirect("/cuenta-pendiente");
```

Una vez dentro del layout, no se re-valida en cada página individual — el auth gate está centralizado.

---

## Componentes UI reutilizables (`src/components/ui/`)

| Componente | Cuándo usarlo |
|------------|---------------|
| `Button` | Toda acción interactiva. Props: `variant`, `size`, `loading` |
| `buttonVariants` | Aplicar estilos de Button a `<Link>` |
| `AlertBanner` | Mensajes persistentes inline. Variantes: `critical`, `warning`, `info`, `error`, `success` |
| `RiskBadge` | Badge de nivel de riesgo IA (`ALTO`/`MEDIO`/`BAJO`) |
| `Card` / `CardContent` | Contenedor de panel |
| `PageContainer` | Wrapper de página con padding y max-width |
| `SectionHeader` | Título + descripción de sección |
| `StatusBadge` | Estado del análisis (`processing`, `ai_completed`, `ai_failed`) |
| `Table` | Tabla de datos |

---

## Design Tokens

Definidos en `globals.css` como CSS custom properties, consumidos via Tailwind 4:

| Token Tailwind | Valor hex | Uso semántico |
|----------------|-----------|---------------|
| `brand-primary` | `#012641` | Acciones principales, sidebar, iconos activos |
| `brand-danger` | `#EE005A` | **Solo alertas clínicas críticas** |
| `brand-bg` | `#f8f9fa` | Fondo de página |
| `brand-surface` | `#ffffff` | Fondo de tarjetas |

**Regla de color clave:** el rojo (`brand-danger`) está **reservado** para alertas clínicas (nivel de riesgo ALTO). Errores de UI genéricos usan `slate`.

---

## Server Components vs Client Components

- **Server Component por defecto** (sin `"use client"`): las páginas que solo leen datos y renderizan HTML.
- **Client Component** (`"use client"`): cuando hay estado local, efectos o event handlers (ejemplo: `/platform/upload/page.tsx` maneja formularios con estado).
- **Auth**: `createClient()` de `@/utils/supabase/server` en Server Components; `createClient()` de `@/utils/supabase/client` en Client Components.

---

## Server Actions

Para formularios simples (sin estado interactivo complejo) se usa Server Actions:

```tsx
async function submitForm(formData: FormData) {
  "use server";
  const supabase = await createClient();
  // operación server-side directa
}
```

No se usa React Query, SWR ni Zustand — se mantiene el stack mínimo.

---

## Preguntas probables + respuesta

**¿Qué es App Router vs Pages Router?**
> App Router (Next.js 13+) usa el sistema de archivos para definir rutas. Cada carpeta puede tener `page.tsx` (ruta), `layout.tsx` (wrapper compartido), `loading.tsx` (skeleton) y `error.tsx` (estado de error). Es más cercano a React Server Components puros.

**¿Por qué no usan Redux o Zustand?**
> El estado del MVP no lo requiere. Server Components obtienen datos directamente, y los formularios usan Server Actions. El único estado local está en componentes interactivos como el upload.

**¿Cómo manejan el color rojo para alertas?**
> `brand-danger` solo se usa para alertas clínicas críticas (nivel de riesgo ALTO). Cualquier otro error de UI usa `slate` para no trivializar el color de alerta médica.

**¿Qué pasa cuando el médico no está aprobado?**
> El `platform/layout.tsx` detecta `status !== "approved"` y redirige a `/cuenta-pendiente`. El médico ve una página informativa hasta que el admin lo apruebe.

---

## Comandos que debes saber demostrar

```bash
# Levantar el frontend en desarrollo
cd apps/web
npm run dev
# Abre http://localhost:3000

# Correr tests
npm run test

# Build de producción (verifica que compila)
npm run build

# Ver estructura de rutas
ls apps/web/src/app/platform/
```
