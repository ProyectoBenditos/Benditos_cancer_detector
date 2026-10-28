import Link from "next/link";
import { redirect } from "next/navigation";
import { EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { isBlindPending, loadBlindContext } from "@/lib/blindReading";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { buttonVariants } from "@/components/ui/Button";

export default async function AlertasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: rows, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, ai_score, ai_risk_level, ai_recommendation, ai_processed_at, patient_id_dicom")
        .eq("ai_risk_level", "ALTO")
        .order("ai_processed_at", { ascending: false });

    // Lectura ciega: un estudio pendiente no aparece en las alertas (falla cerrado si
    // no se puede saber qué está revelado).
    const blind = await loadBlindContext(supabase, user.id);
    const alertas = (rows ?? []).filter((r) => !isBlindPending(blind, r.id));
    const total = alertas.length;

    return (
        <PageContainer>
            <SectionHeader
                title="Centro de Alertas"
                description="Estudios con riesgo ALTO que requieren atención urgente."
                action={
                    <Link
                        href="/platform"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Volver
                    </Link>
                }
            />

            {/* Nota fija con la lectura ciega activa, haya o no pendientes, para no revelar nada. */}
            {blind.enabled && (
                <p className="mb-6 flex items-center gap-2 text-sm text-slate-600">
                    <EyeOff className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    Los estudios con lectura ciega pendiente aparecen aquí cuando registras tu impresión.
                </p>
            )}

            {total > 0 && (
                <div className="mb-6">
                    <AlertBanner
                        variant="critical"
                        title={total === 1
                            ? "1 estudio requiere evaluación urgente"
                            : `${total} estudios requieren evaluación urgente`}
                        description="Casos clasificados con riesgo ALTO por el modelo IA"
                    />
                </div>
            )}

            {error && (
                <div className="mb-6">
                    <AlertBanner
                        variant="error"
                        title="Error cargando alertas"
                        description={error.message}
                    />
                </div>
            )}

            {total === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <span className="text-2xl" aria-hidden="true">✅</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Sin alertas críticas</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            No hay estudios con riesgo ALTO en este momento.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <TableWrapper>
                    <TableHead>
                        <tr>
                            <TableHeaderCell>Archivo</TableHeaderCell>
                            <TableHeaderCell>Patient ID</TableHeaderCell>
                            <TableHeaderCell>Modalidad</TableHeaderCell>
                            <TableHeaderCell>Score IA</TableHeaderCell>
                            <TableHeaderCell>Recomendación</TableHeaderCell>
                            <TableHeaderCell>Analizado</TableHeaderCell>
                            <TableHeaderCell className="text-right">Acción</TableHeaderCell>
                        </tr>
                    </TableHead>
                    <TableBody>
                        {alertas.map((alerta) => (
                            <TableRow key={alerta.id}>
                                <TableCell className="font-bold text-slate-800 truncate max-w-[160px]" title={alerta.original_name}>
                                    {alerta.original_name}
                                </TableCell>
                                <TableCell>
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold border border-slate-200 uppercase tracking-widest">
                                        {alerta.patient_id_dicom ?? "N/D"}
                                    </span>
                                </TableCell>
                                <TableCell>{alerta.modality ?? "N/D"}</TableCell>
                                <TableCell>
                                    <span className="font-bold text-brand-danger">
                                        {alerta.ai_score != null
                                            ? `${(alerta.ai_score * 100).toFixed(1)}%`
                                            : "N/D"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-600 max-w-[200px] truncate" title={alerta.ai_recommendation ?? ""}>
                                    {alerta.ai_recommendation ?? "N/D"}
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                    {alerta.ai_processed_at
                                        ? new Date(alerta.ai_processed_at).toLocaleString()
                                        : "N/D"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link
                                        href={`/platform/uploads/${alerta.id}`}
                                        className="text-brand-danger hover:text-brand-danger-hover hover:underline font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded"
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
