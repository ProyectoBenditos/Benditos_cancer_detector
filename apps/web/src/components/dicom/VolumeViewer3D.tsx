"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Layers, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { getVolumeGeometry, normalizeNodule, type VolumeMetadata } from "./volumeGeometry";
import { VOLUME_VERTEX_SHADER, VOLUME_FRAGMENT_SHADER } from "./volumeShaders";
import { volumeKeyActionFromEvent } from "./volumeKeys";
import { loadPublicVolume, prepareStudyVolume, type PreparedVolumeManifest } from "./volumeClient";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

const TOOLBAR_BUTTON_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

interface VolumeViewer3DProps {
  uploadId?: string;
  atlasUrl?: string;
  manifestUrl?: string;
  volumeMetadata?: VolumeMetadata;
  /** Co-registered integer atlas: 0=background, 1=RUL, 2=RML, 3=RLL, 4=LUL, 5=LLL. */
  lobeAtlasUrl?: string;
  heatmapAtlasUrl?: string;
  /** Source voxel indices [column,row,slice], never guessed from a heatmap. */
  noduleCoords?: { x: number; y: number; z: number };
  noduleRadiusMm?: number;
  /** Sin IA (lectura ciega, práctica): no se descarga el mapa de calor ni se marca el nódulo. */
  hideAi?: boolean;
}

interface VolumeResource {
  texture: THREE.Texture<HTMLImageElement>;
  lobeTexture: THREE.Texture<HTMLImageElement> | null;
  heatTexture: THREE.Texture<HTMLImageElement> | null;
  manifest?: PreparedVolumeManifest;
  metadata: VolumeMetadata;
  tileWidth: number;
  tileHeight: number;
  geometry: ReturnType<typeof getVolumeGeometry>;
}

