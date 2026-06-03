import { Card, CardContent } from "@/components/ui/Card";

type BeforeAfterViewerProps = {
    beforeUrl: string | null;
    heatmapBase64: string | null;
};

function PanelLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            {children}
        </h2>
    );
}

function Placeholder({ message }: { message: string }) {
    return (
        <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
            {message}
        </div>
    );
}

export function BeforeAfterViewer({ beforeUrl, heatmapBase64 }: BeforeAfterViewerProps) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <PanelLabel>Imagen original (antes)</PanelLabel>
                        {beforeUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={beforeUrl}
                                alt="Imagen original del estudio subido por el usuario"
                                className="aspect-square w-full rounded-xl border border-slate-200 bg-black object-contain"
                            />
                        ) : (
                            <Placeholder message="Vista previa no disponible" />
                        )}
                    </div>

                    <div>
                        <PanelLabel>Mapa de calor (después)</PanelLabel>
                        {heatmapBase64 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`data:image/png;base64,${heatmapBase64}`}
                                alt="Mapa de calor Grad-CAM superpuesto que resalta las zonas de mayor activación del modelo"
                                className="aspect-square w-full rounded-xl border border-slate-200 bg-black object-contain"
                            />
                        ) : (
                            <Placeholder message="Mapa de calor no disponible" />
                        )}
                    </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                    En el mapa de calor, las zonas en rojo indican mayor activación del modelo
                    (regiones que más influyeron en la predicción). Es una visualización de apoyo
                    y no constituye un diagnóstico.
                </p>
            </CardContent>
        </Card>
    );
}
