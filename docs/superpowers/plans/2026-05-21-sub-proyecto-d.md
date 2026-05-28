# Sub-proyecto D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar 5 follow-ups ejecutables de seguridad, a11y y exactitud clínica del sub-proyecto C; documentar 2 items de deuda técnica pendientes de decisión del equipo.

**Architecture:** Cambios quirúrgicos en 4 archivos del frontend sin dependencias entre ellos. Items 6 y 7 son decisiones de arquitectura documentadas pero sin código hasta obtener aprobación del equipo.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind 4 / Supabase SSR / lucide-react

---

## Mapa de archivos

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/app/platform/analyze/actions.ts:75` | Renombrar `NEXT_PUBLIC_API_URL` → `API_URL` |
| `apps/web/src/app/platform/reportes/download/route.ts:13` | Agregar filtro `.eq("user_id", user.id)` |
| `apps/web/src/app/platform/modelo/page.tsx:15-20,130-138` | Fortalecer disclaimer + reemplazar raw div por `AlertBanner` |
| `apps/web/src/app/platform/analyze/AnalyzeForm.tsx:59-79` | Envolver grid de features en `<fieldset>/<legend>` |

---

### Task 1: Renombrar NEXT_PUBLIC_API_URL → API_URL en actions.ts

**Files:**
- Modify: `apps/web/src/app/platform/analyze/actions.ts:75`

**Contexto:** `actions.ts` tiene `"use server"` — nunca se bundlea al cliente. Usar `NEXT_PUBLIC_` en una server action es innecesario. `upload/page.tsx` y `analyze/[id]/page.tsx` son `"use client"` y siguen necesitando `NEXT_PUBLIC_API_URL`; esos archivos quedan intactos.

- [ ] **Paso 1: Cambiar el env var en actions.ts**

  En `apps/web/src/app/platform/analyze/actions.ts`, línea 75, cambiar:
  ```ts
  `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analysis/predict`,
  ```
  por:
  ```ts
  `${process.env.API_URL}/api/v1/analysis/predict`,
  ```

- [ ] **Paso 2: Agregar API_URL a .env.local**

  En `apps/web/.env.local`, agregar una línea nueva:
  ```
  API_URL=<mismo valor que NEXT_PUBLIC_API_URL>
  ```
  **No eliminar** `NEXT_PUBLIC_API_URL` — lo siguen usando `upload/page.tsx` y `analyze/[id]/page.tsx`.

- [ ] **Paso 3: Verificar build**

  ```
  cd apps/web && npm run build
  ```
  Expected: sin errores TypeScript.

- [ ] **Paso 4: Commit**

  ```
  git add apps/web/src/app/platform/analyze/actions.ts
  git commit -m "fix: actions.ts usa API_URL server-only en lugar de NEXT_PUBLIC_API_URL"
  ```

---

### Task 2: Defense-in-depth en reportes/download/route.ts

**Files:**
- Modify: `apps/web/src/app/platform/reportes/download/route.ts:13`

**Contexto:** La ruta autentica al usuario con `supabase.auth.getUser()` pero la query no incluye `.eq("user_id", user.id)` — depende 100% de RLS. Si la policy de Supabase está deshabilitada o mal configurada, devuelve registros de todos los usuarios. El filtro explícito añade defensa en profundidad.

**RLS esperado en Supabase (verificar manualmente en el dashboard de Supabase > Authentication > Policies > tabla `dicom_uploads`):**
```sql
CREATE POLICY "select_own_uploads" ON public.dicom_uploads
  FOR SELECT
  USING (auth.uid() = user_id);
