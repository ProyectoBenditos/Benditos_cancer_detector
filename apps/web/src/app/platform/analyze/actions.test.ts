import { describe, it, expect, vi, beforeEach } from "vitest";

// analyzeAction llama redirect() internamente — se mocka para evitar errores de next/navigation
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
// Supabase server se mocka: los tests de validación pura no llegan a la capa de red
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "fake" } }, error: null }) },
  }),
}));

// fetch global también se mocka para evitar llamadas de red reales
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
  json: async () => ({ detail: "mocked error" }),
}) as unknown as typeof fetch;

import { analyzeAction } from "./actions";

const VALID_FEATURES = {
  subtlety: "3",
  calcification: "6",
  sphericity: "4",
  margin: "4",
  lobulation: "1",
  spiculation: "1",
  texture: "5",
  malignancy: "3",
};

function makeFormData(overrides: Record<string, string> = {}, file?: File): FormData {
  const fd = new FormData();
  const features = { ...VALID_FEATURES, ...overrides };
  for (const [k, v] of Object.entries(features)) fd.append(k, v);
  const f = file ?? new File(["x"], "test.png", { type: "image/png" });
  fd.append("imagen", f);
  return fd;
}

describe("analyzeAction — validación pura", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza cuando no hay archivo", async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(VALID_FEATURES)) fd.append(k, v);
    // no se agrega imagen
    const state = await analyzeAction({ error: undefined }, fd);
    expect(state.error).toMatch(/imagen/i);
  });

  it("rechaza archivo vacío (size 0)", async () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(VALID_FEATURES)) fd.append(k, v);
    fd.append("imagen", new File([], "empty.png", { type: "image/png" }));
    const state = await analyzeAction({ error: undefined }, fd);
    expect(state.error).toMatch(/imagen/i);
  });

  it("rechaza archivo mayor a 10 MB", async () => {
    const bigFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const state = await analyzeAction({ error: undefined }, makeFormData({}, bigFile));
    expect(state.error).toMatch(/10 MB|limite/i);
  });

  it("rechaza feature con valor NaN", async () => {
    const state = await analyzeAction({ error: undefined }, makeFormData({ subtlety: "abc" }));
    expect(state.error).toMatch(/subtlety|numero/i);
  });

  it("rechaza feature fuera de rango (malignancy > 5)", async () => {
    const state = await analyzeAction({ error: undefined }, makeFormData({ malignancy: "6" }));
    expect(state.error).toMatch(/malignancy|entre/i);
  });

  it("rechaza feature fuera de rango (subtlety < 1)", async () => {
    const state = await analyzeAction({ error: undefined }, makeFormData({ subtlety: "0" }));
    expect(state.error).toMatch(/subtlety|entre/i);
  });

  it("pasa validación y llega a la capa de red con datos válidos", async () => {
    // con datos válidos no debe retornar error de validación (puede fallar en red, pero no en validación)
    const state = await analyzeAction({ error: undefined }, makeFormData());
    // si hay error, debe ser de red/sesión, no de validación de features
    if (state.error) {
      expect(state.error).not.toMatch(/entre|numero|imagen|MB/i);
    }
  });
});
