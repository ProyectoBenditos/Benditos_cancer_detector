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
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <p className="text-sm text-rose-500 font-medium">Plataforma privada</p>
                    <h1 className="text-3xl font-bold text-slate-800">Subida de archivo DICOM</h1>
                    <p className="mt-2 text-slate-500">
                        Carga un estudio DICOM para validación y registro de metadatos.
                    </p>
                </div>

                <Link
                    href="/platform"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-medium"
                >
                    Volver al Dashboard
                </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <form onSubmit={handleUpload} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Archivo DICOM (.dcm)
                        </label>
                        <input
                            type="file"
                            accept=".dcm,application/dicom"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 transition-all font-medium focus:border-rose-300 focus:ring-1 focus:ring-rose-300 outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl bg-rose-600 px-6 py-3 font-medium text-white hover:bg-rose-500 disabled:opacity-60 transition-colors shadow-sm"
                    >
                        {loading ? "Subiendo archivo..." : "Subir DICOM"}
                    </button>
                </form>

                {errorMsg ? (
                    <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium">
                        {errorMsg}
                    </div>
                ) : null}

                {successData ? (
                    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
                        <h2 className="text-lg font-semibold text-emerald-700 border-b border-emerald-100 pb-3 mb-4">
                            Carga exitosa
                        </h2>

                        <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                <span className="block text-xs font-semibold text-emerald-600 mb-1">Archivo</span>
                                {successData.filename}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                <span className="block text-xs font-semibold text-emerald-600 mb-1">Ruta</span>
                                <span className="break-all">{successData.storage_path}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                <span className="block text-xs font-semibold text-emerald-600 mb-1">Modalidad</span>
                                {successData.modality ?? "N/D"}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100">
                                <span className="block text-xs font-semibold text-emerald-600 mb-1">Fecha de estudio</span>
                                {successData.study_date ?? "N/D"}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-emerald-100 md:col-span-2">
                                <span className="block text-xs font-semibold text-emerald-600 mb-1">Patient ID DICOM</span>
                                {successData.patient_id_dicom ?? "N/D"}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}