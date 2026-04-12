import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function UploadsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: uploads, error } = await supabase
        .from("dicom_uploads")
        .select("id, original_name, modality, study_date, patient_id_dicom, upload_status, created_at")
        .order("created_at", { ascending: false });

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-sky-300">Plataforma privada</p>
                        <h1 className="text-3xl font-bold">Historial de cargas DICOM</h1>
                        <p className="mt-2 text-slate-400">
                            Archivos subidos por el usuario autenticado.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/platform/upload"
                            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500"
                        >
                            Subir nuevo archivo
                        </Link>
                        <Link
                            href="/platform"
                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                        >
                            Volver
                        </Link>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-red-300">
                        Error cargando uploads: {error.message}
                    </div>
                ) : null}

                {!uploads || uploads.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">
                        Aún no has subido archivos DICOM.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/60 text-left text-slate-300">
                                <tr>
                                    <th className="px-4 py-3">Archivo</th>
                                    <th className="px-4 py-3">Modalidad</th>
                                    <th className="px-4 py-3">Fecha estudio</th>
                                    <th className="px-4 py-3">Patient ID</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Cargado</th>
                                    <th className="px-4 py-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((upload) => (
                                    <tr key={upload.id} className="border-t border-slate-800 text-slate-200">
                                        <td className="px-4 py-3">{upload.original_name}</td>
                                        <td className="px-4 py-3">{upload.modality ?? "N/D"}</td>
                                        <td className="px-4 py-3">{upload.study_date ?? "N/D"}</td>
                                        <td className="px-4 py-3">{upload.patient_id_dicom ?? "N/D"}</td>
                                        <td className="px-4 py-3">{upload.upload_status}</td>
                                        <td className="px-4 py-3">
                                            {new Date(upload.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/platform/uploads/${upload.id}`}
                                                className="text-sky-300 hover:text-sky-200"
                                            >
                                                Ver detalle
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}