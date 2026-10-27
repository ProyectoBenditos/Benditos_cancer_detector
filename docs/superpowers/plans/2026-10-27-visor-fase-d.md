# Fase D del visor: lectura ciega y modo práctica — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lectura ciega estricta en estudios reales y un modo práctica con 5 casos LIDC, listos para mostrarse en la sustentación.

**Architecture:**
- **Lectura ciega.** Se decide en el servidor. `loadBlindContext` calcula qué estudios del médico están pendientes, y cada página deja de enviar al navegador el score, el riesgo y el mapa de calor de esos estudios. El visor recibe `aiHiddenReason` y desactiva todo lo que depende de la IA.
- **Impresión inicial.** Es una fila inmutable de `upload_initial_impressions`, con una copia de los marcadores tomada en el servidor.
- **Modo práctica.** Funciona solo en el navegador: lee `public/demo/practica/manifest.json`, que genera un script de Python a partir de TCIA y `pylidc`. No guarda nada.

**Tech Stack:** Next.js 16 + React 19 (vitest + Testing Library), Supabase (una migración), Python 3.11 para el script (pytest).

**Spec:** `docs/superpowers/specs/2026-10-27-visor-fase-d-design.md`

**Rama:** `feat/visor-fase-d`, creada desde `feat/visor-medir-y-deudas` (`c776e97`), porque necesita Medir.

## Global Constraints

- **Commits:** en español, formato `tipo(alcance): descripción`, **sin** `Co-Authored-By` ni menciones a IA o asistentes.
- **Git:**
  - Nunca `git push`, `git add -A` ni `git add .`.
  - No se commitean `.env`, `.venv*`, `.superpowers/` ni `samples/practice/dicom/`.
- **PHI:**
  - `notes` de la impresión y `note` de los marcadores nunca van a `console.*` ni a logs.
  - Los errores al cliente son textos fijos, nunca el detalle de Supabase.
- **Colores:**
  - "Pendiente de lectura" va en slate. Nunca se usa `brand-danger` fuera de alertas clínicas.
  - Pins, anillos y líneas van en `brand-primary`, o `sky-200`/`sky-300` en oscuro.
- **Texto de la insignia:** exactamente `"Pendiente de lectura"` (`BLIND_PENDING_LABEL`).
- **Textos fijos del visor:**
  - Lectura ciega: `"La IA está oculta hasta que registres tu impresión inicial."` (`BLIND_VIEWER_REASON`).
  - Modo práctica: `"La IA se muestra al pulsar «Ver resultado»."` (`PRACTICE_VIEWER_REASON`).
- **Textos del modo práctica:** el aviso de la IA y el pie de página son los del spec, sección 4.4, palabra por palabra.
- **Comandos:**
  - Web, en `apps/web`: `npx vitest run`, `npx tsc --noEmit` y `npx eslint src`.
  - Script: `.venv-practice/Scripts/python.exe -m pytest scripts/tests -q`, desde la raíz.
- **Migraciones:** las aplica Mateo a mano en el SQL Editor. El plan solo crea el archivo.
- **Archivos bloqueados:** `Sidebar.tsx` y `platform/page.tsx` solo se tocan en la Tarea 9, y únicamente si el PR de versiones ya está en `main`.

## Review Focus

1. **Estudio analizado antes de activar la preferencia:**
   - si no tiene valoración, queda pendiente;
   - si tiene valoración, no.

   La prueba va en la Tarea 1 (`pendingIdsFrom`).
2. **Migración no aplicada** (la consulta de `profiles.blind_reading` devuelve error): `loadBlindContext` devuelve `BLIND_DISABLED` y la página funciona como hoy. La prueba va en la Tarea 1.
3. **Registrar con un marcador recién movido o pendiente de guardar:** el botón está deshabilitado mientras el guardado automático está en `saving` o `error`. La prueba va en la Tarea 4.
4. **Doble envío o segunda pestaña:** un insert que choca con la clave única (código `23505`) cuenta como éxito y la página queda revelada. La prueba va en la Tarea 4.
5. **Dos marcas sobre el mismo nódulo, y una marca a exactamente 10 mm:**
   - con dos marcas, cuenta 1 encontrado y 1 marca sobrante;
   - una marca a 10 mm cuenta como acierto.

   La prueba va en la Tarea 7.

## Fuera de alcance

- Métricas, CSV y persistencia del modo práctica.
- Un modelo que detecte nódulos.
- Cambios en la API de FastAPI o en Oracle.
- El PR de versiones.

---

### Task 1: Migración y núcleo de la lectura ciega

