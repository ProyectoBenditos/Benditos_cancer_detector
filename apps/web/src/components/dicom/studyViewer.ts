import { REFERENCES, type Reference } from "@/lib/references";

/** Tipos de archivo que producen un volumen (serie ZIP o NIfTI). */
export function isVolumeFileType(fileType?: string | null): boolean {
  return fileType === "dicom_series" || fileType === "nifti_volume";
}

/** Bandera de la pestaña 3D. Se lee al llamar para poder simularla en pruebas. */
export function volume3dEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VOLUME_3D_ENABLED === "true";
}

/** Referencia del método de explicabilidad según la versión del modelo. */
export function explainabilityReference(modelVersion?: string | null): Reference {
  return modelVersion?.includes("v2") ? REFERENCES.hirescam : REFERENCES.gradcam;
}
