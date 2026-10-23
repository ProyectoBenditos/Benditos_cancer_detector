import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "./uploadFile";

describe("validateUploadFile", () => {
  it("acepta las extensiones soportadas sin importar mayúsculas", () => {
    for (const name of ["a.dcm", "a.zip", "a.nii", "a.NII.GZ", "a.png", "a.jpg", "a.JPEG"]) {
      expect(validateUploadFile({ name, size: 10 })).toBeNull();
    }
  });

  it("rechaza formatos no soportados", () => {
    expect(validateUploadFile({ name: "a.tar.gz", size: 10 })).toBe(
      "Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg.",
    );
  });

  it("rechaza archivos de más de 50 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
    expect(validateUploadFile({ name: "a.dcm", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateUploadFile({ name: "a.dcm", size: MAX_UPLOAD_BYTES + 1 })).toBe(
      "El archivo supera el máximo de 50 MB.",
    );
  });
});
