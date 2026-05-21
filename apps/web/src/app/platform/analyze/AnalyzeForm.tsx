"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { analyzeAction, type AnalyzeFeatureKey, type AnalyzeState } from "./actions";

type FeatureSpec = {
    key: AnalyzeFeatureKey;
    label: string;
    min: number;
    max: number;
    hint: string;
    default: string;
};

const FEATURES: FeatureSpec[] = [
    { key: "subtlety",      label: "Subtlety",      min: 1, max: 5, hint: "1 = muy sutil, 5 = obvio",      default: "3" },
    { key: "calcification", label: "Calcification", min: 1, max: 6, hint: "1 = popcorn, 6 = ausente",      default: "3" },
    { key: "sphericity",    label: "Sphericity",    min: 1, max: 5, hint: "1 = lineal, 5 = redondo",       default: "3" },
    { key: "margin",        label: "Margin",        min: 1, max: 5, hint: "1 = mal definido, 5 = bien",    default: "3" },
    { key: "lobulation",    label: "Lobulation",    min: 1, max: 5, hint: "1 = ninguna, 5 = marcada",      default: "3" },
    { key: "spiculation",   label: "Spiculation",   min: 1, max: 5, hint: "1 = ninguna, 5 = marcada",      default: "3" },
    { key: "texture",       label: "Texture",       min: 1, max: 5, hint: "1 = no solido, 5 = solido",     default: "3" },
    { key: "malignancy",    label: "Malignancy",    min: 1, max: 5, hint: "1 = benigno, 5 = maligno",      default: "3" },
];

const INITIAL_STATE: AnalyzeState = {};

export function AnalyzeForm() {
    const [state, formAction, pending] = useActionState(analyzeAction, INITIAL_STATE);
    const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

    return (
        <form action={formAction} aria-label="Análisis IA de nódulo pulmonar" className="space-y-8">
            <div>
                <label htmlFor="analyze-imagen" className="mb-2 block text-sm font-medium text-slate-700">
                    Imagen CT (PNG / JPG, máx 10 MB)
                </label>
                <input
                    id="analyze-imagen"
                    name="imagen"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        setFileInfo(f ? { name: f.name, size: f.size } : null);
                    }}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all font-medium focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
                />
                {fileInfo && (
                    <p className="text-xs text-slate-500 mt-2">
                        Seleccionado: <span className="font-medium">{fileInfo.name}</span> ({(fileInfo.size / 1024).toFixed(0)} KB)
                    </p>
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Features clínicas</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((spec) => (
                        <Input
                            key={spec.key}
                            name={spec.key}
                            label={`${spec.label} (${spec.min}-${spec.max})`}
                            type="number"
                            step="0.1"
                            min={spec.min}
                            max={spec.max}
                            defaultValue={spec.default}
                            placeholder={spec.hint}
                        />
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    Las features siguen la convención LIDC-IDRI. Valor por defecto 3 = intermedio.
                </p>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={pending}>
                {pending ? "Iniciando análisis..." : "Ejecutar análisis"}
            </Button>

            {state.error && (
                <AlertBanner
                    variant="error"
                    title="No pudimos iniciar el análisis"
                    description={state.error}
                />
            )}
        </form>
    );
}
