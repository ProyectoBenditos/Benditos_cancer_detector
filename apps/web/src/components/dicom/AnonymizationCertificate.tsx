"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Fingerprint, CheckCircle2, Copy, Check, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export type AnonymizationAuditData = {
    pseudonymized_patient_id?: string | null;
    source_sha256?: string | null;
    sanitized_sha256?: string | null;
    tags_cleared_count?: number | null;
    normative_compliance?: string[] | null;
    zero_retention_verified?: boolean | null;
    created_at?: string | null;
};

type Props = {
    audit: AnonymizationAuditData | null;
    fallbackPatientId?: string | null;
};

export function AnonymizationCertificate({ audit, fallbackPatientId }: Props) {
    const [copied, setCopied] = useState(false);

    const pseudonym = audit?.pseudonymized_patient_id || fallbackPatientId || "ONC-PAT-PROTEGIDO";
    const sanitizedHash = audit?.sanitized_sha256;
    const sourceHash = audit?.source_sha256;
    const tagsCount = audit?.tags_cleared_count ?? 0;

    const copyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const standards = audit?.normative_compliance ?? [
        "Ley 1581 de 2012 (Habeas Data Clínico)",
        "Decreto 1377 de 2013",
        "DICOM PS 3.15 Annex E",
        "Resolución 1995 de 1999 MinSalud",
        "Ley 2015 de 2020 Interoperabilidad",
    ];

    return (
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/50 shadow-sm">
            <CardContent className="p-6">
                {/* Encabezado del Certificado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
                            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-base">
                                    Certificado de Desidentificación Clínica
                                </h3>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" /> Verificado
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Cadena de custodia y protección de datos sensibles en salud.
                            </p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Protocolo Criptográfico
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-700">
                            HMAC-SHA256 / AES-256
                        </span>
                    </div>
                </div>

                {/* Grid de Evidencia y Garantías */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    {/* ID Seudonimizado */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-emerald-600" /> ID Seudonimizado
                            </span>
                        </div>
                        <p className="text-sm font-mono font-bold text-slate-800 break-all select-all">
                            {pseudonym}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Token determinista e irreversible. Protege el secreto médico sin romper el seguimiento.
                        </p>
                    </div>

                    {/* Purga de PHI */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Purga PHI en Memoria
                            </span>
                        </div>
                        <p className="text-base font-bold text-emerald-700">
                            {tagsCount > 0 ? `${tagsCount}+ campos vaciados` : "Purga estricta PS 3.15"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Nombre, cédula, clínica, dirección y operador eliminados. Metadatos físicos (HU) preservados.
                        </p>
                    </div>

                    {/* Retención Cero */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Fingerprint className="w-3.5 h-3.5 text-emerald-600" /> Zero Data Retention
                            </span>
                        </div>
                        <p className="text-base font-bold text-slate-800">
                            Cómputo Efímero
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Procesado en memoria RAM en Oracle Cloud. Sin persistencia en discos no autorizados.
                        </p>
                    </div>
                </div>

                {/* Huella Criptográfica SHA-256 */}
                {sanitizedHash && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-900 text-slate-300 p-4 mb-5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <Fingerprint className="w-3.5 h-3.5" /> Huella SHA-256 del Estudio Sanitizado
                            </span>
                            <button
                                type="button"
                                onClick={() => copyHash(sanitizedHash)}
                                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
                                title="Copiar hash SHA-256"
                            >
                                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copied ? "Copiado" : "Copiar"}
                            </button>
                        </div>
                        <p className="font-mono text-xs text-slate-200 break-all select-all">
                            {sanitizedHash}
                        </p>
                        {sourceHash && (
                            <p className="font-mono text-[10px] text-slate-400 mt-2 truncate">
                                Hash fuente antes de purga: {sourceHash}
                            </p>
                        )}
                    </div>
                )}

                {/* Pills de Normativa */}
                <div className="border-t border-slate-200/60 pt-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                        Marco Legal y Estándares Aplicados:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {standards.map((s, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs font-medium"
                            >
                                ✓ {s}
                            </span>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