**Files:**
- Create: `supabase/migrations/20261028120000_blind_reading.sql`
- Create: `apps/web/src/lib/blindReading.ts`, `apps/web/src/lib/blindReading.test.ts`
- Create: `apps/web/src/lib/initialImpression.ts`, `apps/web/src/lib/initialImpression.test.ts`

**Interfaces:**
- Produces (`lib/blindReading.ts`):
  - `type BlindContext = { enabled: boolean; pendingIds: Set<string> }` y `const BLIND_DISABLED: BlindContext`.
  - `pendingIdsFrom(analyzedIds: string[], revealedIds: string[]): Set<string>`.
  - `loadBlindContext(supabase: SupabaseClient, userId: string): Promise<BlindContext>`.
  - `isBlindPending(ctx: BlindContext, uploadId: string): boolean`.
  - `maskBlindPending<T extends { id: string; ai_score?: number | null; ai_risk_level?: string | null; ai_recommendation?: string | null }>(rows: T[], ctx: BlindContext): Array<T & { blind_pending: boolean }>`. Pone en `null` los tres campos de IA de las filas pendientes.
  - `const BLIND_PENDING_LABEL = "Pendiente de lectura"`, `const BLIND_VIEWER_REASON` (texto de Global Constraints).
- Produces (`lib/initialImpression.ts`):
  - `type ImpressionFields = { lung_rads: LungRads; conducta: Conducta; notes: string | null }`.
  - `type InitialImpression = ImpressionFields & { markers_snapshot: unknown[]; revealed_at: string }`.
  - `parseImpressionForm(formData: FormData): { ok: true; uploadId: string; impression: ImpressionFields } | { ok: false; error: string }`.

- [ ] **Step 1: Crear la rama.** `git switch -c feat/visor-fase-d` desde `feat/visor-medir-y-deudas`.
- [ ] **Step 2: Escribir la migración**, con el estilo de `20261002120000_upload_reviews.sql`. Cabecera con "Aplicar manualmente" y `ROLLBACK`. Contenido:
  - `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blind_reading boolean NOT NULL DEFAULT false;`
  - Tabla `upload_initial_impressions`:
    - `id uuid PK`;
    - `upload_id uuid NOT NULL UNIQUE`, con referencia a `dicom_uploads ON DELETE CASCADE`;
    - `user_id`, con referencia a `auth.users`;
    - `lung_rads text NOT NULL` y `conducta text NOT NULL`, con los mismos `CHECK` que `upload_reviews`;
    - `notes text CHECK (char_length(notes) <= 4000)`;
    - `markers_snapshot jsonb NOT NULL DEFAULT '[]'`;
    - `revealed_at timestamptz NOT NULL DEFAULT now()`.
  - RLS:
    - SELECT propio;
    - INSERT propio, con `EXISTS` sobre `dicom_uploads` del mismo usuario;
    - **sin** políticas UPDATE ni DELETE, con un comentario: "inmutable: es la lectura antes de la IA".
- [ ] **Step 3: Escribir las pruebas que fallan.**
  - `pendingIdsFrom(["a","b","c"], ["b"])` es `Set{"a","c"}`.
  - `maskBlindPending` con `pendingIds = {"a"}`:
    - la fila `a` sale con `ai_score: null`, `ai_risk_level: null`, `ai_recommendation: null` y `blind_pending: true`;
    - la fila `b` queda intacta, con `blind_pending: false`.
  - `loadBlindContext`, con un cliente Supabase simulado (patrón `vi.hoisted` de `uploads/[id]/actions.test.ts`):
    - si `profiles` devuelve `error`, el resultado es `BLIND_DISABLED`;
    - con `blind_reading: false`, también `BLIND_DISABLED` y sin más consultas;
    - con `true`, con analizados `["a","b"]`, impresiones `["a"]` y valoraciones `[]`, `pendingIds` es `{"b"}`;
    - si falla la consulta de impresiones o de valoraciones, lanza un error. Es fallo cerrado: no revela nada.
  - `parseImpressionForm`:
    - sin `lung_rads` devuelve `"Elige la categoría Lung-RADS de tu impresión inicial."`;
    - sin `conducta`, `"Elige la conducta de tu impresión inicial."`;
    - con una nota de 4.001 caracteres, `"La nota supera los 4.000 caracteres."`;
    - con un `upload_id` no UUID, `"Estudio no válido."`;
    - con datos válidos y la nota vacía devuelve `notes: null`.
