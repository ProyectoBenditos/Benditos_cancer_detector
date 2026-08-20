import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { BatchHistoryTable, type UploadRecord } from "./BatchHistoryTable";

type PageProps = {
    searchParams: Promise<{ q?: string }>;
};

export default async function UploadsPage({ searchParams }: PageProps) {
    const { q } = await searchParams;
    const supabase = await createClient();

    let query = supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, file_type, ai_score, ai_risk_level, batch_id, metadata_json")
        .order("created_at", { ascending: false });

    if (q && q.trim()) {
        const escaped = q
            .trim()
            .replace(/\\/g, "\\\\")
            .replace(/[%_]/g, "\\$&")
            .replace(/[,()'"]/g, "");
        query = query.or(
            `original_name.ilike.%${escaped}%,metadata_json->>case_ref.ilike.%${escaped}%`
        );
    }

    const { data: uploads, error } = await query;
    const filtered = (uploads as unknown as UploadRecord[]) || [];

    return (
        <PageContainer>
            <SectionHeader
                title="Historial de cargas y análisis"
                description="Listado centralizado de estudios DICOM, cargas individuales y lotes de análisis IA."
                action={
                    <>
                        <Link
                            href="/platform/upload"
                            className={buttonVariants({ variant: "primary", size: "md" })}
                        >
                            Subir DICOM
                        </Link>
                        <Link
                            href="/platform/analyze/batch"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Análisis por Lote
                        </Link>
                    </>
                }
            />

            {/* Buscador */}
            <form method="GET" className="mb-6">
                <div className="flex gap-3">
                    <label htmlFor="uploads-search" className="sr-only">Buscar estudios</label>
                    <input
                        id="uploads-search"
                        type="text"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Buscar por nombre de archivo o referencia del caso..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none transition-all shadow-sm"
                    />
                    <Button type="submit" variant="primary" size="md">
                        Buscar
                    </Button>
                    {q && (
                        <Link
                            href="/platform/uploads"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Limpiar
                        </Link>
                    )}
                </div>
                {q && (
                    <p className="text-xs text-slate-500 mt-2">
                        {filtered.length} resultado(s) para &quot;{q}&quot;
                    </p>
                )}
            </form>

            {error && (
                <div className="mb-6">
                    <AlertBanner
                        variant="error"
                        title="Error cargando historial"
                        description={error.message}
                    />
                </div>
            )}

            {!filtered || filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <span className="text-2xl" aria-hidden="true">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {q ? "Sin resultados" : "No hay estudios registrados"}
                        </h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {q
                                ? `No se encontraron estudios que coincidan con "${q}".`
                                : "Aún no se ha realizado ninguna carga exitosa."}
                        </p>
                        {!q && (
                            <Link
                                href="/platform/upload"
                                className={buttonVariants({ variant: "primary", size: "lg" })}
                            >
                                Realizar la primera carga
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <BatchHistoryTable uploads={filtered} />
            )}
        </PageContainer>
    );
}
