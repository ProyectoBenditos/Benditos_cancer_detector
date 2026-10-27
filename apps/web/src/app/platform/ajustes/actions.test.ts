import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mocks.getUser },
        from: vi.fn(() => ({
            update: (...args: unknown[]) => {
                mocks.update(...args);
                return { eq: mocks.eq };
            },
        })),
    }),
}));

import { setBlindReadingAction } from "./actions";

describe("setBlindReadingAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
        mocks.eq.mockResolvedValue({ error: null });
    });

    it("sin usuario devuelve el aviso de sesión expirada", async () => {
        mocks.getUser.mockResolvedValue({ data: { user: null } });
        const res = await setBlindReadingAction(true);
        expect(res).toEqual({ ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." });
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it("con usuario actualiza el perfil propio y revalida el layout", async () => {
        const res = await setBlindReadingAction(true);
        expect(res).toEqual({ ok: true });
        expect(mocks.update).toHaveBeenCalledWith({ blind_reading: true });
        expect(mocks.eq).toHaveBeenCalledWith("id", "user-abc");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform", "layout");
    });

    it("si update falla devuelve un texto fijo sin detalle", async () => {
        mocks.eq.mockResolvedValue({ error: { message: "detalle interno" } });
        const res = await setBlindReadingAction(false);
        expect(res).toEqual({ ok: false, error: "No se pudo guardar la preferencia. Intenta de nuevo." });
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
});
