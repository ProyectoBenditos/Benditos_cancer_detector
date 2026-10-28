# Medir en mm, deudas de la integración y demo 3D visible — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar la herramienta Medir del visor en estudios DICOM calibrados, cerrar las deudas que dejó la integración del volumen 3D, enlazar la demo 3D desde la landing y dejar diseñada la Fase D.

**Architecture:** Todo es código de la aplicación; no hay cambios en Render, Vercel, Oracle ni Supabase (no hay migraciones: `upload_annotations` ya tiene `kind`, `x2`, `y2`). Una medición es un marcador con `kind = "measure"` y un segundo punto; comparte numeración, panel, notas y guardado automático con los marcadores de la Fase C. La calibración sale de `metadata_json.volume_metadata` (`pixel_spacing`, `rows`, `columns`), que se guarda en cada subida `.dcm` desde el merge #24. Solo se activa si el tamaño natural de la imagen coincide con `rows × columns`.

**Tech Stack:** Next.js 16 + React 19 (vitest + Testing Library); FastAPI (pytest).

**Spec:** sección 10 de `docs/plan-trabajo-semana-entrante.md` (10.3 B, 10.4, 10.5 punto 4 y 10.6) y las tablas "Lo que queda abierto" / "Hallazgos no críticos" de `docs/volume-rendering/INTEGRACION-2026-10-23.md`.

**Rama:** `feat/visor-medir-y-deudas`, desde `main` (`7884524`).

## Global Constraints

- Commits en español, formato `tipo(alcance): descripción`. **Sin** `Co-Authored-By` ni menciones a IA o asistentes.
- El push y el PR los hace Mateo. Nunca `git push`. Nunca `git add -A` ni `git add .`; no commitear `apps/api/scripts/`, `.env`, `.venv*` ni `.superpowers/`.
- PHI: `note` nunca va a `console.*` ni a logs; en los logs solo `error_type` y `hash_id(...)`.
- Medir nunca muestra mm sin calibración real. Texto exacto cuando no está disponible: `"No disponible: este estudio no trae calibración en mm (PixelSpacing)."`.
- Los pins y las líneas de medición usan `brand-primary`; nunca `brand-danger`. En tema oscuro, los acentos van en `sky-200`/`sky-300`.
- Formato de mm en la interfaz: un decimal y coma decimal (`12,4 mm`), con `toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })`.
- Comandos: API en `apps/api` con `.venv/Scripts/python.exe -m pytest -q`; web en `apps/web` con `npx vitest run`, `npx tsc --noEmit` y `npx eslint src`.
- Este plan **no** incluye el PR de versiones (plataforma 1.3 o 1.4, texto "procesado con OncoScan 2.0", Detalles del sistema). Por eso tampoco toca `Sidebar.tsx`, `platform/page.tsx` ni `platform/modelo/page.tsx`.

## Review Focus

1. **Estudios subidos antes del merge #24 (sin `volume_metadata`) y PNG/JPG:** Medir aparece deshabilitado con el texto exacto y no se puede activar con `L`. La prueba va en la Tarea 6.
2. **Imagen cuyo tamaño natural no coincide con `rows × columns`** (por ejemplo, un PNG reescalado): sin calibración. La prueba va en la Tarea 4.
3. **`pixel_spacing` con fila ≠ columna** (píxel no cuadrado): los mm usan cada eje con su espaciado. La prueba va en la Tarea 4.
4. **Fila guardada `kind = "measure"` con `x2` nulo o fuera de rango:** `rowToMarker` devuelve `null` y el visor no se rompe. La prueba va en la Tarea 5.
5. **Cambiar de herramienta (o pulsar Escape) con el primer punto puesto:** se descarta y no se guarda media medición. La prueba va en la Tarea 6.

## Fuera de alcance

PR de versiones; sugerir `size_mm` en el formulario de valoración (10.4, último punto); medir en la pestaña 3D; implementar la Fase D (aquí solo se diseña).

---

### Task 1: Deudas de la API

