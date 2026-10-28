"use client";

import { useActionState, useEffect, useId } from "react";
import { EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { SourceLink } from "@/components/referencias/SourceLink";
import { REFERENCES } from "@/lib/references";
import { CONDUCTA_OPTIONS, LUNG_RADS_OPTIONS, NOTES_MAX_LENGTH } from "@/lib/uploadReview";
import type { SaveStatus } from "@/components/ui/useMarkerAutosave";
import { registerInitialImpressionAction, type ImpressionState } from "./actions";
import { clearRevealPending, markRevealPending } from "./RevealFocus";

const FIELD_CLASS =
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";
const HINT_CLASS = "mt-1 text-xs text-slate-500";

const MARKERS_SAVING = "Guardando marcadores…";
const MARKERS_NOT_SAVED = "Tus marcadores no se guardaron. Reintenta desde el panel del visor antes de registrar.";

/** Destino de «Ir al formulario completo» desde el panel del visor. */
export const IMPRESSION_ANCHOR_ID = "impresion-inicial";

type Props = {
    uploadId: string;
    /** Estado del guardado automático de los marcadores del visor. */
    saveStatus: SaveStatus;
    /** Los marcadores guardados no se pudieron cargar: el visor no guarda. */
    markersLoadFailed: boolean;
};

// Impresión inicial de la lectura ciega. Sin concordancia: el médico todavía no ha visto la IA.
export function BlindImpressionForm({ uploadId, saveStatus, markersLoadFailed }: Props) {
    const [state, formAction, pending] = useActionState<ImpressionState, FormData>(
        registerInitialImpressionAction,
        {},
    );
    const statusId = useId();

    // Una señal vieja (envío que no llegó a revelar) no debe mover el foco más tarde.
    useEffect(() => {
        clearRevealPending();
    }, []);
    useEffect(() => {
        if (state.error) clearRevealPending();
    }, [state.error]);

    // La copia de los marcadores se toma en el servidor: registrar con cambios
    // sin guardar dejaría una impresión que no coincide con lo marcado.
    const markersNotSaved = markersLoadFailed || saveStatus === "error";
    const blockedReason = markersNotSaved ? MARKERS_NOT_SAVED : saveStatus === "saving" ? MARKERS_SAVING : null;

    const value = (key: string) => state.fields?.[key] ?? "";

    return (
        <Card id={IMPRESSION_ANCHOR_ID} tabIndex={-1} className="mb-6 scroll-mt-20 outline-none">
            <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 bg-brand-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <EyeOff className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Impresión inicial
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Se guarda con una copia de tus marcadores. Al registrarla se muestra la IA y ya no se puede editar.
                        </p>
                    </div>
                </div>

                <form action={formAction} onSubmit={() => markRevealPending(uploadId)} className="space-y-5">
                    <input type="hidden" name="upload_id" value={uploadId} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="impression_lung_rads" className={LABEL_CLASS}>
                                Categoría Lung-RADS
                            </label>
                            <select
                                id="impression_lung_rads"
                                name="lung_rads"
                                required
                                defaultValue={value("lung_rads")}
                                className={FIELD_CLASS}
                                aria-describedby="impression_lung_rads-hint"
                            >
                                <option value="" disabled>Elige una categoría</option>
                                {LUNG_RADS_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <p id="impression_lung_rads-hint" className={HINT_CLASS}>
                                Según <SourceLink href={REFERENCES.lungRads.url}>ACR Lung-RADS v2022</SourceLink>.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="impression_conducta" className={LABEL_CLASS}>
                                Conducta / seguimiento
                            </label>
                            <select
                                id="impression_conducta"
                                name="conducta"
                                required
                                defaultValue={value("conducta")}
                                className={FIELD_CLASS}
                            >
                                <option value="" disabled>Elige una conducta</option>
                                {CONDUCTA_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="impression_notes" className={LABEL_CLASS}>
                            Nota <span className="text-slate-500 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            id="impression_notes"
                            name="notes"
                            rows={3}
                            maxLength={NOTES_MAX_LENGTH}
                            defaultValue={value("notes")}
                            className={`${FIELD_CLASS} resize-y`}
                            aria-describedby="impression_notes-hint"
                        />
                        <p id="impression_notes-hint" className={HINT_CLASS}>
                            Dato sensible de salud. Tratado según la{" "}
                            <SourceLink href={REFERENCES.ley1581.url}>Ley 1581 de 2012</SourceLink>.
                        </p>
                    </div>

                    {state.error ? (
                        <AlertBanner variant="error" title="No se registró la impresión" description={state.error} />
                    ) : null}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            loading={pending}
                            disabled={blockedReason !== null}
                            aria-describedby={statusId}
                        >
                            Registrar impresión y ver la IA
                        </Button>
                        <p id={statusId} role="status" aria-live="polite" className="text-xs text-slate-600">
                            {blockedReason}
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
