# Visor — Fase C (persistencia de marcadores) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar automáticamente en Supabase los marcadores del visor (tabla `upload_annotations`) y cargarlos al abrir el estudio, en el historial y en la pantalla de subida.

**Architecture:** Una migración crea `upload_annotations` con RLS igual que `upload_reviews`. La validación y el mapeo fila↔marcador son funciones puras en `src/lib/uploadAnnotations.ts`. Dos server actions (guardar y borrar) viven junto a la de la valoración. En el cliente, `useMarkerAutosave` compara el estado anterior con el nuevo, agrupa las escrituras por marcador con espera de 700 ms, serializa las operaciones de un mismo marcador y expone el estado del guardado. El visor recibe una prop opcional `annotations`; sin ella se comporta como en la Fase B.

**Tech Stack:** Next.js 16 (server actions), React 19, Supabase (PostgreSQL + RLS), Vitest 4 + Testing Library.

**Spec:** [docs/plan-trabajo-semana-entrante.md](../../plan-trabajo-semana-entrante.md), secciones 10.4 (modelo de datos) y 10.7 (fila C). Plan anterior: [2026-10-20-visor-fase-b.md](2026-10-20-visor-fase-b.md).

**Fuera de alcance:** sugerir en el formulario de valoración el `size_mm` de un marcador (la spec lo plantea como opcional), la herramienta Medir (`kind = 'measure'`, la columna queda lista), la lectura ciega (Fase D) y ver los marcadores de otros médicos.

## Decisiones de diseño

Las dos primeras las decidió el usuario. El resto son decisiones del plan, a revisar.

1. **Guardado automático.** Crear, mover, editar y borrar se guardan solos. Las escrituras de un marcador se agrupan con una espera de 700 ms tras el último cambio, para no escribir en cada letra de la nota. Borrar es inmediato. El panel muestra «Los marcadores se guardan automáticamente», «Guardando…», «Guardado» o «No se pudo guardar» con el botón «Reintentar».
2. **Se guarda en las dos pantallas:** en el historial (`uploads/[id]`) y en la de subida (`upload`), porque el estudio ya existe en la base de datos cuando se muestra el resultado.
3. El marcador se identifica por `(upload_id, seq)`: la acción hace `upsert` con `onConflict: "upload_id,seq"`. El cliente no necesita conocer el `uuid` de la fila.
4. **Si la carga inicial falla** (por ejemplo, la migración aún no está aplicada), el guardado queda desactivado y el panel lo avisa. Sin esto, un marcador nuevo con `seq = 1` sobrescribiría el marcador 1 que sí estaba guardado.
5. Al recargar, el siguiente número es el mayor `seq` guardado + 1. Si se borró el de número más alto, ese número puede reutilizarse después de recargar. Se acepta.
6. Las server actions se pasan al visor por props (la página es dueña de la conexión a datos). Así `components/ui` no importa nada de `app/` y los tests usan funciones falsas.
7. Si se intenta salir con cambios pendientes o con error, aparece el aviso estándar del navegador (`beforeunload`). Al desmontar el visor, las escrituras pendientes se envían sin esperar.
8. No se usa `revalidatePath` en estas acciones: el visor ya tiene el estado, y revalidar en cada letra recargaría la página del servidor.

## Global Constraints

- Directorio de trabajo para los comandos: `apps/web`. Rama `feat/visor-fase-c` desde `main`.
- **Nunca** `git add -A` ni `git add .`: `apps/web/package-lock.json` y `apps/web/src/app/visor-demo/` no son parte de esta tarea. Siempre rutas explícitas.
- Commits en español, `tipo: descripción`, sin `Co-Authored-By` ni menciones de IA. El push y el PR los hace el usuario.
- La migración se aplica **a mano** en Supabase → SQL Editor, como las anteriores. El archivo lleva en la cabecera la instrucción y el `ROLLBACK`.
- RLS: la subconsulta va sobre `dicom_uploads`, **nunca** sobre `upload_annotations` (recursión ya vivida). Capturar siempre `error` en las queries server-side.
- PHI: `note` nunca va a `console.*` ni a logs. Los errores se devuelven solo como tipo (`"sesion" | "invalido" | "guardado"`).
- Valores de la spec 10.4: `kind IN ('point','measure')`; `x, y BETWEEN 0 AND 1`; `finding_type IN ('solido','subsolido','vidrio_esmerilado','calcificado','artefacto','otro')`; `ai_agreement IN ('ia_marco','ia_no_marco','ia_falso_positivo')`; `size_mm numeric(5,1)`, `> 0 AND <= 300`; `char_length(note) <= 1000`; `seq` único por `upload_id`; trigger `set_updated_at()` reutilizado.

