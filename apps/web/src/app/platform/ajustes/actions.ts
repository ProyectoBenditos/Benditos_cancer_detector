"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type BlindReadingResult = { ok: true } | { ok: false; error: string };

// Preferencia por médico. La política profiles_update_own limita la
// escritura al propio perfil; el error al cliente es siempre un texto fijo.
export async function setBlindReadingAction(enabled: boolean): Promise<BlindReadingResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

    const { error } = await supabase
        .from("profiles")
        .update({ blind_reading: enabled === true })
        .eq("id", user.id);

    if (error) return { ok: false, error: "No se pudo guardar la preferencia. Intenta de nuevo." };

    revalidatePath("/platform", "layout");
    return { ok: true };
}
