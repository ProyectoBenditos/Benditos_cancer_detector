# Visor — Fase A (correcciones) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los problemas 1, 2, 4 y 5 del visor (sección 10.2 del plan) y agregar el modal de ayuda `?`, sin cambiar todavía las herramientas ni agregar marcadores.

**Architecture:** La lógica nueva va en dos piezas puras o casi puras, cada una con sus tests: `viewerKeys.ts` resuelve qué hace cada tecla y `useViewerFullscreen.ts` maneja la pantalla completa nativa con respaldo "expandido". `BeforeAfterViewer.tsx` solo las conecta. El tema oscuro y el tamaño en pantalla completa son CSS, activados por `data-fullscreen="true"` mediante una variante de Tailwind `viewer-full:`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest 4 + Testing Library (jsdom), lucide-react.

**Spec:** [docs/plan-trabajo-semana-entrante.md](../../plan-trabajo-semana-entrante.md), secciones 10.2, 10.3-A, 10.3-C (solo tamaño, tema oscuro y modo expandido), 10.7 (fila A) y 10.8.

**Fuera de alcance (Fase B):** el problema 3 (panel lateral dentro de pantalla completa), la paleta de herramientas H/A/M/L, brillo/contraste y marcadores. El modal de ayuda solo lista los atajos que **ya existen**.

## Global Constraints

- Directorio de trabajo para comandos: `apps/web`.
- Rama: `feat/visor-fase-a` creada desde `main`. No incluir en los commits `apps/web/package-lock.json` ni `docs/plan-trabajo-semana-entrante.md` (tienen cambios locales ajenos a esta tarea): siempre `git add` con rutas explícitas.
- Commits en español, formato `tipo: descripción breve` (`feat`, `fix`, `test`, `docs`, `style`, `refactor`). **Sin** líneas `Co-Authored-By` ni menciones de IA o asistente.
- Colores: `brand-danger` nunca se usa en el visor. En el tema oscuro, `brand-primary` (#012641) no tiene contraste sobre fondo oscuro: los estados activos y el foco usan `sky-200`/`sky-300` y el texto `slate-100`/`slate-300`.
- La plataforma fuerza modo claro (`color-scheme: light` en `globals.css`). El tema oscuro es una excepción **solo** dentro del visor en pantalla completa.
- Sin dependencias nuevas.
- PHI: no agregar `console.*` en el visor.

## Review Focus

1. **Ctrl/Cmd + `+`, `-` o `0`** es el zoom del navegador: el visor no debe capturarlo (hoy `0` también resetea el visor). → test en la Task 1.
2. **Flechas sobre los deslizadores** (cortina y opacidad): deben mover el deslizador, no desplazar la imagen. Hoy `onKeyDown` del contenedor llama `preventDefault` y el deslizador queda bloqueado. → test en la Task 1.
3. **`requestFullscreen` rechazado** (iframe sin `allowfullscreen`, permisos): debe caer al modo expandido, no quedarse sin hacer nada. → test en la Task 2.
4. **Salir de la página estando en modo expandido** (navegación con el visor desmontado): el scroll del `body` debe quedar restaurado. → test en la Task 2.
5. **Esc con la ayuda abierta en modo expandido**: cierra solo la ayuda; el visor sigue expandido. → test en la Task 4.

---

### Task 1: Atajos de teclado acotados al visor (problema 4)

**Files:**
- Create: `apps/web/src/components/ui/viewerKeys.ts`
- Create: `apps/web/src/components/ui/viewerKeys.test.ts`
- Create: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx:207-275` (quitar el listener global de `window` y reescribir `onKeyDown`) y `:706-709` (texto de la pista)

**Interfaces:**
- Produces:
  ```ts
  export type ViewerAction =
    | "zoomIn" | "zoomOut" | "reset" | "toggleFullscreen" | "exitFullscreen"
    | "panUp" | "panDown" | "panLeft" | "panRight"
    | "toggleAi" | "openHelp";
  export type KeyInput = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean };
  export type KeyTarget = { isContainer: boolean; isFormControl: boolean };
  export function resolveViewerKey(e: KeyInput, target: KeyTarget): ViewerAction | null;
  export function isFormControlTarget(el: EventTarget | null): boolean;
  ```
  Las Tasks 2 y 4 consumen `"toggleFullscreen"`, `"exitFullscreen"` y `"openHelp"`.

**Reglas de `resolveViewerKey`** (en este orden):
1. `ctrlKey`, `metaKey` o `altKey` → `null`.
2. `"Escape"` → `"exitFullscreen"` (también desde un control de formulario).
3. `isFormControl` → `null`.
4. `" "` → `"toggleAi"` **solo si** `isContainer`; si no, `null` (Espacio sobre un botón debe pulsar el botón, WCAG 2.1.1).
5. `"+"`/`"="` → `zoomIn`; `"-"` → `zoomOut`; `"0"` → `reset`; `"f"`/`"F"` → `toggleFullscreen`; `"?"` → `openHelp`; `ArrowUp/Down/Left/Right` → `panUp/Down/Left/Right`.
6. Cualquier otra → `null`.

`isFormControlTarget`: `true` para `INPUT`, `TEXTAREA`, `SELECT` o `isContentEditable`.

- [ ] **Step 1: Crear la rama**

Run: `git switch -c feat/visor-fase-a`
Expected: `Switched to a new branch 'feat/visor-fase-a'`

- [ ] **Step 2: Escribir los tests de `resolveViewerKey`** en `viewerKeys.test.ts`

```ts
const k = (key: string, mods: Partial<KeyInput> = {}): KeyInput =>
  ({ key, ctrlKey: false, metaKey: false, altKey: false, ...mods });
