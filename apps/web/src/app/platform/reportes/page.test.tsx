import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  loadBlindContext: vi.fn(),
  queries: [] as Array<{ calls: Array<[string, unknown[]]> }>,
}));

// Cada consulta registra sus filtros y resuelve un conteo.
function makeQuery() {
  const record = { calls: [] as Array<[string, unknown[]]> };
  mocks.queries.push(record);
  const chain: Record<string, unknown> = {};
  ["select", "eq", "not"].forEach((m) => {
    chain[m] = (...args: unknown[]) => {
      record.calls.push([m, args]);
      return chain;
    };
  });
  chain.then = (resolve: (r: { count: number }) => unknown) => Promise.resolve({ count: 3 }).then(resolve);
  return chain;
}

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => makeQuery(),
  }),
}));
vi.mock("@/lib/blindReading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blindReading")>()),
  loadBlindContext: mocks.loadBlindContext,
}));

import ReportesPage from "./page";

// Las consultas que cuentan por nivel de riesgo.
function riskQueries() {
  return mocks.queries.filter((q) => q.calls.some(([m, args]) => m === "eq" && args[0] === "ai_risk_level"));
}

beforeEach(() => {
  mocks.queries = [];
});
afterEach(cleanup);

describe("ReportesPage: lectura ciega", () => {
  it("con pendientes, el conteo por riesgo los excluye", async () => {
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set(["a", "b"]) });
    render(await ReportesPage());
    const risk = riskQueries();
    expect(risk.length).toBeGreaterThan(0);
    for (const q of risk) {
      expect(q.calls).toContainEqual(["not", ["id", "in", "(a,b)"]]);
    }
  });

  it("sin pendientes no añade un filtro vacío", async () => {
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set() });
    render(await ReportesPage());
    for (const q of mocks.queries) {
      expect(q.calls.some(([m]) => m === "not")).toBe(false);
    }
  });

  it("con la lectura ciega apagada no filtra", async () => {
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: false, pendingIds: new Set(["a"]) });
    render(await ReportesPage());
    for (const q of mocks.queries) {
      expect(q.calls.some(([m]) => m === "not")).toBe(false);
    }
  });
});
