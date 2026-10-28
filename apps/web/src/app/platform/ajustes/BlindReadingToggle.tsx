"use client";

import { useId, useState } from "react";
import { setBlindReadingAction } from "./actions";

export function BlindReadingToggle({ initial, available }: { initial: boolean; available: boolean }) {
    const [checked, setChecked] = useState(initial);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const labelId = useId();
    const descId = useId();

    async function toggle() {
        if (!available || pending) return;
        const previous = checked;
        setChecked(!previous);
        setError(null);
        setPending(true);
        try {
            const res = await setBlindReadingAction(!previous);
            if (!res.ok) {
                setChecked(previous);
                setError(res.error);
            }
        } catch {
            setChecked(previous);
            setError("No se pudo guardar la preferencia. Intenta de nuevo.");
        } finally {
            setPending(false);
        }
    }

    return (
        <div>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <span id={labelId} className="text-sm font-medium text-slate-800">Lectura ciega</span>
                    <p id={descId} className="text-sm text-slate-600 mt-1">
                        Oculta el resultado de la IA en los estudios que no has valorado hasta que registres tu impresión inicial. Mientras esté activa, la única forma de ver la IA de un estudio es registrar tu impresión.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-labelledby={labelId}
                    aria-describedby={descId}
                    // `disabled` haría perder el foco del teclado mientras guarda; el guard de toggle bloquea el reingreso.
                    disabled={!available}
                    aria-disabled={pending || undefined}
                    onClick={toggle}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-progress ${checked ? "bg-brand-primary" : "bg-slate-300"}`}
                >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                </button>
            </div>
            {!available && (
                <p className="text-xs text-slate-500 mt-2">
                    Disponible cuando se aplique la migración de lectura ciega.
                </p>
            )}
            <div role="status" className="text-sm text-slate-700 mt-2 empty:hidden">{error}</div>
        </div>
    );
}
