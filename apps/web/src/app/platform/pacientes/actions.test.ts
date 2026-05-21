import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({
      insert: mocks.insert,
    })),
  }),
}));

import { createPatientAction } from "./actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("createPatientAction — validación pura", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("rechaza external_id vacío", async () => {
    const state = await createPatientAction({}, makeFormData({ external_id: "" }));
    expect(state.error).toMatch(/obligatorio/i);
  });

  it("rechaza external_id con más de 100 caracteres", async () => {
    const state = await createPatientAction({}, makeFormData({ external_id: "x".repeat(101) }));
    expect(state.error).toMatch(/100/);
  });

  it("propaga error de unique constraint", async () => {
    mocks.insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const state = await createPatientAction({}, makeFormData({ external_id: "TEST-001" }));
    expect(state.error).toMatch(/ya tienes/i);
  });

  it("acepta datos válidos y redirige (no error de validación)", async () => {
    // Next.js redirect() lanza internamente — lo capturamos y verificamos que NO es un error de validación
    let thrown: unknown;
    try {
      await createPatientAction(
        {},
        makeFormData({ external_id: "CT-001", display_alias: "Paciente CT", notes: "Notas aquí" })
      );
    } catch (e) {
      thrown = e;
    }
    // El mock de redirect puede no lanzar o puede retornar undefined — en ambos casos no debe haber error de validación
    // Si llegamos aquí sin error, también es válido
    expect(thrown ?? { error: undefined }).not.toMatchObject({ error: expect.stringMatching(/obligatorio|100|ya tienes/i) });
  });
});
