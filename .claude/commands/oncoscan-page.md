---
description: Crea o refactoriza una página de la plataforma OncoScan siguiendo los patrones de Next.js App Router
argument-hint: <ruta/de/la/pagina>
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Voy a crear o refactorizar la página `$ARGUMENTS` para OncoScan.

**Paso 1 — Contexto previo** (leer antes de preguntar)

- `apps/web/CLAUDE.md` — patrones de página, server vs client, data fetching
- `apps/web/src/app/platform/layout.tsx` — auth gate y layout existente
- Si la ruta ya existe: leer el `page.tsx` actual y los archivos al lado

**Paso 2 — Brainstorming corto** (usar skill `superpowers:brainstorming`)

Una sola ronda de preguntas al usuario:
1. ¿Qué datos muestra esta página? ¿De qué tabla/s de Supabase?
2. ¿Tiene formulario? ¿Qué acciones del usuario dispara?
3. ¿Hay algún estado de carga o error especial que considerar?

**Paso 3 — Implementar** (usar skill `maestro:coder`)

Estructura obligatoria en `apps/web/src/app/$ARGUMENTS/`:

```
page.tsx       ← Server Component por defecto
loading.tsx    ← Skeleton o spinner
error.tsx      ← Mensaje de error + botón retry
```

Patrones que deben cumplirse:

- `"use client"` solo si hay estado local, efectos o event handlers
- Auth gate ya está en `platform/layout.tsx` — NO repetir validación de auth
- Data fetching con `createClient()` de `@/utils/supabase/server` directo en el Server Component
- Forms con server actions, no `useState` para data flow
- Empty state con CTA cuando no hay datos
- Estructura: `<PageContainer> → <SectionHeader> → contenido`
- Rojo (`brand-danger`) solo para alertas clínicas críticas

**Paso 4 — Code review** (usar skill `maestro:code-review`)

Verificar antes de entregar:
- No hay PHI en `console.log`
- No hay URLs de Storage expuestas al cliente
- Acciones destructivas (eliminar, sobreescribir) tienen confirmación del usuario
- Resultados de IA incluyen disclaimer "herramienta de apoyo, no sustituye criterio clínico"
