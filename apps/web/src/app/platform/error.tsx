"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";

export default function PlatformError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // NO loguear `error.message` ni `error.stack` aqui: podrian contener PHI
        // (rutas DICOM, Case_Ref, emails). Solo el digest no-PII.
        if (error.digest) {
            console.error("PlatformError digest:", error.digest);
        }
    }, [error]);

    return (
        <PageContainer maxWidth="2xl">
            <AlertBanner
                variant="error"
                title="No pudimos cargar esta sección"
                description="Ocurrió un error procesando la página. Intenta recargar; si el problema persiste, contacta al equipo del proyecto."
                className="mb-6"
            />
            <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={() => reset()}>
                    Reintentar
                </Button>
                <Button
                    variant="secondary"
                    size="md"
                    onClick={() => { window.location.href = "/platform"; }}
                >
                    Ir al Dashboard
                </Button>
            </div>
            {error.digest && (
                <p className="text-xs text-slate-400 mt-6">
                    Código de error: <span className="font-mono">{error.digest}</span>
                </p>
            )}
        </PageContainer>
    );
}