- [ ] **Step 4:** Correr `npx vitest run src/lib/blindReading.test.ts src/lib/initialImpression.test.ts`. Esperado: FAIL.
- [ ] **Step 5: Implementar.**
  - `loadBlindContext`: los analizados son `upload_status in ("analyzed","ai_completed")` del `user_id`. Los revelados son los `upload_id` de `upload_initial_impressions` y de `upload_reviews`.
  - `parseImpressionForm`: reutiliza `UUID_RE`, `LUNG_RADS_OPTIONS`, `CONDUCTA_OPTIONS` y `NOTES_MAX_LENGTH` de `lib/uploadReview.ts`.
- [ ] **Step 6:** Correr las pruebas. Esperado: PASS.
- [ ] **Step 7: Commit.** `feat(web): núcleo de la lectura ciega y migración de la impresión inicial`

---

### Task 2: Interruptor en Ajustes

**Files:**
- Create: `apps/web/src/app/platform/ajustes/actions.ts`, `apps/web/src/app/platform/ajustes/actions.test.ts`
- Create: `apps/web/src/app/platform/ajustes/BlindReadingToggle.tsx`, `apps/web/src/app/platform/ajustes/BlindReadingToggle.test.tsx`
- Modify: `apps/web/src/app/platform/ajustes/page.tsx` (consulta de `profiles`, líneas 15–19; tarjeta nueva antes de "Sesión")

**Interfaces:**
- Produces:
  - `setBlindReadingAction(enabled: boolean): Promise<{ ok: true } | { ok: false; error: string }>`.
  - `BlindReadingToggle({ initial: boolean; available: boolean })`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - Acción:
    - sin usuario, devuelve `{ ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." }`;
    - con usuario, hace `update({ blind_reading: true })` con `.eq("id", user.id)` y llama a `revalidatePath("/platform", "layout")`;
    - si `update` devuelve error, `"No se pudo guardar la preferencia. Intenta de nuevo."`.
  - Interruptor:
    - es un `role="switch"` con nombre accesible `"Lectura ciega"` y `aria-checked` igual a `initial`;
    - al hacer clic llama a la acción y, si falla, muestra el error en una región `role="status"` y vuelve al valor anterior;
    - con `available=false` está deshabilitado y muestra `"Disponible cuando se aplique la migración de lectura ciega."`.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - La página consulta `select("role, blind_reading")`. Si hay error, la consulta se repite solo con `role` y se pasa `available=false`.
  - El interruptor va con este texto: `"Oculta el resultado de la IA en los estudios que no has valorado hasta que registres tu impresión inicial. Mientras esté activa, la única forma de ver la IA de un estudio es registrar tu impresión."`
  - El `AlertBanner` de "Preferencias (próximamente)" se queda.
- [ ] **Step 4:** Correr las pruebas. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): preferencia de lectura ciega en Ajustes`

---

### Task 3: El visor sin IA

**Files:**
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx`, `ViewerToolbar.tsx`, `MarkerEditor.tsx`, `MarkerPanel.tsx`, `useMarkerAutosave.ts` (solo el tipo exportado, si hace falta)
- Modify: `apps/web/src/components/dicom/StudyViewerTabs.tsx`, `apps/web/src/components/dicom/VolumeViewer3D.tsx`
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`, `apps/web/src/components/dicom/VolumeViewer3D.test.tsx`

**Interfaces:**
- Produces:
  - `BeforeAfterViewer` acepta `aiHiddenReason?: string` y `onMarkersChange?: (markers: Marker[]) => void`.
  - `ViewerAnnotations` gana `onStatusChange?: (status: SaveStatus) => void`. `SaveStatus` es el de `useMarkerAutosave.ts`.
  - `StudyViewerTabs`: `heatmapBase64: string | null` y `aiHiddenReason?: string`.
  - `VolumeViewer3D`: `hideAi?: boolean`.
  - `MarkerEditor`: `hideAiAgreement?: boolean`.
  - `MarkerPanel`: `aiHiddenReason?: string`.

- [ ] **Step 1: Escribir las pruebas que fallan** (`BeforeAfterViewer.test.tsx`), con `aiHiddenReason={BLIND_VIEWER_REASON}` y `heatmapBase64={null}`:
  - las opciones de modo de vista tienen `aria-disabled="true"` y su descripción es el motivo;
  - el botón de parpadeo está deshabilitado y Espacio con foco en el visor no cambia nada;
  - el texto del motivo aparece en el visor;
  - al crear un marcador, el editor no tiene el grupo "Opinión frente a la IA";
  - en pantalla completa el panel no tiene el encabezado "Resultado IA" y muestra el motivo;
  - `onMarkersChange` recibe la lista con el marcador nuevo;
  - `annotations.onStatusChange` recibe `"saving"` y luego `"saved"` (temporizadores falsos y `save` resuelto).
- [ ] **Step 2: Escribir la prueba que falla** (`VolumeViewer3D.test.tsx`): con `hideAi`, no existe el botón "Mapa de calor" mientras el volumen carga.
- [ ] **Step 3:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 4: Implementar.**
  - Visor 2D: con `aiHiddenReason`, `showAi` es siempre `false` y el lienzo dibuja solo la imagen "antes".
  - `StudyViewerTabs`:
    - pasa `aiHiddenReason` al 2D y `hideAi` al 3D;
    - cambia el pie del mapa por el motivo;
    - no muestra la insignia del lóbulo.
  - `VolumeViewer3D` con `hideAi`:
    - no descarga la textura del mapa de calor;
    - no ofrece el modo;
    - no dibuja `noduleCoords`.
- [ ] **Step 5:** Correr `npx vitest run src/components`. Esperado: PASS, incluidas las pruebas que ya existían.
- [ ] **Step 6: Commit.** `feat(web): visor sin IA para la lectura ciega y el modo práctica`

---

### Task 4: Lectura ciega en la página del estudio

**Files:**
- Modify: `apps/web/src/app/platform/uploads/[id]/actions.ts`, `apps/web/src/app/platform/uploads/[id]/actions.test.ts`
- Create: `apps/web/src/app/platform/uploads/[id]/BlindReadingWorkspace.tsx`, `BlindImpressionForm.tsx`, `BlindImpressionForm.test.tsx`, `InitialImpressionSummary.tsx`
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx`, `ClinicalReviewForm.tsx`
- Modify: `apps/web/src/app/platform/uploads/[id]/informe/page.tsx` (redirección al inicio)

