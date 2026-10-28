"use client";

import { useEffect, useRef } from "react";

export const REVEAL_ANNOUNCEMENT = "Impresión registrada. El resultado de la IA ya está visible.";

const STORAGE_KEY = "oncoscan:reveal-pending";
/** La señal solo vale unos segundos: cubre el envío y la recarga de la página. */
const MAX_AGE_MS = 30_000;

/**
 * Señal «el usuario acaba de registrar su impresión». La deja el formulario al
 * enviar y la consume una sola vez la página revelada. El almacenamiento puede
 * no estar disponible: sin él la página funciona igual, solo sin mover el foco.
 */
export function markRevealPending(uploadId: string): void {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, `${uploadId}|${Date.now()}`);
    } catch {
        // Sin sessionStorage no hay señal; no es un error.
    }
}

export function clearRevealPending(): void {
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ver markRevealPending.
    }
}

function consumeRevealPending(uploadId: string): boolean {
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw === null) return false;
        window.sessionStorage.removeItem(STORAGE_KEY);
        const [id, at] = raw.split("|");
        const age = Date.now() - Number(at);
        return id === uploadId && Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS;
    } catch {
        return false;
    }
}

/**
 * Tras registrar la impresión, el formulario se desmonta y el foco caería al
 * body. Si la señal está presente, lleva el foco al primer encabezado de
 * `targetIds` que exista (tabIndex -1) y lo anuncia en una región de estado
 * ya montada. En cargas normales de la página no hace nada.
 */
export function RevealFocus({ uploadId, targetIds }: { uploadId: string; targetIds: readonly string[] }) {
    const statusRef = useRef<HTMLParagraphElement>(null);
    const idsKey = targetIds.join("|");

    useEffect(() => {
        if (!consumeRevealPending(uploadId)) return;
        const target = idsKey
            .split("|")
            .map((id) => document.getElementById(id))
            .find((el): el is HTMLElement => el !== null);
        target?.focus();
        if (statusRef.current) statusRef.current.textContent = REVEAL_ANNOUNCEMENT;
    }, [uploadId, idsKey]);

    return <p ref={statusRef} role="status" aria-live="polite" className="sr-only" />;
}