## Review Focus

1. **Falla la carga de los marcadores guardados:** el visor no debe guardar nada (sobrescribiría por `seq`) y debe decirlo. → test en la Task 4.
2. **Borrar un marcador con un guardado pendiente o en curso:** el marcador no debe reaparecer en la base de datos. → test en la Task 3.
3. **Escribir la nota de corrido:** una sola escritura por pausa, con el último valor. → test en la Task 3.
4. **Salir de la página con escrituras pendientes:** se envían al desmontar el visor. → test en la Task 3.
5. **El servidor rechaza** (sesión vencida, RLS, datos fuera de rango manipulados desde el cliente): estado de error, «Reintentar» vuelve a enviar, y la acción valida todo antes de tocar la base de datos. → tests en las Tasks 2, 3 y 4.

---

### Task 1: Migración y validación pura

**Files:**
- Create: `supabase/migrations/20261021120000_upload_annotations.sql`
- Create: `apps/web/src/lib/uploadAnnotations.ts`
- Test: `apps/web/src/lib/uploadAnnotations.test.ts`
- Modify: `apps/web/src/lib/uploadReview.ts` (exportar `UUID_RE`)

**Interfaces:**
- Consumes: `FindingType`, `AiAgreement`, `Marker`, `FINDING_TYPE_OPTIONS`, `AI_AGREEMENT_OPTIONS`, `MARKER_NOTE_MAX`, `MARKER_SIZE_MAX_MM` de `@/components/ui/markerState` (solo tipos y constantes).
- Produces:
  ```ts
  export type AnnotationInput = {
    uploadId: string; seq: number; x: number; y: number;
    findingType: FindingType | null; aiAgreement: AiAgreement | null;
    note: string; sizeMm: number | null;
  };
  export type AnnotationRow = {
    seq: number; x: number; y: number;
    finding_type: string | null; ai_agreement: string | null;
    note: string | null; size_mm: number | string | null;
  };
  export type AnnotationDbValues = {
    upload_id: string; seq: number; kind: "point"; x: number; y: number;
    finding_type: FindingType | null; ai_agreement: AiAgreement | null;
    note: string; size_mm: number | null;
  };
  export const ANNOTATION_COLUMNS = "seq, x, y, finding_type, ai_agreement, note, size_mm";
  export function parseAnnotation(input: unknown): { ok: true; values: AnnotationDbValues } | { ok: false };
  export function rowToMarker(row: AnnotationRow): Marker | null;   // null si la fila no es válida
  export function isValidSeq(seq: unknown): seq is number;           // entero 1..32767
  ```

**Migración** (sigue el formato de `20261002120000_upload_reviews.sql`): columnas `id uuid PK default gen_random_uuid()`, `upload_id uuid NOT NULL REFERENCES dicom_uploads(id) ON DELETE CASCADE`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `seq smallint NOT NULL CHECK (seq > 0)`, `kind text NOT NULL DEFAULT 'point'`, `x real NOT NULL`, `y real NOT NULL`, `x2 real NULL`, `y2 real NULL`, `finding_type`, `ai_agreement`, `size_mm numeric(5,1)`, `note text NOT NULL DEFAULT ''`, `created_at`, `updated_at`; con los CHECK de la sección Global Constraints (`x2/y2` también entre 0 y 1 cuando no son null), `UNIQUE (upload_id, seq)` e índice `(upload_id, seq)`. Trigger `upload_annotations_set_updated_at` con `public.set_updated_at()` (no se redefine la función). Políticas `select/insert/update/delete _own`; `insert` y `update` exigen `auth.uid() = user_id` **y** `EXISTS (SELECT 1 FROM public.dicom_uploads d WHERE d.id = upload_id AND d.user_id = auth.uid())`. Cabecera: «Aplicar manualmente en el dashboard Supabase > SQL Editor» y `ROLLBACK: DROP TABLE IF EXISTS public.upload_annotations;`. Comentario: `note` es PHI.

