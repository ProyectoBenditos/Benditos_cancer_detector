// Valoración del especialista sobre un estudio analizado (tabla `upload_reviews`).
// Los valores deben coincidir con los CHECK de la migración 20261002120000_upload_reviews.sql.

export const CONCORDANCIA_OPTIONS = [
    { value: "concuerda", label: "Concuerda con el resultado IA" },
    { value: "discrepa", label: "Discrepa del resultado IA" },
    { value: "indeterminado", label: "Indeterminado / requiere más estudios" },
] as const;

// ACR Lung-RADS v2022 — categorías asignadas por el radiólogo, no por el modelo.
export const LUNG_RADS_OPTIONS = [
    { value: "0", label: "0 — Incompleto" },
    { value: "1", label: "1 — Negativo" },
    { value: "2", label: "2 — Benigno" },
    { value: "3", label: "3 — Probablemente benigno" },
    { value: "4A", label: "4A — Sospechoso" },
    { value: "4B", label: "4B — Muy sospechoso" },
    { value: "4X", label: "4X — Muy sospechoso con hallazgos adicionales" },
] as const;

// Conductas alineadas con la GPC No. 36 MinSalud (Rec. 2.1): controles por TAC
// según tamaño y confirmación histológica para nódulos > 8 mm.
export const CONDUCTA_OPTIONS = [
    { value: "sin_seguimiento", label: "Sin seguimiento adicional" },
    { value: "tac_3m", label: "TAC de control a 3 meses" },
    { value: "tac_6m", label: "TAC de control a 6 meses" },
    { value: "tac_12m", label: "TAC de control a 12 meses" },
    { value: "pet_tc", label: "PET-TC" },
    { value: "biopsia", label: "Confirmación histológica (biopsia)" },
    { value: "junta", label: "Remisión a junta multidisciplinaria" },
    { value: "otra", label: "Otra (detallar en notas)" },
] as const;

export type Concordancia = (typeof CONCORDANCIA_OPTIONS)[number]["value"];
export type LungRads = (typeof LUNG_RADS_OPTIONS)[number]["value"];
export type Conducta = (typeof CONDUCTA_OPTIONS)[number]["value"];

export const NOTES_MAX_LENGTH = 4000;
export const NODULE_SIZE_MAX_MM = 300;

export type UploadReview = {
    concordancia: Concordancia | null;
    lung_rads: LungRads | null;
    nodule_size_mm: number | null;
    conducta: Conducta | null;
    notes: string | null;
    updated_at?: string | null;
};

export type ParsedReview =
    | { ok: true; uploadId: string; review: Omit<UploadReview, "updated_at"> }
    | { ok: false; error: string };

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readText(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function pickOption<T extends string>(
    raw: string,
    options: readonly { value: T }[],
): T | null | undefined {
    if (raw === "") return null;
    return options.find((o) => o.value === raw)?.value; // undefined = valor inválido
}

export const LOBAR_LOCATIONS = [
    { value: "lsd", label: "Lóbulo Superior Derecho (LSD)", short: "LSD", side: "Pulmón Derecho" },
    { value: "lmd", label: "Lóbulo Medio Derecho (LMD)", short: "LMD", side: "Pulmón Derecho" },
    { value: "lid", label: "Lóbulo Inferior Derecho (LID)", short: "LID", side: "Pulmón Derecho" },
    { value: "lsi", label: "Lóbulo Superior Izquierdo (LSI)", short: "LSI", side: "Pulmón Izquierdo" },
    { value: "lii", label: "Lóbulo Inferior Izquierdo (LII)", short: "LII", side: "Pulmón Izquierdo" },
] as const;

export type LobarLocation = (typeof LOBAR_LOCATIONS)[number]["value"];

export function extractLobarLocation(notes: string | null | undefined): {
    lobarLocation: LobarLocation | null;
    cleanNotes: string;
} {
    if (!notes) return { lobarLocation: null, cleanNotes: "" };
    const match = notes.match(/\[LOBAR:([a-z0-9_-]+)\]/i);
    if (match) {
        const found = LOBAR_LOCATIONS.find((l) => l.value.toLowerCase() === match[1].toLowerCase());
        const cleanNotes = notes.replace(/\[LOBAR:[a-z0-9_-]+\]\s*/i, "").trim();
        return {
            lobarLocation: found ? found.value : null,
            cleanNotes,
        };
    }
    return { lobarLocation: null, cleanNotes: notes };
}

export function encodeLobarNotes(lobarLocation: string | null | undefined, freeNotes: string): string {
    const trimmed = freeNotes.trim();
    if (!lobarLocation) return trimmed;
    return `[LOBAR:${lobarLocation}]${trimmed ? `\n${trimmed}` : ""}`;
}

export function parseReviewForm(formData: FormData): ParsedReview {
    const uploadId = readText(formData, "upload_id");
    if (!UUID_RE.test(uploadId)) {
        return { ok: false, error: "Estudio no válido." };
    }

    const concordancia = pickOption(readText(formData, "concordancia"), CONCORDANCIA_OPTIONS);
    const lungRads = pickOption(readText(formData, "lung_rads"), LUNG_RADS_OPTIONS);
    const conducta = pickOption(readText(formData, "conducta"), CONDUCTA_OPTIONS);
    const lobarLocation = pickOption(readText(formData, "lobar_location"), LOBAR_LOCATIONS);

    if (concordancia === undefined || lungRads === undefined || conducta === undefined || lobarLocation === undefined) {
        return { ok: false, error: "Una de las opciones seleccionadas no es válida." };
    }

    const sizeRaw = readText(formData, "nodule_size_mm").replace(",", ".");
    let noduleSize: number | null = null;
    if (sizeRaw !== "") {
        const parsed = Number(sizeRaw);
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > NODULE_SIZE_MAX_MM) {
            return { ok: false, error: `El tamaño del nódulo debe estar entre 0.1 y ${NODULE_SIZE_MAX_MM} mm.` };
        }
        noduleSize = Math.round(parsed * 10) / 10;
    }

    const rawNotes = readText(formData, "notes");
    const combinedNotes = encodeLobarNotes(lobarLocation, rawNotes);

    if (combinedNotes.length > NOTES_MAX_LENGTH) {
        return { ok: false, error: `Las notas no pueden superar ${NOTES_MAX_LENGTH} caracteres.` };
    }

    if (!concordancia && !lungRads && !conducta && noduleSize === null && !combinedNotes) {
        return { ok: false, error: "Completa al menos un campo antes de guardar." };
    }

    return {
        ok: true,
        uploadId,
        review: {
            concordancia,
            lung_rads: lungRads,
            nodule_size_mm: noduleSize,
            conducta,
            notes: combinedNotes || null,
        },
    };
}
