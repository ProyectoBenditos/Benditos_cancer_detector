import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));

vi.mock("./actions", () => ({ registerInitialImpressionAction: mocks.action }));

import { BlindImpressionForm } from "./BlindImpressionForm";

const UPLOAD_ID = "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b";
const BUTTON = "Registrar impresión y ver la IA";
const NOT_SAVED = "Tus marcadores no se guardaron. Reintenta desde el panel del visor antes de registrar.";

describe("BlindImpressionForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.action.mockResolvedValue({});
    });

    it("mientras se guardan los marcadores deshabilita el botón y lo explica", () => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="saving" markersLoadFailed={false} />);
        expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
        expect(screen.getByText("Guardando marcadores…")).toBeInTheDocument();
    });

    it("si el guardado de los marcadores falló deshabilita el botón", () => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="error" markersLoadFailed={false} />);
        expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
        expect(screen.getByText(NOT_SAVED)).toBeInTheDocument();
    });

    it("si los marcadores no se pudieron cargar deshabilita el botón", () => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="idle" markersLoadFailed={true} />);
        expect(screen.getByRole("button", { name: BUTTON })).toBeDisabled();
        expect(screen.getByText(NOT_SAVED)).toBeInTheDocument();
    });

    it.each(["saved", "idle"] as const)("con saveStatus=%s el botón está habilitado", (status) => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus={status} markersLoadFailed={false} />);
        expect(screen.getByRole("button", { name: BUTTON })).toBeEnabled();
        expect(screen.queryByText("Guardando marcadores…")).not.toBeInTheDocument();
        expect(screen.queryByText(NOT_SAVED)).not.toBeInTheDocument();
    });

    it("pide Lung-RADS y conducta obligatorios y una nota opcional", () => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="idle" markersLoadFailed={false} />);
        expect(screen.getByRole("combobox", { name: /Lung-RADS/ })).toBeRequired();
        expect(screen.getByRole("combobox", { name: /Conducta/ })).toBeRequired();
        const notes = screen.getByRole("textbox", { name: /Nota/ });
        expect(notes).not.toBeRequired();
        expect(notes).toHaveAttribute("maxLength", "4000");
    });

    it("la etiqueta «(opcional)» usa text-slate-500 (contraste AA; slate-400 no alcanza)", () => {
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="idle" markersLoadFailed={false} />);
        const className = screen.getByText("(opcional)").className;
        expect(className).toContain("text-slate-500");
        expect(className).not.toContain("slate-400");
    });

    it("al enviar deja la señal para llevar el foco al resultado tras la revelación", () => {
        window.sessionStorage.clear();
        render(<BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="idle" markersLoadFailed={false} />);
        expect(window.sessionStorage.length).toBe(0);
        const form = screen.getByRole("button", { name: BUTTON }).closest("form") as HTMLFormElement;
        fireEvent.submit(form);
        expect(window.sessionStorage.length).toBe(1);
    });

    it("no tiene ningún campo de concordancia", () => {
        const { container } = render(
            <BlindImpressionForm uploadId={UPLOAD_ID} saveStatus="idle" markersLoadFailed={false} />,
        );
        expect(container.querySelector('[name="concordancia"]')).toBeNull();
        expect(screen.queryByText(/concordancia/i)).not.toBeInTheDocument();
    });
});