async function loadScalarTexture(url: string, signal: AbortSignal, labels = false, headers?: HeadersInit) {
  const response = await fetch(url, { signal, cache: "no-store", headers });
  if (!response.ok) throw new Error(`No se pudo descargar el atlas (${response.status}).`);
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const texture = await new THREE.TextureLoader().loadAsync(objectUrl);
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = labels ? THREE.NearestFilter : THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    if (signal.aborted) {
      texture.dispose();
      throw new DOMException("Carga cancelada", "AbortError");
    }
    return texture;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function VolumeViewer3D(props: VolumeViewer3DProps) {
  // A study/atlas change starts a fresh loading session and disposes the old GPU resources.
  // Mostrar la IA también recarga: así se descarga el mapa de calor que antes se omitió.
  const sessionKey = JSON.stringify([props.uploadId, props.manifestUrl, props.atlasUrl, props.lobeAtlasUrl, props.heatmapAtlasUrl, props.volumeMetadata, props.hideAi === true]);
  return <VolumeViewerSession key={sessionKey} {...props} />;
}

function VolumeViewerSession({
  uploadId, manifestUrl, atlasUrl, volumeMetadata, lobeAtlasUrl, heatmapAtlasUrl, noduleCoords: noduleCoordsProp, noduleRadiusMm = 6,
  hideAi = false,
}: VolumeViewer3DProps) {
  const noduleCoords = hideAi ? undefined : noduleCoordsProp;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotation = useRef({ x: 0.05, y: 0.15 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [resource, setResource] = useState<VolumeResource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useFocusTrap(viewerRef, isFullscreen);
  const [viewMode, setViewMode] = useState<"anatomy" | "lobes" | "heatmap">("anatomy");
  const [heatOpacity, setHeatOpacity] = useState(0.7);
  const [heatThreshold, setHeatThreshold] = useState(0.6);
  const [preparation, setPreparation] = useState({ message: "Cargando el volumen…", progress: 0 });
  const [breathing, setBreathing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReducedMotion(query.matches); if (query.matches) setBreathing(false); };
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  const breathingRef = useRef(false);
  const [clip, setClip] = useState<[number, number, number]>([0.5, 0.5, 0.5]);
  const [density, setDensity] = useState(0.9);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let texture: THREE.Texture<HTMLImageElement> | null = null, lobeTexture: THREE.Texture<HTMLImageElement> | null = null,
      heatTexture: THREE.Texture<HTMLImageElement> | null = null;
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        let metadata = volumeMetadata;
        const prepared = manifestUrl ? await loadPublicVolume(manifestUrl, abort.signal) :
          uploadId ? await prepareStudyVolume(uploadId, base, abort.signal, setPreparation) : null;
        if (prepared) metadata = prepared.manifest.volume_metadata;
        const url = prepared?.atlas || atlasUrl;
        if (!metadata || !url) throw new Error("No hay un volumen con metadata física disponible.");
        texture = await loadScalarTexture(url, abort.signal, false, prepared?.headers);
        const cols = Math.ceil(Math.sqrt(metadata.num_slices));
        const rows = Math.ceil(metadata.num_slices / cols);
        const tileWidth = texture.image.width / cols, tileHeight = texture.image.height / rows;
        if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight)) {
          throw new Error("Las dimensiones del atlas no coinciden con el número de cortes.");
        }
        const geometry = getVolumeGeometry(metadata, tileWidth, tileHeight);
        const lobeUrl = prepared?.lobes || lobeAtlasUrl;
        const heatUrl = hideAi ? undefined : prepared?.heatmap || heatmapAtlasUrl;
        if (lobeUrl) {
          lobeTexture = await loadScalarTexture(lobeUrl, abort.signal, true, prepared?.headers);
          if (lobeTexture.image.width !== texture.image.width || lobeTexture.image.height !== texture.image.height) {
            throw new Error("La máscara lobar no tiene las dimensiones del atlas anatómico.");
          }
        }
        if (heatUrl) {
          heatTexture = await loadScalarTexture(heatUrl, abort.signal, false, prepared?.headers);
          if (heatTexture.image.width !== texture.image.width || heatTexture.image.height !== texture.image.height) {
            throw new Error("El mapa de calor no comparte la rejilla del volumen.");
          }
        }
        if (!abort.signal.aborted) setResource({ texture, lobeTexture, heatTexture, metadata, tileWidth, tileHeight, geometry, manifest: prepared?.manifest });
      } catch (error) {
        texture?.dispose(); lobeTexture?.dispose(); heatTexture?.dispose();
        if (!abort.signal.aborted) setLoadError(error instanceof Error ? error.message : "No se pudo cargar el volumen.");
      }
    };
    void load();
    return () => { abort.abort(); texture?.dispose(); lobeTexture?.dispose(); heatTexture?.dispose(); };
  }, [uploadId, manifestUrl, atlasUrl, volumeMetadata, lobeAtlasUrl, heatmapAtlasUrl, hideAi, retry]);

  useEffect(() => {
    if (!resource || !containerRef.current) return;
    const container = containerRef.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      const notification = requestAnimationFrame(() => setRenderError("WebGL 2 no está disponible en este navegador o dispositivo."));
      return () => cancelAnimationFrame(notification);
    }
    if (Math.max(resource.texture.image.width, resource.texture.image.height) > renderer.capabilities.maxTextureSize) {
      const notification = requestAnimationFrame(() => setRenderError("El atlas excede el tamaño de textura admitido por esta GPU."));
      renderer.dispose(); return () => cancelAnimationFrame(notification);
    }
    let disposed = false;
    renderer.debug.onShaderError = () => { setRenderError("No se pudo compilar el renderizado volumétrico en esta GPU."); };
    renderer.setClearColor(0x020610, 1);
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    renderer.setPixelRatio(pixelRatio);
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 20);
    camera.position.set(0, 0, 1.45);
    cameraRef.current = camera;
    const count = resource.metadata.num_slices, cols = Math.ceil(Math.sqrt(count));
    const material = new THREE.ShaderMaterial({
      vertexShader: VOLUME_VERTEX_SHADER, fragmentShader: VOLUME_FRAGMENT_SHADER,
      side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false,
      uniforms: {
        uCameraLocal: { value: new THREE.Vector3() },
        uAtlas: { value: resource.texture }, uLobeAtlas: { value: resource.lobeTexture || resource.texture },
        uHeatAtlas: { value: resource.heatTexture || resource.texture },
        uHasLobeMask: { value: !!resource.lobeTexture },
        uHeatmapEnabled: { value: false }, uHeatmapOpacity: { value: 0.7 }, uHeatmapThreshold: { value: 0.6 },
        uNumSlices: { value: count }, uGrid: { value: new THREE.Vector2(cols, Math.ceil(count / cols)) },
        uTileSize: { value: new THREE.Vector2(resource.tileWidth, resource.tileHeight) },
        uVolumeScale: { value: new THREE.Vector3(...resource.geometry.scale) },
        uVoxelStep: { value: new THREE.Vector3(...resource.geometry.voxelStep) },
        uSteps: { value: 192 }, uDensityScale: { value: 0.9 },
        uClipPlanes: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        uExcursion: { value: 0 }, uLobeMode: { value: false }, uHasNodule: { value: false },
        uNodulePos: { value: new THREE.Vector3() }, uNoduleRadius: { value: 0 },
        uCerise: { value: new THREE.Color("#D4004F") },
      },
    });
    materialRef.current = material;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(...resource.geometry.scale);
    scene.add(mesh);
    const resize = new ResizeObserver(() => {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    });
    resize.observe(container);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * 0.0015, 0.9, 4);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    const lost = (event: Event) => {
      event.preventDefault(); setRenderError("Se perdió el contexto WebGL. Reintente cargar el volumen.");
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    let frame = 0, frames = 0, measuredAt = performance.now(), phase = 0, previousTime = measuredAt;
    const animate = (time: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      mesh.rotation.set(rotation.current.x, rotation.current.y, 0); mesh.updateMatrixWorld();
      material.uniforms.uCameraLocal.value.copy(camera.position);
      mesh.worldToLocal(material.uniforms.uCameraLocal.value);
      if (breathingRef.current) phase += Math.min(time - previousTime, 50) * 0.0018;
      previousTime = time;
      material.uniforms.uExcursion.value = breathingRef.current ? Math.sin(phase) * 0.012 : 0;
      renderer.render(scene, camera);
      frames++;
      if (time - measuredAt >= 1500) {
        const measuredFps = frames * 1000 / (time - measuredAt);
        setFps(Math.round(measuredFps));
        // Reduce fill rate under sustained load while retaining axial detail.
        const nextRatio = measuredFps < 52 ? Math.max(0.5, pixelRatio * 0.85) :
          measuredFps > 59 ? Math.min(Math.min(window.devicePixelRatio || 1, 1.25), pixelRatio * 1.05) : pixelRatio;
        if (Math.abs(nextRatio - pixelRatio) > 0.01) { pixelRatio = nextRatio; renderer.setPixelRatio(pixelRatio); }
        frames = 0; measuredAt = time;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect();
      container.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.remove(); renderer.dispose(); material.dispose(); box.dispose();
      materialRef.current = null; cameraRef.current = null;
    };
  }, [resource]);

  useEffect(() => {
    breathingRef.current = breathing;
    const material = materialRef.current;
    if (!material || !resource) return;
    material.uniforms.uClipPlanes.value.set(...clip);
    material.uniforms.uDensityScale.value = density;
    material.uniforms.uLobeMode.value = viewMode === "lobes" && !!resource.lobeTexture;
    material.uniforms.uHeatmapEnabled.value = viewMode === "heatmap" && !!resource.heatTexture;
    material.uniforms.uHeatmapOpacity.value = heatOpacity;
    material.uniforms.uHeatmapThreshold.value = heatThreshold;
    material.uniforms.uHasNodule.value = false;
    if (noduleCoords) {
      try {
        material.uniforms.uNodulePos.value.set(...normalizeNodule(noduleCoords, resource.metadata));
        material.uniforms.uNoduleRadius.value = noduleRadiusMm / Math.max(...resource.geometry.dimensionsMm);
        material.uniforms.uHasNodule.value = Number.isFinite(noduleRadiusMm) && noduleRadiusMm > 0;
      } catch { material.uniforms.uHasNodule.value = false; }
    }
  }, [resource, clip, density, viewMode, heatOpacity, heatThreshold, breathing, noduleCoords, noduleRadiusMm]);

  const error = loadError || renderError;
  const heatActive = viewMode === "heatmap" && !!resource?.heatTexture;
  const selectedMode = viewMode === "heatmap" && !resource?.heatTexture ? "anatomy" : viewMode;
  const resetView = () => {
    rotation.current = { x: 0.05, y: 0.15 };
    if (cameraRef.current) cameraRef.current.position.z = 1.45;
    setClip([0.5, 0.5, 0.5]);
  };
  const exitFullscreen = () => {
    setIsFullscreen(false);
    fullscreenButtonRef.current?.focus();
  };
  return (
    <div ref={viewerRef}
      onKeyDown={(e) => { if (isFullscreen && e.key === "Escape") { e.preventDefault(); exitFullscreen(); } }}
      className={`${isFullscreen ? "fixed inset-0 z-50" : "relative rounded-2xl"} flex flex-col overflow-hidden border border-slate-800 bg-[#020610] text-slate-200`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><Layers className="h-4 w-4" aria-hidden="true" />Reconstrucción volumétrica 3D{resource ? ` · ${resource.metadata.num_slices} cortes` : ""}</h4>
          <p className="mt-1 text-xs text-slate-400">{resource?.lobeTexture ? "Pulmones aislados · Segmentación MONAI" : "Ventana pulmonar −600 / 1500 HU"}{resource?.heatTexture ? " · HiResCAM por corte" : " · Iluminación por gradiente"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5" role="group" aria-label="Visualización del volumen">
            {([{ value: "anatomy", label: "Anatomía", available: !!resource },
               { value: "lobes", label: "5 lóbulos", available: !!resource?.lobeTexture },
               { value: "heatmap", label: "Mapa de calor", available: !!resource?.heatTexture }] as const)
              .filter((mode) => !(hideAi && mode.value === "heatmap")).map((mode) => (
              <button key={mode.value} type="button" aria-pressed={selectedMode === mode.value} disabled={!mode.available}
                onClick={() => setViewMode(mode.value)}
                className={`${TOOLBAR_BUTTON_FOCUS} rounded-md px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:text-slate-500 ${selectedMode === mode.value ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`}>{mode.label}</button>
            ))}
          </div>
          <button type="button" aria-pressed={breathing} onClick={() => setBreathing(!breathing)} disabled={reducedMotion}
            title={reducedMotion ? "Desactivado por la preferencia de movimiento reducido" : undefined}
            className={`${TOOLBAR_BUTTON_FOCUS} disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-1.5 rounded-md border px-3 py-1.5 ${breathing ? "border-sky-500 text-sky-300" : "border-slate-600 hover:bg-slate-800"}`}><Activity className="h-3.5 w-3.5" aria-hidden="true" />Simular respiración</button>
          <button type="button" onClick={resetView} aria-label="Restablecer vista" className={`${TOOLBAR_BUTTON_FOCUS} rounded-md border border-slate-600 p-1.5 hover:bg-slate-800`}><RefreshCw className="h-4 w-4" aria-hidden="true" /></button>
          <button ref={fullscreenButtonRef} type="button" onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className={`${TOOLBAR_BUTTON_FOCUS} rounded-md border border-slate-600 p-1.5 hover:bg-slate-800`}>{isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}</button>
        </div>
      </div>
      <div className={`relative ${isFullscreen ? "min-h-0 flex-1" : "h-[420px] sm:h-[480px]"}`}>
        <div ref={containerRef} role="application" tabIndex={0}
          aria-label="Volumen torácico 3D; arrastre o use las flechas para rotar, + y − para ampliar, 0 para restablecer"
          onKeyDown={(e) => {
            const action = volumeKeyActionFromEvent(e);
            if (!action) return;
            e.preventDefault();
            if (action.type === "rotate") {
              rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + action.dx, -1.4, 1.4);
              rotation.current.y += action.dy;
            } else if (action.type === "zoom") {
              const camera = cameraRef.current;
              if (camera) camera.position.z = THREE.MathUtils.clamp(camera.position.z + action.delta, 0.9, 4);
            } else resetView();
          }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            rotation.current.y += (e.clientX - drag.current.x) * 0.008;
            rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + (e.clientY - drag.current.y) * 0.008, -1.4, 1.4);
            drag.current = { x: e.clientX, y: e.clientY };
          }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          className="h-full w-full touch-none cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 active:cursor-grabbing" />
        {(!resource || error) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020610] p-6 text-center text-sm" role={error ? "alert" : "status"}>
          <p>{error || preparation.message}</p>
          {!error && <div className="h-1 w-64 max-w-full overflow-hidden rounded bg-slate-800" role="progressbar" aria-label="Preparación del volumen" aria-valuenow={Math.round(preparation.progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(3, preparation.progress * 100)}%` }} /></div>}
          {error && <button type="button" onClick={() => { setResource(null); setLoadError(null); setRenderError(null); setFps(null); setPreparation({ message: "Reintentando preparación local…", progress: 0 }); setRetry((value) => value + 1); }} className="rounded-md border border-slate-500 px-3 py-1.5 hover:bg-slate-800">Reintentar</button>}
        </div>}
      </div>
      {heatActive && <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/10 px-3 py-2.5 text-xs">
        <label className="flex items-center gap-2">Intensidad del calor<input aria-label="Intensidad del mapa de calor" type="range" min="0" max="1" step="0.05" value={heatOpacity} onChange={(e) => setHeatOpacity(Number(e.target.value))} className="w-24 accent-sky-400" /></label>
        <label className="flex items-center gap-2">Umbral<input aria-label="Umbral del mapa de calor" type="range" min="0.05" max="0.9" step="0.05" value={heatThreshold} onChange={(e) => setHeatThreshold(Number(e.target.value))} className="w-24 accent-sky-400" /><span className="w-7 font-mono text-slate-400">{heatThreshold.toFixed(2)}</span></label>
        <div className="ml-auto flex items-center gap-2 text-slate-300"><span>Baja</span><span className="h-1.5 w-20 rounded bg-gradient-to-r from-amber-400 to-[#D4004F]" /><span>Alta contribución</span></div>
        {resource?.manifest?.peak_activation && <button type="button" className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
          onClick={() => {
            const peak = resource.manifest?.peak_activation;
            if (peak) setClip([0.5, Math.min(0.5, (peak.z + 1) / resource.metadata.num_slices - 0.5), 0.5]);
          }}>Ver pico · corte {resource.manifest.peak_activation.z + 1}</button>}
      </div>}
      {selectedMode === "lobes" && resource?.lobeTexture && <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 px-3 py-2 text-xs text-slate-300">
        {[{ label: "LSD", color: "#3887e1" }, { label: "LMD", color: "#28c364" }, { label: "LID", color: "#f0a626" }, { label: "LSI", color: "#50c6d3" }, { label: "LII", color: "#9460d6" }].map((lobe) => <span key={lobe.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: lobe.color }} />{lobe.label}</span>)}
      </div>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/10 p-3 text-xs">
        {([{ label: "Axial", axis: 1 }, { label: "Sagital", axis: 0 }, { label: "Coronal", axis: 2 }] as const).map(({ label, axis }) => (
          <label key={label} className="flex items-center gap-2">{label}<input aria-label={`Corte ${label.toLowerCase()}`} type="range" min="-0.5" max="0.5" step="0.005" value={clip[axis]} disabled={!resource || !!error}
            onChange={(e) => setClip((previous) => { const next = [...previous] as typeof clip; next[axis] = Number(e.target.value); return next; })} className="w-20 accent-sky-400 sm:w-24" /></label>
        ))}
        <label className="flex items-center gap-2">Opacidad<input aria-label="Opacidad del parénquima" type="range" min="0.2" max="3" step="0.1" value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-20 accent-sky-400" /></label>
        <span className="ml-auto font-mono text-slate-400">{fps === null ? "WebGL 2" : `${fps} FPS`}</span>
      </div>
      <p className="px-3 pb-3 text-xs text-slate-400">{heatActive ? "HiResCAM muestra contribución al clasificador por corte; no es una segmentación tumoral." : resource?.lobeTexture ? "Máscara lobar alineada con la TC." : "Sin máscara lobar disponible."} {breathing && "Movimiento respiratorio ilustrativo. "}{noduleCoords && "Localización focal suministrada."}</p>
    </div>
  );
}
