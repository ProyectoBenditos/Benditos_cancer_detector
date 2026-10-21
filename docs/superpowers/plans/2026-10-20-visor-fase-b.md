# Visor — Fase B (herramientas, marcadores y panel lateral) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al visor una paleta con una sola herramienta activa (Mover, Brillo/Contraste, Marcador; Medir desactivado), marcadores numerados con nota y un panel lateral (score, marcadores, valoración) que también se vea en pantalla completa, todo solo en el navegador.

**Architecture:** La lógica nueva va en módulos puros con tests: `viewerTools.ts` (brillo/contraste y clic frente a arrastre), `markerMath.ts` (coordenadas normalizadas sobre el rectángulo real de la imagen), `markerState.ts` (reducer de marcadores) y las funciones nuevas de `viewerKeys.ts` y `panZoomMath.ts`. `BeforeAfterViewer.tsx` se divide en `ViewerToolbar`, `MarkerLayer` y `MarkerPanel`. El ruteo del puntero según la herramienta se hace en un hook, `useToolPointer.ts`, que delega el pan en `usePanZoom`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest 4 + Testing Library (jsdom 29), lucide-react.

**Spec:** [docs/plan-trabajo-semana-entrante.md](../../plan-trabajo-semana-entrante.md), secciones 10.2 (problema 3), 10.3-A, 10.3-B, 10.3-C, 10.5 (punto 4), 10.7 (fila B y pendientes de la Fase A) y 10.8. Se ignora `docs/plan-modelo-v2.0-segmentacion-volumetrica.md`.

**Fuera de alcance (Fase C en adelante):** guardar los marcadores en Supabase (`upload_annotations`), la herramienta Medir funcional, el WW/WL real, la lectura ciega y el modo práctica.

## Decisiones de diseño

Las tres primeras las decidió el usuario. El resto son decisiones del plan, a revisar.

1. **La nota se edita en el panel lateral**, no en una ventana flotante: al crear o seleccionar un pin, su formulario se abre en la fila de ese marcador. En móvil, dentro de la hoja inferior.
2. **El panel siempre está visible.** En escritorio (`lg`) va en dos columnas, tanto en la vista normal como en pantalla completa. En móvil, fuera de pantalla completa se apila bajo la imagen; dentro es una hoja inferior plegable.
3. **Exportar con consentimiento.** Si algún marcador tiene nota, al descargar se abre un diálogo con la casilla «Incluir el texto de las notas (contiene datos clínicos)», **desmarcada** por defecto. Sin la casilla, la imagen lleva solo los números de los pins; con ella, además, una leyenda numerada al pie. Si ningún marcador tiene nota, se descarga directamente.
4. Brillo/Contraste se aplica solo a la TAC, no al mapa de calor. Arrastre horizontal = contraste, vertical = brillo (hacia arriba aclara). El doble clic restablece el ajuste. La tecla `0` restablece zoom, pan y ajuste.
5. Con la herramienta Marcador, un clic (movimiento menor de 5 px) crea un pin; un arrastre mayor desplaza la imagen. Con Mover, arrastrar desplaza. La rueda hace zoom con cualquier herramienta.
6. Los números de los marcadores no se reutilizan al borrar (coinciden con `seq` de la Fase C). Los valores de `findingType` y `aiAgreement` son los del `CHECK` de la sección 10.4.
7. Los marcadores se ven en los tres modos. En Lado a lado se dibujan en los dos paneles, pero solo los del primero son focalizables; los del segundo llevan `aria-hidden`.
8. El lienzo (`Stage`) deja de tener `role="img"` y pasa a `role="group"`: un `role="img"` oculta a los lectores de pantalla los botones que tenga dentro, es decir, los pins.
9. La trampa de foco se activa en los dos modos de pantalla completa (nativo y expandido): en el nativo, Tab también puede salir hacia elementos que no se ven.
10. El panel muestra el aviso «Los marcadores todavía no se guardan: se pierden al recargar la página.» hasta que llegue la Fase C. No se agrega `beforeunload`.
11. Indicadores en la esquina inferior izquierda del lienzo: zoom y, si hay ajuste, brillo y contraste. El % de zoom sale de la barra.

## Global Constraints

- Directorio de trabajo para los comandos: `apps/web`.
- Rama `feat/visor-fase-b` creada desde `main`. **Nunca** `git add -A` ni `git add .`: `apps/web/package-lock.json` tiene cambios locales ajenos a esta tarea. Siempre `git add` con rutas explícitas.
- Commits en español, formato `tipo: descripción breve`. **Sin** `Co-Authored-By` ni menciones de IA o asistente.
- `git push` y el PR los corre el usuario: al terminar, dejar los comandos listos.
- Colores: el visor nunca usa `brand-danger`. Los pins usan `brand-primary` en modo claro; en el tema oscuro (`viewer-full:`) los acentos son `sky-200`/`sky-300` y el texto `slate-100`/`slate-300`.
- La etiqueta de la herramienta dice «Brillo/Contraste», nunca «WW/WL».
- PHI: el texto de las notas nunca va a `console.*` ni a la imagen exportada sin la casilla de consentimiento marcada. Los anuncios `aria-live` nombran el número y el tipo del marcador, nunca la nota.
- Sin dependencias nuevas. Iconos solo de `lucide-react`.
- Nota: máximo 1000 caracteres. Tamaño en mm opcional, `> 0` y `<= 300`.

## Review Focus

1. **Escribir en la nota** (`textarea`) con letras que son atajos (`h`, `a`, `m`, `0`, `f`, `?`) o con Espacio: no debe cambiar de herramienta, hacer zoom ni alternar la IA. → test en la Task 9.
2. **Clic en las franjas negras** de una imagen no cuadrada (object-contain): no crea marcador. → test en la Task 2.
3. **Tab dentro de un diálogo** (ayuda o exportar) abierto en pantalla completa: el foco se queda en el diálogo; la trampa del visor no se lo lleva. → test en la Task 5.
4. **Flechas sobre un radio de la paleta o sobre un pin**: mueven la selección o el pin y no se propagan al visor (no desplazan la imagen). → tests en las Tasks 6 y 8.
5. **Agregar un marcador antes de que cargue la imagen** (tamaño natural desconocido) o con el lienzo sin medidas: el marcador cae en el centro (0.5, 0.5) y no en `NaN`. → test en la Task 2.

---

### Task 1: Brillo/contraste y clic frente a arrastre (funciones puras)

**Files:**
- Create: `apps/web/src/components/ui/viewerTools.ts`
- Test: `apps/web/src/components/ui/viewerTools.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ViewerTool = "pan" | "adjust" | "marker" | "measure";
  export type Adjust = { brightness: number; contrast: number };
  export const ADJUST_DEFAULT: Adjust;            // { brightness: 1, contrast: 1 }
  export const ADJUST_MIN = 0.2;
  export const ADJUST_MAX = 3;
  export const ADJUST_PX_PER_UNIT = 200;          // 200 px de arrastre = ±1.0
  export const CLICK_TOLERANCE_PX = 5;
  export function adjustFromDrag(base: Adjust, dx: number, dy: number): Adjust;
  export function adjustFilter(a: Adjust): string; // "none" si es el default
  export function isClick(dx: number, dy: number): boolean;
  export function isDefaultAdjust(a: Adjust): boolean;
  ```