**Interfaces:**
- Consumes: Tarea 1 (`loadBlindContext`, `isBlindPending`, `parseImpressionForm`, `InitialImpression`) y Tarea 3 (`aiHiddenReason`, `onStatusChange`).
- Produces:
  - `type ImpressionState = { error?: string; fields?: Record<string, string> }`.
  - `registerInitialImpressionAction(prev: ImpressionState, formData: FormData): Promise<ImpressionState>`.
  - `ClinicalReviewForm` acepta `impressionDefaults?: { lung_rads: LungRads; conducta: Conducta } | null`.

- [ ] **Step 1: Escribir las pruebas que fallan de la acción.**
  - Con datos válidos, lee `upload_annotations` (`ANNOTATION_COLUMNS`, `upload_id`) e inserta en `upload_initial_impressions`:
    - `{ upload_id, user_id, lung_rads, conducta, notes, markers_snapshot: <filas leídas> }`;
    - después llama a `revalidatePath("/platform/uploads/<id>")` y devuelve `{}`.
  - Si la lectura de anotaciones falla, devuelve `"No se pudieron leer tus marcadores. Intenta de nuevo."` y no inserta.
  - Si el insert devuelve `{ code: "23505" }`, devuelve `{}` y revalida.
  - Con otro error devuelve `"No se pudo registrar tu impresión. Intenta de nuevo."`, conserva `fields` y no incluye el texto del error de Supabase.
- [ ] **Step 2: Escribir las pruebas que fallan del formulario** (`BlindImpressionForm.test.tsx`).
  - El botón `"Registrar impresión y ver la IA"`:
    - está deshabilitado con `saveStatus="saving"` y muestra `"Guardando marcadores…"`;
    - está deshabilitado con `"error"` o `markersLoadFailed`, y muestra `"Tus marcadores no se guardaron. Reintenta desde el panel del visor antes de registrar."`;
    - se habilita con `"saved"` o `"idle"`.
  - No existe ningún campo de concordancia.
- [ ] **Step 3:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 4: Implementar.**
  - `page.tsx` carga `ctx = await loadBlindContext(supabase, user.id)` y calcula `pending = isBlindPending(ctx, upload.id)`.
  - Con `pending`:
    - no se renderizan la tarjeta "Resultado del análisis IA", el enlace al informe, "Metadata de inferencia" ni `ClinicalReviewForm`;
    - `BlindReadingWorkspace` recibe los mismos datos que hoy recibe `StudyViewerTabs`, excepto `heatmapBase64` y `summary`, que no salen del servidor;
    - una tarjeta encima del visor dice: `"Lectura ciega activa. Marca y mide lo que veas y registra tu impresión. La IA aparece después, y tu impresión inicial no se puede editar."`
  - `BlindReadingWorkspace`:
    - es un cliente;
    - guarda `saveStatus` desde `onStatusChange`;
    - renderiza `StudyViewerTabs` con `aiHiddenReason={BLIND_VIEWER_REASON}` y `heatmapBase64={null}`;
    - debajo pone `BlindImpressionForm`.
  - Sin `pending`, la página es la de hoy. Si existe una fila en `upload_initial_impressions`:
    - se muestra `InitialImpressionSummary`, con el título `"Impresión inicial (antes de la IA)"`, Lung-RADS, conducta, nota, el número de marcadores de la copia y `revealed_at`;
    - `ClinicalReviewForm` recibe `impressionDefaults` cuando no hay valoración.
  - `informe/page.tsx`: si el estudio está pendiente, `redirect("/platform/uploads/<id>")`.
