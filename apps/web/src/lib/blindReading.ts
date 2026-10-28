// Lectura ciega: con `profiles.blind_reading` activo, la IA de un estudio
// queda oculta hasta que el médico registra su impresión inicial o su valoración.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BlindContext = { enabled: boolean; pendingIds: Set<string> };

export const BLIND_DISABLED: BlindContext = { enabled: false, pendingIds: new Set() };

export const BLIND_PENDING_LABEL = "Pendiente de lectura";
export const BLIND_VIEWER_REASON = "La IA está oculta hasta que registres tu impresión inicial.";

export function pendingIdsFrom(analyzedIds: string[], revealedIds: string[]): Set<string> {
    const revealed = new Set(revealedIds);
    return new Set(analyzedIds.filter((id) => !revealed.has(id)));
}

// Falla cerrado: si no se puede saber qué está revelado, lanza en vez de mostrar la IA.
// Si no se puede leer el perfil, la lectura ciega queda desactivada.
export async function loadBlindContext(supabase: SupabaseClient, userId: string): Promise<BlindContext> {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("blind_reading")
        .eq("id", userId)
        .maybeSingle();
    if (profileError || !profile?.blind_reading) return BLIND_DISABLED;

    const [uploads, impressions, reviews] = await Promise.all([
        supabase.from("dicom_uploads").select("id").eq("user_id", userId).in("upload_status", ["analyzed", "ai_completed"]),
        supabase.from("upload_initial_impressions").select("upload_id").eq("user_id", userId),
        supabase.from("upload_reviews").select("upload_id").eq("user_id", userId),
    ]);
    if (uploads.error || impressions.error || reviews.error) {
        throw new Error("No se pudo determinar el estado de la lectura ciega.");
    }

    const analyzedIds = (uploads.data ?? []).map((r: { id: string }) => r.id);
    const revealedIds = [
        ...(impressions.data ?? []).map((r: { upload_id: string }) => r.upload_id),
        ...(reviews.data ?? []).map((r: { upload_id: string }) => r.upload_id),
    ];
    return { enabled: true, pendingIds: pendingIdsFrom(analyzedIds, revealedIds) };
}

export function isBlindPending(ctx: BlindContext, uploadId: string): boolean {
    return ctx.pendingIds.has(uploadId);
}

export function maskBlindPending<
    T extends {
        id: string;
        ai_score?: number | null;
        ai_risk_level?: string | null;
        ai_recommendation?: string | null;
    },
>(rows: T[], ctx: BlindContext): Array<T & { blind_pending: boolean }> {
    return rows.map((row) =>
        isBlindPending(ctx, row.id)
            ? { ...row, ai_score: null, ai_risk_level: null, ai_recommendation: null, blind_pending: true }
            : { ...row, blind_pending: false },
    );
}