`parseAnnotation`: rechaza si `uploadId` no cumple `UUID_RE`, `seq` no pasa `isValidSeq`, `x`/`y` no son números finitos en [0,1], `findingType`/`aiAgreement` no son `null` ni un valor del catálogo, `sizeMm` no es `null` ni un número finito en (0, 300], o `note` no es string o pasa de 1000 caracteres. `size_mm` se redondea a 1 decimal.

`rowToMarker`: `id = \`m${seq}\``; `size_mm` puede llegar como string desde PostgREST (`numeric`) → `Number`. Devuelve `null` si `seq`, `x` o `y` no son válidos; un `finding_type`/`ai_agreement` desconocido se vuelve `null`.

- [ ] **Step 1: Crear la rama**

Run: `git switch -c feat/visor-fase-c`

- [ ] **Step 2: Escribir los tests**

```ts
const OK = { uploadId: "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b", seq: 1, x: 0.25, y: 0.75,
  findingType: "solido", aiAgreement: "ia_no_marco", note: "Borde liso", sizeMm: 8.46 };

it("acepta un marcador válido y lo pasa a columnas", () => {
  expect(parseAnnotation(OK)).toEqual({ ok: true, values: { upload_id: OK.uploadId, seq: 1, kind: "point",
    x: 0.25, y: 0.75, finding_type: "solido", ai_agreement: "ia_no_marco", note: "Borde liso", size_mm: 8.5 } });
});
it("rechaza datos manipulados", () => {
  for (const bad of [
    { uploadId: "abc" }, { seq: 0 }, { seq: 1.5 }, { seq: 40000 }, { x: 1.2 }, { y: -0.1 }, { x: Number.NaN },
    { findingType: "maligno" }, { aiAgreement: "x" }, { sizeMm: 0 }, { sizeMm: 301 }, { note: "x".repeat(1001) }, { note: 5 },
  ]) expect(parseAnnotation({ ...OK, ...bad }).ok).toBe(false);
  expect(parseAnnotation(null).ok).toBe(false);
});
it("acepta tipo, opinión y tamaño vacíos", () => {
  expect(parseAnnotation({ ...OK, findingType: null, aiAgreement: null, sizeMm: null, note: "" }).ok).toBe(true);
});
it("rowToMarker convierte la fila (size_mm puede venir como texto)", () => {
  expect(rowToMarker({ seq: 3, x: 0.5, y: 0.5, finding_type: "otro", ai_agreement: null, note: null, size_mm: "12.0" }))
    .toEqual({ id: "m3", seq: 3, x: 0.5, y: 0.5, findingType: "otro", aiAgreement: null, note: "", sizeMm: 12 });
});
it("rowToMarker descarta filas corruptas y limpia valores desconocidos", () => {
  expect(rowToMarker({ seq: 0, x: 0.5, y: 0.5, finding_type: null, ai_agreement: null, note: "", size_mm: null })).toBeNull();
  expect(rowToMarker({ seq: 1, x: 0.5, y: 0.5, finding_type: "raro", ai_agreement: "raro", note: "", size_mm: null }))
    .toMatchObject({ findingType: null, aiAgreement: null });
});
```

- [ ] **Step 3: Correr y ver que fallan** — `npx vitest run src/lib/uploadAnnotations.test.ts` → FAIL (no existe el módulo).
- [ ] **Step 4: Implementar** `uploadAnnotations.ts`, exportar `UUID_RE` y escribir la migración.
- [ ] **Step 5: Correr y ver que pasan** — mismo comando → PASS; `npx vitest run src/lib` → PASS (la valoración sigue verde).
- [ ] **Step 6: Commit**

```bash
git add ../../supabase/migrations/20261021120000_upload_annotations.sql src/lib/uploadAnnotations.ts src/lib/uploadAnnotations.test.ts src/lib/uploadReview.ts
git commit -m "feat(db): tabla upload_annotations con RLS y validación de marcadores"
```

