import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));

// Query builder fluido: soporta cadenas arbitrarias y es awaitable
function makeQuery() {
  const q: Record<string, unknown> = {};
  const self = q;
  ["select", "eq", "not", "order"].forEach((m) => {
    self[m] = vi.fn().mockReturnValue(self);
  });
  // thenable — permite `await query`
  self["then"] = (
    resolve: (v: { data: unknown[]; error: null }) => void,
    reject?: (e: unknown) => void
  ) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
  return self;
}

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => makeQuery()),
  }),
}));

import { GET } from "./route";

describe("GET /platform/reportes/download", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("devuelve CSV (200) cuando el usuario está autenticado", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("aplica filtro alto_riesgo cuando tipo=alto_riesgo", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    const req = new NextRequest("http://localhost/platform/reportes/download?tipo=alto_riesgo");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("alto_riesgo");
  });
});
