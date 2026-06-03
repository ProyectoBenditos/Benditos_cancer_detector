# Visor interactivo de imágenes médicas (zoom, pan, overlay Grad-CAM)

- **Fecha**: 2026-06-03
- **Autor(es)**: Equipo OncoScan
- **Estado**: `Implementado`
- **Issues cubiertos**: KAN-98 (continuación)

## 1. Contexto

El componente `apps/web/src/components/ui/BeforeAfterViewer.tsx` (commit `0d9bfab`, KAN-98)
hoy renderiza dos `<img>` estáticas lado a lado: la imagen original del estudio (signed URL
del bucket `dicom-files`; para DICOM es un preview PNG, para PNG/JPG es el original) y el mapa
de calor Grad-CAM (PNG en base64, rojo = mayor activación del modelo). No hay interacción.

Ambas imágenes son del mismo estudio y mismo tamaño, pensadas para superponerse. Para la
sustentación académica se quiere un visor pulido que permita inspeccionar el estudio y entender
dónde miró el modelo. **No es un dispositivo médico certificado**; el objetivo es claridad y
calidad de demo, no precisión diagnóstica.

El componente se usa en 3 sitios, todos con las mismas props (`beforeUrl`, `heatmapBase64`):

- `apps/web/src/app/platform/upload/page.tsx` — client, resultado inline tras analizar.
- `apps/web/src/app/platform/analyze/[id]/page.tsx` — client, flujo PNG con polling.
- `apps/web/src/app/platform/uploads/[id]/page.tsx` — **server component**, flujo DICOM.

## 2. Decisión

Convertir `BeforeAfterViewer` en un visor interactivo cliente que ofrece **zoom hacia el
cursor, pan, fullscreen y un toggle entre dos modos** — *overlay* (heatmap superpuesto sobre el
original con control de opacidad) y *lado a lado sincronizado* (dos paneles que comparten el
mismo zoom/pan). Implementado **a mano con CSS transforms, sin dependencias nuevas**,
manteniendo las props actuales para no tocar los 3 call sites.

## 3. Interfaces

### 3.1 Endpoints HTTP / Server actions

N/A — cambio puramente de UI cliente. No se añaden endpoints ni server actions. El componente
sigue recibiendo exactamente los mismos datos que hoy.

### 3.2 Componentes / Props

La firma pública **no cambia** (compatibilidad con los 3 call sites):

```ts
type BeforeAfterViewerProps = {
  beforeUrl: string | null;       // signed URL de la imagen original (o preview PNG de DICOM)
  heatmapBase64: string | null;   // PNG base64 del heatmap Grad-CAM
};
```

El archivo pasa a ser `"use client"`. Importarlo desde el Server Component
`uploads/[id]/page.tsx` es válido: las props son serializables (strings/null) y se crea un
límite cliente.

Estructura interna en unidades pequeñas y testeables:

```
apps/web/src/components/ui/BeforeAfterViewer.tsx   // orquesta modo, opacidad, render, fullscreen
apps/web/src/components/ui/usePanZoom.ts           // hook: estado de transform + matemática pura
apps/web/src/components/ui/panZoomMath.ts          // funciones puras (zoom-al-cursor, clamp) → testeables
```

Estado interno (no expuesto en props):

| Estado | Tipo | Rango / default | Rol |
|--------|------|-----------------|-----|
| `mode` | `"overlay" \| "side"` | default `"overlay"` | Modo de visualización (segmented control) |
| `scale` | `number` | clamp `[1, 8]`, default `1` | Nivel de zoom |
| `tx`, `ty` | `number` | clamp a bordes según `scale` | Desplazamiento (pan) en px |
| `opacity` | `number` | `[0, 1]`, default `0.6` | Opacidad del heatmap (solo modo overlay) |
| `isFullscreen` | `boolean` | default `false` | Estado de pantalla completa |

`panZoomMath.ts` (funciones puras, sin React):

```ts
// Nuevo scale tras un evento de rueda, acotado a [min, max].
function nextScale(current: number, deltaY: number, min: number, max: number): number;

// Translate ajustado para que el zoom apunte al cursor (cx, cy relativos al stage).
function zoomToCursor(
  prev: { scale: number; tx: number; ty: number },
  next: { scale: number },
  cursor: { x: number; y: number },
): { tx: number; ty: number };

// Acota tx/ty para que la imagen escalada no deje bordes vacíos dentro del stage.
function clampTranslate(
  t: { tx: number; ty: number },
  scale: number,
  stage: { w: number; h: number },
): { tx: number; ty: number };
```

### 3.3 Modelo de datos

N/A — no se tocan tablas, RLS ni Storage de Supabase.

## 4. Alternativas descartadas

- **`react-zoom-pan-pinch`**: librería de zoom/pan/pinch. Descartada porque agrega una
  dependencia nueva (requiere discusión por política del proyecto) y, al ser el visor solo para
  escritorio (mouse + teclado), el ahorro es mínimo: overlay, opacidad, toggle y fullscreen
  habría que construirlos a mano igualmente.
- **OpenSeadragon**: visor de imágenes gigapíxel basado en mosaicos (tiles). Descartada porque
  las imágenes son PNGs únicos del mismo tamaño, no pirámides de tiles; sería sobredimensionado,
  pesado y con overlay incómodo.
- **Solo modo overlay** (sin lado a lado): descartada porque el usuario eligió el toggle entre
  ambos modos para combinar impacto visual (overlay) y comparación con contexto (lado a lado).

## 5. Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Matemática de zoom-al-cursor con bugs (saltos, drift) | Media | Bajo | Funciones puras en `panZoomMath.ts` con test unitario (vitest) |
| Uso accidental de `brand-danger` (rojo reservado) en controles | Baja | Medio | Controles solo en `brand-primary`/`slate`; el rojo es dato del heatmap, no UI |
| Fuga de PHI por logging durante depuración | Baja | Alto | Prohibido `console.*`; `beforeUrl` y heatmap nunca a logs |
| Regresión accesibilidad (no operable por teclado) | Media | Medio | `role="group"`, foco visible, atajos +/−/0/F/flechas; ejecutar `/oncoscan-a11y` |
| Romper alguno de los 3 call sites | Baja | Alto | Mantener firma de props idéntica; verificar las 3 rutas |

## 6. Plan de verificación

- [ ] Test unitario de `panZoomMath.ts` (`apps/web/src/components/ui/panZoomMath.test.ts`):
      `nextScale` respeta clamp; `clampTranslate` no deja bordes vacíos; `zoomToCursor` mantiene
      el punto bajo el cursor.
- [ ] Verificación manual en las 3 rutas: `upload`, `analyze/[id]`, `uploads/[id]` — zoom con
      rueda, pan arrastrando, toggle de modo, slider de opacidad, fullscreen, atajos de teclado.
- [ ] `/oncoscan-a11y` ejecutado sobre `BeforeAfterViewer.tsx` (UI clínica).
- [ ] `git grep -n "console\." apps/web/src` sigue devolviendo solo la línea esperada de `error.tsx`.

## 7. Issues cubiertos

- **KAN-98** (continuación) — Visualizador antes/después con mapa de calor Grad-CAM: esta spec
  evoluciona el componente entregado en `0d9bfab` de estático a interactivo (zoom, pan, overlay
  con opacidad, lado a lado sincronizado, fullscreen) sin cambiar su contrato de props.

## 8. Referencias

- ADRs previas: n/a
- Especificaciones reemplazadas: n/a (extiende KAN-98)
- Sub-CLAUDE.md: `apps/web/CLAUDE.md` (tokens, política `console.*`, "no agregar librerías sin discutir")
