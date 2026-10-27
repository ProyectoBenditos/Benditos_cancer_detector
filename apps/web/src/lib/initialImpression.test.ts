import { describe, it, expect } from "vitest";
import { parseImpressionForm } from "./initialImpression";

const UPLOAD_ID = "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b";

function fd(fields: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.append(k, v);
    return f;
}

describe("parseImpressionForm", () => {
    it("exige un upload_id uuid", () => {
        expect(parseImpressionForm(fd({ upload_id: "abc", lung_rads: "2", conducta: "tac_6m" }))).toEqual({
            ok: false,
            error: "Estudio no válido.",
        });
    });

    it("exige lung_rads", () => {
        expect(parseImpressionForm(fd({ upload_id: UPLOAD_ID, conducta: "tac_6m" }))).toEqual({
            ok: false,
            error: "Elige la categoría Lung-RADS de tu impresión inicial.",
        });
    });

    it("exige conducta", () => {
        expect(parseImpressionForm(fd({ upload_id: UPLOAD_ID, lung_rads: "2" }))).toEqual({
            ok: false,
            error: "Elige la conducta de tu impresión inicial.",
        });
    });

    it("rechaza valores fuera del catálogo", () => {
        const r = parseImpressionForm(fd({ upload_id: UPLOAD_ID, lung_rads: "9", conducta: "tac_6m" }));
        expect(r.ok).toBe(false);
    });

    it("rechaza notas de más de 4.000 caracteres", () => {
        expect(
            parseImpressionForm(
                fd({ upload_id: UPLOAD_ID, lung_rads: "2", conducta: "tac_6m", notes: "x".repeat(4001) }),
            ),
        ).toEqual({ ok: false, error: "La nota supera los 4.000 caracteres." });
    });

    it("con datos válidos y nota vacía devuelve notes null", () => {
        expect(
            parseImpressionForm(fd({ upload_id: UPLOAD_ID, lung_rads: "4A", conducta: "pet_tc", notes: "  " })),
        ).toEqual({
            ok: true,
            uploadId: UPLOAD_ID,
            impression: { lung_rads: "4A", conducta: "pet_tc", notes: null },
        });
    });
});
