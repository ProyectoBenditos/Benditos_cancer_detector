import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function UploadDetailPage({ params }: PageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: upload, error } = await supabase
        .from("dicom_uploads")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !upload) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-sky-300">Detalle de carga</p>
                        <h1 className="text-3xl font-bold">{upload.original_name}</h1>
                        <p className="mt-2 text-slate-400">
                            Información básica del archivo DICOM registrado.
                        </p>
                    </div>

                    <Link
                        href="/platform/uploads"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                    >
                        Volver al historial
                    </Link>
                </div>

                <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm md:grid-cols-2">
                    <div><span className="text-slate-400">ID:</span> {upload.id}</div>
                    <div><span className="text-slate-400">Estado:</span> {upload.upload_status}</div>
                    <div><span className="text-slate-400">Archivo:</span> {upload.original_name}</div>
                    <div><span className="text-slate-400">Tamaño:</span> {upload.file_size ?? "N/D"}</div>
                    <div><span className="text-slate-400">Modalidad:</span> {upload.modality ?? "N/D"}</div>
                    <div><span className="text-slate-400">Fecha de estudio:</span> {upload.study_date ?? "N/D"}</div>
                    <div><span className="text-slate-400">Patient ID DICOM:</span> {upload.patient_id_dicom ?? "N/D"}</div>
                    <div><span className="text-slate-400">Ruta storage:</span> {upload.storage_path}</div>
                    <div><span className="text-slate-400">Usuario:</span> {upload.user_id}</div>
                    <div><span className="text-slate-400">Creado:</span> {new Date(upload.created_at).toLocaleString()}</div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="text-lg font-semibold text-sky-300">Metadatos JSON</h2>
                    <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
                        {JSON.stringify(upload.metadata_json, null, 2)}
                    </pre>
                </div>
            </div>
        </main>
    );
}