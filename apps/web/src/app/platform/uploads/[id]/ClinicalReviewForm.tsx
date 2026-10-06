"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { SourceLink } from "@/components/referencias/SourceLink";
import { REFERENCES } from "@/lib/references";
import {
    CONCORDANCIA_OPTIONS,
    CONDUCTA_OPTIONS,
    LUNG_RADS_OPTIONS,
    NODULE_SIZE_MAX_MM,
    NOTES_MAX_LENGTH,
    type UploadReview,
} from "@/lib/uploadReview";
import { saveUploadReviewAction, type ReviewState } from "./actions";

const FIELD_CLASS =
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";
const HINT_CLASS = "mt-1 text-xs text-slate-500";

type Props = {
    uploadId: string;
    initial: UploadReview | null;
};

export function ClinicalReviewForm({ uploadId, initial }: Props) {
    const [state, formAction, pending] = useActionState<ReviewState, FormData>(saveUploadReviewAction, {});
    const lastSaved = state.savedAt ?? initial?.updated_at ?? null;
    // Tras enviar (con éxito o error) se repuebla con lo enviado; antes, con lo guardado en BD.
    const value = (key: string, saved: string | number | null | undefined) =>
        state.fields?.[key] ?? (saved == null ? "" : String(saved));

    return (
        <Card className="mb-6">
            <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 bg-brand-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <ClipboardCheck className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Valoración del especialista
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Registra tu lectura del estudio. Queda guardada junto al resultado IA y solo tú puedes verla.
                        </p>
                    </div>
                </div>

                <form action={formAction} className="space-y-5">
                    <input type="hidden" name="upload_id" value={uploadId} />

                    <fieldset>
                        <legend className={LABEL_CLASS}>Concordancia con el resultado IA</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {CONCORDANCIA_OPTIONS.map((o) => (
                                <label
                                    key={o.value}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 cursor-pointer has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary"
                                >
                                    <input
                                        type="radio"
                                        name="concordancia"
                                        value={o.value}
                                        defaultChecked={value("concordancia", initial?.concordancia) === o.value}
                                        className="accent-brand-primary"
                                    />
                                    {o.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="lung_rads" className={LABEL_CLASS}>
                                Categoría Lung-RADS <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <select
                                id="lung_rads"
                                name="lung_rads"
                                defaultValue={value("lung_rads", initial?.lung_rads)}
                                className={FIELD_CLASS}
                                aria-describedby="lung_rads-hint"
                            >
                                <option value="">Sin asignar</option>
                                {LUNG_RADS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <p id="lung_rads-hint" className={HINT_CLASS}>
                                Según <SourceLink href={REFERENCES.lungRads.url}>ACR Lung-RADS v2022</SourceLink>. El modelo no asigna esta categoría.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="nodule_size_mm" className={LABEL_CLASS}>
                                Diámetro del nódulo (mm) <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                id="nodule_size_mm"
                                name="nodule_size_mm"
                                type="number"
                                inputMode="decimal"
                                min={0.1}
                                max={NODULE_SIZE_MAX_MM}
                                step={0.1}
                                defaultValue={value("nodule_size_mm", initial?.nodule_size_mm)}
                                className={FIELD_CLASS}
                                aria-describedby="nodule_size_mm-hint"
                                placeholder="Ej: 6.5"
                            />
                            <p id="nodule_size_mm-hint" className={HINT_CLASS}>
                                El tamaño define el seguimiento en la{" "}
                                <SourceLink href={REFERENCES.gpc36.url}>GPC No. 36 MinSalud (Rec. 2.1)</SourceLink>.{" "}
                                <Link href="/platform/modelo#seguimiento-gpc" className="text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover">
                                    Ver tabla
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="conducta" className={LABEL_CLASS}>
                            Conducta / seguimiento <span className="text-slate-400 font-normal">(opcional)</span>
                        </label>
                        <select
                            id="conducta"
                            name="conducta"
                            defaultValue={value("conducta", initial?.conducta)}
                            className={FIELD_CLASS}
                        >
                            <option value="">Sin definir</option>
                            {CONDUCTA_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="notes" className={LABEL_CLASS}>
                            Notas clínicas <span className="text-slate-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={5}
                            maxLength={NOTES_MAX_LENGTH}
                            defaultValue={value("notes", initial?.notes)}
                            className={`${FIELD_CLASS} resize-y`}
                            placeholder="Hallazgos, correlación clínica, antecedentes relevantes, plan acordado..."
                        />
                        <p className={HINT_CLASS}>
                            Dato sensible de salud. Tratado según la{" "}
                            <SourceLink href={REFERENCES.ley1581.url}>Ley 1581 de 2012</SourceLink>; no reemplaza la historia clínica oficial (
                            <SourceLink href={REFERENCES.res1995.url}>Res. 1995 de 1999</SourceLink>).
                        </p>
                    </div>

                    {state.error ? (
                        <AlertBanner variant="error" title="No se guardó la valoración" description={state.error} />
                    ) : null}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button type="submit" variant="primary" size="md" loading={pending}>
                            {pending ? "Guardando..." : initial || state.savedAt ? "Actualizar valoración" : "Guardar valoración"}
                        </Button>
                        <p role="status" aria-live="polite" className="text-xs text-slate-500">
                            {lastSaved && !pending
                                ? `${state.savedAt ? "Guardado" : "Última actualización"}: ${new Date(lastSaved).toLocaleString()}`
                                : null}
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
