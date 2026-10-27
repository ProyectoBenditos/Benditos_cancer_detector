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
    it("«Sin nota» no usa slate-400 (contraste insuficiente)", () => {
        render(<InitialImpressionSummary impression={IMPRESSION} uploadId="u1" />);
        expect(screen.getByText("Sin nota").className).not.toContain("slate-400");
    });

    it("trae la región de estado y su encabezado puede recibir el foco", () => {
        render(<InitialImpressionSummary impression={IMPRESSION} uploadId="u1" />);
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Impresión inicial/ })).toHaveAttribute("tabindex", "-1");
    });
});
