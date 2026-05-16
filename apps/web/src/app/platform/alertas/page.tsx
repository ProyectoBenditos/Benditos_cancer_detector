import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

export default async function AlertasPage() {
    const supabase = await createClient();

    const { data: alertas, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, ai_score, ai_risk_level, ai_recommendation, ai_processed_at, patient_id_dicom")
        .eq("ai_risk_level", "ALTO")
        .order("ai_processed_at", { ascending: false });

    const total = alertas?.length ?? 0;

    return (
        <PageContainer>
            <SectionHeader
                title="Centro de Alertas"
                description="Estudios con riesgo ALTO que requieren atención urgente."
                action={
                    <Link
                        href="/platform"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Volver
                    </Link>
                }
            />

            {/* Contador */}
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">
                    {total}
                </span>
                <div>
                    <p className="font-semibold text-red-700">
                        {total === 0
                            ? "No hay alertas activas"
                            : total === 1
                            ? "1 estudio requiere evaluación urgente"
                            : `${total} estudios requieren evaluación urgente`}
                    </p>
                    <p className="text-xs text-red-500">
                        Casos clasificados con riesgo ALTO por el modelo IA
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 mb-6 font-medium">
                    Error cargando alertas: {error.message}
                </div>
            )}

            {total === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <span className="text-2xl">✅</span>
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
                        {alertas!.map((alerta) => (
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
                                    <span className="font-bold text-red-600">
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
                                        className="text-red-600 hover:text-red-700 hover:underline font-medium transition-colors"
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