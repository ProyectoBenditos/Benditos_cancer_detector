import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPublicVolume, prepareStudyVolume, volumeErrorMessage } from "./volumeClient";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "test-local-token" } } }) } }),
}));

const manifest = { volume_metadata: { num_slices: 3, rows: 5, columns: 7, pixel_spacing: [1, 1], slice_spacing: 2 },
  assets: { atlas: "atlas.png", lobes: "lobes.png", heatmap: "heatmap.png" } };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("registered volume delivery", () => {
  it("resolves all public artifacts against the same manifest directory", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(manifest)));
    const result = await loadPublicVolume("http://localhost:3000/demo/lung-ct/manifest.json", new AbortController().signal);
    expect(result.atlas).toBe("http://localhost:3000/demo/lung-ct/atlas.png");
    expect(result.lobes).toBe("http://localhost:3000/demo/lung-ct/lobes.png");
    expect(result.heatmap).toBe("http://localhost:3000/demo/lung-ct/heatmap.png");
    expect(result.headers).toBeUndefined();
  });
  it("sends bearer auth to the study API and keeps it out of the URL", async () => {
    const ready = { status: "ready", manifest: { ...manifest,
      assets: { atlas: "/api/v1/study/atlas.png", lobes: "/api/v1/study/lobes.png", heatmap: "/api/v1/study/heatmap.png" } } };
    const fetchMock = vi.fn().mockResolvedValue(reply(ready));
    vi.stubGlobal("fetch", fetchMock);
    const result = await prepareStudyVolume("study-id", "http://127.0.0.1:8000", new AbortController().signal, vi.fn());
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/v1/dicom/study-id/volume/prepare");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-local-token");
    expect(result.heatmap).toBe("http://127.0.0.1:8000/api/v1/study/heatmap.png");
  });
  it("refuses to forward study credentials to an external artifact origin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ status: "ready", manifest: {
      ...manifest, assets: { atlas: "https://external.invalid/atlas.png" },
    } })));
    await expect(prepareStudyVolume("study", "http://127.0.0.1:8000", new AbortController().signal, vi.fn())).rejects.toThrow("origen");
  });
  it("surfaces a worker error instead of displaying a simulated heatmap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ status: "error", message: "No hay soporte pulmonar" })));
    await expect(prepareStudyVolume("study", "http://127.0.0.1:8000", new AbortController().signal, vi.fn())).rejects.toThrow("No hay soporte pulmonar");
  });
});

describe("volumeErrorMessage", () => {
  it("returns product-language messages", () => {
    expect(volumeErrorMessage(503)).toBe("El volumen 3D no está disponible en este entorno.");
    expect(volumeErrorMessage(429)).toBe("Hay otros volúmenes en preparación. Intenta de nuevo en unos minutos.");
    expect(volumeErrorMessage(404)).toBe("No se encontró el volumen de este estudio.");
    expect(volumeErrorMessage(500)).toBe("No se pudo preparar el volumen (500).");
  });
  it("never leaks server detail", () => {
    expect(volumeErrorMessage(503, "Inicie el servicio local PyTorch/MONAI en el puerto 8001")).not.toContain("8001");
  });
  it("does not surface the server detail from a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ detail: "Inicie el servicio local en el puerto 8001" }, 503)));
    await expect(loadPublicVolume("http://localhost:3000/m.json", new AbortController().signal))
      .rejects.toThrow("El volumen 3D no está disponible en este entorno.");
  });
});
