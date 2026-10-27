import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { InitialImpressionSummary } from "./InitialImpressionSummary";

const IMPRESSION = {
    lung_rads: "2",
    conducta: "seguimiento_12_meses",
    notes: null,
    markers_snapshot: [],
    revealed_at: "2026-10-27T12:00:00Z",
};

describe("InitialImpressionSummary", () => {
    it("«Sin nota» no usa slate-400 (contraste insuficiente)", () => {
        render(<InitialImpressionSummary impression={IMPRESSION} />);
        expect(screen.getByText("Sin nota").className).not.toContain("slate-400");
    });
});