Resuelve dos pendientes de `INTEGRACION-2026-10-23.md`: el `str(e)` que se guarda en `ai_error` y la afirmación falsa de `zero_retention_verified`.

**Files:**
- Modify: `apps/api/app/api/v1/routers/analysis.py:251,260`
- Modify: `apps/api/app/core/deidentifier.py:172`
- Modify: `apps/api/app/api/v1/routers/dicom.py:296`
- Test: `apps/api/tests/test_analysis.py`, `apps/api/tests/test_deidentifier.py`, `apps/api/tests/test_dicom.py`

**Decisión:** `docs/arquitectura-privacidad-y-lidc-patologia.md` (Capa 4) define *zero retention* como "el archivo es purgado sin guardarse en almacenamiento permanente". La plataforma guarda el archivo desidentificado en Storage, así que la auditoría registra `False` en todos los tipos. Las filas históricas con `true` no se tocan; eso es una decisión de datos de Mateo.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `test_analysis.py`: con `hf_predict` mockeado para lanzar `HFInferenceError("HF respondio 500: /ruta/secreta")`, el `ai_error` enviado a `supabase_mock.table().update` es exactamente `"El servicio de IA no respondió correctamente."`. Con `RuntimeError("/ruta/secreta")` es `"Error inesperado en el análisis."`. En ningún caso contiene `"/ruta"`.
  - `test_deidentifier.py`: `deidentify_dicom_bytes(...)[1]["zero_retention_verified"] is False`.
  - `test_dicom.py`: en la subida de un `.dcm`, la fila insertada en `dicom_anonymization_audit` lleva `zero_retention_verified` en `False`.
- [ ] **Step 2:** Correr `pytest -q`. Esperado: FAIL en esas pruebas.
- [ ] **Step 3: Implementar.**
  - `analysis.py`: las dos llamadas a `_persist_failure` usan los mensajes fijos; los `log_event` existentes no cambian.
  - `deidentifier.py:172`: `False`, con un comentario de una línea que cite la definición de la Capa 4.
  - `dicom.py:296`: el valor por defecto de `audit_deid.get(...)` sigue en `False`.
- [ ] **Step 4:** Correr `pytest -q`. Esperado: todo PASS.
- [ ] **Step 5: Commit.** `fix(api): no guardar detalles internos en ai_error ni afirmar retención cero cuando el archivo queda en Storage`

---

### Task 2: Deudas de la web: error persistente, accesibilidad del visor 3D y warnings

Resuelve el toast (WCAG 3.3.1), los hallazgos de accesibilidad del visor 3D (ahora público por la demo), el `animate-ping` y los 12 warnings de ESLint.

**Files:**
- Modify: `apps/web/src/app/platform/upload/page.tsx` (bloque de `validateUploadFile`, líneas 151–153; `supabase` en línea 108)
- Modify: `apps/web/src/components/dicom/VolumeViewer3D.tsx` (contenedor línea 263, botones línea 283, lienzo línea 288)
- Modify: `apps/web/src/components/informe/LungLobeDiagram.tsx:175`
- Modify: `apps/web/src/app/platform/analyze/batch/page.tsx:182,195,258`
- Modify: `apps/web/src/app/platform/uploads/[id]/informe/page.tsx:3,8,12,66,269,287`
- Modify: `apps/web/src/components/informe/ReportPrintControls.tsx:5`
- Test: `apps/web/src/app/platform/upload/page.test.tsx` (crear si no existe), `apps/web/src/components/dicom/VolumeViewer3D.test.tsx` (crear)

