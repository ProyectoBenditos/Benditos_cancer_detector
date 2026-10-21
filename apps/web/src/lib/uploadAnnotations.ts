// Marcadores del visor guardados en `upload_annotations` (Fase C).
// Los valores deben coincidir con los CHECK de la migración 20261021120000_upload_annotations.sql.
// `note` es PHI: nunca se escribe en logs.

import {
    AI_AGREEMENT_OPTIONS,
    FINDING_TYPE_OPTIONS,
    MARKER_NOTE_MAX,
    MARKER_SIZE_MAX_MM,
    type AiAgreement,
    type FindingType,
    type Marker,
} from "@/components/ui/markerState";
import { UUID_RE } from "./uploadReview";

export type AnnotationInput = {
    uploadId: string;
    seq: number;
    x: number;
    y: number;
    findingType: FindingType | null;
    aiAgreement: AiAgreement | null;
    note: string;
    sizeMm: number | null;
};

/** Fila tal como la devuelve PostgREST (`numeric` puede llegar como texto). */
export type AnnotationRow = {
    seq: number;
    x: number;
    y: number;
    finding_type: string | null;
    ai_agreement: string | null;
    note: string | null;
    size_mm: number | string | null;
};

export type AnnotationDbValues = {
    upload_id: string;
    seq: number;
    kind: "point";
    x: number;
    y: number;
    finding_type: FindingType | null;
    ai_agreement: AiAgreement | null;
    note: string;
    size_mm: number | null;
};

export const ANNOTATION_COLUMNS = "seq, x, y, finding_type, ai_agreement, note, size_mm";

const SEQ_MAX = 32767; // smallint

const FINDING_VALUES = new Set<string>(FINDING_TYPE_OPTIONS.map((o) => o.value));
const AGREEMENT_VALUES = new Set<string>(AI_AGREEMENT_OPTIONS.map((o) => o.value));

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isUnit = (v: unknown): v is number => isFiniteNumber(v) && v >= 0 && v <= 1;

export function isValidSeq(seq: unknown): seq is number {
    return typeof seq === "number" && Number.isInteger(seq) && seq >= 1 && seq <= SEQ_MAX;
}

/** Valida lo que llega del cliente antes de tocar la base de datos. */
export function parseAnnotation(input: unknown): { ok: true; values: AnnotationDbValues } | { ok: false } {
    if (typeof input !== "object" || input === null) return { ok: false };
    const a = input as Record<string, unknown>;

    if (typeof a.uploadId !== "string" || !UUID_RE.test(a.uploadId)) return { ok: false };
    if (!isValidSeq(a.seq)) return { ok: false };
    if (!isUnit(a.x) || !isUnit(a.y)) return { ok: false };
    if (a.findingType !== null && !(typeof a.findingType === "string" && FINDING_VALUES.has(a.findingType))) {
        return { ok: false };
    }
    if (a.aiAgreement !== null && !(typeof a.aiAgreement === "string" && AGREEMENT_VALUES.has(a.aiAgreement))) {
        return { ok: false };
    }
    if (a.sizeMm !== null && !(isFiniteNumber(a.sizeMm) && a.sizeMm > 0 && a.sizeMm <= MARKER_SIZE_MAX_MM)) {
        return { ok: false };
    }
    if (typeof a.note !== "string" || a.note.length > MARKER_NOTE_MAX) return { ok: false };

    return {
        ok: true,
        values: {
            upload_id: a.uploadId,
            seq: a.seq,
            kind: "point",
            x: a.x,
            y: a.y,
            finding_type: a.findingType as FindingType | null,
            ai_agreement: a.aiAgreement as AiAgreement | null,
            note: a.note,
            size_mm: a.sizeMm === null ? null : Math.round(a.sizeMm * 10) / 10,
        },
    };
}

/** Fila guardada → marcador del visor. null si la fila no es válida. */
export function rowToMarker(row: AnnotationRow): Marker | null {
    if (!isValidSeq(row.seq) || !isUnit(row.x) || !isUnit(row.y)) return null;
    const size = row.size_mm == null ? null : Number(row.size_mm);
    return {
        id: `m${row.seq}`,
        seq: row.seq,
        x: row.x,
        y: row.y,
        findingType: row.finding_type && FINDING_VALUES.has(row.finding_type) ? (row.finding_type as FindingType) : null,
        aiAgreement:
            row.ai_agreement && AGREEMENT_VALUES.has(row.ai_agreement) ? (row.ai_agreement as AiAgreement) : null,
        note: row.note ?? "",
        sizeMm: size !== null && Number.isFinite(size) && size > 0 ? size : null,
    };
}
