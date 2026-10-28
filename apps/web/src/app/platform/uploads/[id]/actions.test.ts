import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    from: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    annotations: vi.fn(),
    insert: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mocks.getUser },
        from: (table: string) => {
            mocks.from(table);
            return {
                upsert: (...args: unknown[]) => {
                    mocks.upsert(...args);
                    return { select: () => ({ single: mocks.single }) };
                },
                // select(cols).eq(col, val).order(col) termina en { data, error }.
                select: (...args: unknown[]) => {
                    mocks.select(...args);
                    return {
                        eq: (...eqArgs: unknown[]) => {
                            mocks.eq(...eqArgs);
                            return {
                                order: (...orderArgs: unknown[]) => {
                                    mocks.order(...orderArgs);
                                    return mocks.annotations();
                                },
                            };
                        },
                    };
                },
                insert: (...args: unknown[]) => mocks.insert(table, ...args),
            };
        },
    }),
}));

import { registerInitialImpressionAction, saveUploadReviewAction } from "./actions";
import { ANNOTATION_COLUMNS } from "@/lib/uploadAnnotations";

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

        // fields permite repoblar el form en la pantalla de subida, donde no hay revalidación.
        expect(state).toEqual({
            savedAt: "2026-10-02T12:00:00Z",
            fields: {
                concordancia: "concuerda",
                lung_rads: "4A",
                nodule_size_mm: "7,25",
                conducta: "tac_3m",
                notes: "  Control en 3 meses  ",
            },
        });
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

describe("registerInitialImpressionAction", () => {
    const ROWS = [
        { seq: 1, kind: "point", x: 0.25, y: 0.75, x2: null, y2: null, finding_type: "solido", ai_agreement: null, note: "Borde liso", size_mm: null },
        { seq: 2, kind: "line", x: 0.1, y: 0.1, x2: 0.2, y2: 0.2, finding_type: null, ai_agreement: null, note: null, size_mm: 6.5 },
    ];
    const VALID = { upload_id: UPLOAD_ID, lung_rads: "4A", conducta: "tac_3m", notes: "  Nódulo en LSD  " };
    const VALID_FIELDS = { lung_rads: "4A", conducta: "tac_3m", notes: "  Nódulo en LSD  " };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
        mocks.annotations.mockResolvedValue({ data: ROWS, error: null });
        mocks.insert.mockResolvedValue({ error: null });
    });

    it("copia los marcadores del servidor, inserta la impresión, revalida y devuelve {}", async () => {
        const state = await registerInitialImpressionAction({}, makeFormData(VALID));

        expect(state).toEqual({});
        expect(mocks.from).toHaveBeenCalledWith("upload_annotations");
        expect(mocks.select).toHaveBeenCalledWith(ANNOTATION_COLUMNS);
        expect(mocks.eq).toHaveBeenCalledWith("upload_id", UPLOAD_ID);
        expect(mocks.insert).toHaveBeenCalledWith("upload_initial_impressions", {
            upload_id: UPLOAD_ID,
            user_id: "user-abc",
            lung_rads: "4A",
            conducta: "tac_3m",
            notes: "Nódulo en LSD",
            markers_snapshot: ROWS,
        });
        expect(mocks.revalidatePath).toHaveBeenCalledWith(`/platform/uploads/${UPLOAD_ID}`);
    });

    it("sin marcadores guarda una copia vacía", async () => {
        mocks.annotations.mockResolvedValueOnce({ data: null, error: null });
        await registerInitialImpressionAction({}, makeFormData(VALID));
        expect(mocks.insert).toHaveBeenCalledWith(
            "upload_initial_impressions",
            expect.objectContaining({ markers_snapshot: [] }),
        );
    });

    it("si no puede leer los marcadores no inserta", async () => {
        mocks.annotations.mockResolvedValueOnce({ data: null, error: { message: "relation does not exist" } });
        const state = await registerInitialImpressionAction({}, makeFormData(VALID));
        expect(state.error).toBe("No se pudieron leer tus marcadores. Intenta de nuevo.");
        expect(state.fields).toEqual(VALID_FIELDS);
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("si la impresión ya existe (23505) devuelve {} y revalida", async () => {
        mocks.insert.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate key value" } });
        const state = await registerInitialImpressionAction({}, makeFormData(VALID));
        expect(state).toEqual({});
        expect(mocks.revalidatePath).toHaveBeenCalledWith(`/platform/uploads/${UPLOAD_ID}`);
    });

    it("con otro error devuelve un texto fijo, conserva los campos y no filtra el detalle", async () => {
        mocks.insert.mockResolvedValueOnce({ error: { code: "42501", message: "new row violates row-level security policy" } });
        const state = await registerInitialImpressionAction({}, makeFormData(VALID));
        expect(state.error).toBe("No se pudo registrar tu impresión. Intenta de nuevo.");
        expect(state.fields).toEqual(VALID_FIELDS);
        expect(JSON.stringify(state)).not.toContain("row-level security");
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("rechaza el formulario sin Lung-RADS sin tocar la base", async () => {
        const state = await registerInitialImpressionAction(
            {},
            makeFormData({ upload_id: UPLOAD_ID, conducta: "tac_3m" }),
        );
        expect(state.error).toBe("Elige la categoría Lung-RADS de tu impresión inicial.");
        expect(state.fields).toEqual({ conducta: "tac_3m" });
        expect(mocks.from).not.toHaveBeenCalled();
    });

    it("exige sesión", async () => {
        mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
        const state = await registerInitialImpressionAction({}, makeFormData(VALID));
        expect(state.error).toMatch(/sesión/i);
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
