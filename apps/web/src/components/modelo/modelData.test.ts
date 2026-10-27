import { describe, it, expect } from "vitest";
import {
  CONFUSION_MATRIX,
  MODEL_METRICS,
  MODEL_STATUS,
  TEST_COHORT,
} from "./modelData";

describe("modelData", () => {
  it("la matriz de confusión suma el tamaño de la cohorte de prueba", () => {
    const total =
      CONFUSION_MATRIX.tn + CONFUSION_MATRIX.fp + CONFUSION_MATRIX.fn + CONFUSION_MATRIX.tp;
    expect(total).toBe(TEST_COHORT.samples);
  });

  it("describe la cohorte de prueba como 357 muestras de 56 pacientes", () => {
    expect(MODEL_METRICS.testCases).toBe("357 muestras (56 pacientes)");
  });

  it("no afirma la resolución 128×128 en la explicabilidad", () => {
    expect(MODEL_METRICS.explainability).not.toContain("128×128");
  });

  it("marca el modelo documentado como no desplegado en producción", () => {
    expect(MODEL_STATUS.documentedInProduction).toBe(false);
    expect(MODEL_STATUS.servingVersion).toBe("multimodal-v1.2");
    expect(MODEL_STATUS.documentedVersion).toBe("multimodal-v2.0-densenet");
  });
});