---

### Task 2: Server actions de guardar y borrar

**Files:**
- Modify: `apps/web/src/app/platform/uploads/[id]/actions.ts`
- Test: `apps/web/src/app/platform/uploads/[id]/annotationActions.test.ts` (archivo nuevo, para no mezclar los mocks con los de la valoración)

**Interfaces:**
- Consumes: `parseAnnotation`, `isValidSeq`, `AnnotationInput` (Task 1); `UUID_RE`.
- Produces:
  ```ts
  export type AnnotationResult = { ok: true } | { ok: false; error: "sesion" | "invalido" | "guardado" };
  export async function saveAnnotationAction(input: AnnotationInput): Promise<AnnotationResult>;
  export async function deleteAnnotationAction(uploadId: string, seq: number): Promise<AnnotationResult>;
  ```
  Orden: validar → sesión → query. `save`: `.from("upload_annotations").upsert({ ...values, user_id: user.id }, { onConflict: "upload_id,seq" })`. `delete`: `.from("upload_annotations").delete().eq("upload_id", uploadId).eq("seq", seq)`. Cualquier `error` de Supabase → `{ ok: false, error: "guardado" }`. Sin `console.*`, sin `revalidatePath`.

- [ ] **Step 1: Escribir los tests** (mismo estilo de mocks que `actions.test.ts`)

```ts
it("guarda con upsert por (upload_id, seq) y el user_id de la sesión", async () => {
  expect(await saveAnnotationAction(OK)).toEqual({ ok: true });
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ upload_id: OK.uploadId, seq: 1, user_id: "user-abc", note: "Borde liso" }),
    { onConflict: "upload_id,seq" });
});
it("rechaza datos inválidos sin tocar la base de datos", async () => {
  expect(await saveAnnotationAction({ ...OK, x: 3 })).toEqual({ ok: false, error: "invalido" });
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("sin sesión devuelve error de sesión", async () => {
  mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
  expect(await saveAnnotationAction(OK)).toEqual({ ok: false, error: "sesion" });
});
it("un error de Supabase (RLS, red) se devuelve como tipo, sin detalle", async () => {
  mocks.upsertResult.mockResolvedValueOnce({ error: { message: "new row violates row-level security" } });
  expect(await saveAnnotationAction(OK)).toEqual({ ok: false, error: "guardado" });
});
it("borra por upload_id y seq", async () => {
  expect(await deleteAnnotationAction(OK.uploadId, 2)).toEqual({ ok: true });
  expect(mocks.eq).toHaveBeenNthCalledWith(1, "upload_id", OK.uploadId);
  expect(mocks.eq).toHaveBeenNthCalledWith(2, "seq", 2);
});
it("borrar valida id y seq", async () => {
  expect(await deleteAnnotationAction("abc", 2)).toEqual({ ok: false, error: "invalido" });
  expect(await deleteAnnotationAction(OK.uploadId, 0)).toEqual({ ok: false, error: "invalido" });
});
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run "src/app/platform/uploads/[id]/annotationActions.test.ts"` → FAIL.
- [ ] **Step 3: Implementar** las dos acciones.
- [ ] **Step 4: Correr y ver que pasan** — el archivo nuevo y `actions.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add "src/app/platform/uploads/[id]/actions.ts" "src/app/platform/uploads/[id]/annotationActions.test.ts"
git commit -m "feat(web): server actions para guardar y borrar marcadores"
```

---

### Task 3: Guardado automático en el cliente

**Files:**
- Create: `apps/web/src/components/ui/useMarkerAutosave.ts`
- Test: `apps/web/src/components/ui/useMarkerAutosave.test.ts`
- Modify: `apps/web/src/components/ui/markerState.ts` (agregar `markersStateFrom`)
- Test: `apps/web/src/components/ui/markerState.test.ts`

