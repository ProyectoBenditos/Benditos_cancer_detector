/**
 * Estado de los marcadores del visor (reducer puro, testeado).
 * En la Fase B vive solo en el navegador; los valores de findingType y
 * aiAgreement son los del CHECK de la futura tabla upload_annotations (Fase C).
 * La nota es PHI: nunca se escribe en la consola del navegador ni en logs.
 * Una medición es un marcador con segundo punto: comparte numeración, panel y guardado.
 */
import { clamp } from "./panZoomMath";
import { formatMm } from "./measureMath";

export type FindingType = "solido" | "subsolido" | "vidrio_esmerilado" | "calcificado" | "artefacto" | "otro";
export type AiAgreement = "ia_marco" | "ia_no_marco" | "ia_falso_positivo";
export type MarkerKind = "point" | "measure";

export type Marker = {
  id: string;
  /** Número visible. No se reutiliza al borrar (coincide con `seq` de la Fase C). */
  seq: number;
  kind: MarkerKind;
  /** Coordenadas normalizadas [0,1] sobre la imagen. */
  x: number;
  y: number;
  /** Segundo punto de una medición; null en los puntos. */
  x2: number | null;
  y2: number | null;
  findingType: FindingType | null;
  aiAgreement: AiAgreement | null;
  note: string;
  /** En una medición es la distancia calculada, no un dato editable. */
  sizeMm: number | null;
};

export type MarkersState = { markers: Marker[]; selectedId: string | null; nextSeq: number };
export type MarkerPatch = Partial<Pick<Marker, "findingType" | "aiAgreement" | "note" | "sizeMm">>;
export type MarkerAction =
  | { type: "add"; x: number; y: number }
  | { type: "addMeasure"; x: number; y: number; x2: number; y2: number; sizeMm: number }
  | { type: "update"; id: string; patch: MarkerPatch }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "remove"; id: string }
  | { type: "select"; id: string | null };

export const MARKERS_INITIAL: MarkersState = { markers: [], selectedId: null, nextSeq: 1 };
export const MARKER_NOTE_MAX = 1000;
export const MARKER_SIZE_MAX_MM = 300;

export const FINDING_TYPE_OPTIONS: ReadonlyArray<{ value: FindingType; label: string }> = [
  { value: "solido", label: "Nódulo sólido" },
  { value: "subsolido", label: "Nódulo subsólido" },
  { value: "vidrio_esmerilado", label: "Vidrio esmerilado" },
  { value: "calcificado", label: "Calcificado" },
  { value: "artefacto", label: "Artefacto" },
  { value: "otro", label: "Otro" },
];

export const AI_AGREEMENT_OPTIONS: ReadonlyArray<{ value: AiAgreement; label: string }> = [
  { value: "ia_marco", label: "La IA lo marcó" },
  { value: "ia_no_marco", label: "La IA no lo marcó (posible falso negativo)" },
  { value: "ia_falso_positivo", label: "La IA marcó algo que no es lesión (falso positivo)" },
];

const ARIA_NOTE_CHARS = 35;

const clamp01 = (v: number) => clamp(v, 0, 1);

function validSize(v: number | null): number | null {
  if (v == null || !Number.isFinite(v) || v <= 0 || v > MARKER_SIZE_MAX_MM) return null;
  return v;
}

function sanitizePatch(patch: MarkerPatch): MarkerPatch {
  const out: MarkerPatch = { ...patch };
  if (patch.note !== undefined) out.note = patch.note.slice(0, MARKER_NOTE_MAX);
  if (patch.sizeMm !== undefined) out.sizeMm = validSize(patch.sizeMm);
  return out;
}

function mapMarker(state: MarkersState, id: string, fn: (m: Marker) => Marker): MarkersState {
  if (!state.markers.some((m) => m.id === id)) return state;
  return { ...state, markers: state.markers.map((m) => (m.id === id ? fn(m) : m)) };
}

function appendMarker(state: MarkersState, fields: Omit<Marker, "id" | "seq">): MarkersState {
  const seq = state.nextSeq;
  const marker: Marker = { id: `m${seq}`, seq, ...fields };
  return { markers: [...state.markers, marker], selectedId: marker.id, nextSeq: seq + 1 };
}

const EMPTY_DETAILS = { findingType: null, aiAgreement: null, note: "" } as const;

/** Desplaza la medición entera: el paso se acota para que ningún extremo salga de [0,1]. */
function moveMeasure(m: Marker, x: number, y: number): Marker {
  const x2 = m.x2 ?? m.x;
  const y2 = m.y2 ?? m.y;
  const dx = clamp(x - m.x, -Math.min(m.x, x2), 1 - Math.max(m.x, x2));
  const dy = clamp(y - m.y, -Math.min(m.y, y2), 1 - Math.max(m.y, y2));
  return { ...m, x: clamp01(m.x + dx), y: clamp01(m.y + dy), x2: clamp01(x2 + dx), y2: clamp01(y2 + dy) };
}

export function markersReducer(state: MarkersState, action: MarkerAction): MarkersState {
  switch (action.type) {
    case "add":
      return appendMarker(state, {
        kind: "point",
        x: clamp01(action.x),
        y: clamp01(action.y),
        x2: null,
        y2: null,
        ...EMPTY_DETAILS,
        sizeMm: null,
      });
    case "addMeasure": {
      // Sin mm válidos no hay medición: no se podría guardar.
      const sizeMm = validSize(action.sizeMm);
      if (sizeMm === null) return state;
      return appendMarker(state, {
        kind: "measure",
        x: clamp01(action.x),
        y: clamp01(action.y),
        x2: clamp01(action.x2),
        y2: clamp01(action.y2),
        ...EMPTY_DETAILS,
        sizeMm,
      });
    }
    case "update":
      return mapMarker(state, action.id, (m) => {
        const patch = sanitizePatch(action.patch);
        if (m.kind === "measure") delete patch.sizeMm;
        return { ...m, ...patch };
      });
    case "move":
      return mapMarker(state, action.id, (m) =>
        m.kind === "measure" ? moveMeasure(m, action.x, action.y) : { ...m, x: clamp01(action.x), y: clamp01(action.y) }
      );
    case "remove":
      if (!state.markers.some((m) => m.id === action.id)) return state;
      return {
        ...state,
        markers: state.markers.filter((m) => m.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case "select":
      return { ...state, selectedId: action.id };
  }
}

/**
 * Estado inicial desde marcadores guardados: ordenados por seq, el siguiente
 * número es el mayor + 1 y sin selección.
 */
export function markersStateFrom(markers: Marker[]): MarkersState {
  const sorted = [...markers].sort((a, b) => a.seq - b.seq);
  const maxSeq = sorted.length > 0 ? sorted[sorted.length - 1].seq : 0;
  return { markers: sorted, selectedId: null, nextSeq: maxSeq + 1 };
}

export function findingLabel(t: FindingType | null): string {
  return FINDING_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? "Sin clasificar";
}

/** «Marcador 2: nódulo subsólido, comienzo de la nota…» o «Medición 3: 12,4 mm, …» */
export function markerAriaLabel(m: Marker): string {
  let label =
    m.kind === "measure" && m.sizeMm !== null
      ? `Medición ${m.seq}: ${formatMm(m.sizeMm)}`
      : `Marcador ${m.seq}: ${findingLabel(m.findingType).toLowerCase()}`;
  const note = m.note.trim();
  if (note) {
    const head = note.slice(0, ARIA_NOTE_CHARS).trimEnd();
    label += `, ${head}${note.length > ARIA_NOTE_CHARS ? "…" : ""}`;
  }
  return label;
}