**Interfaces:**
- Consumes: `useFocusTrap` de `@/components/ui/useFocusTrap` (ya existe; revisar su firma en el archivo).

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - Página de subida: al elegir un archivo `a.tar.gz`, aparece un elemento `role="alert"` con `"Formato no soportado"`, enlazado al input por `aria-describedby`, y sigue visible después de que el toast se va. Al elegir un archivo válido, el mensaje desaparece. Mockear `createClient` y `fetch` como en las pruebas existentes de la página, si las hay.
  - `VolumeViewer3D.test.tsx`: mockear `three` y `./volumeClient` para que la carga quede en estado "listo" sin WebGL, o probar solo la barra si eso no es posible.
    - Con la pantalla completa activa, `Escape` la cierra y el foco vuelve al botón "Pantalla completa".
    - El contenedor del lienzo tiene `role="application"`.
    - Los iconos de la barra llevan `aria-hidden="true"`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - **Subida:** estado `fileError: string | null`; se muestra bajo el input como `<p id="upload-file-error" role="alert">`, y el input lleva `aria-invalid` y `aria-describedby="upload-file-error"` cuando hay error. El toast se mantiene.
  - **`VolumeViewer3D`:**
    - con `isFullscreen`, aplicar `useFocusTrap` al contenedor y cerrar con `Escape`, devolviendo el foco al botón de pantalla completa;
    - el lienzo pasa de `role="img"` a `role="application"`, con el mismo `aria-label`;
    - los botones de la barra reciben `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`;
    - los iconos de `lucide-react` reciben `aria-hidden="true"`.
  - **`LungLobeDiagram.tsx:175`:** `animate-ping` → `motion-safe:animate-ping`.
  - **ESLint:**
    - quitar los imports y variables sin usar listados;
    - en `upload/page.tsx:108` y `analyze/batch/page.tsx`, crear el cliente una sola vez con `const [supabase] = useState(() => createClient())` e incluirlo en las dependencias;
    - en `informe/page.tsx:269,287`, `{/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage en página de impresión; next/image no aplica */}`.
- [ ] **Step 4:** Correr `npx vitest run`, `npx tsc --noEmit` y `npx eslint src`. Esperado: PASS y **0 warnings**.
- [ ] **Step 5: Commit.** `fix(web): error de subida persistente, accesibilidad del visor 3D y limpieza de warnings`

---

### Task 3: Enlace a la demo 3D desde la landing

**Files:**
- Modify: `apps/web/src/app/page.tsx` (bloque de botones, líneas 118–132)
- Test: `apps/web/src/app/page.test.tsx` (crear si no existe)

- [ ] **Step 1: Escribir la prueba que falla.** La landing tiene un enlace con nombre accesible `"Ver demostración 3D"` y `href="/demo/pulmon-3d"`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Un tercer `Link`, junto a "Conoce más", con el mismo estilo secundario (blanco con borde slate) e icono `Box` de `lucide-react` (`aria-hidden`). Texto: `Ver demostración 3D`. Bajo el grupo de botones, una línea `text-xs text-slate-500`: `Demostración con una TC pública; no procesa estudios de pacientes.`
- [ ] **Step 4:** Correr `npx vitest run` y `npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 5: Verificación manual (Mateo).** Abrir `/demo/pulmon-3d` desde la landing en un portátil con gráfica integrada y en un móvil. Anotar el resultado en el PR.
- [ ] **Step 6: Commit.** `feat(web): enlazar la demostración 3D desde la landing`

---

### Task 4: Calibración y cálculo de distancias (funciones puras)

**Files:**
- Create: `apps/web/src/lib/pixelGeometry.ts`, `apps/web/src/lib/pixelGeometry.test.ts`
- Create: `apps/web/src/components/ui/measureMath.ts`, `apps/web/src/components/ui/measureMath.test.ts`

**Interfaces:**
- Produces, en `pixelGeometry.ts`:
  ```ts
  /** pixelSpacingMm = [fila, columna] en mm, como PixelSpacing de DICOM. */
  export type PixelGeometry = { pixelSpacingMm: [number, number]; rows: number; columns: number };
  export function pixelGeometryFrom(volumeMetadata: unknown): PixelGeometry | null
  ```
  Devuelve `null` si falta cualquier campo o si algún valor no es un número finito mayor que 0. `rows` y `columns` deben ser enteros.
- Produces, en `measureMath.ts`:
  ```ts
  export type Calibration = { rowMm: number; colMm: number };
  export function calibrationFor(geometry: PixelGeometry | null, natural: Size): Calibration | null
  export function measureMm(a: Point, b: Point, natural: Size, cal: Calibration): number
  export function formatMm(mm: number): string   // "12,4 mm"
  ```
  - `calibrationFor` devuelve `null` si `geometry` es `null` o si `natural.w !== geometry.columns` o `natural.h !== geometry.rows`.
  - `measureMm = hypot((b.x − a.x) · natural.w · colMm, (b.y − a.y) · natural.h · rowMm)`, redondeado a 0,1.
  - `Size` y `Point` se importan de `./markerMath`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `pixelGeometryFrom({ pixel_spacing: [0.7, 0.7], rows: 512, columns: 512 })` devuelve la geometría.
  - Devuelven `null`: `null`, `{}`, `pixel_spacing: [0, 0.7]`, `rows: "512"`, `pixel_spacing: null`.
  - `calibrationFor(geo512, { w: 512, h: 512 })` devuelve `{ rowMm: 0.7, colMm: 0.7 }`; con `{ w: 256, h: 256 }` devuelve `null` (Review Focus 2).
  - `measureMm({x:0,y:0},{x:0.5,y:0},{w:512,h:512},{rowMm:0.7,colMm:0.7}) === 179.2`.
  - Píxel no cuadrado (`rowMm: 1, colMm: 0.5`), de `(0,0)` a `(0.1,0.1)` en 100×100 → `11.2` (`hypot(5, 10) = 11.18…`) (Review Focus 3).
  - `formatMm(12.44) === "12,4 mm"`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): calibración en mm desde PixelSpacing y cálculo de distancias del visor`

