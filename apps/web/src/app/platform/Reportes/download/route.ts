import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tipo = req.nextUrl.searchParams.get("tipo") ?? "completo";

    let query = supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, ai_risk_level, ai_score, ai_recommendation, ai_model_version, upload_status, created_at, metadata_json")
        .order("created_at", { ascending: false });

    if (tipo === "alto_riesgo") {
        query = query.eq("ai_risk_level", "ALTO");
    } else if (tipo === "estadistico") {
        query = query.not("ai_score", "is", null);
    } else if (tipo === "con_referencia") {
        query = query.not("metadata_json->>case_ref", "is", null);
    }

    const { data, error } = await query;

    if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
    }

    const headers = ["ID", "Archivo", "Referencia", "Modalidad", "Fecha Estudio", "Riesgo IA", "Score IA (%)", "Recomendación", "Modelo", "Estado", "Ingresado"];
    const rows = data.map(u => [
        u.id,
        u.original_name,
        u.metadata_json?.case_ref ?? "",
        u.modality ?? "",
        u.study_date ?? "",
        u.ai_risk_level ?? "",
        u.ai_score != null ? (u.ai_score * 100).toFixed(2) : "",
        u.ai_recommendation ?? "",
        u.ai_model_version ?? "",
        u.upload_status,
        new Date(u.created_at).toLocaleString("es-CO"),
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const filename = `oncoscan_reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}