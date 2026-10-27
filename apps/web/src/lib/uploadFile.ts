import { volume3dEnabled } from "@/components/dicom/studyViewer";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const BASE_EXTENSIONS = [".dcm", ".png", ".jpg", ".jpeg"];
// Series ZIP y volúmenes NIfTI: solo con la bandera 3D (el backend también los filtra).
const VOLUME_EXTENSIONS = [".zip", ".nii", ".nii.gz"];

function allowedExtensions(): string[] {
  return volume3dEnabled() ? [...BASE_EXTENSIONS, ...VOLUME_EXTENSIONS] : BASE_EXTENSIONS;
}

/** Valor del atributo `accept` del selector de archivo. */
export function uploadAccept(): string {
  const mimes = ["application/dicom", "image/png", "image/jpeg"];
  if (volume3dEnabled()) mimes.push("application/zip", "application/x-zip-compressed");
  return [...allowedExtensions(), ...mimes].join(",");
}

/** Texto visible con los formatos aceptados. */
export function uploadFormatsLabel(): string {
  const formats = volume3dEnabled()
    ? "DICOM (.dcm), Serie Multicorte (.zip), Volumen NIfTI (.nii, .nii.gz), PNG y JPG"
    : "DICOM (.dcm), PNG y JPG";
  return `Formatos compatibles: ${formats}. Tamaño máximo: 50MB.`;
}

/** Devuelve el mensaje de error o null si el archivo se puede subir. */
export function validateUploadFile(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (!allowedExtensions().some((ext) => name.endsWith(ext))) {
    return volume3dEnabled()
      ? "Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg."
      : "Formato no soportado. Use .dcm, .png o .jpg.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "El archivo supera el máximo de 50 MB.";
  }
  return null;
}