---

### Task 5: Mediciones en el modelo de marcadores y su persistencia

**Files:**
- Modify: `apps/web/src/components/ui/markerState.ts`, `markerState.test.ts`
- Modify: `apps/web/src/lib/uploadAnnotations.ts`, `uploadAnnotations.test.ts`
- Modify: `apps/web/src/components/ui/useMarkerAutosave.ts:11`, `useMarkerAutosave.test.ts`
- Modify: `apps/web/src/app/platform/uploads/[id]/actions.ts` (sin cambios de lógica; `parseAnnotation` ya valida)

**Interfaces:**
- Consumes: `formatMm` de `./measureMath` (Tarea 4). El `sizeMm` de una medición lo calcula la Tarea 6.
- Produces, en `markerState.ts`:
  ```ts
  export type MarkerKind = "point" | "measure";
  // Marker suma: kind: MarkerKind; x2: number | null; y2: number | null
  // MarkerAction suma: { type: "addMeasure"; x: number; y: number; x2: number; y2: number; sizeMm: number }
  ```
  - `add` crea `kind: "point"`, `x2: null`, `y2: null`.
  - `addMeasure` crea `kind: "measure"` con los dos puntos acotados a [0,1] y `sizeMm` validado.
  - `move` sobre una medición traslada **los dos puntos** con el mismo desplazamiento, acotado para que ninguno salga de [0,1].
  - `update` ignora `sizeMm` en mediciones, porque es un valor derivado.
  - `markerAriaLabel` de una medición: `"Medición {seq}: {formatMm(sizeMm)}"`, más la nota como hoy. Importar `formatMm` de `./measureMath` (Tarea 4).
- Produces, en `uploadAnnotations.ts`:
  - `AnnotationInput` y `AnnotationRow` suman `kind`, `x2` y `y2`.
  - `AnnotationDbValues.kind` pasa a ser `MarkerKind`.
  - `ANNOTATION_COLUMNS = "seq, kind, x, y, x2, y2, finding_type, ai_agreement, note, size_mm"`.
  - `parseAnnotation`: `kind` debe ser `point` o `measure`. Si es `point`, `x2` y `y2` deben ser `null`. Si es `measure`, `x2` e `y2` deben estar en [0,1] y `sizeMm` no puede ser `null`.
  - `rowToMarker`: una fila `measure` con `x2` o `y2` inválidos devuelve `null`; una fila sin `kind` se trata como `point`.