- [ ] **Step 1: Crear la rama**

Run: `git switch -c feat/visor-fase-b`
Expected: `Switched to a new branch 'feat/visor-fase-b'`

- [ ] **Step 2: Escribir los tests**

```ts
describe("adjustFromDrag", () => {
  it("horizontal cambia el contraste y vertical el brillo (arriba aclara)", () => {
    expect(adjustFromDrag(ADJUST_DEFAULT, 100, 0)).toEqual({ brightness: 1, contrast: 1.5 });
    expect(adjustFromDrag(ADJUST_DEFAULT, 0, -100)).toEqual({ brightness: 1.5, contrast: 1 });
  });
  it("acota a [0.2, 3]", () => {
    expect(adjustFromDrag(ADJUST_DEFAULT, -10_000, 10_000)).toEqual({ brightness: 0.2, contrast: 0.2 });
    expect(adjustFromDrag(ADJUST_DEFAULT, 10_000, -10_000)).toEqual({ brightness: 3, contrast: 3 });
  });
});
describe("adjustFilter", () => {
  it("default no aplica filtro", () => expect(adjustFilter(ADJUST_DEFAULT)).toBe("none"));
  it("genera brightness y contrast", () =>
    expect(adjustFilter({ brightness: 1.2, contrast: 0.9 })).toBe("brightness(1.2) contrast(0.9)"));
});
describe("isClick", () => {
  it("menos de 5 px es clic", () => {
    expect(isClick(3, 3)).toBe(true);
    expect(isClick(4, 4)).toBe(false); // hypot ≈ 5.66
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/viewerTools.test.ts`
Expected: FAIL (no existe el módulo)

- [ ] **Step 4: Implementar `viewerTools.ts`**

`adjustFromDrag`: `contrast = base.contrast + dx / ADJUST_PX_PER_UNIT`, `brightness = base.brightness - dy / ADJUST_PX_PER_UNIT`, ambos acotados con `clamp` de `panZoomMath.ts` y redondeados a 2 decimales. `isClick`: `Math.hypot(dx, dy) < CLICK_TOLERANCE_PX`.

- [ ] **Step 5: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/viewerTools.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/viewerTools.ts src/components/ui/viewerTools.test.ts
git commit -m "feat(web): matemática pura de brillo/contraste del visor"
```

---

### Task 2: Coordenadas de marcadores (markerMath) y centrado (panZoomMath)

**Files:**
- Create: `apps/web/src/components/ui/markerMath.ts`
- Test: `apps/web/src/components/ui/markerMath.test.ts`
- Modify: `apps/web/src/components/ui/panZoomMath.ts` (agregar `centerTransform`)
- Test: `apps/web/src/components/ui/panZoomMath.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // markerMath.ts
  export type Size = { w: number; h: number };
  export type Point = { x: number; y: number };
  export type Rect = { left: number; top: number; width: number; height: number };
  export type Transform = { scale: number; tx: number; ty: number };
  /** Rectángulo que ocupa la imagen con object-contain, en las unidades de `stage`.
   *  Con stage = {w:100, h:100} el resultado está en porcentaje. */
  export function containRect(stage: Size, natural: Size): Rect;
  /** Punto en px relativos al stage (lo que mide el puntero) → coordenada normalizada [0,1]
   *  de la imagen, deshaciendo el transform. null si cae fuera de la imagen o el stage mide 0. */
  export function stageToNormalized(p: Point, t: Transform, stage: Size, natural: Size): Point | null;
  /** Normalizada → posición en la capa sin transformar, en unidades de `stage`. */
  export function normalizedToStage(n: Point, stage: Size, natural: Size): Point;
  /** Centro de lo que se ve, normalizado y acotado a [0,1]. {0.5, 0.5} si el stage mide 0. */
  export function visibleCenter(t: Transform, stage: Size, natural: Size): Point;
  /** Mueve una coordenada normalizada, acotada a [0,1]. */
  export function nudge(n: Point, dx: number, dy: number): Point;
  export const NUDGE_STEP = 0.01;

  // panZoomMath.ts
  /** Transform que deja el punto `p` (unidades del stage sin transformar) en el centro del stage, ya acotado. */
  export function centerTransform(p: Point, scale: number, stage: Size): { tx: number; ty: number };
  ```
  Si el tamaño natural es desconocido, quien llama pasa `{ w: 1, h: 1 }` (imagen cuadrada).

- [ ] **Step 1: Escribir los tests**

```ts
const square = { w: 400, h: 400 };
const wide = { w: 800, h: 400 }; // imagen 2:1 → franjas arriba y abajo
const id = { scale: 1, tx: 0, ty: 0 };