**Interfaces:**
- Consumes: `Marker`, `MarkersState` (Fase B).
- Produces:
  ```ts
  // markerState.ts
  /** Estado inicial desde marcadores guardados: ordenados por seq, nextSeq = mayor + 1, sin selección. */
  export function markersStateFrom(markers: Marker[]): MarkersState;
  // useMarkerAutosave.ts
  export type SaveStatus = "idle" | "saving" | "saved" | "error";
  export const AUTOSAVE_DELAY_MS = 700;
  /** Por seq: marcadores nuevos o con algún campo distinto → upserts; seq que ya no está → removals. */
  export function diffMarkers(prev: Marker[], next: Marker[]): { upserts: Marker[]; removals: number[] };
  export function useMarkerAutosave(opts: {
    markers: Marker[];
    enabled: boolean;
    save: (m: Marker) => Promise<boolean>;
    remove: (seq: number) => Promise<boolean>;
    delayMs?: number;
  }): { status: SaveStatus; retry: () => void };
  ```

Comportamiento del hook:
- Los `markers` del primer render son la línea base (vienen de la base de datos): no se guardan.
- Cada cambio de `markers` se compara con el anterior (`diffMarkers`). Cada upsert reinicia un temporizador **por seq**; al vencer envía el **último** valor de ese marcador.
- Un removal cancela el temporizador de ese seq y se envía de inmediato.
- Las operaciones de un mismo seq se encadenan (una promesa por seq), así un borrado nunca llega antes que un guardado previo del mismo marcador.
- `status`: `"saving"` mientras haya temporizadores o envíos en curso; `"saved"` cuando terminan todos bien; `"error"` si alguno devuelve `false` o lanza (los seq fallidos se recuerdan).
- `retry()` vuelve a enviar los seq fallidos (upsert con el valor actual, o remove si ya no existe).
- Al desmontar, los temporizadores pendientes se envían sin esperar.
- Con `status` en `"saving"` o `"error"`, registra un `beforeunload` que llama a `preventDefault()`.
- Con `enabled = false` no hace nada y `status` se queda en `"idle"`.

- [ ] **Step 1: Escribir los tests** (`vi.useFakeTimers()`, `renderHook` con `rerender({ markers })`, `save`/`remove` como `vi.fn().mockResolvedValue(true)`)

```ts
it("markersStateFrom ordena y continúa la numeración", () => {
  const s = markersStateFrom([mk(3), mk(1)]);
  expect(s.markers.map((m) => m.seq)).toEqual([1, 3]);
  expect(s.nextSeq).toBe(4);
  expect(s.selectedId).toBeNull();
  expect(markersStateFrom([]).nextSeq).toBe(1);
});
it("diffMarkers detecta nuevos, cambiados y borrados", () => {
  expect(diffMarkers([mk(1), mk(2)], [mk(1), { ...mk(2), note: "x" }, mk(3)]))
    .toEqual({ upserts: [{ ...mk(2), note: "x" }, mk(3)], removals: [] });
  expect(diffMarkers([mk(1), mk(2)], [mk(2)])).toEqual({ upserts: [], removals: [1] });
});
it("no guarda los marcadores con los que arranca", async () => { /* render con [mk(1)], avanzar 2000 ms → save no llamado, status "idle" */ });
it("agrupa la escritura de la nota: un solo save con el último valor", async () => {
  // rerender con note "B", "Bo", "Bor" separados 100 ms; avanzar 700 ms
  // → save llamado 1 vez con note "Bor"; status "saved"
});
it("borrar cancela el guardado pendiente y no lo reenvía", async () => {
  // agregar mk(2) (pendiente) y luego quitarlo antes de 700 ms
  // → remove(2) llamado; save nunca llamado con seq 2
});
it("un borrado espera al guardado en curso del mismo marcador", async () => {
  // save de seq 2 que resuelve con un deferred; quitar mk(2) mientras está en curso
  // → remove(2) se llama solo después de resolver el save
});
it("error y reintento", async () => {
  // save resuelve false → status "error"; retry() con save → true → status "saved" y save llamado 2 veces
});
it("al desmontar envía lo pendiente", async () => { /* cambio pendiente + unmount() → save llamado sin avanzar el reloj */ });
it("avisa antes de salir con cambios pendientes", () => {
  // con un cambio pendiente: dispatchEvent(new Event("beforeunload", { cancelable: true })) → defaultPrevented true
});
it("deshabilitado no guarda", () => { /* enabled false → nada */ });
```

