import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    BLIND_DISABLED,
    BLIND_PENDING_LABEL,
    BLIND_VIEWER_REASON,
    isBlindPending,
    loadBlindContext,
    maskBlindPending,
    pendingIdsFrom,
} from "./blindReading";

type Result = { data: unknown; error: unknown };

// Cliente simulado: cada tabla devuelve su resultado; los filtros se encadenan.
function makeClient(results: Record<string, Result>) {
    const from = vi.fn((table: string) => {
        const result = results[table] ?? { data: [], error: null };
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.in = () => chain;
        chain.maybeSingle = () => Promise.resolve(result);
        chain.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve);
        return chain;
    });
    return { client: { from } as unknown as SupabaseClient, from };
}

describe("pendingIdsFrom", () => {
    it("quita los revelados de los analizados", () => {
        expect(pendingIdsFrom(["a", "b", "c"], ["b"])).toEqual(new Set(["a", "c"]));
    });
});

describe("maskBlindPending", () => {
    const rows = [
        { id: "a", ai_score: 0.9, ai_risk_level: "high", ai_recommendation: "x" },
        { id: "b", ai_score: 0.1, ai_risk_level: "low", ai_recommendation: "y" },
    ];

    it("oculta los campos de IA solo en las filas pendientes", () => {
        const out = maskBlindPending(rows, { enabled: true, pendingIds: new Set(["a"]) });
        expect(out[0]).toEqual({
            id: "a",
            ai_score: null,
            ai_risk_level: null,
            ai_recommendation: null,
            blind_pending: true,
        });
        expect(out[1]).toEqual({ ...rows[1], blind_pending: false });
    });

    it("no muta las filas originales", () => {
        maskBlindPending(rows, { enabled: true, pendingIds: new Set(["a"]) });
        expect(rows[0].ai_score).toBe(0.9);
    });
});

describe("isBlindPending", () => {
    it("consulta pendingIds", () => {
        const ctx = { enabled: true, pendingIds: new Set(["a"]) };
        expect(isBlindPending(ctx, "a")).toBe(true);
        expect(isBlindPending(ctx, "b")).toBe(false);
        expect(isBlindPending(BLIND_DISABLED, "a")).toBe(false);
    });
});

describe("constantes", () => {
    it("usan los textos exactos", () => {
        expect(BLIND_PENDING_LABEL).toBe("Pendiente de lectura");
        expect(BLIND_VIEWER_REASON).toBe("La IA está oculta hasta que registres tu impresión inicial.");
    });
});

describe("loadBlindContext", () => {
    it("devuelve BLIND_DISABLED si profiles falla", async () => {
        const { client } = makeClient({ profiles: { data: null, error: { message: "boom" } } });
        expect(await loadBlindContext(client, "u1")).toBe(BLIND_DISABLED);
    });

    it("devuelve BLIND_DISABLED sin más consultas si blind_reading es false", async () => {
        const { client, from } = makeClient({
            profiles: { data: { blind_reading: false }, error: null },
        });
        expect(await loadBlindContext(client, "u1")).toBe(BLIND_DISABLED);
        expect(from).toHaveBeenCalledTimes(1);
    });

    it("calcula los pendientes cuando está activo", async () => {
        const { client } = makeClient({
            profiles: { data: { blind_reading: true }, error: null },
            dicom_uploads: { data: [{ id: "a" }, { id: "b" }], error: null },
            upload_initial_impressions: { data: [{ upload_id: "a" }], error: null },
            upload_reviews: { data: [], error: null },
        });
        const ctx = await loadBlindContext(client, "u1");
        expect(ctx.enabled).toBe(true);
        expect(ctx.pendingIds).toEqual(new Set(["b"]));
    });

    it("cuenta como revelado un estudio con valoración previa", async () => {
        const { client } = makeClient({
            profiles: { data: { blind_reading: true }, error: null },
            dicom_uploads: { data: [{ id: "a" }, { id: "b" }], error: null },
            upload_initial_impressions: { data: [], error: null },
            upload_reviews: { data: [{ upload_id: "a" }], error: null },
        });
        expect((await loadBlindContext(client, "u1")).pendingIds).toEqual(new Set(["b"]));
    });

    it.each(["dicom_uploads", "upload_initial_impressions", "upload_reviews"])(
        "lanza (falla cerrado) si falla la consulta de %s",
        async (table) => {
            const { client } = makeClient({
                profiles: { data: { blind_reading: true }, error: null },
                dicom_uploads: { data: [], error: null },
                upload_initial_impressions: { data: [], error: null },
                upload_reviews: { data: [], error: null },
                [table]: { data: null, error: { message: "boom" } },
            });
            await expect(loadBlindContext(client, "u1")).rejects.toThrow();
        },
    );
});
