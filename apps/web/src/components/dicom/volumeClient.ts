import type { VolumeMetadata } from "./volumeGeometry";

export interface PreparedVolumeManifest {
  volume_metadata: VolumeMetadata;
  assets: { atlas: string; lobes?: string; heatmap?: string };
  attribution?: { method: string; positive_activation?: boolean; native_layer_shapes?: number[][] };
  segmentation?: { method: string; present_labels?: number[] };
  peak_activation?: { x: number; y: number; z: number; label: string; is_lesion_detection: false } | null;
}

// El detalle del servidor puede contener texto de desarrollo; nunca se muestra al usuario.
export function volumeErrorMessage(status: number, detail?: string): string {
  void detail;
  if (status === 503) return "El volumen 3D no está disponible en este entorno.";
  if (status === 429) return "Hay otros volúmenes en preparación. Intenta de nuevo en unos minutos.";
  if (status === 404) return "No se encontró el volumen de este estudio.";
  return `No se pudo preparar el volumen (${status}).`;
}

async function requestJson(url: string, signal: AbortSignal, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, signal, cache: "no-store" });
  if (!response.ok) throw new Error(volumeErrorMessage(response.status));
  return response.json();
}

function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancelled = () => { clearTimeout(timer); reject(new DOMException("Carga cancelada", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancelled); resolve(); }, 1500);
    signal.addEventListener("abort", cancelled, { once: true });
    if (signal.aborted) cancelled();
  });
}

export async function prepareStudyVolume(uploadId: string, base: string, signal: AbortSignal,
  progress: (value: { message: string; progress: number }) => void) {
  const { createClient } = await import("@/utils/supabase/client");
  const client = createClient();
  const authHeaders = async () => {
    const { data } = await client.auth.getSession();
    if (!data.session?.access_token) throw new Error("Inicie sesión para preparar el volumen del estudio.");
    return { Authorization: `Bearer ${data.session.access_token}` };
  };
  const endpoint = `${base}/api/v1/dicom/${encodeURIComponent(uploadId)}/volume`;
  let job = await requestJson(`${endpoint}/prepare`, signal, { method: "POST", headers: await authHeaders() });
  const deadline = Date.now() + 30 * 60 * 1000;
  while (job.status !== "ready") {
    if (job.status === "error") throw new Error("No se pudo preparar el volumen.");
    if (Date.now() > deadline) throw new Error("La preparación sigue en curso. Reintente consultar el volumen.");
    progress({ message: job.message || "Preparando TC, lóbulos y mapa de calor en local…", progress: job.progress ?? 0 });
    await pause(signal);
    job = await requestJson(`${endpoint}/jobs/${encodeURIComponent(job.job_id)}`, signal, { headers: await authHeaders() });
  }
  const manifest = job.manifest as PreparedVolumeManifest;
  const assetUrl = (value: string) => {
    const url = new URL(value, base);
    if (url.origin !== new URL(base).origin) throw new Error("El origen de los artefactos no coincide con la API del estudio.");
    return url.toString();
  };
  return { manifest, headers: await authHeaders(), atlas: assetUrl(manifest.assets.atlas),
    lobes: manifest.assets.lobes ? assetUrl(manifest.assets.lobes) : undefined,
    heatmap: manifest.assets.heatmap ? assetUrl(manifest.assets.heatmap) : undefined };
}

export async function loadPublicVolume(manifestUrl: string, signal: AbortSignal) {
  const manifest = await requestJson(manifestUrl, signal) as PreparedVolumeManifest;
  const resolve = (value: string) => new URL(value, new URL(manifestUrl, window.location.href)).toString();
  return { manifest, headers: undefined, atlas: resolve(manifest.assets.atlas),
    lobes: manifest.assets.lobes ? resolve(manifest.assets.lobes) : undefined,
    heatmap: manifest.assets.heatmap ? resolve(manifest.assets.heatmap) : undefined };
}
