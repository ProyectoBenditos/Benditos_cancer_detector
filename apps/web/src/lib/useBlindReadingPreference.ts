"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Preferencia de lectura ciega leída en el navegador (flujo de subida y lotes).
 * `null` mientras carga: quien la usa no muestra el resultado hasta saberla.
 * Si la consulta falla (p. ej. la migración no está aplicada), la función queda apagada.
 */
export function useBlindReadingPreference(): boolean | null {
    const [enabled, setEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        let active = true;
        const supabase = createClient();

        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    if (active) setEnabled(false);
                    return;
                }
                const { data, error } = await supabase
                    .from("profiles")
                    .select("blind_reading")
                    .eq("id", user.id)
                    .maybeSingle();
                if (active) setEnabled(!error && data?.blind_reading === true);
            } catch {
                if (active) setEnabled(false);
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    return enabled;
}
