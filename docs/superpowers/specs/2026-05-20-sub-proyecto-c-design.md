# Sub-proyecto C — Cierre de follow-ups + merge de fronted-nicolas

**Fecha:** 2026-05-20
**Plan ejecutable:** [`../plans/2026-05-20-sub-proyecto-c.md`](../plans/2026-05-20-sub-proyecto-c.md)
**Jira destino (al cierre):** `docs/jira/sub-proyecto-c-follow-ups.md`
**Depende de:** Sub-proyectos A y B (mergeados a `main`)
**Rama de trabajo:** `merge/fronted-nicolas-into-main` (desde `main`)

---

## Motivación

Cerrar los follow-ups documentados en `docs/jira/sub-proyecto-b-design-system.md` y a la vez incorporar el trabajo paralelo de la rama `fronted-nicolas` (autor: Nicolás Chávez / `craxker07`, commit `19f1d78` del 2026-05-18) que aporta tres páginas nuevas (Modelo, Reportes, Reportes/download) y mejoras a uploads (search + case_ref). Las dos ramas divergieron antes del design system, por lo que un `git merge` directo produce 4 archivos en conflicto. Estrategia: **merge conceptual** sobre `main` (extraer features, reskinear al design system, commits con `Co-Authored-By: craxker07`).

## Alcance final (decisiones cerradas por el usuario, 2026-05-20)

### Sección 0 — Merge conceptual de `fronted-nicolas`

| Item | Decisión |
|------|---------|
| Estrategia de merge | Merge conceptual sobre `main`; sin `git merge` literal |
| `Modelo/page.tsx` (Nicolás menciona ISIC/EfficientNet — cáncer de piel) | **Dejar contenido como está**, solo reskinear visualmente. Riesgo asumido: queda contenido inexacto que tendrá que validar Luis (AI Engineer) en sub-proyecto D. Se documenta como follow-up explícito. |
| `Reportes/page.tsx` | Adoptar reskineado al design system (eliminar `slate-900`, `sky-400`, `red-50`; usar `Card`, `Button`, tokens `brand-*`). |
| `Reportes/download/route.ts` | Adoptar tal cual; verificar que RLS de Supabase está activa en `dicom_uploads` para que el CSV solo contenga registros del usuario. |
| Dashboard rediseñado | Adoptar estructura nueva de Nicolás (Hero banner + 4 KPIs reales + Actividad reciente + 3 Acciones rápidas) reskineada al design system. Elimina las cards "Módulos Inteligentes (Próximamente)" dummy del main actual. |
| Header — eliminar campana | Aplicar el cambio. Resuelve el Phantom `Notificaciones` por eliminación. |
| Sidebar — link a Reportes | Aplicar. Reemplaza el Phantom `Exportar Reportes` con Link real a `/platform/reportes`. |
| Sidebar — link a Modelo IA | Aplicar. Nuevo Link a `/platform/modelo`. |
| Uploads — búsqueda por nombre y referencia | Portar al `uploads/page.tsx` actual de main. **Fix obligatorio**: escapar comas y `%` en `term` antes de pasarlo a `.or()` para cerrar el riesgo de filter injection en Supabase. |
| Uploads detail — campo case_ref | Portar el bloque al rediseño de `uploads/[id]/page.tsx` (Sección 4). Limpiar los comentarios `// DESPUÉS — agrega...` que Nicolás dejó dentro del JSX y que renderizarían como texto literal. |

### Sección 1 — LogoutButton + página `/platform/ajustes`

| Item | Decisión |
|------|---------|
| LogoutButton | Migrar al design system: `<Button variant="danger" size="sm">`. Eliminar las clases `border-slate-700`, `text-slate-200`, `hover:bg-slate-900` (dark theme). |
| Ubicación de LogoutButton | Mover del `Header` a la nueva página `/platform/ajustes`. El Header queda con solo avatar + email + rol. |
| `/platform/ajustes` | Nueva página Server Component. Muestra email del usuario autenticado, rol fijo "Médico", botón Cerrar sesión, bloque "Preferencias (próximamente)" con explicación. |
| Sidebar `Ajustes` Phantom | Reemplazar `PhantomLink` por `Link href="/platform/ajustes"`. |

### Sección 2 — `error.tsx` y `loading.tsx`

| Item | Decisión |
|------|---------|
| Granularidad de error | **Un solo `error.tsx`** en `apps/web/src/app/platform/error.tsx` que captura todos los errores de la plataforma. Usa `AlertBanner variant="error"` + `<Button onClick={reset}>Reintentar</Button>`. |
| Granularidad de loading | **Un `loading.tsx` por ruta** con skeleton específico al contenido esperado. Total: 10 archivos (`/platform`, `/upload`, `/uploads`, `/uploads/[id]`, `/analyze`, `/analyze/[id]`, `/alertas`, `/ajustes`, `/reportes`, `/modelo`). |
| Diseño de skeletons | Usar `animate-pulse` de Tailwind sobre divs grises (`bg-slate-200`). Skeletons reflejan la estructura real (tabla → filas; cards → cards; detail → bloques). |

