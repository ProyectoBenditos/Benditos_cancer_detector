import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES, uploadAccept, uploadFormatsLabel, validateUploadFile } from "./uploadFile";

const MSG_CON_VOLUMEN = "Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg.";
const MSG_SIN_VOLUMEN = "Formato no soportado. Use .dcm, .png o .jpg.";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validateUploadFile con la bandera 3D encendida", () => {
  it("acepta las extensiones soportadas sin importar mayúsculas", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    for (const name of ["a.dcm", "a.zip", "a.nii", "a.NII.GZ", "a.png", "a.jpg", "a.JPEG"]) {
      expect(validateUploadFile({ name, size: 10 })).toBeNull();
    }
  });

  it("rechaza formatos no soportados con la lista completa", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    expect(validateUploadFile({ name: "a.tar.gz", size: 10 })).toBe(MSG_CON_VOLUMEN);
  });

  it("incluye series y volúmenes en accept y en el texto de formatos", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    expect(uploadAccept()).toContain(".zip");
    expect(uploadAccept()).toContain(".nii.gz");
    expect(uploadFormatsLabel()).toContain("NIfTI");
  });
});

describe("validateUploadFile con la bandera 3D apagada", () => {
  it("acepta .dcm, .png y .jpg", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "false");
    for (const name of ["a.dcm", "a.png", "a.jpg", "a.JPEG"]) {
      expect(validateUploadFile({ name, size: 10 })).toBeNull();
    }
  });

  it("rechaza .zip, .nii y .nii.gz con la lista sin volúmenes", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "false");
    for (const name of ["a.zip", "a.nii", "a.NII.GZ", "a.tar.gz"]) {
      expect(validateUploadFile({ name, size: 10 })).toBe(MSG_SIN_VOLUMEN);
    }
  });

  it("trata la variable ausente como apagada", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", undefined);
    expect(validateUploadFile({ name: "a.zip", size: 10 })).toBe(MSG_SIN_VOLUMEN);
  });

  it("omite series y volúmenes en accept y en el texto de formatos", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "false");
    expect(uploadAccept()).not.toMatch(/zip|\.nii/);
    expect(uploadFormatsLabel()).not.toMatch(/zip|NIfTI|Multicorte/);
    expect(uploadFormatsLabel()).toContain(".dcm");
  });
});

describe("tamaño máximo", () => {
  it("rechaza archivos de más de 50 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
    expect(validateUploadFile({ name: "a.dcm", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateUploadFile({ name: "a.dcm", size: MAX_UPLOAD_BYTES + 1 })).toBe(
      "El archivo supera el máximo de 50 MB.",
    );
  });
});
