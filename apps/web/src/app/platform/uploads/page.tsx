import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";

function RiskBadge({ level }: { level: string | null }) {
    if (!level) return <span className="text-slate-400 text-xs">Sin análisis</span>;
    const colors: Record<string, string> = {
        ALTO:  "bg-red-100 text-red-700 border-red-200",
        MEDIO: "bg-amber-100 text-amber-700 border-amber-200",
        BAJO:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colors[level] ?? "bg-slate-100 text-slate-600"}`}>
            {level}
        </span>
    );
}

export default async function UploadsPage() {
    const supabase = await createClient();

    const { data: uploads, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, ai_score, ai_risk_level")
        .order("created_at", { ascending: false });

    return (
        <PageContainer>
            <SectionHeader
                title="Historial de cargas DICOM"
                description="Listado centralizado y gestión de toda la operación de estudios."
                action={
                    <>
                        <Link
                            href="/platform/upload"
                            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                        >
                            Subir DICOM
                        </Link>
                        <Link
                            href="/platform"
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Volver
                        </Link>
                    </>
                }
            />

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 mb-6 font-medium">
                    Error cargando historial: {error.message}
                </div>
            )}

            {!uploads || uploads.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <span className="text-2xl">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No hay estudios registrados</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            Aún no se ha realizado ninguna carga exitosa de imágenes hacia la plataforma.
                        </p>
                        <Link
                            href="/platform/upload"
                            className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover shadow-sm transition-all"
                        >
                            Realizar la primera carga
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <TableWrapper>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Archivo</TableHeaderCell>
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Fecha Estudio</TableHeaderCell>
                            <TableHeaderCell>Patient ID</TableHeaderCell>
                            <TableHeaderCell>Riesgo IA</TableHeaderCell>
                            <TableHeaderCell>Score IA</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Ingresado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {uploads.map((upload) => (
                            <TableRow key={upload.id}>
                                <TableCell className="font-bold text-slate-800 truncate max-w-[180px]" title={upload.original_name}>
                                    {upload.original_name}
                                </TableCell>
                                <TableCell>{upload.modality ?? "N/D"}</TableCell>
                                <TableCell className="text-slate-500">{upload.study_date ?? "N/D"}</TableCell>
                                <TableCell>
                                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200 uppercase tracking-widest">
                                        {upload.patient_id_dicom ?? "N/D"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <RiskBadge level={upload.ai_risk_level} />
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
                                        href={`/platform/uploads/${upload.id}`}
                                        className="text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                                    >
                                        Ver detalle
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </TableWrapper>
            )}
        </PageContainer>
    );
}