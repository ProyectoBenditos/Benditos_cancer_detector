"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type FeatureKey =
    | "subtlety"
    | "calcification"
    | "sphericity"
    | "margin"
    | "lobulation"
    | "spiculation"
    | "texture"
    | "malignancy";

type FeatureSpec = {
    key: FeatureKey;
    label: string;
    min: number;
    max: number;
    hint: string;
};

const FEATURES: FeatureSpec[] = [
    { key: "subtlety",     label: "Subtlety",      min: 1, max: 5, hint: "1 = muy sutil, 5 = obvio" },
    { key: "calcification",label: "Calcification", min: 1, max: 6, hint: "1 = popcorn, 6 = ausente" },
    { key: "sphericity",   label: "Sphericity",    min: 1, max: 5, hint: "1 = lineal, 5 = redondo" },
    { key: "margin",       label: "Margin",        min: 1, max: 5, hint: "1 = mal definido, 5 = bien definido" },
    { key: "lobulation",   label: "Lobulation",    min: 1, max: 5, hint: "1 = ninguna, 5 = marcada" },
    { key: "spiculation",  label: "Spiculation",   min: 1, max: 5, hint: "1 = ninguna, 5 = marcada" },
    { key: "texture",      label: "Texture",       min: 1, max: 5, hint: "1 = no solido, 5 = solido" },
    { key: "malignancy",   label: "Malignancy",    min: 1, max: 5, hint: "1 = benigno, 5 = maligno" },
];

const DEFAULT_FEATURES: Record<FeatureKey, string> = {
    subtlety: "3",
    calcification: "3",
    sphericity: "3",
    margin: "3",
    lobulation: "3",
    spiculation: "3",
    texture: "3",
    malignancy: "3",
};

const MAX_BYTES = 10 * 1024 * 1024;

export default function AnalyzePage() {
    const supabase = createClient();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [features, setFeatures] = useState<Record<FeatureKey, string>>(DEFAULT_FEATURES);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const updateFeature = (key: FeatureKey, value: string) => {
        setFeatures((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (!file) {
            setErrorMsg("Selecciona una imagen PNG o JPG.");
            return;
        }
        if (file.size > MAX_BYTES) {
            setErrorMsg("La imagen excede el limite de 10 MB.");
            return;
        }

        for (const spec of FEATURES) {
            const raw = features[spec.key];
            const num = Number(raw);
            if (raw === "" || Number.isNaN(num)) {
                setErrorMsg(`Ingresa un numero valido para ${spec.label}.`);
                return;
            }
            if (num < spec.min || num > spec.max) {
                setErrorMsg(`${spec.label} debe estar entre ${spec.min} y ${spec.max}.`);
                return;
            }
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session?.access_token) {
                setErrorMsg("No se pudo obtener la sesion del usuario. Recarga la pagina.");
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append("imagen", file);
            for (const spec of FEATURES) {
                formData.append(spec.key, features[spec.key]);
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analysis/predict`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setErrorMsg(result.detail || "Error iniciando el analisis.");
                setLoading(false);
                return;
            }

            router.push(`/platform/analyze/${result.upload_id}`);
        } catch {
            setErrorMsg("Ocurrio un error inesperado iniciando el analisis.");
            setLoading(false);
        }
    };

    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title="Analisis IA de nodulo pulmonar"
                description="Sube una imagen CT (PNG/JPG) e ingresa las 8 features clinicas. El modelo OncaScan AI devolvera score y nivel de riesgo."
                action={
                    <Link
                        href="/platform"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        Cancelar y Volver
                    </Link>
                }
            />

            <Card>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Imagen CT (PNG / JPG, max 10 MB)
                            </label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all font-medium focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                            />
                            {file && (
                                <p className="text-xs text-slate-500 mt-2">
                                    Seleccionado: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(0)} KB)
                                </p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-3">Features clinicas</h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {FEATURES.map((spec) => (
                                    <Input
                                        key={spec.key}
                                        label={`${spec.label} (${spec.min}-${spec.max})`}
                                        type="number"
                                        step="0.1"
                                        min={spec.min}
                                        max={spec.max}
                                        value={features[spec.key]}
                                        onChange={(e) => updateFeature(spec.key, e.target.value)}
                                        placeholder={spec.hint}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Las features siguen la convencion LIDC-IDRI. Valor por defecto 3 = intermedio.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-brand-primary px-8 py-3.5 font-medium text-white hover:bg-brand-primary-hover disabled:opacity-60 transition-colors shadow-sm"
                        >
                            {loading ? "Iniciando analisis..." : "Ejecutar analisis"}
                        </button>
                    </form>

                    {errorMsg && (
                        <div className="mt-8 rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-sm text-brand-danger font-medium">
                            {errorMsg}
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}