it("containRect deja franjas en una imagen apaisada", () => {
  expect(containRect(square, wide)).toEqual({ left: 0, top: 100, width: 400, height: 200 });
  expect(containRect({ w: 100, h: 100 }, wide)).toEqual({ left: 0, top: 25, width: 100, height: 50 });
});
it("un clic en la franja negra no da coordenada", () => {
  expect(stageToNormalized({ x: 200, y: 50 }, id, square, wide)).toBeNull();
  expect(stageToNormalized({ x: 200, y: 200 }, id, square, wide)).toEqual({ x: 0.5, y: 0.5 });
});
it("deshace zoom y pan", () => {
  const t = { scale: 2, tx: -200, ty: -200 }; // centro del stage = centro de la imagen
  expect(stageToNormalized({ x: 200, y: 200 }, t, square, square)).toEqual({ x: 0.5, y: 0.5 });
});
it("ida y vuelta conserva el punto", () => {
  const p = normalizedToStage({ x: 0.25, y: 0.75 }, square, wide);
  expect(stageToNormalized(p, id, square, wide)).toEqual({ x: 0.25, y: 0.75 });
});
it("stage sin medidas: centro por defecto, sin NaN", () => {
  expect(stageToNormalized({ x: 0, y: 0 }, id, { w: 0, h: 0 }, square)).toBeNull();
  expect(visibleCenter(id, { w: 0, h: 0 }, square)).toEqual({ x: 0.5, y: 0.5 });
});
it("nudge acota a [0,1]", () => {
  expect(nudge({ x: 0.995, y: 0 }, NUDGE_STEP, -NUDGE_STEP)).toEqual({ x: 1, y: 0 });
});
// panZoomMath.test.ts
it("centerTransform centra el punto y respeta los límites", () => {
  expect(centerTransform({ x: 200, y: 200 }, 2, square)).toEqual({ tx: -200, ty: -200 });
  expect(centerTransform({ x: 0, y: 0 }, 2, square)).toEqual({ tx: 0, ty: 0 }); // acotado
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/markerMath.test.ts src/components/ui/panZoomMath.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

`containRect`: `k = min(stage.w / natural.w, stage.h / natural.h)`, tamaño `natural * k`, centrado. `stageToNormalized`: punto en la capa = `(p - t) / scale`, luego relativo a `containRect`; `null` si queda fuera de `[0,1]` o si `stage.w` o `stage.h` es 0. `centerTransform`: `tx = stage.w / 2 - scale * p.x` (y análogo), pasado por `clampTranslate`. Redondear las salidas normalizadas a 4 decimales para que las comparaciones sean estables.

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/markerMath.test.ts src/components/ui/panZoomMath.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/markerMath.ts src/components/ui/markerMath.test.ts src/components/ui/panZoomMath.ts src/components/ui/panZoomMath.test.ts
git commit -m "feat(web): coordenadas normalizadas de marcadores sobre el rectángulo real de la imagen"
```

---

### Task 3: Estado de los marcadores (reducer puro)

**Files:**
- Create: `apps/web/src/components/ui/markerState.ts`
- Test: `apps/web/src/components/ui/markerState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FindingType = "solido" | "subsolido" | "vidrio_esmerilado" | "calcificado" | "artefacto" | "otro";
  export type AiAgreement = "ia_marco" | "ia_no_marco" | "ia_falso_positivo";
  export type Marker = {
    id: string;              // `m${seq}`
    seq: number;
    x: number; y: number;    // normalizadas [0,1]
    findingType: FindingType | null;
    aiAgreement: AiAgreement | null;
    note: string;
    sizeMm: number | null;
  };
  export type MarkersState = { markers: Marker[]; selectedId: string | null; nextSeq: number };
  export type MarkerPatch = Partial<Pick<Marker, "findingType" | "aiAgreement" | "note" | "sizeMm">>;
  export type MarkerAction =
    | { type: "add"; x: number; y: number }
    | { type: "update"; id: string; patch: MarkerPatch }
    | { type: "move"; id: string; x: number; y: number }
    | { type: "remove"; id: string }
    | { type: "select"; id: string | null };
  export const MARKERS_INITIAL: MarkersState;   // { markers: [], selectedId: null, nextSeq: 1 }
  export const MARKER_NOTE_MAX = 1000;
  export const MARKER_SIZE_MAX_MM = 300;
  export const FINDING_TYPE_OPTIONS: ReadonlyArray<{ value: FindingType; label: string }>;
  export const AI_AGREEMENT_OPTIONS: ReadonlyArray<{ value: AiAgreement; label: string }>;
  export function markersReducer(state: MarkersState, action: MarkerAction): MarkersState;
  export function findingLabel(t: FindingType | null): string;   // null → "Sin clasificar"
  export function markerAriaLabel(m: Marker): string;
  ```
  Etiquetas exactas. Hallazgo: «Nódulo sólido», «Nódulo subsólido», «Vidrio esmerilado», «Calcificado», «Artefacto», «Otro». Opinión: «La IA lo marcó», «La IA no lo marcó (posible falso negativo)», «La IA marcó algo que no es lesión (falso positivo)».

- [ ] **Step 1: Escribir los tests**

```ts
const add = (s: MarkersState, x = 0.5, y = 0.5) => markersReducer(s, { type: "add", x, y });

it("agrega numerado y lo selecciona", () => {
  const s = add(MARKERS_INITIAL);
  expect(s.markers[0]).toMatchObject({ id: "m1", seq: 1, note: "", findingType: null, sizeMm: null });
  expect(s.selectedId).toBe("m1");
});
it("no reutiliza números al borrar", () => {
  let s = add(add(MARKERS_INITIAL));
  s = markersReducer(s, { type: "remove", id: "m2" });
  s = add(s);
  expect(s.markers.map((m) => m.seq)).toEqual([1, 3]);
});
it("borrar el seleccionado deja la selección vacía", () => {
  const s = markersReducer(add(MARKERS_INITIAL), { type: "remove", id: "m1" });
  expect(s.selectedId).toBeNull();
});
it("la nota se corta en 1000 caracteres", () => {
  const s = markersReducer(add(MARKERS_INITIAL), { type: "update", id: "m1", patch: { note: "x".repeat(1200) } });
  expect(s.markers[0].note).toHaveLength(1000);
});
it("tamaño fuera de (0, 300] se descarta", () => {
  let s = add(MARKERS_INITIAL);
  for (const bad of [0, -2, 301, Number.NaN]) {
    s = markersReducer(s, { type: "update", id: "m1", patch: { sizeMm: bad } });
    expect(s.markers[0].sizeMm).toBeNull();
  }
  s = markersReducer(s, { type: "update", id: "m1", patch: { sizeMm: 8.5 } });
  expect(s.markers[0].sizeMm).toBe(8.5);
});
it("add y move acotan a [0,1]", () => {
  const s = markersReducer(add(MARKERS_INITIAL, 1.4, -0.2), { type: "move", id: "m1", x: -1, y: 2 });
  expect(s.markers[0]).toMatchObject({ x: 0, y: 1 });
});
it("el nombre accesible incluye número, tipo y el comienzo de la nota", () => {
  const m = { ...add(MARKERS_INITIAL).markers[0], findingType: "subsolido" as const, note: "Borde espiculado en lóbulo superior derecho" };
  expect(markerAriaLabel(m)).toBe("Marcador 1: nódulo subsólido, Borde espiculado en lóbulo superior…");
});
```

`markerAriaLabel`: «Marcador N: <tipo en minúscula>», y si hay nota, «, » más los primeros 35 caracteres (sin espacios al final) y «…» si la nota es más larga. Sin nota y sin tipo: «Marcador N: sin clasificar».

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/markerState.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar `markerState.ts`**

Las acciones sobre un `id` inexistente devuelven el mismo `state`.

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/markerState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/markerState.ts src/components/ui/markerState.test.ts
git commit -m "feat(web): estado puro de los marcadores con notas del visor"
```

---

### Task 4: Teclas de herramientas y flechas del radiogroup (viewerKeys)

**Files:**
- Modify: `apps/web/src/components/ui/viewerKeys.ts`
- Test: `apps/web/src/components/ui/viewerKeys.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces:
  ```ts
  export type ViewerAction =
    | /* las existentes */ ...
    | "toolPan" | "toolAdjust" | "toolMarker" | "toolMeasure" | "addMarker";
  /** Patrón ARIA de radio: flechas con vuelta, Home/End. Salta los índices deshabilitados. null si la tecla no aplica. */
  export function nextRadioIndex(key: string, current: number, disabled: ReadonlyArray<boolean>): number | null;
  ```

Reglas nuevas de `resolveViewerKey` (después de la regla de Espacio, con los modificadores y los campos de formulario ya excluidos como hoy):
- `h`/`H` → `toolPan`; `a`/`A` → `toolAdjust`; `m`/`M` → `toolMarker`; `l`/`L` → `toolMeasure`.
- `Enter` → `addMarker` **solo** con `isContainer` (sobre un botón, Enter pulsa el botón).

`VIEWER_SHORTCUTS` agrega, en este orden y después de «Arrastrar»: `H` «Herramienta Mover», `A` «Herramienta Brillo/Contraste (arrastre horizontal = contraste, vertical = brillo; doble clic restablece)», `M` «Herramienta Marcador (clic sobre la imagen)», `Enter` «Con Marcador activo, agregar un marcador en el centro», `Flechas sobre un marcador` «Mover el marcador», `L` «Medir (no disponible: la imagen no trae calibración en mm)». La fila `0` pasa a «Restablecer zoom, posición y brillo/contraste».

- [ ] **Step 1: Escribir los tests**

```ts
it("teclas de herramienta", () => {
  expect(resolveViewerKey(k("h"), onContainer)).toBe("toolPan");
  expect(resolveViewerKey(k("A"), onButton)).toBe("toolAdjust");
  expect(resolveViewerKey(k("m"), onContainer)).toBe("toolMarker");
  expect(resolveViewerKey(k("L"), onContainer)).toBe("toolMeasure");
  expect(resolveViewerKey(k("m"), onInput)).toBeNull();
});
it("Enter agrega marcador solo con el contenedor enfocado", () => {
  expect(resolveViewerKey(k("Enter"), onContainer)).toBe("addMarker");
  expect(resolveViewerKey(k("Enter"), onButton)).toBeNull();
});
describe("nextRadioIndex", () => {
  const none = [false, false, false, false];
  it("flechas con vuelta", () => {
    expect(nextRadioIndex("ArrowRight", 3, none)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, none)).toBe(3);
    expect(nextRadioIndex("ArrowDown", 1, none)).toBe(2);
    expect(nextRadioIndex("ArrowUp", 1, none)).toBe(0);
  });
  it("Home/End y saltar deshabilitados", () => {
    const measureOff = [false, false, false, true];
    expect(nextRadioIndex("ArrowRight", 2, measureOff)).toBe(0);
    expect(nextRadioIndex("End", 0, measureOff)).toBe(2);
    expect(nextRadioIndex("Home", 2, measureOff)).toBe(0);
  });
  it("otras teclas no aplican", () => expect(nextRadioIndex("a", 0, none)).toBeNull());
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/viewerKeys.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar** las reglas y `nextRadioIndex` en `viewerKeys.ts`.

- [ ] **Step 4: Correr y ver que pasan** (el archivo completo, incluidos los tests de la Fase A)

Run: `npx vitest run src/components/ui/viewerKeys.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/viewerKeys.ts src/components/ui/viewerKeys.test.ts
git commit -m "feat(web): atajos H/A/M/L, Enter para marcador y flechas de radiogroup"
```

---

### Task 5: Contención del foco en pantalla completa (pendiente 3 de la Fase A)

**Files:**
- Create: `apps/web/src/components/ui/useFocusTrap.ts`
- Test: `apps/web/src/components/ui/useFocusTrap.test.tsx`

**Interfaces:**
- Produces: `export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean): void`

Comportamiento: con `active`, un listener `keydown` en el elemento atrapa Tab y Shift+Tab. Los focalizables son el propio contenedor (si tiene `tabIndex >= 0`) más los descendientes `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` que no estén `disabled` ni dentro de un ancestro `[aria-hidden="true"]`. Desde el último, Tab va al primero; desde el primero, Shift+Tab va al último. **Ignora** el evento si el destino está dentro de `[role="dialog"]` (el `Modal` tiene su propia trampa) o si ya viene con `defaultPrevented`.

- [ ] **Step 1: Escribir los tests** (componente de prueba con un contenedor `tabIndex={0}`, dos botones y un `role="dialog"` opcional con un botón dentro)

```tsx
it("Tab desde el último vuelve al contenedor", () => {
  render(<Harness active />);
  screen.getByRole("button", { name: "Último" }).focus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  expect(screen.getByTestId("trap")).toHaveFocus();
});
it("Shift+Tab desde el contenedor va al último", () => {
  render(<Harness active />);
  screen.getByTestId("trap").focus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
  expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
});
it("inactivo no intercepta", () => {
  render(<Harness active={false} />);
  screen.getByRole("button", { name: "Último" }).focus();
  expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
});
it("no interfiere con un diálogo abierto dentro", () => {
  render(<Harness active withDialog />);
  screen.getByRole("button", { name: "En diálogo" }).focus();
  expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
  expect(screen.getByRole("button", { name: "En diálogo" })).toHaveFocus();
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/useFocusTrap.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `useFocusTrap.ts`**

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/useFocusTrap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/useFocusTrap.ts src/components/ui/useFocusTrap.test.tsx
git commit -m "feat(web): contener el foco dentro del visor en pantalla completa"
```

---

### Task 6: ViewerToolbar con paleta de herramientas, flechas y aria-live (pendientes 1 y 2)

**Files:**
- Create: `apps/web/src/components/ui/ViewerToolbar.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (la barra superior, líneas 340-459, pasa al componente nuevo; agregar `tool`, el anuncio `aria-live` y las acciones de herramienta en `onKeyDown`)
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `ViewerTool` (Task 1), `nextRadioIndex` y las acciones `tool*` (Task 4).
- Produces:
  ```ts
  export type ViewMode = "curtain" | "side" | "overlay";   // movido desde BeforeAfterViewer
  export type ViewerToolbarProps = {
    mode: ViewMode; onModeChange: (m: ViewMode) => void;
    tool: ViewerTool; onToolChange: (t: ViewerTool) => void;
    showAi: boolean; onToggleAi: () => void;
    isFullscreen: boolean; onToggleFullscreen: () => void;
    onZoomIn: () => void; onZoomOut: () => void; onReset: () => void;
    onExport: () => void; onHelp: () => void;
  };
  export function ViewerToolbar(props: ViewerToolbarProps): JSX.Element;
  ```
  Dentro del archivo, un `RadioGroup` interno (no exportado) con tabindex móvil: el radio marcado tiene `tabIndex={0}` y el resto `-1`. Con las flechas, `nextRadioIndex` elige el siguiente, lo marca (`onChange`) y le pasa el foco. Su `onKeyDown` hace `preventDefault` y `stopPropagation` cuando maneja la tecla, para que el visor no desplace la imagen. Se usa para el selector de modo (nombres sin cambios: «Cortina», «Lado a lado», «Superpuesto») y para la paleta (`aria-label="Herramienta"`), con radios de icono cuyos nombres accesibles son «Mover (H)», «Brillo/Contraste (A)», «Marcador (M)» y «Medir (L)». Iconos: `Hand`, `SunMedium`, `MapPin`, `Ruler`.
  **Medir** lleva `aria-disabled="true"`, no se puede marcar y `aria-describedby` apunta a un texto `sr-only`: «No disponible: la imagen no trae PixelSpacing, así que no se puede medir en milímetros.» (el mismo texto va en `title`).
  `BeforeAfterViewer` agrega `const [tool, setTool] = useState<ViewerTool>("pan")` y `const [announcement, setAnnouncement] = useState("")`, renderizado como `<p role="status" aria-live="polite" className="sr-only">`. Mensajes: «IA visible» / «IA oculta» (con Espacio y con el botón Parpadeo), «Herramienta: Mover» (o el nombre que corresponda) y, para `toolMeasure`, el texto de Medir.

- [ ] **Step 1: Escribir los tests de componente**

```tsx
describe("BeforeAfterViewer — herramientas", () => {
  it("las teclas H/A/M cambian la herramienta activa", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "a" });
    expect(screen.getByRole("radio", { name: "Brillo/Contraste (A)" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Herramienta: Brillo/Contraste");
  });
  it("Medir está desactivado con explicación y L lo anuncia", () => {
    const visor = renderViewer();
    const medir = screen.getByRole("radio", { name: "Medir (L)" });
    expect(medir).toHaveAttribute("aria-disabled", "true");
    expect(medir).toHaveAccessibleDescription(/PixelSpacing/);
    fireEvent.click(medir);
    expect(medir).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(visor, { key: "l" });
    expect(screen.getByRole("status")).toHaveTextContent(/PixelSpacing/);
  });
  it("flechas recorren la paleta, saltan Medir y no se propagan", () => {
    renderViewer();
    const marcador = screen.getByRole("radio", { name: "Marcador (M)" });
    fireEvent.click(marcador);
    marcador.focus();
    expect(fireEvent.keyDown(marcador, { key: "ArrowRight" })).toBe(false);
    const mover = screen.getByRole("radio", { name: "Mover (H)" });
    expect(mover).toHaveAttribute("aria-checked", "true");
    expect(mover).toHaveFocus();
  });
  it("flechas en el selector de modo", () => {
    renderViewer();
    const cortina = screen.getByRole("radio", { name: /Cortina/ });
    cortina.focus();
    fireEvent.keyDown(cortina, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: /Superpuesto/ })).toHaveAttribute("aria-checked", "true");
  });
  it("Espacio anuncia el estado de la IA", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, { key: " ", code: "Space" });
    expect(screen.getByRole("status")).toHaveTextContent("IA oculta");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en los tests nuevos; los de la Fase A siguen pasando.

- [ ] **Step 3: Implementar `ViewerToolbar.tsx` y conectarlo en `BeforeAfterViewer.tsx`**

Mover `ToolbarButton`, `DARK_CONTROL` y `DARK_PANEL` al archivo nuevo (exportar las constantes para que las usen los otros componentes). Quitar el % de zoom de la barra (pasa al lienzo en la Task 7). Mantener los nombres accesibles existentes: «Acercar (+)», «Alejar (-)», «Restablecer vista (0)», «Descargar imagen», «Atajos de teclado (?)», «Pantalla completa (F)».

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ViewerToolbar.tsx src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): paleta de herramientas del visor con flechas y anuncios aria-live"
```

---

### Task 7: Herramienta Brillo/Contraste e indicadores del lienzo

**Files:**
- Create: `apps/web/src/components/ui/useToolPointer.ts`
- Modify: `apps/web/src/components/ui/usePanZoom.ts` (exponer `getTransform` y `centerOn`)
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (`Stage`: `role="group"`, prop `footer`; filtro en las imágenes de la TAC)
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `adjustFromDrag`, `adjustFilter`, `isClick`, `ADJUST_DEFAULT`, `isDefaultAdjust` (Task 1); `centerTransform` (Task 2).
- Produces:
  ```ts
  // usePanZoom.ts — se agrega al objeto devuelto
  getTransform: () => { scale: number; tx: number; ty: number };
  getStageSize: () => { w: number; h: number };       // del último stage registrado
  centerOn: (p: { x: number; y: number }, scale: number) => void;
  // useToolPointer.ts
  export function useToolPointer(opts: {
    tool: ViewerTool;
    pan: ReturnType<typeof usePanZoom>["stageHandlers"];
    adjust: Adjust;
    onAdjust: (a: Adjust) => void;
    onClickAt: (p: { x: number; y: number }, stage: { w: number; h: number }) => void;
  }): ReturnType<typeof usePanZoom>["stageHandlers"] & { onDoubleClick: () => void };
  ```
  Ruteo: `ref` siempre es el de `pan` (la rueda hace zoom con cualquier herramienta). Con `pan`, los handlers de puntero delegan en `pan`. Con `marker`, también delegan (el arrastre desplaza), pero se guarda el punto de inicio y, en `onPointerUp`, si `isClick(dx, dy)` se llama a `onClickAt` con el punto relativo al stage (`clientX - rect.left`). Con `adjust`, el arrastre llama a `onAdjust(adjustFromDrag(base, dx, dy))`, donde `base` es el ajuste al iniciar, y `onDoubleClick` llama a `onAdjust(ADJUST_DEFAULT)`. `setPointerCapture` y `hasPointerCapture` se llaman solo si existen (jsdom no los implementa).

`BeforeAfterViewer`: `const [adjust, setAdjust] = useState(ADJUST_DEFAULT)`. `style={{ filter: adjustFilter(adjust) }}` en **todas** las `<img>` de la TAC original y en ninguna del mapa de calor. `reset` (botón y tecla `0`) también hace `setAdjust(ADJUST_DEFAULT)`. Cursor del stage: `pan` → grab (si `canPan`); `adjust` → `cursor-ns-resize`; `marker` → `cursor-crosshair`. El `footer` de `Stage` se renderiza fuera de la capa transformada, abajo a la izquierda (`absolute bottom-2 left-2`, `pointer-events-none`, `bg-slate-900/80 text-white text-[10px] font-semibold tabular-nums`): «Zoom 140%» y, si el ajuste no es el default, « · Brillo 120% · Contraste 90%».

- [ ] **Step 1: Escribir los tests de componente**

```tsx
it("el lienzo muestra el zoom en la esquina", () => {
  renderViewer();
  expect(screen.getByText("Zoom 100%")).toBeInTheDocument();
});
it("doble clic con Brillo/Contraste restablece el ajuste y 0 también", () => {
  const visor = renderViewer();
  fireEvent.keyDown(visor, { key: "a" });
  const stage = screen.getByRole("group", { name: /Comparativa en cortina/ });
  fireEvent.pointerDown(stage, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(stage, { clientX: 100, clientY: 0, pointerId: 1 });
  fireEvent.pointerUp(stage, { clientX: 100, clientY: 0, pointerId: 1 });
  expect(screen.getByText(/Contraste 150%/)).toBeInTheDocument();
  fireEvent.doubleClick(stage);
  expect(screen.queryByText(/Contraste/)).not.toBeInTheDocument();
});
it("el filtro se aplica a la TAC y no al mapa de calor", () => {
  // mismo arrastre de 100 px a la derecha que el test anterior, luego:
  expect(screen.getByAltText("Estudio tomográfico original").style.filter).toBe("brightness(1) contrast(1.5)");
  expect(screen.getByAltText("Detección IA superpuesta").style.filter).toBe("");
});
```

Si `fireEvent.pointerMove` no transporta `clientX` en jsdom 29, el test usa `fireEvent.mouseDown`/`mouseMove`/`mouseUp` y el hook escucha esos eventos, o se crea un `PointerEvent` con `createEvent` y `Object.defineProperty` para `clientX`. No hay que bajar la cobertura: elegir la variante que funcione y anotarla en un comentario del test.

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en los tests nuevos.

- [ ] **Step 3: Implementar** `useToolPointer.ts`, las funciones nuevas de `usePanZoom.ts` y los cambios en `BeforeAfterViewer.tsx`. Actualizar los `getByRole("img", …)` de los tests existentes si alguno apuntaba al stage.

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/useToolPointer.ts src/components/ui/usePanZoom.ts src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): herramienta Brillo/Contraste con filtro CSS e indicadores en el lienzo"
```

---

### Task 8: Marcadores sobre la imagen (MarkerLayer)

**Files:**
- Create: `apps/web/src/components/ui/MarkerLayer.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (reducer de marcadores, tamaño natural, `onClickAt`, acción `addMarker`)
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `markersReducer`, `MARKERS_INITIAL`, `markerAriaLabel` (Task 3); `containRect`, `normalizedToStage`, `stageToNormalized`, `visibleCenter`, `nudge`, `NUDGE_STEP` (Task 2); `getTransform`, `getStageSize` (Task 7).
- Produces:
  ```ts
  export function MarkerLayer(props: {
    markers: Marker[];
    selectedId: string | null;
    natural: Size;              // { w: 1, h: 1 } mientras no cargue la imagen
    scale: number;
    focusable: boolean;         // false en el segundo panel de Lado a lado
    onSelect: (id: string) => void;
    onMove: (id: string, x: number, y: number) => void;
  }): JSX.Element;
  ```
  Cada pin es un `<button type="button">` con `aria-label={markerAriaLabel(m)}`, posición `left/top` en % (`normalizedToStage(m, {w:100,h:100}, natural)`, redondeada a 2 decimales para evitar valores como `51.00000000000001%`) y `transform: translate(-50%, -50%) scale(${1 / scale})` para mantener su tamaño en pantalla. Círculo de 24 px con el número: `bg-brand-primary text-white border-2 border-white`; seleccionado, con `ring-2 ring-white ring-offset-2 ring-offset-brand-primary`; en el tema oscuro, `viewer-full:bg-sky-300 viewer-full:text-slate-950`. `onPointerDown` hace `stopPropagation` (ni pan ni marcador nuevo). Las flechas sobre el pin llaman a `onMove` con `nudge(…, ±NUDGE_STEP)`, con `preventDefault` + `stopPropagation`. Con `focusable=false`: `aria-hidden="true"` y `tabIndex={-1}` en el contenedor y en los pins.

`BeforeAfterViewer`: `useReducer(markersReducer, MARKERS_INITIAL)`. El tamaño natural se toma del `onLoad` de la `<img>` de la TAC (`naturalWidth`/`naturalHeight`); si vale 0 o la imagen no cargó, `{ w: 1, h: 1 }`. `onClickAt` → `stageToNormalized(p, getTransform(), stage, natural)`; si es `null`, no hace nada. Acción `addMarker` (Enter) con la herramienta Marcador → `visibleCenter(getTransform(), getStageSize(), natural)`; con otra herramienta, nada. Al agregar se anuncia «Marcador N agregado». `<MarkerLayer>` va dentro de la capa transformada de cada `Stage`: en cortina y superpuesto, uno; en lado a lado, en los dos (el segundo con `focusable={false}`). El z-index de los pins queda por encima del tirador de la cortina.

- [ ] **Step 1: Escribir los tests de componente**

```tsx
describe("BeforeAfterViewer — marcadores", () => {
  it("M + Enter agrega el marcador 1 en el centro", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    const pin = screen.getByRole("button", { name: /^Marcador 1: sin clasificar/ });
    expect(pin.style.left).toBe("50%");
    expect(pin.style.top).toBe("50%");
    expect(screen.getByRole("status")).toHaveTextContent("Marcador 1 agregado");
  });
  it("Enter con la herramienta Mover no agrega marcador", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, { key: "Enter" });
    expect(screen.queryByRole("button", { name: /^Marcador 1/ })).not.toBeInTheDocument();
  });
  it("las flechas sobre un pin lo mueven y no se propagan", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    const pin = screen.getByRole("button", { name: /^Marcador 1/ });
    expect(fireEvent.keyDown(pin, { key: "ArrowRight" })).toBe(false);
    expect(pin.style.left).toBe("51%");
  });
  it("en Lado a lado solo un juego de pins es focalizable", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    fireEvent.click(screen.getByRole("radio", { name: /Lado a lado/ }));
    expect(screen.getAllByRole("button", { name: /^Marcador 1/ })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en los tests nuevos.

- [ ] **Step 3: Implementar `MarkerLayer.tsx` y conectarlo**

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MarkerLayer.tsx src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): marcadores numerados sobre la imagen con tamaño constante al hacer zoom"
```

---

### Task 9: Panel lateral con lista, editor de la nota y valoración resumida

**Files:**
- Create: `apps/web/src/components/ui/MarkerPanel.tsx`
- Create: `apps/web/src/components/ui/MarkerEditor.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (prop `summary`, layout en dos columnas, panel dentro del contenedor)
- Modify: `apps/web/src/components/ui/RiskBadge.tsx` (exportar `asRiskLevel`)
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx` (usar `asRiskLevel` importado y pasar `summary`)
- Modify: `apps/web/src/app/platform/upload/page.tsx` (pasar `summary`)
- Modify: `apps/web/src/app/platform/uploads/[id]/ClinicalReviewForm.tsx` (`id="valoracion"` y `tabIndex={-1}` en el `Card`)
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `Marker`, `MarkerAction`, `FINDING_TYPE_OPTIONS`, `AI_AGREEMENT_OPTIONS`, `MARKER_NOTE_MAX`, `MARKER_SIZE_MAX_MM`, `findingLabel` (Task 3); `CONCORDANCIA_OPTIONS`, `LUNG_RADS_OPTIONS`, `CONDUCTA_OPTIONS`, `UploadReview` de `@/lib/uploadReview`; `RiskBadge`, `RiskLevel`.
- Produces:
  ```ts
  // BeforeAfterViewer.tsx
  export type ViewerSummary = {
    score: number | null;               // 0..1
    riskLevel: RiskLevel | null;
    review: Pick<UploadReview, "concordancia" | "lung_rads" | "conducta"> | null;
    reviewAnchorId?: string;            // default "valoracion"
  };
  // prop nueva y opcional de BeforeAfterViewer: summary?: ViewerSummary

  // RiskBadge.tsx
  export function asRiskLevel(level: string | null | undefined): RiskLevel | null;

  // MarkerPanel.tsx
  export function MarkerPanel(props: {
    summary?: ViewerSummary;
    markers: Marker[];
    selectedId: string | null;
    dispatch: (a: MarkerAction) => void;
    onCenter: (m: Marker) => void;      // centra y hace zoom ×3 (centerOn)
    onGoToReview: () => void;
    onAnnounce: (msg: string) => void;
  }): JSX.Element;
  // MarkerEditor.tsx
  export function MarkerEditor(props: { marker: Marker; onChange: (patch: MarkerPatch) => void; onClose: () => void }): JSX.Element;
  ```

Contenido del panel (`<aside aria-label="Panel del caso">`), en este orden, cada bloque con un H2 de sección (`text-sm font-semibold uppercase tracking-wider text-slate-500`, `viewer-full:text-slate-400`):
1. **Resultado IA** (solo si hay `summary`): score con el mismo formato de la página, `${(score * 100).toFixed(1)}%` (p. ej. «82.0%»), con `tabular-nums`, `RiskBadge` y el texto `text-xs` «Probabilidad estimada por el modelo, no severidad.»
2. **Marcadores (N)**: aviso `text-xs` «Los marcadores todavía no se guardan: se pierden al recargar la página.». Sin marcadores: «Elige la herramienta Marcador (M) y haz clic sobre la imagen.». Cada fila es un `<li>` con el número, `findingLabel` y los primeros 40 caracteres de la nota, y tres botones de icono: «Centrar marcador N» (`Crosshair`), «Editar marcador N» (`Pencil`) y «Borrar marcador N» (`Trash2`). Borrar abre una confirmación dentro de la fila («¿Borrar el marcador N?» con «Borrar» y «Cancelar») y, al confirmar, despacha `remove` y anuncia «Marcador N borrado». Seleccionar un pin o pulsar Editar abre `MarkerEditor` dentro de esa fila. Al agregar un marcador, el editor del nuevo queda abierto y el foco pasa a su primer campo.
3. **Valoración**: concordancia, Lung-RADS y conducta, con las etiquetas de las opciones de `uploadReview`, o «Sin valoración registrada.». Botón «Ir al formulario completo» → `onGoToReview`.

`MarkerEditor`: `<select>` «Tipo de hallazgo» y `<select>` «Opinión frente a la IA», los dos con una opción vacía «Sin indicar»; `<textarea>` «Nota» con `maxLength={MARKER_NOTE_MAX}` y un contador «N/1000» enlazado por `aria-describedby`; `<input type="number">` «Tamaño estimado (mm, opcional)» con `min="0.1" max="300" step="0.1"`; botón «Listo» → `onClose`. Los cambios se despachan al instante (`update`); no hay botón de guardar porque en la Fase B no hay persistencia. Etiquetas con `<label htmlFor>` y `useId`.

`onGoToReview` en `BeforeAfterViewer`: `exitFullscreen()`, y en el siguiente `requestAnimationFrame` hace `scrollIntoView({ block: "start" })` y `focus()` sobre `document.getElementById(reviewAnchorId)`.

Layout (sin pantalla completa): el contenido del contenedor pasa a `lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6`; en móvil el panel se apila debajo. El layout en pantalla completa es de la Task 10.

Páginas:
- `uploads/[id]/page.tsx`: `summary={{ score: upload.ai_score, riskLevel: asRiskLevel(upload.ai_risk_level), review: review ? { concordancia: review.concordancia, lung_rads: review.lung_rads, conducta: review.conducta } : null }}`. Reemplazar la `asRiskLevel` local por la importada.
- `upload/page.tsx`: `summary={{ score: analysisResult.score, riskLevel: asRiskLevel(analysisResult.nivel_riesgo), review: null }}`.

- [ ] **Step 1: Escribir los tests de componente** (`renderViewer` pasa a aceptar un `summary` opcional)

```tsx
describe("BeforeAfterViewer — panel", () => {
  it("muestra score, riesgo y valoración resumida", () => {
    renderViewer({ score: 0.82, riskLevel: "ALTO", review: { concordancia: "discrepa", lung_rads: "4A", conducta: null } });
    const panel = screen.getByRole("complementary", { name: "Panel del caso" });
    expect(panel).toHaveTextContent("82.0%");
    expect(panel).toHaveTextContent("Discrepa del resultado IA");
  });
  it("un marcador nuevo abre su editor y la nota se limita a 1000", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    expect(screen.getByRole("combobox", { name: "Tipo de hallazgo" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Nota" })).toHaveAttribute("maxLength", "1000");
  });
  it("escribir atajos en la nota no cambia de herramienta ni alterna la IA", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    const nota = screen.getByRole("textbox", { name: "Nota" });
    for (const key of ["h", "a", "0", "f", "?", " "]) fireEvent.keyDown(nota, { key });
    expect(screen.getByRole("radio", { name: "Marcador (M)" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("TAC Pura")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("borrar pide confirmación", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    fireEvent.keyDown(visor, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Borrar marcador 1" }));
    expect(screen.getByRole("button", { name: /^Marcador 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.queryByRole("button", { name: /^Marcador 1/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Marcador 1 borrado");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en los tests nuevos.

- [ ] **Step 3: Implementar** `MarkerEditor.tsx`, `MarkerPanel.tsx`, `asRiskLevel` y la conexión en el visor y las dos páginas.

- [ ] **Step 4: Correr tests y tipos**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MarkerPanel.tsx src/components/ui/MarkerEditor.tsx src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx src/components/ui/RiskBadge.tsx "src/app/platform/uploads/[id]/page.tsx" "src/app/platform/uploads/[id]/ClinicalReviewForm.tsx" src/app/platform/upload/page.tsx
git commit -m "feat(web): panel lateral del visor con marcadores, nota y valoración resumida"
```

---

### Task 10: Panel en pantalla completa, hoja inferior en móvil y trampa de foco (problema 3)

**Files:**
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx`
- Modify: `apps/web/src/components/ui/MarkerPanel.tsx`
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap` (Task 5), `isFullscreen` de `useViewerFullscreen`.
- Produces: `MarkerPanel` recibe además `isFullscreen: boolean`.

Layout en pantalla completa: el contenedor (`h-dvh`, oscuro) pasa a `viewer-full:flex-col lg:viewer-full:flex-row lg:viewer-full:gap-4`. La columna principal (barra, lienzo y controles inferiores) es `viewer-full:min-h-0 viewer-full:flex-1`, y el lienzo se sigue dimensionando por la altura, como en la Fase A. El panel es `lg:viewer-full:w-80 lg:viewer-full:shrink-0 lg:viewer-full:overflow-y-auto`, con `DARK_PANEL`. Debajo de `lg` y en pantalla completa, el panel es una **hoja inferior**: un botón «Panel del caso · N marcadores» con `aria-expanded` y `aria-controls` y `ChevronUp`/`ChevronDown` la abre o la pliega. Abierta, el contenido es `max-h-[50dvh] overflow-y-auto`. Arranca plegada, y se abre sola al agregar un marcador (el editor tiene que verse). Fuera de pantalla completa en móvil no hay botón: el panel se apila abierto, como en la Task 9. La visibilidad del botón la deciden las clases (`hidden max-lg:viewer-full:flex`), no JS; el contenido plegado lleva `max-lg:viewer-full:hidden` solo cuando la hoja está cerrada.

Trampa de foco: `useFocusTrap(containerRef, isFullscreen)`.

- [ ] **Step 1: Escribir los tests**

```tsx
it("en pantalla completa el panel está dentro del visor", () => {
  const visor = renderViewer({ score: 0.5, riskLevel: "MEDIO", review: null });
  fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
  expect(visor).toContainElement(screen.getByRole("complementary", { name: "Panel del caso" }));
});
it("la hoja inferior se pliega y despliega", () => {
  const visor = renderViewer();
  fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
  const toggle = screen.getByRole("button", { name: /Panel del caso · 0 marcadores/ });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
});
it("en modo expandido Tab no sale del visor", () => {
  const visor = renderViewer();
  fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
  const focusables = visor.querySelectorAll<HTMLElement>("button:not([disabled]):not([tabindex='-1']), input, select, textarea");
  const last = focusables[focusables.length - 1];
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(visor).toHaveFocus();
});
it("Tab dentro de la ayuda abierta en pantalla completa se queda en la ayuda", () => {
  const visor = renderViewer();
  fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
  fireEvent.keyDown(visor, { key: "?" });
  const cerrar = screen.getByRole("button", { name: "Cerrar modal" });
  cerrar.focus();
  fireEvent.keyDown(cerrar, { key: "Tab" });
  expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en los tests nuevos.

- [ ] **Step 3: Implementar el layout, la hoja inferior y la trampa de foco**

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/BeforeAfterViewer.tsx src/components/ui/MarkerPanel.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): panel del caso dentro de la pantalla completa, hoja inferior en móvil y foco contenido"
```

---

### Task 11: Exportar con pins y consentimiento para las notas

**Files:**
- Create: `apps/web/src/components/ui/viewerExport.ts`
- Test: `apps/web/src/components/ui/viewerExport.test.ts`
- Create: `apps/web/src/components/ui/ViewerExportDialog.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (`handleExport`)
- Test: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: `Marker`, `findingLabel` (Task 3); `adjustFilter` (Task 1); `Modal`.
- Produces:
  ```ts
  // viewerExport.ts
  export const EXPORT_SIZE = 800;
  /** Líneas de la leyenda. Vacío si includeNotes es false: las notas son PHI. */
  export function exportLegendLines(markers: Marker[], includeNotes: boolean): string[];
  /** Centro de cada pin en el lienzo exportado (la imagen se dibuja estirada a 800×800). */
  export function exportPinPositions(markers: Marker[], size?: number): Array<{ seq: number; x: number; y: number }>;
  export function hasNotes(markers: Marker[]): boolean;   // alguna nota con texto (trim)
  // ViewerExportDialog.tsx
  export function ViewerExportDialog(props: { open: boolean; onClose: () => void; onConfirm: (includeNotes: boolean) => void }): JSX.Element;
  ```
  Formato de la leyenda: `"1. Nódulo sólido — <nota sin saltos de línea>"`, una línea por marcador con nota o tipo y cortada a 110 caracteres con «…». El diálogo se renderiza **dentro** del contenedor del visor (como la ayuda), con el título «Descargar imagen», la casilla «Incluir el texto de las notas (contiene datos clínicos)» desmarcada y los botones «Descargar» y «Cancelar».

`handleExport(includeNotes)`: dibuja la TAC con `ctx.filter = adjustFilter(adjust)` (y lo vuelve a `"none"` antes del mapa de calor y del resto); el mapa de calor como hoy, y luego los pins: círculo `#012641` con borde blanco y el número en blanco. Si `includeNotes`, el canvas crece en alto (`800 + 24 + 18 × líneas`) y la leyenda va debajo del membrete. El botón «Descargar imagen» abre el diálogo solo si `hasNotes(markers)`; si no, exporta directamente sin notas. Corrige de paso el texto «OncaScan» por «OncoScan» en el membrete y en el nombre del archivo.

- [ ] **Step 1: Escribir los tests**

```ts
const m = (seq: number, note: string, findingType: Marker["findingType"] = "solido"): Marker =>
  ({ id: `m${seq}`, seq, x: 0.25, y: 0.5, findingType, aiAgreement: null, note, sizeMm: null });

it("sin consentimiento no hay texto de notas", () => {
  expect(exportLegendLines([m(1, "dato sensible")], false)).toEqual([]);
});
it("con consentimiento, una línea por marcador", () => {
  expect(exportLegendLines([m(1, "borde\nespiculado")], true)).toEqual(["1. Nódulo sólido — borde espiculado"]);
});
it("posición de los pins en el lienzo exportado", () => {
  expect(exportPinPositions([m(2, "")])).toEqual([{ seq: 2, x: 200, y: 400 }]);
});
it("hasNotes ignora notas en blanco", () => {
  expect(hasNotes([m(1, "   ")])).toBe(false);
});
```

Test de componente:
```tsx
it("con notas, descargar pide consentimiento y la casilla arranca desmarcada", () => {
  const visor = renderViewer();
  fireEvent.keyDown(visor, { key: "m" });
  fireEvent.keyDown(visor, { key: "Enter" });
  fireEvent.change(screen.getByRole("textbox", { name: "Nota" }), { target: { value: "x" } });
  fireEvent.click(screen.getByRole("button", { name: "Descargar imagen" }));
  const dialog = screen.getByRole("dialog", { name: "Descargar imagen" });
  expect(visor).toContainElement(dialog);
  expect(screen.getByRole("checkbox", { name: /Incluir el texto de las notas/ })).not.toBeChecked();
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run src/components/ui/viewerExport.test.ts src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar** `viewerExport.ts`, `ViewerExportDialog.tsx` y el nuevo `handleExport`.

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run src/components/ui/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/viewerExport.ts src/components/ui/viewerExport.test.ts src/components/ui/ViewerExportDialog.tsx src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): exportar con pins numerados y notas solo con consentimiento explícito"
```

---

### Task 12: Verificación, documentación y entrega

**Files:**
- Modify: `apps/web/CLAUDE.md` (fila `BeforeAfterViewer` y filas nuevas `ViewerToolbar`, `MarkerLayer`, `MarkerPanel`)
- Modify: `docs/plan-trabajo-semana-entrante.md` (estado de la sección 10, fila B de 10.7 marcada ✅, pendientes de la Fase A resueltos y casillas de 10.8 que quedan cubiertas)
- Modify: memoria `visor-fases-estado.md` (Fase B hecha en la rama; sigue la C)

- [ ] **Step 1: Suite completa, tipos y lint**

Run: `npx vitest run; npx tsc --noEmit; npm run lint`
Expected: todo en verde.

- [ ] **Step 2: Auditoría PHI**

Run: `git grep -n "console\." src`
Expected: solo la línea de `platform/error.tsx` con `error.digest`.

- [ ] **Step 3: Revisiones del proyecto**

Correr `/oncoscan-a11y apps/web/src/components/ui/BeforeAfterViewer.tsx` y `/oncoscan-clinical-review apps/web/src/components/ui/MarkerPanel.tsx`. Corregir los hallazgos que correspondan a esta fase, con un commit `fix:` por tema.

- [ ] **Step 4: Prueba manual** con `npm run dev`: pantalla 16:9, ancho de móvil en DevTools y modo expandido. Comprobar que un pin queda en el mismo punto de la anatomía tras hacer zoom, pan y entrar y salir de pantalla completa. La recarga es de la Fase C. Anotar en la entrega lo que no se pudo probar (por ejemplo, un iPhone real).

- [ ] **Step 5: Documentación y commit**

```bash
git add apps/web/CLAUDE.md docs/plan-trabajo-semana-entrante.md docs/superpowers/plans/2026-10-20-visor-fase-b.md
git commit -m "docs: documentar la fase B del visor"
```

- [ ] **Step 6: Dejar al usuario los comandos de push y PR**

```bash
git push -u origin feat/visor-fase-b
gh pr create --base main --head feat/visor-fase-b --title "feat: visor fase B — herramientas, marcadores con notas y panel lateral" --body-file <archivo con el resumen>
```
