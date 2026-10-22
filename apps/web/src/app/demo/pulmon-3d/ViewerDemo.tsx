"use client";

import dynamic from "next/dynamic";

const VolumeViewer3D = dynamic(() => import("@/components/dicom/VolumeViewer3D"), {
  ssr: false,
  loading: () => <div className="flex min-h-[520px] items-center justify-center rounded-xl bg-slate-950 text-sm text-slate-300" role="status">Cargando visor volumétrico…</div>,
});

export function ViewerDemo() {
  return <VolumeViewer3D manifestUrl="/demo/lung-ct/manifest.json" />;
}
