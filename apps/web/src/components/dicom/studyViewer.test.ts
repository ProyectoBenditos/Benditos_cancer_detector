import { afterEach, describe, expect, it, vi } from "vitest";
import { REFERENCES } from "@/lib/references";
import { explainabilityReference, isVolumeFileType, volume3dEnabled } from "./studyViewer";

afterEach(() => vi.unstubAllEnvs());

describe("isVolumeFileType", () => {
  it("acepta solo series y volúmenes NIfTI", () => {
    expect(isVolumeFileType("dicom_series")).toBe(true);
    expect(isVolumeFileType("nifti_volume")).toBe(true);
    for (const t of ["dicom", "image", "png_analysis", "", null, undefined]) {
      expect(isVolumeFileType(t)).toBe(false);
    }
  });
});

describe("volume3dEnabled", () => {
  it("solo es verdadero con la bandera en 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    expect(volume3dEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "false");
    expect(volume3dEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "");
    expect(volume3dEnabled()).toBe(false);
  });
});

describe("explainabilityReference", () => {
  it("usa HiResCAM para el modelo v2 y Grad-CAM en otro caso", () => {
    expect(explainabilityReference("multimodal-v2.0-densenet-real")).toBe(REFERENCES.hirescam);
    expect(explainabilityReference("multimodal-v1.2")).toBe(REFERENCES.gradcam);
    expect(explainabilityReference(null)).toBe(REFERENCES.gradcam);
    expect(explainabilityReference(undefined)).toBe(REFERENCES.gradcam);
  });
});