### Sección 3 — Refactor de `analyze/page.tsx` a Server Component

| Item | Decisión |
|------|---------|
| Alcance | **Full refactor**: `page.tsx` queda Server Component limpio. La forma se extrae a `AnalyzeForm.tsx` Client Component que usa `useActionState`. La acción `analyzeAction` en `actions.ts` valida, llama a FastAPI server-side con el bearer del session, y hace `redirect()` al resultado. |
| Sesión server-side | `createClient()` de `@/utils/supabase/server`, `supabase.auth.getSession()` para obtener `access_token` que se pasa al backend FastAPI vía `Authorization: Bearer ...`. |
| API URL | `NEXT_PUBLIC_API_URL` se sigue usando (es la misma variable que ya existe). Se mantiene como `NEXT_PUBLIC_*` para no romper otros archivos. **Nota**: idealmente sería `API_URL` server-only, pero ese rename es follow-up para D. |
| Error UI | Estado `{ error?: string }` devuelto por `useActionState`; cuando no es `undefined`, render `<AlertBanner variant="error">`. Sin `useState` para data flow. |

### Sección 4 — Rediseño de `uploads/[id]/page.tsx` a light theme

| Item | Decisión |
|------|---------|
| Alcance | **Rediseño completo**: reescribir usando `PageContainer`, `SectionHeader`, `Card`, `RiskBadge`, `StatusBadge`, `Button`/`buttonVariants`, tokens `brand-*`. |
| Estructura | 4 bloques: (a) header con título + back link; (b) tarjeta resultado IA con `RiskBadge`, score, modelo, recomendación; (c) tarjeta info del archivo con `case_ref` integrado desde la idea de Nicolás; (d) tarjeta features clínicas si existen. |
| Storage path | Mantener visible solo el path relativo, sin convertir a signed URL desde el cliente (regla PHI). |
| Estado `error` y `!isAnalyzed` | Usar `AlertBanner variant="error"` / `variant="warning"` en lugar de divs custom. |

### Sección 5 — Landing `app/page.tsx`: adoptar tokens platform

| Item | Decisión |
|------|---------|
| Estrategia | **Adoptar tokens platform**. La paleta marketing (navy `#020B2D` + cyan `#22AFFF`) se reemplaza por la paleta clínica (Deep Space Blue `#012641` + Raspberry Red `#EE005A`). Cambio visual fuerte: la landing pierde el cyan, gana el raspberry. |
| Mapeo de sustitución | `bg-[#020B2D]` → `bg-brand-primary` · `bg-[#010619]` → `bg-slate-950` (variante más oscura para alternar) · `text-[#22AFFF]` → `text-brand-danger` (raspberry como accent) · `bg-[#22AFFF]/20` → `bg-brand-danger/20` · gradient `from-[#22AFFF] to-cyan-300` → `from-brand-danger to-rose-300` · borders `#22AFFF/40` → `border-brand-danger/40` |
| Glow effect en hero | Mantener; cambia color de `bg-[#22AFFF]/20 blur-[120px]` a `bg-brand-danger/20 blur-[120px]`. Visualmente más rojizo/cálido. |
| Mantener | Estructura de secciones (Nav, Hero, About, Features, Architecture, Research, Team, GitHub, Roadmap, Footer). Imágenes (`hero-dashboard.png`, logos). Tipografía. |

### Sección 6 — A11y sweep + contraste de `brand-danger` (contingente)