const onContainer = { isContainer: true, isFormControl: false };
const onButton = { isContainer: false, isFormControl: false };
const onInput = { isContainer: false, isFormControl: true };

it("Espacio alterna la IA solo con el contenedor enfocado", () => {
  expect(resolveViewerKey(k(" "), onContainer)).toBe("toggleAi");
  expect(resolveViewerKey(k(" "), onButton)).toBeNull();
  expect(resolveViewerKey(k(" "), onInput)).toBeNull();
});
it("no captura el zoom del navegador", () => {
  expect(resolveViewerKey(k("0", { ctrlKey: true }), onContainer)).toBeNull();
  expect(resolveViewerKey(k("+", { metaKey: true }), onContainer)).toBeNull();
});
it("las flechas en un control de formulario no desplazan la imagen", () => {
  expect(resolveViewerKey(k("ArrowRight"), onInput)).toBeNull();
  expect(resolveViewerKey(k("ArrowRight"), onButton)).toBe("panRight");
});
it("Escape sale de pantalla completa incluso desde un control", () => {
  expect(resolveViewerKey(k("Escape"), onInput)).toBe("exitFullscreen");
});
it("mapea los atajos existentes y la ayuda", () => {
  expect(resolveViewerKey(k("="), onButton)).toBe("zoomIn");
  expect(resolveViewerKey(k("-"), onButton)).toBe("zoomOut");
  expect(resolveViewerKey(k("F"), onButton)).toBe("toggleFullscreen");
  expect(resolveViewerKey(k("?"), onContainer)).toBe("openHelp");
  expect(resolveViewerKey(k("x"), onContainer)).toBeNull();
});
```

Más un `describe("isFormControlTarget")` que verifique `true` para `<input>`, `<textarea>` y `<select>`; `false` para `<button>`, `<div>` y `null`.

- [ ] **Step 3: Ejecutarlos y confirmar que fallan**

Run: `npx vitest run src/components/ui/viewerKeys.test.ts`
Expected: FAIL, no se puede resolver `./viewerKeys`.

- [ ] **Step 4: Implementar `viewerKeys.ts`** según las reglas de arriba.

- [ ] **Step 5: Ejecutarlos y confirmar que pasan**

Run: `npx vitest run src/components/ui/viewerKeys.test.ts`
Expected: PASS.

- [ ] **Step 6: Escribir los tests del componente** en `BeforeAfterViewer.test.tsx`

Render: `<><button>Guardar valoración</button><BeforeAfterViewer beforeUrl="/estudio.png" heatmapBase64="AAAA" /></>`. Contenedor: `screen.getByRole("group", { name: /Visor de tomografía/ })`. Con `initialShowAi` por defecto, el botón de parpadeo muestra el texto `Parpadeo`, y `TAC Pura` cuando la IA está oculta.

- `"Espacio fuera del visor no alterna la IA"`: `fireEvent.keyDown(botonGuardar, { key: " ", code: "Space" })` → sigue visible `Parpadeo` y no existe `TAC Pura`.
- `"Espacio sobre un botón del visor no alterna la IA"`: lo mismo sobre `getByRole("button", { name: "Acercar (+)" })`.
- `"Espacio con el visor enfocado alterna la IA"`: `contenedor.focus()` y luego `fireEvent.keyDown(contenedor, { key: " ", code: "Space" })` → aparece `TAC Pura`.
- `"Las flechas sobre la cortina no se bloquean"`: `expect(fireEvent.keyDown(getByRole("slider", { name: "Posición de la cortina" }), { key: "ArrowRight" })).toBe(true)` (`true` = no se llamó `preventDefault`).

- [ ] **Step 7: Ejecutarlos y confirmar que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL en "Espacio fuera del visor…" (el listener global de `window` alterna la IA) y en "Las flechas sobre la cortina…" (`preventDefault`).

- [ ] **Step 8: Conectar `resolveViewerKey` en `BeforeAfterViewer.tsx`**

- Eliminar el `useEffect` del listener `keydown` en `window`.
- `onKeyDown` calcula `target = { isContainer: e.target === e.currentTarget, isFormControl: isFormControlTarget(e.target) }`, resuelve la acción y la ejecuta con un `switch`. Las direcciones de pan se mantienen: `panUp → panBy(0, PAN_STEP)`, `panDown → panBy(0, -PAN_STEP)`, `panLeft → panBy(PAN_STEP, 0)`, `panRight → panBy(-PAN_STEP, 0)`.
- `preventDefault()` solo si la acción no es `null` y es `toggleAi`, `openHelp` o un pan.
- `openHelp` y `exitFullscreen` quedan como no-op hasta las Tasks 2 y 4.
- Pista inferior (texto exacto): `Con el visor enfocado, Espacio alterna entre TAC limpia e IA.`

- [ ] **Step 9: Ejecutar toda la suite**

Run: `npx vitest run`
Expected: PASS, incluidos `panZoomMath.test.ts` y los tests de los otros componentes.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/viewerKeys.ts src/components/ui/viewerKeys.test.ts src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "fix(web): limitar los atajos del visor al foco y no bloquear Espacio ni flechas fuera de el"
```