- [ ] **Step 5:** Correr `npx vitest run "src/app/platform/uploads"`. Esperado: PASS.
- [ ] **Step 6: Commit.** `feat(web): registrar la impresión inicial antes de revelar la IA`

---

### Task 5: Ningún otro lugar revela un estudio pendiente

**Files:**
- Create: `apps/web/src/components/ui/BlindPendingBadge.tsx`
- Create: `apps/web/src/lib/useBlindReadingPreference.ts`, `apps/web/src/lib/useBlindReadingPreference.test.ts`
- Modify: `apps/web/src/app/platform/uploads/page.tsx`, `uploads/BatchHistoryTable.tsx`
- Modify: `apps/web/src/app/platform/alertas/page.tsx`
- Modify: `apps/web/src/app/platform/reportes/page.tsx` (conteo de `ALTO`, líneas 19–22), `reportes/download/route.ts`
- Modify: `apps/web/src/app/platform/pacientes/[id]/page.tsx` (líneas 93–97)
- Modify: `apps/web/src/app/platform/upload/page.tsx` (bloque de resultado, alrededor de las líneas 530–640), `upload/page.test.tsx`
- Modify: `apps/web/src/app/platform/analyze/batch/page.tsx` (líneas 861–867 y la miniatura del mapa)
- Test: `apps/web/src/app/platform/uploads/BatchHistoryTable.test.tsx` (crear si no existe)

**Interfaces:**
- Consumes: Tarea 1.
- Produces:
  - `BlindPendingBadge()`: insignia slate con `EyeOff` y el texto `BLIND_PENDING_LABEL`.
  - `useBlindReadingPreference(): boolean | null`: `null` mientras carga y `false` si la consulta falla.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `BatchHistoryTable`:
    - una fila con `blind_pending: true` muestra `"Pendiente de lectura"` y no muestra el porcentaje;
    - el riesgo más alto de un lote ignora las filas pendientes.
  - `useBlindReadingPreference` devuelve `null` y luego `true`, con el cliente de `@/utils/supabase/client` simulado; con error, `false`.
  - `upload/page.test.tsx`: con la preferencia en `true` y un análisis completado:
    - aparece `"Análisis completado. Tienes la lectura ciega activa: abre el estudio para registrar tu impresión antes de ver la IA."` y un enlace `"Abrir el estudio"` a `/platform/uploads/<dicom_id>`;
    - no aparecen el score, el visor ni el formulario de valoración.

    Con la preferencia en `null` tampoco se muestra el resultado.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - Páginas de servidor: `loadBlindContext` y luego `maskBlindPending` antes de renderizar o de pasar las filas al cliente.
  - Alertas:
    - quitan las filas pendientes;
    - con `ctx.enabled`, muestran la nota fija `"Los estudios con lectura ciega pendiente aparecen aquí cuando registras tu impresión."`, aunque no haya ninguno pendiente, para que la nota no revele nada.
  - Reportes: con `ctx.enabled` y pendientes, el conteo `ALTO` añade `.not("id", "in", \`(${[...ctx.pendingIds].join(",")})\`)`.
  - El CSV quita las filas pendientes.
  - Paciente: muestra `BlindPendingBadge` en lugar del texto del riesgo.
  - Lotes: con la preferencia en `true`, los ítems completados muestran `BlindPendingBadge` en lugar del score, del `RiskBadge` y de la miniatura del mapa.
