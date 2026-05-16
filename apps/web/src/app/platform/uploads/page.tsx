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

type PageProps = {
    searchParams: Promise<{ q?: string }>;
};

export default async function UploadsPage({ searchParams }: PageProps) {
    const { q } = await searchParams;
    const supabase = await createClient();

    let query = supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at, ai_score, ai_risk_level, metadata_json")
        .order("created_at", { ascending: false });

    // Filtrar por nombre de archivo si hay búsqueda
    if (q && q.trim()) {
        query = query.ilike("original_name", `%${q.trim()}%`);
    }

    const { data: uploads, error } = await query;

    // Filtrar también por case_ref en metadata_json (client-side sobre los resultados)
    const filtered = q && q.trim()
        ? uploads?.filter(u =>
            u.original_name.toLowerCase().includes(q.toLowerCase()) ||
            (u.metadata_json?.case_ref ?? "").toLowerCase().includes(q.toLowerCase())
          )
        : uploads;

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

            {/* Buscador */}
            <form method="GET" className="mb-6">
                <div className="flex gap-3">
                    <input
                        type="text"
                        name="q"
                        defaultValue={q ?? ""}
                        placeholder="Buscar por nombre de archivo o referencia del caso..."
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-hover transition-colors shadow-sm"
                    >
                        Buscar
                    </button>
                    {q && (
                        <Link
                            href="/platform/uploads"
                            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Limpiar
                        </Link>
                    )}
                </div>
                {q && (
                    <p className="text-xs text-slate-500 mt-2">
                        {filtered?.length ?? 0} resultado(s) para "{q}"
                    </p>
                )}
            </form>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 mb-6 font-medium">
                    Error cargando historial: {error.message}
                </div>
            )}

            {!filtered || filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                            <span className="text-2xl">📋</span>
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
                                className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover shadow-sm transition-all"
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
                        {filtered.map((upload) => (
                            <TableRow key={upload.id}>
                                <TableCell className="font-bold text-slate-800 truncate max-w-[150px]" title={upload.original_name}>
                                    {upload.original_name}
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