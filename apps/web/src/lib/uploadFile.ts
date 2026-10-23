export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".dcm", ".zip", ".nii", ".nii.gz", ".png", ".jpg", ".jpeg"];

/** Devuelve el mensaje de error o null si el archivo se puede subir. */
export function validateUploadFile(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "El archivo supera el máximo de 50 MB.";
  }
  return null;
}
