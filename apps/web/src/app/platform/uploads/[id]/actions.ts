"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { parseReviewForm, UUID_RE } from "@/lib/uploadReview";
import { isValidSeq, parseAnnotation, type AnnotationInput, type AnnotationResult } from "@/lib/uploadAnnotations";

export type ReviewState = {
    error?: string;
    savedAt?: string;
    // Valores enviados. React 19 resetea el formulario tras la acción: con esto se
    // repuebla si falla y también tras guardar en pantallas sin revalidación (subida).
    fields?: Record<string, string>;
};

const FIELD_KEYS = ["concordancia", "lung_rads", "nodule_size_mm", "conducta", "lobar_location", "notes"] as const;

function submittedFields(formData: FormData): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const key of FIELD_KEYS) {
        const value = formData.get(key);
        if (typeof value === "string") fields[key] = value;
    }
    return fields;
}

export async function saveUploadReviewAction(
    _prev: ReviewState,
    formData: FormData,
): Promise<ReviewState> {
    const parsed = parseReviewForm(formData);
    if (!parsed.ok) return { error: parsed.error, fields: submittedFields(formData) };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", fields: submittedFields(formData) };

    // RLS rechaza el insert si el estudio no pertenece al médico.
    const { data, error } = await supabase
        .from("upload_reviews")
        .upsert(
            { upload_id: parsed.uploadId, user_id: user.id, ...parsed.review },
            { onConflict: "upload_id" },
        )
        .select("updated_at")
        .single();

    if (error) {
        return { error: "No se pudo guardar la valoración. Intenta de nuevo.", fields: submittedFields(formData) };
    }

    revalidatePath(`/platform/uploads/${parsed.uploadId}`);
    return { savedAt: data?.updated_at ?? new Date().toISOString(), fields: submittedFields(formData) };
}

// ── Marcadores del visor (Fase C) ──
// Los llama el guardado automático del visor. Errores solo como tipo: la nota
// es PHI y el detalle de Supabase no debe llegar al cliente ni a logs.
// Sin revalidatePath: el visor ya tiene el estado y se guarda en cada pausa.

export async function saveAnnotationAction(input: AnnotationInput): Promise<AnnotationResult> {
    const parsed = parseAnnotation(input);
    if (!parsed.ok) return { ok: false, error: "invalido" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "sesion" };

    // RLS rechaza la escritura si el estudio no pertenece al médico.
    const { error } = await supabase
        .from("upload_annotations")
        .upsert({ ...parsed.values, user_id: user.id }, { onConflict: "upload_id,seq" });

    return error ? { ok: false, error: "guardado" } : { ok: true };
}

export async function deleteAnnotationAction(uploadId: string, seq: number): Promise<AnnotationResult> {
    if (typeof uploadId !== "string" || !UUID_RE.test(uploadId) || !isValidSeq(seq)) {
        return { ok: false, error: "invalido" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "sesion" };

    const { error } = await supabase.from("upload_annotations").delete().eq("upload_id", uploadId).eq("seq", seq);

    return error ? { ok: false, error: "guardado" } : { ok: true };
}
