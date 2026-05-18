import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

type PageProps = {
    searchParams: Promise<{ q?: string }>;
};

export default async function UploadsPage({ searchParams }: PageProps) {
    const { q } = await searchParams;
    const supabase = await createClient();

    let query = supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, file_type, ai_score, ai_risk_level, metadata_json")
        .order("created_at", { ascending: false });

    if (q && q.trim()) {
        query = query.ilike("original_name", `%${q.trim()}%`);
    }

    const { data: uploads, error } = await query;

    const filtered = q && q.trim()
        ? uploads?.filter(u =>
            u.original_name.toLowerCase().includes(q.toLowerCase()) ||
            (u.metadata_json?.case_ref ?? "").toLowerCase().includes(q.toLowerCase())
          )
        : uploads;

    return (
        <PageContainer>
            <SectionHeader
                title="Historial de cargas y análisis"
                description="Listado centralizado de estudios DICOM y análisis IA."
                action={
                    <>
                        <Link
                            href="/platform/upload"
                            className={buttonVariants({ variant: "primary", size: "md" })}
                        >
                            Subir DICOM
                        </Link>
                        <Link
                            href="/platform/analyze"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Análisis IA
                        </Link>
                        <Link
                            href="/platform"
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            Volver
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
                        {filtered?.length ?? 0} resultado(s) para &quot;{q}&quot;
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
                <TableWrapper>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Archivo</TableHeaderCell>
                            <TableHeaderCell>Tipo</TableHeaderCell>
                            <TableHeaderCell>Referencia</TableHeaderCell>
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Fecha Estudio</TableHeaderCell>
                            <TableHeaderCell>Riesgo IA</TableHeaderCell>
                            <TableHeaderCell>Score IA</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Ingresado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {filtered.map((upload) => {
                            const isAnalysis = upload.file_type === "png_analysis";
                            const detailHref = isAnalysis
                                ? `/platform/analyze/${upload.id}`
                                : `/platform/uploads/${upload.id}`;
                            return (
                                <TableRow key={upload.id}>
                                    <TableCell className="font-bold text-slate-800 truncate max-w-[150px]" title={upload.original_name}>
                                        {upload.original_name}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                                            isAnalysis
                                                ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                                                : "bg-slate-100 text-slate-700 border-slate-200"
                                        }`}>
                                            {isAnalysis ? "IA" : "DICOM"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-600 truncate max-w-[120px]" title={upload.metadata_json?.case_ref ?? ""}>
                                        {upload.metadata_json?.case_ref
                                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium">{upload.metadata_json.case_ref}</span>
                                            : <span className="text-slate-400 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>{upload.modality ?? "N/D"}</TableCell>
                                    <TableCell className="text-slate-500">{upload.study_date ?? "N/D"}</TableCell>
                                    <TableCell>
                                        <RiskBadge level={upload.ai_risk_level as RiskLevel | null} />
                                    </TableCell>
                                    <TableCell className="text-slate-700 font-medium">
                                        {upload.ai_score != null
                                            ? `${(upload.ai_score * 100).toFixed(1)}%`
                                            : <span className="text-slate-400 text-xs">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={upload.upload_status} />
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs">
                                        {new Date(upload.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <Link
                                            href={detailHref}
                                            className="text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded"
                                        >
                                            {isAnalysis ? "Ver IA" : "Ver detalle"}
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </TableWrapper>
            )}
        </PageContainer>
    );
}
