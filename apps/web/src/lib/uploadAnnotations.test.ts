import { describe, expect, it } from "vitest";
import { isValidSeq, parseAnnotation, rowToMarker } from "./uploadAnnotations";

const OK = {
  uploadId: "6f1c2b3a-1d2e-4f50-8a9b-0c1d2e3f4a5b",
  seq: 1,
  x: 0.25,
  y: 0.75,
  findingType: "solido",
  aiAgreement: "ia_no_marco",
  note: "Borde liso",
  sizeMm: 8.46,
};

describe("parseAnnotation", () => {
  it("acepta un marcador válido y lo pasa a columnas", () => {
    expect(parseAnnotation(OK)).toEqual({
      ok: true,
      values: {
        upload_id: OK.uploadId,
        seq: 1,
        kind: "point",
        x: 0.25,
        y: 0.75,
        finding_type: "solido",
        ai_agreement: "ia_no_marco",
        note: "Borde liso",
        size_mm: 8.5,
      },
    });
  });

  it("rechaza datos manipulados", () => {
    const bads: Array<Record<string, unknown>> = [
      { uploadId: "abc" },
      { seq: 0 },
      { seq: 1.5 },
      { seq: 40000 },
      { x: 1.2 },
      { y: -0.1 },
      { x: Number.NaN },
      { x: "0.5" },
      { findingType: "maligno" },
      { aiAgreement: "x" },
      { sizeMm: 0 },
      { sizeMm: 301 },
      { sizeMm: Number.POSITIVE_INFINITY },
      { note: "x".repeat(1001) },
      { note: 5 },
    ];
    for (const bad of bads) expect(parseAnnotation({ ...OK, ...bad }).ok, JSON.stringify(bad)).toBe(false);
    expect(parseAnnotation(null).ok).toBe(false);
    expect(parseAnnotation("x").ok).toBe(false);
  });

  it("acepta tipo, opinión, tamaño y nota vacíos", () => {
    expect(parseAnnotation({ ...OK, findingType: null, aiAgreement: null, sizeMm: null, note: "" }).ok).toBe(true);
  });
});

describe("isValidSeq", () => {
  it("entero entre 1 y 32767", () => {
    expect(isValidSeq(1)).toBe(true);
    expect(isValidSeq(32767)).toBe(true);
    expect(isValidSeq(0)).toBe(false);
    expect(isValidSeq(32768)).toBe(false);
    expect(isValidSeq("1")).toBe(false);
  });
});

describe("rowToMarker", () => {
  it("convierte la fila (size_mm puede venir como texto)", () => {
    expect(
      rowToMarker({ seq: 3, x: 0.5, y: 0.5, finding_type: "otro", ai_agreement: null, note: null, size_mm: "12.0" })
    ).toEqual({
      id: "m3",
      seq: 3,
      x: 0.5,
      y: 0.5,
      findingType: "otro",
      aiAgreement: null,
      note: "",
      sizeMm: 12,
    });
  });

  it("descarta filas corruptas y limpia valores desconocidos", () => {
    expect(
      rowToMarker({ seq: 0, x: 0.5, y: 0.5, finding_type: null, ai_agreement: null, note: "", size_mm: null })
    ).toBeNull();
    expect(
      rowToMarker({ seq: 1, x: 2, y: 0.5, finding_type: null, ai_agreement: null, note: "", size_mm: null })
    ).toBeNull();
    expect(
      rowToMarker({ seq: 1, x: 0.5, y: 0.5, finding_type: "raro", ai_agreement: "raro", note: "", size_mm: null })
    ).toMatchObject({ findingType: null, aiAgreement: null });
  });
});
