"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";

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
                setErrorMsg("No se pudo obtener la sesión del usuario. Por favor recarga la página.");
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
        <PageContainer maxWidth="4xl">
            <SectionHeader 
                title="Subida de archivo DICOM" 
                description="Carga un estudio DICOM para validación y registro centralizado de metadatos clínicos."
                action={
                    <Link
                        href="/platform"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        Cancelar y Volver
                    </Link>
                }
            />

            <Card>
                <CardContent className="p-8">
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Archivo DICOM (.dcm)
                            </label>
                            <input
                                type="file"
                                accept=".dcm,application/dicom"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-all font-medium focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-2">Formato requerido estándar DICOM. Tamaño máximo procesable: 50MB.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-brand-primary px-8 py-3.5 font-medium text-white hover:bg-brand-primary-hover disabled:opacity-60 transition-colors shadow-sm"
                        >
                            {loading ? "Procesando archivo..." : "Subir DICOM"}
                        </button>
                    </form>

                    {errorMsg && (
                        <div className="mt-8 rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-sm text-brand-danger font-medium flex gap-3">
                            {errorMsg}
                        </div>
                    )}

                    {successData && (
                        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-inner">
                            <h2 className="text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-3 mb-4">
                                Carga procesada exitosamente
                            </h2>

                            <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Archivo</span>
                                    <span className="font-medium truncate" title={successData.filename}>{successData.filename}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Modalidad</span>
                                    <span className="font-medium">{successData.modality ?? "N/D"}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Fecha de estudio</span>
                                    <span className="font-medium">{successData.study_date ?? "N/D"}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Patient ID</span>
                                    <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 self-start">{successData.patient_id_dicom ?? "N/D"}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center md:col-span-2">
                                    <span className="block text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">Referencia Storage PATH</span>
                                    <span className="font-mono text-xs text-slate-500 break-all">{successData.storage_path}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}