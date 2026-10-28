import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRACTICE_BASE, PRACTICE_MANIFEST_URL, parsePracticeManifest } from "./practiceCases";

const validCase = {
  id: "caso-01",
  image: "caso-01.png",
  heatmap: "caso-01-heatmap.png",
  pixel_spacing: [0.7, 0.8],
  rows: 512,
  columns: 512,
  reference: [{ x: 0.6, y: 0.65, diameter_mm: 7.8, readers: 4 }],
  ai: { score: 0.72, risk_level: "ALTO", model_version: "multimodal-v1.2" },
};
const manifest = (c: unknown = validCase) => ({ version: 1, cases: [c] });

describe("constantes", () => {
  it("usa las rutas públicas del manifest", () => {
    expect(PRACTICE_MANIFEST_URL).toBe("/demo/practica/manifest.json");
    expect(PRACTICE_BASE).toBe("/demo/practica/");
  });
});

describe("parsePracticeManifest", () => {
  it("arma las URLs y la geometría de un manifest válido", () => {
    const cases = parsePracticeManifest(manifest());
    expect(cases).toHaveLength(1);
    expect(cases![0].imageUrl).toBe("/demo/practica/caso-01.png");
    expect(cases![0].heatmapUrl).toBe("/demo/practica/caso-01-heatmap.png");
    expect(cases![0].geometry).toEqual({ pixelSpacingMm: [0.7, 0.8], rows: 512, columns: 512 });
    expect(cases![0].reference).toEqual([{ x: 0.6, y: 0.65, diameterMm: 7.8, readers: 4 }]);
    expect(cases![0].ai).toEqual({ score: 0.72, riskLevel: "ALTO", modelVersion: "multimodal-v1.2" });
  });

  it("devuelve null si falta cases", () => {
    expect(parsePracticeManifest({ version: 1 })).toBeNull();
    expect(parsePracticeManifest(null)).toBeNull();
  });

  it("devuelve null si una x está fuera de [0, 1]", () => {
    const bad = { ...validCase, reference: [{ x: 1.2, y: 0.5, diameter_mm: 5, readers: 3 }] };
    expect(parsePracticeManifest(manifest(bad))).toBeNull();
  });

  it("devuelve null si risk_level no es un nivel conocido", () => {
    const bad = { ...validCase, ai: { ...validCase.ai, risk_level: "CRITICO" } };
    expect(parsePracticeManifest(manifest(bad))).toBeNull();
  });

  it("parsea el manifest real con 5 casos", () => {
    const raw = readFileSync(join(process.cwd(), "public/demo/practica/manifest.json"), "utf8");
    expect(parsePracticeManifest(JSON.parse(raw))).toHaveLength(5);
  });
});
