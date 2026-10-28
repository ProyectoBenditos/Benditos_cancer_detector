import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { RevealFocus, markRevealPending, clearRevealPending, REVEAL_ANNOUNCEMENT } from "./RevealFocus";

const UPLOAD_ID = "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b";
const OTHER_ID = "11111111-2222-4333-8444-555555555555";

function renderWithTargets() {
    return render(
        <>
            <h2 id="ai-heading" tabIndex={-1}>Resultado del análisis IA</h2>
            <h2 id="impression-heading" tabIndex={-1}>Impresión inicial (antes de la IA)</h2>
            <RevealFocus uploadId={UPLOAD_ID} targetIds={["ai-heading", "impression-heading"]} />
        </>,
    );
}

describe("RevealFocus", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("sin la señal de registro no mueve el foco ni anuncia nada", () => {
        renderWithTargets();
        expect(document.body).toHaveFocus();
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("con la señal lleva el foco al encabezado del resultado y lo anuncia", () => {
        markRevealPending(UPLOAD_ID);
        renderWithTargets();
        expect(screen.getByRole("heading", { name: "Resultado del análisis IA" })).toHaveFocus();
        expect(screen.getByRole("status")).toHaveTextContent(REVEAL_ANNOUNCEMENT);
        expect(REVEAL_ANNOUNCEMENT).toBe("Impresión registrada. El resultado de la IA ya está visible.");
    });

    it("si no está el encabezado de la IA usa el de la impresión inicial", () => {
        markRevealPending(UPLOAD_ID);
        render(
            <>
                <h2 id="impression-heading" tabIndex={-1}>Impresión inicial (antes de la IA)</h2>
                <RevealFocus uploadId={UPLOAD_ID} targetIds={["ai-heading", "impression-heading"]} />
            </>,
        );
        expect(screen.getByRole("heading", { name: /Impresión inicial/ })).toHaveFocus();
    });

    it("la señal se consume: una recarga posterior no vuelve a mover el foco", () => {
        markRevealPending(UPLOAD_ID);
        const first = renderWithTargets();
        first.unmount();
        (document.activeElement as HTMLElement | null)?.blur();
        renderWithTargets();
        expect(document.body).toHaveFocus();
    });

    it("ignora la señal de otro estudio", () => {
        markRevealPending(OTHER_ID);
        renderWithTargets();
        expect(document.body).toHaveFocus();
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("ignora una señal vencida", () => {
        markRevealPending(UPLOAD_ID);
        vi.spyOn(Date, "now").mockReturnValue(Date.now() + 5 * 60_000);
        renderWithTargets();
        expect(document.body).toHaveFocus();
    });

    it("clearRevealPending borra la señal", () => {
        markRevealPending(UPLOAD_ID);
        clearRevealPending();
        renderWithTargets();
        expect(document.body).toHaveFocus();
    });

    it("sin sessionStorage la página funciona igual", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("bloqueado");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("bloqueado");
        });
        expect(() => markRevealPending(UPLOAD_ID)).not.toThrow();
        expect(() => clearRevealPending()).not.toThrow();
        expect(() => renderWithTargets()).not.toThrow();
        expect(document.body).toHaveFocus();
    });
});
