"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type UploadResponse = {
    message: string;
    user_id: string;
    filename: string;
    storage_path: string;
    modality: string | null;
    study_date: string | null;
    patient_id_dicom: string | null;
};

export default function UploadDicomPage() {
    const supabase = createClient();

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successData, setSuccessData] = useState<UploadResponse | null>(null);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessData(null);

        if (!file) {
            setErrorMsg("Debes seleccionar un archivo DICOM.");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session?.access_token) {
                setErrorMsg("No se pudo obtener la sesión del usuario.");
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dicom/upload`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                setErrorMsg(result.detail || "Error subiendo el archivo.");
                setLoading(false);
                return;
            }

            setSuccessData(result);
            setFile(null);
        } catch (error) {
            setErrorMsg("Ocurrió un error inesperado durante la carga.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-sky-300">Plataforma privada</p>
                        <h1 className="text-3xl font-bold">Subida de archivo DICOM</h1>
                        <p className="mt-2 text-slate-400">
                            Carga un estudio DICOM para validación y registro de metadatos.
                        </p>
                    </div>

                    <Link
                        href="/platform"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
                    >
                        Volver
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <form onSubmit={handleUpload} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm text-slate-300">
                                Archivo DICOM (.dcm)
                            </label>
                            <input
                                type="file"
                                accept=".dcm,application/dicom"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-sky-600 px-5 py-3 font-medium hover:bg-sky-500 disabled:opacity-60"
                        >
                            {loading ? "Subiendo..." : "Subir DICOM"}
                        </button>
                    </form>

                    {errorMsg ? (
                        <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
                            {errorMsg}
                        </div>
                    ) : null}

                    {successData ? (
                        <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
                            <h2 className="text-lg font-semibold text-emerald-300">
                                Carga exitosa
                            </h2>

                            <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                                <div>
                                    <span className="text-slate-400">Archivo:</span> {successData.filename}
                                </div>
                                <div>
                                    <span className="text-slate-400">Ruta:</span> {successData.storage_path}
                                </div>
                                <div>
                                    <span className="text-slate-400">Modalidad:</span> {successData.modality ?? "N/D"}
                                </div>
                                <div>
                                    <span className="text-slate-400">Fecha de estudio:</span> {successData.study_date ?? "N/D"}
                                </div>
                                <div>
                                    <span className="text-slate-400">Patient ID DICOM:</span> {successData.patient_id_dicom ?? "N/D"}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}