---

### Task 2: Pantalla completa con respaldo expandido (problema 5)

**Files:**
- Create: `apps/web/src/components/ui/useViewerFullscreen.ts`
- Create: `apps/web/src/components/ui/useViewerFullscreen.test.ts`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (reemplaza `isFullscreen`, el efecto `fullscreenchange` y `toggleFullscreen` de las líneas 115 y 225-238)

**Interfaces:**
- Consumes: acciones `"toggleFullscreen"` y `"exitFullscreen"` de la Task 1.
- Produces:
  ```ts
  export type FullscreenMode = "none" | "native" | "expanded";
  export function useViewerFullscreen(ref: React.RefObject<HTMLElement | null>): {
    mode: FullscreenMode;
    isFullscreen: boolean; // mode !== "none"
    toggle: () => void;
    exit: () => void;
  };
  ```
  El contenedor del visor expone `data-fullscreen={isFullscreen}` y `data-fullscreen-mode={mode}`. La Task 3 se apoya en ambos atributos.

**Comportamiento:**
- `toggle` con `mode === "none"`: si `typeof el.requestFullscreen === "function"`, llamarla; si la promesa se rechaza, pasar a `"expanded"`. Si la función no existe (iPhone Safari), pasar directo a `"expanded"`.
- `toggle` o `exit` en `"native"` → `document.exitFullscreen()`. En `"expanded"` → `"none"`.
- El listener de `fullscreenchange` pone `"native"` si `document.fullscreenElement === ref.current` y `"none"` si no.
- Mientras `mode === "expanded"`: guardar `document.body.style.overflow`, ponerlo en `"hidden"` y restaurar el valor guardado en la limpieza del efecto (al salir y al desmontar).