- [ ] **Step 4:** Correr `npx vitest run`. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): ocultar el riesgo de los estudios pendientes de lectura ciega en listas, alertas, reportes y subida`

---

### Task 6: Script de casos de práctica

**Files:**
- Create: `scripts/requirements-practice.txt`, con versiones fijas: `pylidc==0.2.3`, `pydicom`, `numpy`, `pillow`, `httpx`, `pytest`. Si `pylidc` falla con NumPy 2, se fija `numpy==1.23.5`.
- Create: `scripts/practice_cases.py` (funciones puras), `scripts/prepare_practice_cases.py` (CLI), `scripts/tests/test_practice_cases.py`
- Create (generados): `apps/web/public/demo/practica/manifest.json`, `caso-0N.png`, `caso-0N-heatmap.png`; `samples/practice/provenance.json`
- Modify: `.gitignore` (`.venv-practice/`, `samples/practice/dicom/`; además `!scripts/prepare_practice_cases.py`, `!scripts/practice_cases.py`, `!scripts/tests/` si las reglas actuales de `scripts/` los excluyen); `samples/README.md` (sección de los casos de práctica)

**Interfaces:**
- Produces (`practice_cases.py`):
  - `FEATURE_RANGES: dict[str, tuple[float, float]]`, copiado de `apps/api/app/api/v1/routers/analysis.py:37-44`.
  - `consensus_features(annotations: list[dict[str, float]]) -> tuple[dict[str, float], list[str]]`: medianas por variable, recortadas a `FEATURE_RANGES`, y la lista de variables recortadas.
  - `is_reference(n_readers: int, diameter_mm: float) -> bool`: `n_readers >= 3 and 6 <= diameter_mm <= 30`.
  - `normalized_center(col: float, row: float, columns: int, rows: int) -> tuple[float, float]`.
  - `lung_window_u8(hu: np.ndarray, center: float = -600, width: float = 1500) -> np.ndarray`.
- Produces: el contrato de `manifest.json` que lee la Tarea 7.

```json
{ "version": 1,
  "cases": [ { "id": "caso-01", "image": "caso-01.png", "heatmap": "caso-01-heatmap.png",
               "pixel_spacing": [0.703, 0.703], "rows": 512, "columns": 512,
               "reference": [ { "x": 0.41, "y": 0.55, "diameter_mm": 12.3, "readers": 4 } ],
               "ai": { "score": 0.83, "risk_level": "ALTO", "model_version": "multimodal-v1.2" } } ] }
```

- [ ] **Step 1: Crear el entorno.** `python -m venv .venv-practice`; `.venv-practice/Scripts/python.exe -m pip install -r scripts/requirements-practice.txt`. El requirements se escribe con la herramienta de archivos, nunca con `>` de PowerShell, porque guarda en UTF-16. Verificación: `python -c "import pylidc"` no falla.
- [ ] **Step 2: Escribir las pruebas que fallan.**
  - `consensus_features([{...calcification: 6...}, ...])` devuelve la mediana, con `calcification <= 6`, y lista las variables recortadas.
  - `is_reference(3, 6.0)` es `True`; `is_reference(2, 10)` es `False`; `is_reference(4, 31)` es `False`.
  - `normalized_center(256, 128, 512, 512)` es `(0.5, 0.25)`.
  - `lung_window_u8` da `0` para `-1350` HU y `255` para `150` HU.
- [ ] **Step 3:** Correr las pruebas. Esperado: FAIL. Implementar `practice_cases.py`. Correr de nuevo. Esperado: PASS.
- [ ] **Step 4: Implementar el CLI** `prepare_practice_cases.py`, con `--patients` (opcional), `--ai-url` (por defecto `https://oncoscan-ai.duckdns.org`) y `--dry-run`.
  1. Pacientes `test` de `docs/modelo-v2-densenet/splits/split_assignment.csv`, en orden alfabético. Se quedan los primeros 5 con al menos un nódulo de referencia (`pylidc` `scan.cluster_annotations()`).
  2. Descarga la serie desde `https://services.cancerimagingarchive.net/nbia-api/services/v1/getImage?SeriesInstanceUID=<uid>` (zip) a `samples/practice/dicom/<uid>/`, en una carpeta nueva por serie. Los DICOM se leen con `pydicom` desde el script, sin ejecutar nada desde esa carpeta.
  3. Elige el corte cuya posición z es la más cercana al centroide del nódulo de referencia más grande. Toma como referencia todos los nódulos de referencia con un contorno a ±½ grosor de corte de esa z.
  4. Guarda `caso-0N.png` con `lung_window_u8` y la entrada de la IA con `model_input_png` de `apps/api/app/services/ct_window.py`. Para importarlo, inserta `apps/api` en `sys.path`, como `prepare_lung_demo.py`.
  5. Hace `POST {ai-url}/predict` con `files={"imagen": ("imagen.png", png, "image/png")}` y las 8 variables como `data`. Lee `score`, `nivel_riesgo`, `modelo_version` y `heatmap_base64` (o `explicabilidad.overlay_base64`) y guarda `caso-0N-heatmap.png`.
  6. Escribe `manifest.json` y `provenance.json`. La procedencia lleva el paciente LIDC, la serie, la z, el sha256 del PNG, las variables, los recortes y la nota de que la partición es la de v2 y no la de v1.2.
