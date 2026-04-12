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
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at")
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
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Fecha Estudio</TableHeaderCell>
                            <TableHeaderCell>Patient ID</TableHeaderCell>
                            <TableHeaderCell>Estado</TableHeaderCell>
                            <TableHeaderCell>Ingresado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {uploads.map((upload) => (
                            <TableRow key={upload.id}>
                                <TableCell className="font-bold text-slate-800 truncate max-w-[200px]" title={upload.original_name}>
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
                                        Auditar
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