"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { parseReviewForm } from "@/lib/uploadReview";

export type ReviewState = {
    error?: string;
    savedAt?: string;
    // Valores enviados, para repoblar el formulario si falla (React 19 lo resetea tras la acción).
    fields?: Record<string, string>;
};

const FIELD_KEYS = ["concordancia", "lung_rads", "nodule_size_mm", "conducta", "notes"] as const;

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
    return { savedAt: data?.updated_at ?? new Date().toISOString() };
}