- [ ] **Step 1: Escribir las pruebas que fallan** para cada regla de la sección Interfaces:
  - reducer: `addMeasure`; `move` de una medición cerca del borde; `update` que intenta cambiar el `sizeMm` de una medición;
  - `parseAnnotation`: `measure` válido, `measure` sin `x2`, `point` con `x2`;
  - `rowToMarker`: `measure` con `x2: null` → `null` (Review Focus 4);
  - autosave: cambiar `x2` de una medición genera un upsert.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.** En `useMarkerAutosave.ts:11`, `PERSISTED_FIELDS` suma `"x2"` y `"y2"`. Actualizar los objetos `Marker` de las pruebas y fixtures existentes con `kind: "point", x2: null, y2: null`.
- [ ] **Step 4:** Correr `npx vitest run` y `npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): mediciones como marcadores con segundo punto y su validación al guardar`

---

### Task 6: Herramienta Medir en el visor

**Files:**
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (props; `selectTool` línea 352; `onClickAt` línea 235; acción `addMarker` línea 407; contenido de la pantalla completa)
- Modify: `apps/web/src/components/ui/ViewerToolbar.tsx` (`MEASURE_UNAVAILABLE` línea 43; `TOOL_OPTIONS` línea 176; props)
- Modify: `apps/web/src/components/ui/useToolPointer.ts` (clic también con `measure`)
- Modify: `apps/web/src/components/ui/MarkerLayer.tsx`, `MarkerPanel.tsx`, `MarkerEditor.tsx`, `viewerExport.ts`
- Modify: `apps/web/src/components/ui/viewerKeys.ts:64`
- Modify: `apps/web/src/components/dicom/StudyViewerTabs.tsx` (prop de paso)
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx`, `apps/web/src/app/platform/upload/page.tsx`
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`, `viewerExport.test.ts`, `apps/web/src/components/dicom/StudyViewerTabs.test.tsx`

**Interfaces:**
- Consumes: `PixelGeometry`, `pixelGeometryFrom` (Tarea 4); `calibrationFor`, `measureMm`, `formatMm` (Tarea 4); la acción `addMeasure` y `Marker.kind/x2/y2` (Tarea 5).
- Produces:
  - prop nueva `pixelGeometry?: PixelGeometry | null` en `BeforeAfterViewer` y en `StudyViewerTabs`;
  - prop nueva `measureAvailable: boolean` en `ViewerToolbar`;
  - en `UploadResponse` de la página de subida, el campo `volume_metadata?: unknown`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `BeforeAfterViewer.test.tsx`. Disparar `load` en la imagen "antes" con `naturalWidth`/`naturalHeight` definidos con `Object.defineProperty`, como hacen las pruebas existentes de marcadores.
  - Sin `pixelGeometry`: la opción "Medir (L)" tiene `aria-disabled="true"`, su descripción es el texto exacto de Global Constraints y `L` anuncia ese texto sin activar la herramienta (Review Focus 1).
  - Con geometría de 512×512 y espaciado 0,7, e imagen natural de 512×512: `L` activa Medir; dos clics separados por media imagen crean en el panel la fila `"Medición 1: 179,2 mm"` y se llama a `annotations.save` con `kind: "measure"` y `sizeMm: 179.2`.
  - Con el primer punto puesto, pulsar `M` (o `Escape` fuera de pantalla completa) descarta el punto: un clic posterior con Medir crea un primer punto nuevo y no una medición (Review Focus 5).
  - Con Medir activo, `Enter` fija el primer punto en el centro visible; tras mover la imagen con las flechas, un segundo `Enter` crea la medición.
  - Una medición guardada (`initial` con `kind: "measure"`) se dibuja como una línea (`data-testid="measure-line-1"`) con `aria-label` `"Medición 1: …"`.
  - En `StudyViewerTabs.test.tsx`: la prop `pixelGeometry` llega al visor 2D.
  - En `viewerExport.test.ts`: la leyenda de una medición incluye `"179,2 mm"`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - `MEASURE_UNAVAILABLE` pasa al texto exacto de Global Constraints. `TOOL_OPTIONS` se arma según `measureAvailable`.
  - En el visor: `const calibration = calibrationFor(pixelGeometry ?? null, natural)`; `selectTool("measure")` solo activa la herramienta si hay calibración.
  - Primer punto pendiente: estado `measureStart: Point | null`, dibujado como pin hueco. Se descarta al cambiar de herramienta o con `Escape` (si `Escape` cierra la pantalla completa, primero descarta el punto). El segundo clic o `Enter` despacha `addMeasure` con `sizeMm: measureMm(...)`.
  - `useToolPointer` llama a `onClickAt` con `tool === "marker" || tool === "measure"`.
  - **`MarkerLayer`:** para `kind === "measure"`, dibuja una línea SVG `brand-primary` entre los dos puntos, con grosor de trazo constante al hacer zoom (escala inversa, igual que los pins) y el pin numerado en el primer punto.
  - **`MarkerPanel`:** las mediciones muestran `formatMm(sizeMm)` y, una sola vez bajo la lista si hay alguna medición, `Medición sobre el corte mostrado; no reemplaza la medición en la estación de trabajo.`
  - **`MarkerEditor`:** en mediciones, el tamaño es de solo lectura.
  - **Exportación:** dibuja la línea donde hoy dibuja los pins y la leyenda agrega los mm.
  - **`viewerKeys.ts:64`:** `"Medir en mm (dos clics o Enter dos veces; solo estudios DICOM calibrados)"`.
  - **Páginas:**
    - `uploads/[id]/page.tsx` pasa `pixelGeometry={pixelGeometryFrom(upload.metadata_json?.volume_metadata)}`;
    - `upload/page.tsx` agrega `volume_metadata?: unknown` a `UploadResponse` y pasa `pixelGeometry={pixelGeometryFrom(successData?.volume_metadata)}`.
