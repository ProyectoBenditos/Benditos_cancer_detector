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
        <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Historial de cargas DICOM</h1>
                    <p className="mt-1 text-slate-500">
                        Registro de todas las imágenes médicas procesadas
                    </p>
                </div>

                <div className="flex gap-3 text-sm font-medium">
                    <Link
                        href="/platform/upload"
                        className="rounded-xl bg-rose-600 px-5 py-2.5 text-white hover:bg-rose-500 transition-colors shadow-sm"
                    >
                        Subir nuevo archivo
                    </Link>
                    <Link
                        href="/platform"
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Volver
                    </Link>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 mb-6 font-medium">
                    Error cargando uploads: {error.message}
                </div>
            ) : null}

            {!uploads || uploads.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No hay archivos registrados</h3>
                    <p className="text-slate-500 mb-6">Aún no has subido archivos DICOM a la plataforma.</p>
                    <Link
                        href="/platform/upload"
                        className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-500 transition-colors shadow-sm"
                    >
                        Comenzar primera carga
                    </Link>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs tracking-wider uppercase">
                            <tr>
                                <th className="px-6 py-4">Archivo</th>
                                <th className="px-6 py-4">Modalidad</th>
                                <th className="px-6 py-4">Fecha estudio</th>
                                <th className="px-6 py-4">Patient ID</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Cargado</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {uploads.map((upload) => (
                                <tr key={upload.id} className="text-slate-700 hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium">{upload.original_name}</td>
                                    <td className="px-6 py-4">{upload.modality ?? "N/D"}</td>
                                    <td className="px-6 py-4">{upload.study_date ?? "N/D"}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">
                                            {upload.patient_id_dicom ?? "N/D"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${upload.upload_status === 'COMPLETED' || upload.upload_status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                            {upload.upload_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(upload.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/platform/uploads/${upload.id}`}
                                            className="text-rose-600 hover:text-rose-700 font-semibold hover:underline text-sm inline-flex items-center"
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
    );
}