| Item | Decisión |
|------|---------|
| Sweep | El plan documenta los archivos a auditar y le pide al usuario ejecutar `/oncoscan-a11y` (no se invoca automáticamente — requiere usuario). |
| Contraste `brand-danger` (#EE005A ≈ 4.1:1 sobre blanco) | **Contingente**: si el sweep flagea el color para texto pequeño, cambiar token a `#D4004F` (~4.6:1) en `globals.css`. Propagación automática. |
| Cualquier otro finding | Se documenta como follow-up para sub-proyecto D. Sub-proyecto C no se compromete a arreglarlos todos. |

### Sección 7 — Cierre

| Item | Decisión |
|------|---------|
| Commit final | `feat: sub-proyecto C — merge de fronted-nicolas + ajustes + analyze refactor + uploads detail + landing reskin + error/loading boundaries` |
| Jira | `docs/jira/sub-proyecto-c-follow-ups.md` con resumen, alcance, commits, follow-ups para D. |
| Merge a main | Fast-forward o PR (decide el usuario al final). |

## Co-authorship con Nicolás

Los commits que adopten cambios de `fronted-nicolas` (Sección 0) usan el trailer:

```
Co-Authored-By: Nicolás Chávez Oliveros <nicolaker031@gmail.com>
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## Reglas inviolables (de CLAUDE.md raíz)

1. **No tocar backend FastAPI ni schema de Supabase.** Toda la integración con FastAPI se hace vía `fetch` server-side con bearer del session. Toda la lectura de Supabase usa el client del usuario (RLS aplica).
2. **No loguear PHI**: no usar `console.log`/`console.error` con `email`, `Case_Ref`, `result_json`, `storage_path`, rutas DICOM, predicción IA.
3. **No exponer URLs de Storage al cliente** sin signed URL server-side. En el rediseño de `uploads/[id]/page.tsx`, el `storage_path` se muestra como texto monoespaciado, no como link descargable.
4. **PhantomButtons confirmados uno a uno antes de activar.** Decisiones tomadas:
   - `Notificaciones` → eliminado (Nicolás)
   - `Exportar Reportes` (sidebar) → activado → `/platform/reportes`
   - `Configurar Reportes` (dashboard) → reemplazado por card "Exportar Reportes" del dashboard nuevo
   - `Pacientes Registrados` → **mantener como Phantom** (sin schema)
   - `Ajustes` → activado → `/platform/ajustes`
5. **Sin librerías nuevas.** Todo se hace con stack actual.

## Riesgos abiertos

| Riesgo | Mitigación |
|--------|-----------|
| Contenido inexacto en `Modelo/page.tsx` (ISIC/EfficientNet en vez de LIDC/CT) | Documentado como follow-up D. El usuario aceptó el riesgo. Sugerencia: agregar disclaimer en la página "Contenido pendiente de validación del AI Engineer". |
| RLS de Supabase en `dicom_uploads` podría no filtrar por user_id | Sección 0 incluye task de verificación: leer la policy en Supabase studio (manualmente por el usuario, fuera del plan automático) antes de mergear Reportes/download. |
| Filter injection en `.or()` de uploads search | Sección 0 incluye fix: escapar `,` `%` `(` `)` del término antes de interpolarlo. |
| Adoptar tokens platform en landing rompe la estética marketing | Decisión del usuario aceptada. Reversible: si después del cambio se ve mal, se restaura desde el commit anterior y se reabre la decisión en D. |
| Contraste `brand-danger` puede no pasar WCAG AA | Contingencia en Sección 6: ajustar a `#D4004F`. |

## Verificación

Como en sub-proyecto B, no hay test runner en el repo. Las verificaciones son:

```bash
cd apps/web
npm run build          # debe pasar sin errores TS ni warnings
npm run lint           # debe pasar sin nuevos errores
```

Y los grep gates (cero hits esperados después de Sub-proyecto C):

```bash
# Plataforma clínica: cero red-* y cero bg-[#...]
grep -rn "rose-" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login
grep -rn "red-[0-9]" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login
grep -rn "bg-\[#" apps/web/src/app/platform apps/web/src/components apps/web/src/app/login

# Landing: cero bg-[#...] después de adoptar tokens
grep -rn "bg-\[#" apps/web/src/app/page.tsx
grep -rn "text-\[#" apps/web/src/app/page.tsx
grep -rn "#020B2D\|#010619\|#22AFFF\|#1a8ce6" apps/web/src/app/page.tsx
```

Y manual:

- Abrir cada ruta `/platform/*` en el navegador. Verificar que renderiza, que loading.tsx aparece brevemente, y que un error simulado activa error.tsx.
- Probar el flujo de analyze: subir imagen, ver errores de validación, ver redirect a resultado.
- Probar export CSV: descargar los 4 tipos de reporte y revisar que solo contiene registros del usuario actual.
- `/oncoscan-a11y` manual sobre los archivos nuevos.

## Fuera de scope (Sub-proyecto D)

- Reescribir contenido de `Modelo/page.tsx` con info real validada por Luis (AI Engineer).
- Migración de `NEXT_PUBLIC_API_URL` a env server-only.
- Implementación real de "Pacientes Registrados" (requiere schema).
- Implementación de "Preferencias" dentro de `/platform/ajustes`.
- Notificaciones reales (in-app o push).
- Tests automatizados.
- Activar políticas RLS adicionales si el audit de PHI lo requiere.

---

## Issues cubiertos

- **KAN-42** — Columnas de riesgo/score en historial DICOM.
- **KAN-43** — Vista de detalle del resultado IA + parámetros + estado.
- **KAN-45** — Sistema de diseño fundacional (follow-ups del sub-proyecto B integrados aquí: Phantoms aprobados, refactor `analyze` a Server Component, `uploads/[id]` a light theme, `error.tsx`/`loading.tsx` por ruta).

Trazabilidad complementaria en [`docs/psp/traceability-matrix.md`](../../psp/traceability-matrix.md).
