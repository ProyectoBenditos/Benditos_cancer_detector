import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { InitialImpression } from "@/lib/initialImpression";
import { InitialImpressionSummary } from "./InitialImpressionSummary";

const IMPRESSION: InitialImpression = {
    lung_rads: "2",
    conducta: "tac_12m",
    notes: null,
    markers_snapshot: [],
    revealed_at: "2026-10-27T12:00:00Z",
};

describe("InitialImpressionSummary", () => {
    it("«Sin nota» usa text-slate-500 (contraste AA; slate-400 no alcanza)", () => {
        render(<InitialImpressionSummary impression={IMPRESSION} uploadId="u1" />);
        const className = screen.getByText("Sin nota").className;
        expect(className).toContain("text-slate-500");
        expect(className).not.toContain("slate-400");
    });

    it("muestra la hora de registro en es-CO y en la zona de Bogotá aunque el servidor esté en UTC", () => {
        const previousTz = process.env.TZ;
        process.env.TZ = "UTC";
        try {
            // 02:30 UTC del 28 de octubre = 9:30 p. m. del 27 de octubre en Bogotá (UTC-5).
            render(
                <InitialImpressionSummary
                    impression={{ ...IMPRESSION, revealed_at: "2026-10-28T02:30:00Z" }}
                    uploadId="u1"
                />,
            );
            const registrada = screen.getByText("Registrada").nextElementSibling?.textContent ?? "";
            expect(registrada).toMatch(/^27\/10\/2026,\s9:30\sp\.\sm\.$/);
        } finally {
            if (previousTz === undefined) delete process.env.TZ;
            else process.env.TZ = previousTz;
        }
    });

    it("trae la región de estado y su encabezado puede recibir el foco", () => {
        render(<InitialImpressionSummary impression={IMPRESSION} uploadId="u1" />);
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Impresión inicial/ })).toHaveAttribute("tabindex", "-1");
    });
});
