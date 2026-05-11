import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function UploadsPage() {
    const supabase = await createClient();

    // No need to redirect here since `platform/layout.tsx` guarantees valid session
    const { data: uploads, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, file_type, ai_risk_level, ai_score")
        .order("created_at", { ascending: false });

    return (
        <PageContainer>
            <SectionHeader
                title="Historial de cargas y analisis"
                description="Listado centralizado de estudios DICOM y analisis IA."
                action={
                    <>
                        <Link
                            href="/platform/upload"
                            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                        >
                            Subir DICOM
                        </Link>
                        <Link
                            href="/platform/analyze"
                            className="rounded-lg border border-brand-primary/40 bg-brand-primary/5 px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/10 transition-colors shadow-sm"
                        >
                            Analisis IA
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

            {error ? (
                <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-brand-danger mb-6 font-medium">
                    Error cargando historial de la base de datos: {error.message}
                </div>
            ) : null}

            {!uploads || uploads.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                             <span className="text-2xl">📋</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No hay estudios registrados</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Aún no se ha realizado ninguna carga exitosa de imágenes DICOM hacia nuestra plataforma de procesamiento.</p>
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
                            <TableHeaderCell>Referencia Archivo</TableHeaderCell>
                            <TableHeaderCell>Tipo</TableHeaderCell>
                            <TableHeaderCell>Modalidad / Riesgo IA</TableHeaderCell>
                            <TableHeaderCell>Fecha Estudio</TableHeaderCell>
                            <TableHeaderCell>Patient ID</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Ingresado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {uploads.map((upload) => {
                            const isAnalysis = upload.file_type === "png_analysis";
                            const detailHref = isAnalysis
                                ? `/platform/analyze/${upload.id}`
                                : `/platform/uploads/${upload.id}`;
                            return (
                                <TableRow key={upload.id}>
                                    <TableCell className="font-bold text-slate-800 truncate max-w-[200px]" title={upload.original_name}>
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
                                    <TableCell>
                                        {isAnalysis ? (
                                            upload.ai_risk_level ? (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    upload.ai_risk_level === "ALTO"
                                                        ? "bg-brand-danger/10 text-brand-danger border-brand-danger/30"
                                                        : upload.ai_risk_level === "MEDIO"
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                }`}>
                                                    {upload.ai_risk_level}
                                                    {upload.ai_score !== null && upload.ai_score !== undefined
                                                        ? ` · ${Number(upload.ai_score).toFixed(3)}`
                                                        : ""}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Pendiente</span>
                                            )
                                        ) : (
                                            upload.modality ?? "N/D"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-500">{upload.study_date ?? "N/D"}</TableCell>
                                    <TableCell>
                                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200 uppercase tracking-widest">
                                            {upload.patient_id_dicom ?? "N/D"}
                                        </span>
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
                                            className="text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                                        >
                                            {isAnalysis ? "Ver IA" : "Auditar"}
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