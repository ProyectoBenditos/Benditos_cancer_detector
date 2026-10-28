import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ action: vi.fn() }));

vi.mock("./actions", () => ({ setBlindReadingAction: mocks.action }));

import { BlindReadingToggle } from "./BlindReadingToggle";

describe("BlindReadingToggle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.action.mockResolvedValue({ ok: true });
    });

    it("es un switch con nombre accesible y aria-checked igual a initial", () => {
        render(<BlindReadingToggle initial={true} available={true} />);
        const sw = screen.getByRole("switch", { name: "Lectura ciega" });
        expect(sw).toHaveAttribute("aria-checked", "true");
    });

    it("al hacer clic llama a la acción con el valor nuevo", async () => {
        render(<BlindReadingToggle initial={false} available={true} />);
        const sw = screen.getByRole("switch", { name: "Lectura ciega" });
        fireEvent.click(sw);
        expect(sw).toHaveAttribute("aria-checked", "true");
        await waitFor(() => expect(mocks.action).toHaveBeenCalledWith(true));
    });

    it("si la acción falla muestra el error y vuelve al valor anterior", async () => {
        mocks.action.mockResolvedValue({ ok: false, error: "No se pudo guardar la preferencia. Intenta de nuevo." });
        render(<BlindReadingToggle initial={false} available={true} />);
        const sw = screen.getByRole("switch", { name: "Lectura ciega" });
        fireEvent.click(sw);
        await waitFor(() =>
            expect(screen.getByRole("status")).toHaveTextContent("No se pudo guardar la preferencia. Intenta de nuevo."),
        );
        expect(sw).toHaveAttribute("aria-checked", "false");
    });

    it("mientras guarda conserva el foco, marca aria-disabled y no admite un segundo cambio", async () => {
        let finish: (value: { ok: true }) => void = () => {};
        mocks.action.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        render(<BlindReadingToggle initial={false} available={true} />);
        const sw = screen.getByRole("switch", { name: "Lectura ciega" });
        sw.focus();
        fireEvent.click(sw);

        expect(sw).not.toBeDisabled();
        expect(sw).toHaveAttribute("aria-disabled", "true");
        expect(sw).toHaveFocus();
        fireEvent.click(sw);
        expect(mocks.action).toHaveBeenCalledTimes(1);
        expect(sw).toHaveAttribute("aria-checked", "true");

        finish({ ok: true });
        await waitFor(() => expect(sw).not.toHaveAttribute("aria-disabled"));
        expect(sw).toHaveFocus();
    });

    it("con available=false está deshabilitado y explica por qué", () => {
        render(<BlindReadingToggle initial={false} available={false} />);
        expect(screen.getByRole("switch", { name: "Lectura ciega" })).toBeDisabled();
        expect(
            screen.getByText("Disponible cuando se aplique la migración de lectura ciega."),
        ).toBeInTheDocument();
    });
});
