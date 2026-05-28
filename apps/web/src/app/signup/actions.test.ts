import { describe, it, expect, vi, beforeEach } from "vitest";

// signupAction llama redirect() en el happy path
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

// vi.hoisted permite definir los mocks antes del vi.mock hoisted
const { signUpMock } = vi.hoisted(() => ({ signUpMock: vi.fn() }));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { signUp: signUpMock },
  }),
}));

import { signupAction } from "./actions";

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const base = {
    email: "medico@hospital.invalid",
    password: "secret-1234",
    confirm_password: "secret-1234",
    full_name: "Médica de Prueba",
    cedula_profesional: "12345678",
    especialidad: "Radiología",
    institucion: "Hospital de Pruebas",
    ...overrides,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) fd.append(k, v);
  return fd;
}

describe("signupAction — validación pura", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUpMock.mockResolvedValue({
      data: { user: { id: "user-x", identities: [{ id: "identity-x" }] }, session: null },
      error: null,
    });
  });

  it("rechaza email inválido", async () => {
    const state = await signupAction({}, makeFormData({ email: "no-es-correo" }));
    expect(state.error).toMatch(/correo/i);
  });

  it("rechaza password menor a 8 caracteres", async () => {
    const state = await signupAction({}, makeFormData({ password: "abc", confirm_password: "abc" }));
    expect(state.error).toMatch(/contraseña/i);
  });

  it("rechaza confirm_password distinto a password", async () => {
    const state = await signupAction({}, makeFormData({ confirm_password: "otra-clave" }));
    expect(state.error).toMatch(/coinciden/i);
  });

  it("rechaza nombre completo menor a 3 caracteres", async () => {
    const state = await signupAction({}, makeFormData({ full_name: "X" }));
    expect(state.error).toMatch(/nombre/i);
  });

  it("rechaza cédula profesional menor a 3 caracteres", async () => {
    const state = await signupAction({}, makeFormData({ cedula_profesional: "1" }));
    expect(state.error).toMatch(/cédula/i);
  });

  it("rechaza especialidad menor a 3 caracteres", async () => {
    const state = await signupAction({}, makeFormData({ especialidad: "" }));
    expect(state.error).toMatch(/especialidad/i);
  });

  it("rechaza institución menor a 3 caracteres", async () => {
    const state = await signupAction({}, makeFormData({ institucion: "ab" }));
    expect(state.error).toMatch(/institución/i);
  });
});

describe("signupAction — manejo de respuesta Supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy path; cada test lo sobreescribe si necesita otro escenario
    signUpMock.mockResolvedValue({
      data: { user: { id: "u", identities: [{ id: "i" }] }, session: null },
      error: null,
    });
  });

  it("propaga error de Supabase Auth", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Email ya registrado" },
    });
    const state = await signupAction({}, makeFormData());
    expect(state.error).toMatch(/Email ya registrado/);
  });

  it("detecta email ya registrado por identities vacío", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u", identities: [] }, session: null },
      error: null,
    });
    const state = await signupAction({}, makeFormData());
    expect(state.error).toMatch(/ya tiene una cuenta/i);
  });

  it("no devuelve error cuando supabase responde con user válido", async () => {
    const state = await signupAction({}, makeFormData());
    // happy path llama redirect() → si no hubo error de validación previo, state es undefined o vacío
    expect(state?.error).toBeUndefined();
  });
});
