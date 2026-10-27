import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    user: { id: "u1" } as { id: string } | null,
    profile: { data: null as unknown, error: null as unknown },
    eq: vi.fn(),
}));

vi.mock("@/utils/supabase/client", () => ({
    createClient: () => ({
        auth: { getUser: () => Promise.resolve({ data: { user: mocks.user }, error: null }) },
        from: () => ({
            select: () => ({
                eq: (...args: unknown[]) => {
                    mocks.eq(...args);
                    return { maybeSingle: () => Promise.resolve(mocks.profile) };
                },
            }),
        }),
    }),
}));

import { useBlindReadingPreference } from "./useBlindReadingPreference";

afterEach(() => {
    mocks.user = { id: "u1" };
    mocks.profile = { data: null, error: null };
    mocks.eq.mockReset();
});

describe("useBlindReadingPreference", () => {
    it("devuelve null mientras carga y luego true", async () => {
        mocks.profile = { data: { blind_reading: true }, error: null };
        const { result } = renderHook(() => useBlindReadingPreference());
        expect(result.current).toBeNull();
        await waitFor(() => expect(result.current).toBe(true));
        expect(mocks.eq).toHaveBeenCalledWith("id", "u1");
    });

    it("devuelve false si la consulta falla (la columna puede no existir)", async () => {
        mocks.profile = { data: null, error: { message: "column does not exist" } };
        const { result } = renderHook(() => useBlindReadingPreference());
        await waitFor(() => expect(result.current).toBe(false));
    });

    it("devuelve false con la preferencia apagada", async () => {
        mocks.profile = { data: { blind_reading: false }, error: null };
        const { result } = renderHook(() => useBlindReadingPreference());
        await waitFor(() => expect(result.current).toBe(false));
    });

    it("devuelve false sin sesión", async () => {
        mocks.user = null;
        const { result } = renderHook(() => useBlindReadingPreference());
        await waitFor(() => expect(result.current).toBe(false));
    });
});