- [ ] **Step 4:** Correr `npx vitest run`, `npx tsc --noEmit` y `npx eslint src`. Esperado: PASS y 0 warnings.
- [ ] **Step 5: Verificación manual.** Correr `npm run dev` contra la API local, subir y analizar `samples/volume-rendering-v2/dicom_unitario_caso01.dcm`, medir y recargar la página. La medición sigue en el mismo lugar con los mismos mm. Un estudio PNG muestra Medir deshabilitado.
- [ ] **Step 6:** `/oncoscan-a11y` sobre `BeforeAfterViewer.tsx` y `MarkerLayer.tsx`, y `/oncoscan-clinical-review` sobre `MarkerPanel.tsx`. Corregir lo crítico.
- [ ] **Step 7: Commit.** `feat(web): herramienta Medir en mm para estudios DICOM calibrados`

---

### Task 7: Diseño de la Fase D (lectura ciega y modo práctica)

Esta tarea no lleva código: deja la spec lista para su propio plan.

**Files:**
- Create: `docs/superpowers/specs/2026-10-27-visor-fase-d-design.md`
- Modify: `docs/plan-trabajo-semana-entrante.md` (nota de estado en la sección 10)

- [ ] **Step 1:** Ejecutar la skill `superpowers:brainstorming` con Mateo, partiendo de la sección 10.6 y de estas condiciones ya conocidas:
  - la IA debe quedar oculta en **las dos pestañas** (2D y 3D) y en los badges hasta que el médico registre su impresión inicial;
  - la impresión "antes de la IA" se guarda aparte de la valoración posterior;
  - el modo práctica usa casos LIDC sin pacientes reales (restricción R2);
  - el panel del caso debe acompañar a la pestaña 3D en pantalla completa (D6 de la revisión).
- [ ] **Step 2:** Escribir la spec con las decisiones tomadas: modelo de datos (con o sin migración), rutas, estados del visor y cómo se mide la sensibilidad y el tiempo de lectura con y sin IA.
- [ ] **Step 3:** Agregar en la nota de estado de la sección 10: `Fase D: diseño en docs/superpowers/specs/2026-10-27-visor-fase-d-design.md; pendiente de plan.`
- [ ] **Step 4: Commit.** `docs: diseño de la fase D del visor (lectura ciega y modo práctica)`
