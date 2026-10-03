import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mocks.getUser },
        from: vi.fn(() => ({
            upsert: (...args: unknown[]) => {
                mocks.upsert(...args);
                return { select: () => ({ single: mocks.single }) };
            },
        })),
    }),
}));

import { saveUploadReviewAction } from "./actions";

const UPLOAD_ID = "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b";

function makeFormData(fields: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
}

describe("saveUploadReviewAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
        mocks.single.mockResolvedValue({ data: { updated_at: "2026-10-02T12:00:00Z" }, error: null });
    });

    it("rechaza un upload_id que no es uuid", async () => {
        const state = await saveUploadReviewAction({}, makeFormData({ upload_id: "abc", notes: "x" }));
        expect(state.error).toMatch(/no válido/i);
        expect(state.fields).toEqual({ notes: "x" });
        expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("rechaza el formulario vacío", async () => {
        const state = await saveUploadReviewAction({}, makeFormData({ upload_id: UPLOAD_ID }));
        expect(state.error).toMatch(/al menos un campo/i);
    });

    it("rechaza opciones fuera del catálogo", async () => {
        const state = await saveUploadReviewAction(
            {},
            makeFormData({ upload_id: UPLOAD_ID, lung_rads: "5" }),
        );
        expect(state.error).toMatch(/no es válida/i);
    });

    it("rechaza tamaños de nódulo fuera de rango", async () => {
        for (const size of ["0", "-3", "301", "abc"]) {
            const state = await saveUploadReviewAction(
                {},
                makeFormData({ upload_id: UPLOAD_ID, nodule_size_mm: size }),
            );
            expect(state.error).toMatch(/tamaño/i);
        }
    });

    it("rechaza notas demasiado largas", async () => {
        const state = await saveUploadReviewAction(
            {},
            makeFormData({ upload_id: UPLOAD_ID, notes: "x".repeat(4001) }),
        );
        expect(state.error).toMatch(/4000/);
    });

    it("guarda con upsert por upload_id y normaliza los campos", async () => {
        const state = await saveUploadReviewAction(
            {},
            makeFormData({
                upload_id: UPLOAD_ID,
                concordancia: "concuerda",
                lung_rads: "4A",
                nodule_size_mm: "7,25",
                conducta: "tac_3m",
                notes: "  Control en 3 meses  ",
            }),
        );

        expect(state).toEqual({ savedAt: "2026-10-02T12:00:00Z" });
        expect(mocks.upsert).toHaveBeenCalledWith(
            {
                upload_id: UPLOAD_ID,
                user_id: "user-abc",
                concordancia: "concuerda",
                lung_rads: "4A",
                nodule_size_mm: 7.3,
                conducta: "tac_3m",
                notes: "Control en 3 meses",
            },
            { onConflict: "upload_id" },
        );
    });

    it("guarda campos vacíos como null", async () => {
        await saveUploadReviewAction({}, makeFormData({ upload_id: UPLOAD_ID, notes: "Solo notas" }));
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ concordancia: null, lung_rads: null, nodule_size_mm: null, conducta: null }),
            expect.anything(),
        );
    });

    it("exige sesión", async () => {
        mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
        const state = await saveUploadReviewAction({}, makeFormData({ upload_id: UPLOAD_ID, notes: "x" }));
        expect(state.error).toMatch(/sesión/i);
    });

    it("devuelve un mensaje genérico si Supabase falla (sin filtrar detalle)", async () => {
        mocks.single.mockResolvedValueOnce({ data: null, error: { message: "new row violates row-level security policy" } });
        const state = await saveUploadReviewAction({}, makeFormData({ upload_id: UPLOAD_ID, notes: "x" }));
        expect(state.error).toBe("No se pudo guardar la valoración. Intenta de nuevo.");
        expect(state.fields).toEqual({ notes: "x" });
    });
});
