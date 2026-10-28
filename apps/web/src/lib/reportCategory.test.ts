import { describe, expect, it } from "vitest";
import {
  IMPRESSION_SOURCE_LABEL,
  UNASSIGNED_TEXT,
  reportConducta,
  reportLungRads,
} from "./reportCategory";

const IMPRESSION = { lung_rads: "2", conducta: "tac_12m" } as const;
const REVIEW = { lung_rads: "4A", conducta: "pet_tc" } as const;

describe("reportLungRads", () => {
  it("sin valoración ni impresión queda sin asignar y sin descripción", () => {
    const r = reportLungRads(null, null);
    expect(r.source).toBe("none");
    expect(r.text).toBe(UNASSIGNED_TEXT);
    expect(r.text).toBe("Sin asignar — pendiente del especialista");
    expect(r.description).toBeNull();
  });

  it("una valoración sin categoría tampoco toma una de la IA", () => {
    const r = reportLungRads({ lung_rads: null, conducta: null }, null);
    expect(r.source).toBe("none");
    expect(r.text).toBe(UNASSIGNED_TEXT);
  });

  it("con impresión 2 muestra la 2 rotulada como impresión inicial", () => {
    const r = reportLungRads(null, IMPRESSION);
    expect(r.source).toBe("impression");
    expect(r.text).toBe("Categoría 2");
    expect(r.heading).toContain(IMPRESSION_SOURCE_LABEL);
    expect(IMPRESSION_SOURCE_LABEL).toBe("Impresión inicial (antes de la IA)");
    expect(r.description).toBe("Benigno");
  });

  it("con valoración muestra la de la valoración aunque haya impresión", () => {
    const r = reportLungRads(REVIEW, IMPRESSION);
    expect(r.source).toBe("review");
    expect(r.text).toBe("Categoría 4A");
    expect(r.heading).toBe("Categoría Lung-RADS Registrada");
    expect(r.description).toBe("Sospechoso");
  });
});

describe("reportConducta", () => {
  it("sin valoración ni impresión queda sin asignar", () => {
    const r = reportConducta(null, null);
    expect(r.source).toBe("none");
    expect(r.text).toBe(UNASSIGNED_TEXT);
  });

  it("con impresión muestra su conducta rotulada como impresión inicial", () => {
    const r = reportConducta(null, IMPRESSION);
    expect(r.source).toBe("impression");
    expect(r.text).toBe("TAC de control a 12 meses");
    expect(r.heading).toContain(IMPRESSION_SOURCE_LABEL);
  });

  it("con valoración muestra la de la valoración", () => {
    const r = reportConducta(REVIEW, IMPRESSION);
    expect(r.source).toBe("review");
    expect(r.text).toBe("PET-TC");
    expect(r.heading).toBe("Conducta Registrada por el Especialista");
  });
});