```

- [ ] **Paso 1: Agregar filtro user_id a la query**

  En `apps/web/src/app/platform/reportes/download/route.ts`, cambiar el bloque de líneas 13-16:
  ```ts
  let query = supabase
      .from("dicom_uploads")
      .select("id, original_name, modality, study_date, ai_risk_level, ai_score, ai_recommendation, ai_model_version, upload_status, created_at, metadata_json")
      .order("created_at", { ascending: false });
  ```
  por:
  ```ts
  let query = supabase
      .from("dicom_uploads")
      .select("id, original_name, modality, study_date, ai_risk_level, ai_score, ai_recommendation, ai_model_version, upload_status, created_at, metadata_json")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
  ```

- [ ] **Paso 2: Verificar build**

  ```
  cd apps/web && npm run build
  ```
  Expected: sin errores TypeScript.

- [ ] **Paso 3: Commit**

  ```
  git add apps/web/src/app/platform/reportes/download/route.ts
  git commit -m "fix: filtro user_id explicito en CSV export como defense-in-depth"
  ```

---

### Task 3: modelo/page.tsx — AlertBanner + disclaimer AI Engineer

**Files:**
- Modify: `apps/web/src/app/platform/modelo/page.tsx`

Sub-cambios en orden: (a) fortalecer disclaimer superior, (b) reemplazar raw div "Aviso Clínico", (c) limpiar import.

- [ ] **Paso 1: Fortalecer el disclaimer superior (líneas 15-20)**

  Cambiar:
  ```tsx
  <AlertBanner
      variant="warning"
      title="Contenido pendiente de validación clínica"
      description="La información técnica de esta página está pendiente de revisión por el equipo de IA del proyecto. No usar como referencia para decisiones clínicas reales."
      className="mb-6"
  />
  ```
  por:
  ```tsx
  <AlertBanner
      variant="warning"
      title="Contenido pendiente de validación clínica"
      description="Información técnica pendiente de validación por el AI Engineer del proyecto. No usar como referencia para decisiones clínicas reales."
      className="mb-6"
  />
  ```

- [ ] **Paso 2: Reemplazar raw div "Aviso Clínico" (líneas 129-138)**

  Cambiar el bloque completo:
  ```tsx
  {/* Aviso clínico */}
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
          <p className="text-sm font-bold text-amber-800 mb-1">Aviso Clínico Importante</p>
          <p className="text-sm text-amber-700">
              Este sistema es exclusivamente una <strong>herramienta de apoyo diagnóstico</strong>. Los resultados del modelo IA no constituyen diagnóstico médico definitivo y no deben reemplazar el juicio clínico del especialista. Todo resultado debe ser validado por un profesional de salud calificado antes de tomar decisiones terapéuticas.
          </p>
      </div>
  </div>
  ```
  por:
  ```tsx
  {/* Aviso clínico */}
  <AlertBanner
      variant="warning"
      title="Aviso Clínico Importante"
      description="Este sistema es exclusivamente una herramienta de apoyo diagnóstico. Los resultados del modelo IA no constituyen diagnóstico médico definitivo y no deben reemplazar el juicio clínico del especialista. Todo resultado debe ser validado por un profesional de salud calificado antes de tomar decisiones terapéuticas."
  />
  ```

- [ ] **Paso 3: Limpiar import — eliminar AlertTriangle (línea 5)**

  Cambiar:
  ```tsx
  import { Brain, Database, BarChart3, ShieldCheck, AlertTriangle, Layers } from "lucide-react";
  ```
  por:
  ```tsx
  import { Brain, Database, BarChart3, ShieldCheck, Layers } from "lucide-react";
  ```

- [ ] **Paso 4: Verificar build**

  ```
  cd apps/web && npm run build
  ```
  Expected: sin errores TypeScript, sin unused import warnings.

- [ ] **Paso 5: Commit**

  ```
  git add apps/web/src/app/platform/modelo/page.tsx
  git commit -m "fix: reemplazar raw div Aviso Clinico por AlertBanner + disclaimer AI Engineer"
  ```

---

### Task 4: AnalyzeForm.tsx — fieldset/legend para grupo de features clínicas

**Files:**
- Modify: `apps/web/src/app/platform/analyze/AnalyzeForm.tsx:59-79`

**Contexto:** Los 8 inputs de features clínicas tienen `<label>` correctamente asociado, pero el grupo carece de semántica de agrupación para tecnologías asistivas (AT). Un `<fieldset>/<legend>` permite a lectores de pantalla anunciar el grupo al entrar. No es fallo WCAG pero mejora la experiencia con AT.

- [ ] **Paso 1: Envolver grid en fieldset**

  Cambiar el bloque (líneas 59-79):
  ```tsx
  <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Features clínicas</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((spec) => (
              <Input
                  key={spec.key}
                  name={spec.key}
                  label={`${spec.label} (${spec.min}-${spec.max})`}
                  type="number"
                  step="0.1"
                  min={spec.min}
                  max={spec.max}
                  defaultValue={spec.default}
                  placeholder={spec.hint}
              />
          ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
          Las features siguen la convención LIDC-IDRI. Valor por defecto 3 = intermedio.
      </p>
  </div>
  ```
  por:
  ```tsx
  <fieldset className="border-0 p-0 m-0">
      <legend className="sr-only">Features clínicas LIDC-IDRI</legend>
      <p aria-hidden="true" className="text-sm font-semibold text-slate-800 mb-3">Features clínicas</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((spec) => (
              <Input
                  key={spec.key}
                  name={spec.key}
                  label={`${spec.label} (${spec.min}-${spec.max})`}
                  type="number"
                  step="0.1"
                  min={spec.min}
                  max={spec.max}
                  defaultValue={spec.default}
                  placeholder={spec.hint}
              />
          ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
          Las features siguen la convención LIDC-IDRI. Valor por defecto 3 = intermedio.
      </p>
  </fieldset>
  ```

  El `<h3>` se reemplaza por `<p aria-hidden="true">` para evitar que AT anuncie el texto dos veces (la `<legend>` sr-only ya cubre la semántica del grupo). El estilo visual es idéntico.

- [ ] **Paso 2: Verificar build**

  ```
  cd apps/web && npm run build
  ```
  Expected: sin errores TypeScript.

- [ ] **Paso 3: Commit**

  ```
  git add apps/web/src/app/platform/analyze/AnalyzeForm.tsx
  git commit -m "fix: fieldset legend para grupo de features clinicas (WCAG 1.3.1)"
  ```

---

## Items de discusión — pendientes de decisión del equipo

### Item 6: bg-slate-950 en landing — ¿token o dejarlo?

Las secciones About, Architecture, Team y Roadmap de `apps/web/src/app/page.tsx` (líneas 84, 168, 211, 254) usan `bg-slate-950`. No tiene alias de token.

**Opción A — Agregar `brand-surface-dark` en `globals.css`**
- Pro: el color queda en el sistema de tokens, cambio global en 1 lugar.
- Contra: agrega un token "marketing-only" al design system clínico; over-engineering para 4 usos en 1 archivo.
- Implementación: 1 línea en `globals.css` + 4 find-replace en `page.tsx`.

**Opción B — Dejar como está (recomendada)**
- `bg-slate-950` es un color de Tailwind bien conocido y autodocumentado.
- La landing es la única página con dark sections.
- Si la landing crece o el color cambia, revisar entonces.

**Decisión requerida antes de tocar código.**

---

### Item 7: Tests automatizados

El repo no tiene Vitest ni Jest.

**Opción A — Vitest + @testing-library/react (recomendada)**
- Se integra con Next.js sin configuración de webpack custom.
- `analyzeAction` es una server action pura (input → output | redirect): testeable con fixtures de `FormData`.
- `reportes/download/route.ts` es un handler puro (NextRequest → NextResponse): testeable con `new NextRequest(url)`.
- Mínimo viable para sub-proyecto D: `vitest.config.ts` + ~5 tests unitarios sobre `analyzeAction` (campo vacío, valor fuera de rango, rango válido) + 1 test de 401 en el route.
- Tiempo estimado: ~3-4 horas incluyendo configuración.

**Opción B — Diferir a sub-proyecto E**
- Pro: el scope de D ya cubre 4 archivos de código.
- Contra: `analyzeAction` tiene lógica de validación no trivial que crece con cada feature.

**Decisión requerida antes de tocar código.**

---

## Issues cubiertos

- **KAN-38** — POST `/api/v1/dicom/analyze/{dicom_id}` (descarga, convierte a PNG, llama HF, guarda resultado).
- **KAN-39** — Endpoint de upload acepta `.dcm`, `.png`, `.jpg` con conversión automática.
- **KAN-40** — Sliders para features clínicas pre-análisis.
- **KAN-41** — Mostrar score, nivel de riesgo y recomendación con colores por nivel.
- **KAN-43** — Vista de detalle del resultado IA completo.
- **KAN-44** — Dependencias para conversión DICOM → PNG (`pydicom`, `Pillow`).

Trazabilidad complementaria en [`docs/psp/traceability-matrix.md`](../../psp/traceability-matrix.md).
