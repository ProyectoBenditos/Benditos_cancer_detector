// Impresión inicial del especialista, registrada antes de ver la IA
// (tabla `upload_initial_impressions`, migración 20261028120000_blind_reading.sql).

import {
    CONDUCTA_OPTIONS,
    LUNG_RADS_OPTIONS,
    NOTES_MAX_LENGTH,
    UUID_RE,
    type Conducta,
    type LungRads,
} from "./uploadReview";

export type ImpressionFields = {
    lung_rads: LungRads;
    conducta: Conducta;
    notes: string | null;
};

export type InitialImpression = ImpressionFields & {
    markers_snapshot: unknown[];
    revealed_at: string;
};

export type ParsedImpression =
    | { ok: true; uploadId: string; impression: ImpressionFields }
    | { ok: false; error: string };

function readText(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

export function parseImpressionForm(formData: FormData): ParsedImpression {
    const uploadId = readText(formData, "upload_id");
    if (!UUID_RE.test(uploadId)) {
        return { ok: false, error: "Estudio no válido." };
    }

    const lungRads = LUNG_RADS_OPTIONS.find((o) => o.value === readText(formData, "lung_rads"))?.value;
    if (!lungRads) {
        return { ok: false, error: "Elige la categoría Lung-RADS de tu impresión inicial." };
    }

    const conducta = CONDUCTA_OPTIONS.find((o) => o.value === readText(formData, "conducta"))?.value;
    if (!conducta) {
        return { ok: false, error: "Elige la conducta de tu impresión inicial." };
    }

    const notes = readText(formData, "notes");
    if (notes.length > NOTES_MAX_LENGTH) {
        return { ok: false, error: "La nota supera los 4.000 caracteres." };
    }

    return {
        ok: true,
        uploadId,
        impression: { lung_rads: lungRads, conducta, notes: notes || null },
    };
}
