/**
 * Estado de los marcadores del visor (reducer puro, testeado).
 * En la Fase B vive solo en el navegador; los valores de findingType y
 * aiAgreement son los del CHECK de la futura tabla upload_annotations (Fase C).
 * La nota es PHI: no se envía a console.* ni a logs.
 */
import { clamp } from "./panZoomMath";

export type FindingType = "solido" | "subsolido" | "vidrio_esmerilado" | "calcificado" | "artefacto" | "otro";
export type AiAgreement = "ia_marco" | "ia_no_marco" | "ia_falso_positivo";

export type Marker = {
  id: string;
  /** Número visible. No se reutiliza al borrar (coincide con `seq` de la Fase C). */
  seq: number;
  /** Coordenadas normalizadas [0,1] sobre la imagen. */
  x: number;
  y: number;
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

export function markersReducer(state: MarkersState, action: MarkerAction): MarkersState {
  switch (action.type) {
    case "add": {
      const seq = state.nextSeq;
      const marker: Marker = {
        id: `m${seq}`,
        seq,
        x: clamp01(action.x),
        y: clamp01(action.y),
        findingType: null,
        aiAgreement: null,
        note: "",
        sizeMm: null,
      };
      return { markers: [...state.markers, marker], selectedId: marker.id, nextSeq: seq + 1 };
    }
    case "update":
      return mapMarker(state, action.id, (m) => ({ ...m, ...sanitizePatch(action.patch) }));
    case "move":
      return mapMarker(state, action.id, (m) => ({ ...m, x: clamp01(action.x), y: clamp01(action.y) }));
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

export function findingLabel(t: FindingType | null): string {
  return FINDING_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? "Sin clasificar";
}

/** «Marcador 2: nódulo subsólido, comienzo de la nota…» */
export function markerAriaLabel(m: Marker): string {
  let label = `Marcador ${m.seq}: ${findingLabel(m.findingType).toLowerCase()}`;
  const note = m.note.trim();
  if (note) {
    const head = note.slice(0, ARIA_NOTE_CHARS).trimEnd();
    label += `, ${head}${note.length > ARIA_NOTE_CHARS ? "…" : ""}`;
  }
  return label;
}
