import { describe, it, expect, vi, beforeEach } from "vitest";

// revalidatePath no es relevante para los tests de lógica
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// vi.hoisted permite que los mocks existan antes del vi.mock hoisted
const { getUserMock, fromMock, selectMock, eqMock, singleMock, updateMock, updateEqMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    fromMock: vi.fn(),
    selectMock: vi.fn(),
    eqMock: vi.fn(),
    singleMock: vi.fn(),
    updateMock: vi.fn(),
    updateEqMock: vi.fn(),
  }));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

import { approveMedicoAction, rejectMedicoAction, revokeMedicoAction } from "./actions";

/**
 * Construye la cadena `supabase.from("profiles").select("role").eq("id", id).single()`
 * para devolver `{ data: { role } }` y deja preparado un .update().eq() también.
 */
function setupSupabaseChain(role: string | null) {
  singleMock.mockResolvedValue({ data: role ? { role } : null });
  eqMock.mockReturnValue({ single: singleMock });
  selectMock.mockReturnValue({ eq: eqMock });
  updateEqMock.mockResolvedValue({ data: null, error: null });
  updateMock.mockReturnValue({ eq: updateEqMock });
  fromMock.mockReturnValue({ select: selectMock, update: updateMock });
}

describe("approveMedicoAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza cuando no hay sesión", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    setupSupabaseChain("admin");
    await expect(approveMedicoAction("p-1")).rejects.toThrow(/autenticado/i);
  });

  it("rechaza cuando el usuario no es admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    setupSupabaseChain("medico");
    await expect(approveMedicoAction("p-1")).rejects.toThrow(/autorizado/i);
  });

  it("aprueba al perfil cuando el usuario es admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-admin" } } });
    setupSupabaseChain("admin");
    await approveMedicoAction("p-target");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approved_by: "u-admin",
      })
    );
  });
});

describe("rejectMedicoAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza cuando no hay sesión", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    setupSupabaseChain("admin");
    await expect(rejectMedicoAction("p-1", "razón")).rejects.toThrow(/autenticado/i);
  });

  it("rechaza cuando el usuario no es admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    setupSupabaseChain(null);
    await expect(rejectMedicoAction("p-1", "razón")).rejects.toThrow(/autorizado/i);
  });

  it("guarda 'Sin motivo especificado' cuando reason vacía", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-admin" } } });
    setupSupabaseChain("admin");
    await rejectMedicoAction("p-1", "");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        rejection_reason: "Sin motivo especificado",
      })
    );
  });

  it("guarda la razón recibida cuando viene poblada", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-admin" } } });
    setupSupabaseChain("admin");
    await rejectMedicoAction("p-1", "Cédula no válida");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rejection_reason: "Cédula no válida",
      })
    );
  });
});

describe("revokeMedicoAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza cuando el usuario no es admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } } });
    setupSupabaseChain("medico");
    await expect(revokeMedicoAction("p-1")).rejects.toThrow(/autorizado/i);
  });

  it("revoca y limpia campos de aprobación", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u-admin" } } });
    setupSupabaseChain("admin");
    await revokeMedicoAction("p-target");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
      })
    );
  });
});