- [ ] **Step 5: Ejecutar** `--dry-run` (lista los candidatos) y después la ejecución completa. Verificación: 5 casos en `manifest.json`, cada uno con al menos 1 referencia y los dos PNG existentes. Si TCIA u Oracle no responden, se detiene y se informa a Mateo; no se inventan datos.
- [ ] **Step 6: Commit.** `feat: casos de práctica LIDC-IDRI con referencia de los radiólogos y resultado de la IA precalculado`. Se añaden los archivos uno por uno; nunca `samples/practice/dicom/`.

---

### Task 7: Manifest y comparación del modo práctica

**Files:**
- Create: `apps/web/src/lib/practiceCases.ts`, `apps/web/src/lib/practiceCases.test.ts`
- Create: `apps/web/src/lib/practiceMath.ts`, `apps/web/src/lib/practiceMath.test.ts`

**Interfaces:**
- Consumes: `calibrationFor`, `measureMm` (`components/ui/measureMath.ts`), `PixelGeometry` y `Marker`.
- Produces:
  - `PRACTICE_MANIFEST_URL = "/demo/practica/manifest.json"` y `PRACTICE_BASE = "/demo/practica/"`.
  - `type PracticeReference = { x: number; y: number; diameterMm: number; readers: number }`.
  - `type PracticeCase = { id: string; imageUrl: string; heatmapUrl: string; geometry: PixelGeometry; reference: PracticeReference[]; ai: { score: number; riskLevel: RiskLevel; modelVersion: string } }`.
  - `parsePracticeManifest(json: unknown): PracticeCase[] | null`.
  - `MATCH_RADIUS_MM = 10`.
  - `markerAnchor(m: Marker): Point`.
  - `matchReader(anchors: Point[], reference: PracticeReference[], geometry: PixelGeometry): { found: boolean[]; unmatched: number }`.
  - `practiceSummary(found: boolean[], unmatched: number): string`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `parsePracticeManifest`:
    - con un manifest válido, arma `imageUrl = "/demo/practica/caso-01.png"`;
    - devuelve `null` si falta `cases`, si una `x` está fuera de [0, 1] o si `risk_level` no es un nivel conocido.
  - `markerAnchor`: un punto devuelve `(x, y)`; una medición devuelve el punto medio.
  - `matchReader`, con una geometría de 512×512 a 1 mm/px:
    - un ancla a exactamente 10 mm cuenta como encontrada;
    - a 10,01 mm, no;
    - dos anclas cerca del mismo nódulo dan `found=[true]` y `unmatched=1`;
    - el emparejamiento es por la pareja global más cercana: con A cerca de R1 y R2, y B cerca solo de R1, quedan los dos nódulos encontrados.
  - `practiceSummary`:
    - `([true,false],0)` da `"Encontraste 1 de 2 nódulos de referencia."`;
    - `([true],0)` da `"Encontraste 1 de 1 nódulo de referencia."`;
    - `([false],1)` termina con `" 1 marca no coincide con ningún nódulo de referencia."`;
    - `([false],2)` termina con `" 2 marcas no coinciden con ningún nódulo de referencia."`.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Para la distancia en mm se usa `calibrationFor(geometry, { w: geometry.columns, h: geometry.rows })` y luego `measureMm`, con la misma convención de ejes que Medir.