`mk(seq)` en el test: `{ id: \`m${seq}\`, seq, x: 0.5, y: 0.5, findingType: null, aiAgreement: null, note: "", sizeMm: null }`.

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/components/ui/useMarkerAutosave.test.ts src/components/ui/markerState.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `markersStateFrom` y el hook. Guardar en refs (no en estado) los temporizadores, las cadenas por seq, los marcadores actuales y los seq fallidos; `status` es estado de React.
- [ ] **Step 4: Correr y ver que pasan** — mismo comando → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/components/ui/useMarkerAutosave.ts src/components/ui/useMarkerAutosave.test.ts src/components/ui/markerState.ts src/components/ui/markerState.test.ts
git commit -m "feat(web): guardado automático de marcadores con espera y orden por marcador"
```

---

### Task 4: Visor y panel con persistencia

**Files:**
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx`
- Modify: `apps/web/src/components/ui/MarkerPanel.tsx`
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `markersStateFrom`, `useMarkerAutosave`, `SaveStatus` (Task 3); `AnnotationInput`, `AnnotationResult` (Tasks 1–2, solo tipos).
- Produces:
  ```ts
  // BeforeAfterViewer.tsx — prop nueva y opcional
  export type ViewerAnnotations = {
    uploadId: string;
    initial: Marker[];
    /** La carga de los guardados falló: no se guarda nada para no sobrescribir. */
    loadFailed?: boolean;
    save: (input: AnnotationInput) => Promise<AnnotationResult>;
    remove: (uploadId: string, seq: number) => Promise<AnnotationResult>;
  };
  // MarkerPanel recibe además:
  saveState?: { status: SaveStatus; loadFailed: boolean; onRetry: () => void };  // ausente = sin persistencia (Fase B)
  ```
  `useReducer(markersReducer, annotations?.initial ?? [], markersStateFrom)`. El autosave usa `enabled = !!annotations && !annotations.loadFailed`, con `save = (m) => annotations.save({ uploadId, ...campos de m }).then((r) => r.ok)` y `remove` análogo. Si la promesa lanza, cuenta como `false`.

Textos del panel (en lugar del aviso de la Fase B, que se mantiene cuando no hay `saveState`), en un `<p aria-live="polite">` **sin** `role="status"` (el visor ya tiene uno):
- `idle`: «Los marcadores se guardan automáticamente.»
- `saving`: «Guardando…»
- `saved`: «Guardado.»
- `error`: «No se pudieron guardar los últimos cambios.» + botón «Reintentar».
- `loadFailed`: «No se pudieron cargar los marcadores guardados. Para no sobrescribirlos, los cambios de esta sesión no se guardarán; recarga la página para intentarlo de nuevo.»

- [ ] **Step 1: Escribir los tests**

```tsx
function renderWithAnnotations(over: Partial<ViewerAnnotations> = {}) {
  const save = vi.fn().mockResolvedValue({ ok: true });
  const remove = vi.fn().mockResolvedValue({ ok: true });
  render(<BeforeAfterViewer beforeUrl="/estudio.png" heatmapBase64="AAAA"
    annotations={{ uploadId: UPLOAD_ID, initial: [], save, remove, ...over }} />);
  return { visor: screen.getByRole("group", { name: /Visor de tomografía/ }), save, remove };
}

it("muestra los marcadores guardados al abrir", () => {
  renderWithAnnotations({ initial: [{ ...mk(2), findingType: "solido" }] });
  expect(screen.getByRole("button", { name: /^Marcador 2: nódulo sólido/ })).toBeInTheDocument();
});
it("un marcador nuevo continúa la numeración y se guarda solo", async () => {
  vi.useFakeTimers();
  const { visor, save } = renderWithAnnotations({ initial: [mk(2)] });
  addMarkerWithKeyboard(visor);
  expect(screen.getByRole("button", { name: /^Marcador 3/ })).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(700));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ uploadId: UPLOAD_ID, seq: 3 }));
  expect(screen.getByText("Guardado.")).toBeInTheDocument();
});
it("borrar llama a remove", async () => { /* initial [mk(1)], borrar con confirmación → remove(UPLOAD_ID, 1) */ });
it("si el guardado falla, muestra el error y Reintentar vuelve a enviar", async () => {
  // save → { ok: false, error: "guardado" } y luego { ok: true }; clic en «Reintentar» → save 2 veces, «Guardado.»
});
it("si la carga falló, avisa y no guarda nada", async () => {
  vi.useFakeTimers();
  const { visor, save } = renderWithAnnotations({ loadFailed: true });
  addMarkerWithKeyboard(visor);
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText(/No se pudieron cargar los marcadores guardados/)).toBeInTheDocument();
});
it("sin annotations conserva el aviso de la Fase B", () => {
  renderViewer();
  expect(screen.getByText(/todavía no se guardan/)).toBeInTheDocument();
});
```

