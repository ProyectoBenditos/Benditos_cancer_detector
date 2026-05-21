"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type AnalyzeFeatureKey =
    | "subtlety"
    | "calcification"
    | "sphericity"
    | "margin"
    | "lobulation"
    | "spiculation"
    | "texture"
    | "malignancy";

export type AnalyzeState = {
    error?: string;
};

const FEATURE_LIMITS: Record<AnalyzeFeatureKey, { min: number; max: number; label: string }> = {
    subtlety: { min: 1, max: 5, label: "Subtlety" },
    calcification: { min: 1, max: 6, label: "Calcification" },
    sphericity: { min: 1, max: 5, label: "Sphericity" },
    margin: { min: 1, max: 5, label: "Margin" },
    lobulation: { min: 1, max: 5, label: "Lobulation" },
    spiculation: { min: 1, max: 5, label: "Spiculation" },
    texture: { min: 1, max: 5, label: "Texture" },
    malignancy: { min: 1, max: 5, label: "Malignancy" },
};

const FEATURE_KEYS = Object.keys(FEATURE_LIMITS) as AnalyzeFeatureKey[];

const MAX_BYTES = 10 * 1024 * 1024;

export async function analyzeAction(
    _prev: AnalyzeState,
    formData: FormData
): Promise<AnalyzeState> {
    const file = formData.get("imagen");
    if (!(file instanceof File) || file.size === 0) {
        return { error: "Selecciona una imagen PNG o JPG." };
    }
    if (file.size > MAX_BYTES) {
        return { error: "La imagen excede el limite de 10 MB." };
    }

    for (const key of FEATURE_KEYS) {
        const spec = FEATURE_LIMITS[key];
        const raw = formData.get(key);
        const str = typeof raw === "string" ? raw : "";
        const num = Number(str);
        if (str === "" || Number.isNaN(num)) {
            return { error: `Ingresa un numero valido para ${spec.label}.` };
        }
        if (num < spec.min || num > spec.max) {
            return { error: `${spec.label} debe estar entre ${spec.min} y ${spec.max}.` };
        }
    }

    const supabase = await createClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session?.access_token) {
        return { error: "No se pudo obtener la sesion del usuario. Recarga la pagina." };
    }

    const upstream = new FormData();
    upstream.append("imagen", file);
    for (const key of FEATURE_KEYS) {
        upstream.append(key, formData.get(key) as string);
    }

    let uploadId: string | undefined;
    try {
        const response = await fetch(
            `${process.env.API_URL}/api/v1/analysis/predict`,
            {
                method: "POST",
                headers: { Authorization: `Bearer ${data.session.access_token}` },
                body: upstream,
            }
        );
        const result = (await response.json()) as { upload_id?: string; detail?: string };
        if (!response.ok) {
            return { error: result.detail || "Error iniciando el analisis." };
        }
        uploadId = result.upload_id;
    } catch {
        return { error: "Ocurrio un error inesperado iniciando el analisis." };
    }

    if (!uploadId) {
        return { error: "El backend no devolvio un ID de analisis." };
    }

    redirect(`/platform/analyze/${uploadId}`);
}