- [ ] **Step 1: Escribir los tests** en `useViewerFullscreen.test.ts` (usar `renderHook` y `act`; `ref = { current: document.createElement("div") }`; jsdom no implementa `requestFullscreen`)

- `"sin Fullscreen API entra en modo expandido y bloquea el scroll"`: `body.style.overflow = "auto"`, `toggle()` → `mode === "expanded"`, overflow `"hidden"`; `toggle()` → `"none"`, overflow `"auto"`.
- `"restaura el scroll si se desmonta estando expandido"`: `toggle()` y luego `unmount()` → overflow vuelve al valor previo.
- `"si requestFullscreen se rechaza cae a modo expandido"`: `ref.current.requestFullscreen = vi.fn().mockRejectedValue(new Error("denied"))`, `toggle()` → `await waitFor(() => expect(result.current.mode).toBe("expanded"))`.
- `"con Fullscreen API usa modo nativo y no toca el scroll"`: `requestFullscreen = vi.fn().mockResolvedValue(undefined)`, `toggle()`. Luego `Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => ref.current })` y `document.dispatchEvent(new Event("fullscreenchange"))` → `mode === "native"` y el overflow no cambia. Al terminar, restaurar `fullscreenElement` a `null`.

- [ ] **Step 2: Ejecutarlos y confirmar que fallan**

Run: `npx vitest run src/components/ui/useViewerFullscreen.test.ts`
Expected: FAIL, no se puede resolver `./useViewerFullscreen`.

- [ ] **Step 3: Implementar `useViewerFullscreen.ts`** según el comportamiento de arriba.

- [ ] **Step 4: Ejecutarlos y confirmar que pasan**

Run: `npx vitest run src/components/ui/useViewerFullscreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Conectar el hook en `BeforeAfterViewer.tsx`**

- `toggleFullscreen` pasa a ser `toggle`, y la acción `exitFullscreen` llama a `exit`.
- Agregar `data-fullscreen-mode={mode}` al contenedor.
- En modo `"expanded"`, el contenedor suma las clases `fixed inset-0 z-50 overflow-auto rounded-none`.

- [ ] **Step 6: Agregar al test del componente** `"pantalla completa sin API expande el visor y Esc lo cierra"`

Clic en `getByRole("button", { name: "Pantalla completa (F)" })` → el contenedor tiene `data-fullscreen="true"` y `data-fullscreen-mode="expanded"`. Luego `fireEvent.keyDown(contenedor, { key: "Escape" })` → `data-fullscreen="false"`.

- [ ] **Step 7: Ejecutar toda la suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/useViewerFullscreen.ts src/components/ui/useViewerFullscreen.test.ts src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): modo expandido del visor cuando el navegador no permite pantalla completa"
```

---

### Task 3: Tamaño por altura y tema oscuro en pantalla completa (problemas 1 y 2)

**Files:**
- Modify: `apps/web/src/app/globals.css` (agregar la variante después de `@import "tailwindcss";`)
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (clases de `Placeholder`, `Stage`, `ToolbarButton`, contenedor, barra superior, envolturas de cada modo, paneles de los deslizadores y opciones inferiores)

**Interfaces:**
- Consumes: `data-fullscreen="true"` en el contenedor (Task 2).
- Produces: la variante `viewer-full:`, que reutilizarán la Fase B (panel lateral y paleta de herramientas).

```css
@custom-variant viewer-full (&:where([data-fullscreen="true"], [data-fullscreen="true"] *));
```

