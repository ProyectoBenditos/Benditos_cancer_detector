import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    from: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
    eq: vi.fn(),
    result: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mocks.getUser },
        from: (table: string) => {
            mocks.from(table);
            // delete().eq().eq() es encadenable y termina en una promesa con { error }.
            const chain = {
                eq: (...args: unknown[]) => {
                    mocks.eq(...args);
                    return Object.assign(mocks.result(), chain);
                },
            };
            return {
                upsert: (...args: unknown[]) => {
                    mocks.upsert(...args);
                    return mocks.result();
                },
                delete: () => {
                    mocks.remove();
                    return chain;
                },
            };
        },
    }),
}));

import { deleteAnnotationAction, saveAnnotationAction } from "./actions";
import type { AnnotationInput } from "@/lib/uploadAnnotations";

const OK: AnnotationInput = {
    uploadId: "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b",
    seq: 1,
    x: 0.25,
    y: 0.75,
    findingType: "solido",
    aiAgreement: null,
    note: "Borde liso",
    sizeMm: null,
    kind: "point",
    x2: null,
    y2: null,
};

describe("saveAnnotationAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
        mocks.result.mockImplementation(() => Promise.resolve({ error: null }));
    });

    it("guarda con upsert por (upload_id, seq) y el user_id de la sesión", async () => {
        expect(await saveAnnotationAction(OK)).toEqual({ ok: true });
        expect(mocks.from).toHaveBeenCalledWith("upload_annotations");
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ upload_id: OK.uploadId, seq: 1, user_id: "user-abc", note: "Borde liso" }),
            { onConflict: "upload_id,seq" },
        );
    });

    it("rechaza datos inválidos sin tocar la base de datos", async () => {
        expect(await saveAnnotationAction({ ...OK, x: 3 })).toEqual({ ok: false, error: "invalido" });
        expect(mocks.getUser).not.toHaveBeenCalled();
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("sin sesión devuelve error de sesión", async () => {
        mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
        expect(await saveAnnotationAction(OK)).toEqual({ ok: false, error: "sesion" });
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("un error de Supabase (RLS, red) se devuelve como tipo, sin detalle", async () => {
        mocks.result.mockImplementationOnce(() =>
            Promise.resolve({ error: { message: "new row violates row-level security policy" } }),
        );
        expect(await saveAnnotationAction(OK)).toEqual({ ok: false, error: "guardado" });
    });
});

describe("deleteAnnotationAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
        mocks.result.mockImplementation(() => Promise.resolve({ error: null }));
    });

    it("borra por upload_id y seq", async () => {
        expect(await deleteAnnotationAction(OK.uploadId, 2)).toEqual({ ok: true });
        expect(mocks.remove).toHaveBeenCalled();
        expect(mocks.eq).toHaveBeenNthCalledWith(1, "upload_id", OK.uploadId);
        expect(mocks.eq).toHaveBeenNthCalledWith(2, "seq", 2);
    });

    it("valida id y seq", async () => {
        expect(await deleteAnnotationAction("abc", 2)).toEqual({ ok: false, error: "invalido" });
        expect(await deleteAnnotationAction(OK.uploadId, 0)).toEqual({ ok: false, error: "invalido" });
        expect(mocks.remove).not.toHaveBeenCalled();
    });

    it("sin sesión devuelve error de sesión", async () => {
        mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
        expect(await deleteAnnotationAction(OK.uploadId, 2)).toEqual({ ok: false, error: "sesion" });
    });

    it("un error de Supabase se devuelve como tipo", async () => {
        mocks.result.mockImplementation(() => Promise.resolve({ error: { message: "boom" } }));
        expect(await deleteAnnotationAction(OK.uploadId, 2)).toEqual({ ok: false, error: "guardado" });
    });
});
