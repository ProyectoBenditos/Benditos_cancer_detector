import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { CONDUCTA_OPTIONS, LUNG_RADS_OPTIONS } from "@/lib/uploadReview";
import type { InitialImpression } from "@/lib/initialImpression";

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
    return options.find((o) => o.value === value)?.label ?? value;
}

// Impresión registrada en la lectura ciega, antes de ver la IA. Solo lectura: la fila es inmutable.
export function InitialImpressionSummary({ impression }: { impression: InitialImpression }) {
    const markerCount = Array.isArray(impression.markers_snapshot) ? impression.markers_snapshot.length : 0;

    return (
        <Card className="mb-6">
            <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-5">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 text-slate-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Impresión inicial (antes de la IA)
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Registrada en la lectura ciega. No se puede editar.
                        </p>
                    </div>
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lung-RADS</dt>
                        <dd className="text-sm font-medium text-slate-800">
                            {optionLabel(LUNG_RADS_OPTIONS, impression.lung_rads)}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conducta</dt>
                        <dd className="text-sm font-medium text-slate-800">
                            {optionLabel(CONDUCTA_OPTIONS, impression.conducta)}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Marcadores</dt>
                        <dd className="text-sm font-medium text-slate-800 tabular-nums">
                            {markerCount === 1 ? "1 marcador" : `${markerCount} marcadores`}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registrada</dt>
                        <dd className="text-sm font-medium text-slate-800">
                            {new Date(impression.revealed_at).toLocaleString()}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nota</dt>
                        <dd className="text-sm text-slate-800 whitespace-pre-line break-words">
                            {impression.notes ?? <span className="text-slate-400 italic">Sin nota</span>}
                        </dd>
                    </div>
                </dl>
            </CardContent>
        </Card>
    );
}