**Criterios de aceptación (CSS, se verifican a mano):**
- **Contenedor en pantalla completa:** `viewer-full:flex viewer-full:h-dvh viewer-full:flex-col viewer-full:bg-slate-950 viewer-full:p-4`. Se eliminan todas las clases `data-[fullscreen=true]:*`, incluida `bg-white`.
- **Área de imagen:** las ramas de los tres modos se envuelven en un bloque `viewer-full:min-h-0 viewer-full:flex-1`. Dentro, el `Stage` deja de ser `w-full` y se dimensiona por la altura disponible: cuadrado, centrado, sin pasar del ancho (`max-w-full`). La barra superior, el deslizador de la cortina u opacidad y las opciones inferiores quedan visibles **sin scroll** en 1920×1080 y 1366×768.
- **Modo lado a lado:** cada panel sigue la misma regla y ambos caben en la altura.
- **Tema oscuro, solo en pantalla completa:**
  - superficies `slate-900`/`slate-800`, bordes `slate-700`, texto `slate-100`/`slate-300`;
  - estado activo (`ToolbarButton active` y segmento de modo activo): `sky-300` con texto `slate-950` o `sky-200` sobre `slate-800`;
  - foco: `viewer-full:focus-visible:outline-sky-300`.
  - El botón ámbar "TAC Pura" conserva su color, porque es un estado.
- **Fuera de pantalla completa:** el visor se ve **idéntico** a hoy.

- [ ] **Step 1: Agregar la variante en `globals.css`.**

- [ ] **Step 2: Aplicar las clases** según los criterios de arriba.

- [ ] **Step 3: Verificar tipos, lint y tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: sin errores y todos los tests en PASS.

- [ ] **Step 4: Verificación manual** con `npm run dev`, en `/platform/uploads/<id de un estudio de prueba LIDC>`

- 1920×1080 y 1366×768, en cada modo (Cortina, Lado a lado, Superpuesto): F → imagen entera, cuadrada, centrada, fondo oscuro y controles visibles sin scroll. Esc → vuelve igual que antes.
- DevTools con dispositivo iPhone 14 (390×844): el visor normal no cambia.
- Contraste del texto `slate-300` sobre `slate-900` y del activo sobre su fondo: ≥ 4.5:1 (con la herramienta de contraste de DevTools).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/ui/BeforeAfterViewer.tsx
git commit -m "style(web): tema oscuro y tamano por altura del visor en pantalla completa"
```

---

### Task 4: Modal de ayuda con los atajos (`?`)

**Files:**
- Modify: `apps/web/src/components/ui/viewerKeys.ts` (agregar `VIEWER_SHORTCUTS`)
- Create: `apps/web/src/components/ui/ViewerHelpDialog.tsx`
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.tsx` (estado `helpOpen`, botón en la barra y acción `openHelp`)
- Modify: `apps/web/src/components/ui/BeforeAfterViewer.test.tsx`

**Interfaces:**
- Consumes: acción `"openHelp"` (Task 1), `mode` y `exit` (Task 2), `Modal` de `src/components/ui/Modal.tsx`.
- Produces:
  ```ts
  export const VIEWER_SHORTCUTS: ReadonlyArray<{ keys: string; description: string }>;
  export function ViewerHelpDialog(props: { open: boolean; onClose: () => void }): JSX.Element | null;
  ```

**Copia exacta de `VIEWER_SHORTCUTS`** (en este orden):

| keys | description |
|---|---|
| `Rueda del ratón` | `Acercar o alejar hacia el cursor` |
| `Arrastrar` | `Mover la imagen (con zoom aplicado)` |
| `+ / −` | `Acercar / alejar` |
| `Flechas` | `Mover la imagen` |
| `0` | `Restablecer zoom y posición` |
| `Espacio` | `Mostrar u ocultar la IA (con el visor enfocado)` |
| `F` | `Pantalla completa` |
| `Esc` | `Salir de pantalla completa` |
| `?` | `Mostrar esta ayuda` |