`afterEach(() => vi.useRealTimers())` en el bloque.

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx` → FAIL en los nuevos; los anteriores pasan.
- [ ] **Step 3: Implementar** la prop, el hook y los textos del panel.
- [ ] **Step 4: Correr y ver que pasan** — `npx vitest run src/components/ui/` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/components/ui/BeforeAfterViewer.tsx src/components/ui/MarkerPanel.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): el visor guarda y carga los marcadores y muestra el estado del guardado"
```

---

### Task 5: Conectar las páginas

**Files:**
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx`
- Modify: `apps/web/src/app/platform/upload/page.tsx`

**Interfaces:**
- Consumes: `ANNOTATION_COLUMNS`, `AnnotationRow`, `rowToMarker` (Task 1); `saveAnnotationAction`, `deleteAnnotationAction` (Task 2); `ViewerAnnotations` (Task 4).

`uploads/[id]/page.tsx`: si `isAnalyzed`, consultar `.from("upload_annotations").select(ANNOTATION_COLUMNS).eq("upload_id", id).order("seq")`. Con `error`: `initial = []` y `loadFailed = true` (no loguear). Sin error: `initial = rows.map(rowToMarker).filter(Boolean)`. Pasar `annotations={{ uploadId: upload.id, initial, loadFailed, save: saveAnnotationAction, remove: deleteAnnotationAction }}`.

`upload/page.tsx` (client): `annotations={{ uploadId: analysisResult.dicom_id, initial: [], save: saveAnnotationAction, remove: deleteAnnotationAction }}`, importando las acciones desde `../uploads/[id]/actions` (como ya se importa `ClinicalReviewForm`).

- [ ] **Step 1: Implementar** los dos cambios.
- [ ] **Step 2: Verificar tipos y suite**

Run: `npx tsc --noEmit; npx vitest run`
Expected: sin errores; todo en verde.

- [ ] **Step 3: Commit**

```bash
git add "src/app/platform/uploads/[id]/page.tsx" src/app/platform/upload/page.tsx
git commit -m "feat(web): cargar los marcadores guardados en el historial y guardarlos también desde la subida"
```

---

### Task 6: Verificación, documentación y entrega

**Files:**
- Modify: `apps/web/CLAUDE.md` (fila del visor: persistencia), `docs/plan-trabajo-semana-entrante.md` (estado de la sección 10, fila C ✅, casilla de «recarga» en 10.8), memoria `visor-fases-estado.md`.

- [ ] **Step 1:** `npx vitest run; npx tsc --noEmit; npm run lint` → todo en verde. `git grep -n "console\." src` → solo `platform/error.tsx`.
- [ ] **Step 2:** `/oncoscan-clinical-review` sobre `actions.ts` y `useMarkerAutosave.ts` (PHI, errores genéricos). Corregir hallazgos de esta fase con un commit `fix:` cada uno.
- [ ] **Step 3: Commit de la documentación** (incluye este plan).

```bash
git add apps/web/CLAUDE.md docs/plan-trabajo-semana-entrante.md docs/superpowers/plans/2026-10-21-visor-fase-c.md
git commit -m "docs: documentar la fase C del visor"
```

- [ ] **Step 4: Entregar al usuario**: el SQL a ejecutar en Supabase → SQL Editor (contenido de la migración), cómo comprobarlo (crear un marcador, recargar, verlo; abrir el estudio con otra cuenta y no verlo) y los comandos de push, PR y merge.