- [ ] **Step 4:** Correr las pruebas. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): comparación de marcas con la referencia en el modo práctica`

---

### Task 8: Página del modo práctica

**Files:**
- Create: `apps/web/src/app/platform/practica/page.tsx`, `loading.tsx`, `PracticeSession.tsx`, `PracticeResult.tsx`, `PracticeSession.test.tsx`

**Interfaces:**
- Consumes:
  - Tarea 3 (`BeforeAfterViewer` con `aiHiddenReason={PRACTICE_VIEWER_REASON}`, `onMarkersChange` y `pixelGeometry`; sin `annotations`).
  - Tarea 7.
- Produces: `PRACTICE_VIEWER_REASON`, exportado desde `practiceCases.ts`, y las constantes de texto `PRACTICE_AI_NOTICE` y `PRACTICE_FOOTER`, con el texto del spec, sección 4.4.

- [ ] **Step 1: Escribir las pruebas que fallan**, con `fetch` simulado devolviendo un manifest de 2 casos.
  - La intro muestra `PRACTICE_AI_NOTICE` y el botón `"Empezar"`.
  - Tras "Empezar", el visor no tiene imagen de mapa de calor y aparece el botón `"Ver resultado"`.
  - Tras "Ver resultado", aparecen:
    - el resumen de `practiceSummary`;
    - el score con formato `"83,0 %"` (`toLocaleString("es-CO")`);
    - un `RiskBadge`;
    - una lista accesible de los nódulos de referencia (`"Nódulo de referencia 1: 12,3 mm, marcado por 4 de 4 radiólogos"`).
  - "Siguiente caso" pasa al caso 2.
  - En el último caso, el botón es `"Terminar"` y lleva al cierre: `"Terminaste los casos de práctica."`.
  - Si `fetch` falla o el manifest no es válido, aparece `"No se pudieron cargar los casos de práctica."` con el botón `"Reintentar"`.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - `page.tsx` es de servidor: comprueba la sesión (redirige a `/login`, como Ajustes), lleva el `SectionHeader` `"Modo práctica"` y el pie `PRACTICE_FOOTER`.
  - `PracticeSession` es un cliente, con los estados `intro | reading(i) | result(i) | done`. Al pasar de un caso a otro remonta el visor con `key={caseId + intento}`.
  - `PracticeResult`:
    - dibuja la imagen y una capa SVG, con los anillos de referencia en línea discontinua, del radio real en mm convertido a la escala de la imagen, y las marcas del lector numeradas;
    - ofrece un interruptor `"Mostrar mapa de calor de la IA"` que superpone `heatmapUrl`;
    - la capa SVG es `aria-hidden` y la lista de texto es la alternativa accesible.
- [ ] **Step 4:** Correr las pruebas. Esperado: PASS.
- [ ] **Step 5: Commit.** `feat(web): modo práctica con casos LIDC-IDRI`

---

### Task 9: Enlaces y dashboard (solo con el PR de versiones en `main`)

**Condición:** `git log main --oneline` muestra el merge del PR de versiones. Si no lo muestra, esta tarea se salta y se informa a Mateo.

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx` (entrada `"Modo práctica"` a `/platform/practica`, después de "Análisis por lotes")
- Modify: `apps/web/src/app/platform/page.tsx` (enlace `"Ver demostración 3D"` a `/demo/pulmon-3d`; `loadBlindContext` y `maskBlindPending` en la lista reciente y en el conteo `ALTO`, igual que en reportes)

- [ ] **Step 1:** `git merge main` en la rama. Si hay conflictos, se resuelven conservando los cambios del PR de versiones.
- [ ] **Step 2: Escribir las pruebas que fallan** (si no existe un test del dashboard, se crea uno con Supabase simulado):
  - una fila pendiente muestra `"Pendiente de lectura"`;
  - existe el enlace `"Ver demostración 3D"` con `href="/demo/pulmon-3d"`.
- [ ] **Step 3: Implementar.** Correr las pruebas. Esperado: PASS.
- [ ] **Step 4: Commit.** `feat(web): enlaces al modo práctica y a la demo 3D, y lectura ciega en el dashboard`

---

### Task 10: Verificación final

- [ ] **Step 1:** En `apps/web`, correr `npx vitest run`, `npx tsc --noEmit` y `npx eslint src`. Esperado: 0 fallos, 0 errores y 0 warnings.
- [ ] **Step 2:** Correr `.venv-practice/Scripts/python.exe -m pytest scripts/tests -q`. Esperado: PASS.
- [ ] **Step 3:** Ejecutar `/oncoscan-a11y` sobre `apps/web/src/app/platform/practica/` y `apps/web/src/app/platform/uploads/[id]/`, y `/oncoscan-clinical-review` sobre los mismos directorios. Lo crítico se corrige, cada corrección con una prueba que primero falla y en su propio commit.
- [ ] **Step 4:** Actualizar la fila D de la tabla 10.7 de `docs/plan-trabajo-semana-entrante.md` como hecha, con la rama. Commit: `docs: estado de la Fase D del visor`.
- [ ] **Step 5:** Informar a Mateo de los pasos manuales:
  1. Aplicar `20261028120000_blind_reading.sql`.
  2. Activar la lectura ciega en Ajustes, subir `samples/volume-rendering-v2/dicom_unitario_caso01.dcm` y comprobar que no se ve la IA en la subida, el historial, las alertas ni el informe.
  3. Registrar la impresión y comprobar que la IA aparece y que el formulario llega prellenado.
  4. Recorrer los 5 casos de `/platform/practica` en el portátil y en el móvil.