**Reglas:**
- `ViewerHelpDialog` usa `Modal` con `title="Atajos del visor"` y muestra una lista `<dl>` con `<kbd>` para cada `keys`.
- **Se renderiza dentro del contenedor del visor**: con la Fullscreen API nativa, lo que está fuera del elemento en pantalla completa no se ve.
- Botón nuevo en la barra: `ToolbarButton` con `label="Atajos de teclado (?)"` e icono `Keyboard` de lucide-react, antes del botón de pantalla completa.
- En `onKeyDown`, la acción `exitFullscreen` **se ignora si `helpOpen`**. Así Esc cierra solo el modal (el propio `Modal` escucha Esc).

- [ ] **Step 1: Escribir los tests** en `BeforeAfterViewer.test.tsx`

- `"? con el visor enfocado abre la ayuda dentro del visor"`: `fireEvent.keyDown(contenedor, { key: "?" })` → `getByRole("dialog", { name: "Atajos del visor" })` existe, contiene el texto `Mostrar u ocultar la IA (con el visor enfocado)` y `expect(contenedor).toContainElement(dialog)`.
- `"el botón de la barra abre la ayuda"`: clic en `getByRole("button", { name: "Atajos de teclado (?)" })` → el diálogo existe.
- `"Esc con la ayuda abierta en modo expandido cierra solo la ayuda"`: clic en "Pantalla completa (F)", `keyDown "?"` sobre el contenedor y `fireEvent.keyDown(dialog, { key: "Escape" })` → `queryByRole("dialog")` es `null` y el contenedor sigue con `data-fullscreen="true"`.

- [ ] **Step 2: Ejecutarlos y confirmar que fallan**

Run: `npx vitest run src/components/ui/BeforeAfterViewer.test.tsx`
Expected: FAIL, no se encuentra el diálogo "Atajos del visor".

- [ ] **Step 3: Implementar `VIEWER_SHORTCUTS`, `ViewerHelpDialog` y la conexión en el visor.**

- [ ] **Step 4: Ejecutar toda la suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/viewerKeys.ts src/components/ui/ViewerHelpDialog.tsx src/components/ui/BeforeAfterViewer.tsx src/components/ui/BeforeAfterViewer.test.tsx
git commit -m "feat(web): modal de ayuda con los atajos del visor"
```

---

### Task 5: Auditoría, documentación y cierre

**Files:**
- Modify: `apps/web/CLAUDE.md` (fila `BeforeAfterViewer` de la tabla de componentes)
- Modify: `docs/plan-trabajo-semana-entrante.md` (sección 10.8). Este archivo tiene cambios locales previos del usuario: **preguntar antes** de incluirlos en el commit, o hacer `git add -p` solo con las líneas de la 10.8.

- [ ] **Step 1: Ejecutar `/oncoscan-a11y src/components/ui/BeforeAfterViewer.tsx`** y corregir los hallazgos de nivel AA que toquen esta fase. Volver a ejecutar `npx vitest run` y confirmar PASS.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: compila sin errores de tipos ni de lint.

- [ ] **Step 3: Probar en un iPhone real**, si hay uno disponible: el botón de pantalla completa expande el visor, el fondo no hace scroll y Esc o el mismo botón lo cierran. Si no hay iPhone, anotarlo como pendiente en el resumen del PR.

- [ ] **Step 4: Actualizar la documentación**

- `apps/web/CLAUDE.md`: agregar a la descripción de `BeforeAfterViewer` lo siguiente:
  - atajos solo con el visor enfocado (`viewerKeys.ts`);
  - pantalla completa con respaldo expandido (`useViewerFullscreen.ts`);
  - tema oscuro con la variante `viewer-full:`;
  - ayuda con `?`.
- 10.8: marcar `[x]` en "¿En pantalla completa la imagen cabe entera…?" y en "¿Espacio activa normalmente los botones fuera del visor?".

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documentar la fase A del visor"
```
(Agregar `../../docs/plan-trabajo-semana-entrante.md` solo según lo acordado en Files.)
