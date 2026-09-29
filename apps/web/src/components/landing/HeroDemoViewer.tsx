"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Split,
  Columns2,
  Sparkles,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";

type ViewerMode = "curtain" | "parpadeo" | "side";

export function HeroDemoViewer() {
  const [mode, setMode] = useState<ViewerMode>("curtain");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [showAiInParpadeo, setShowAiInParpadeo] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pointerIsDown = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escucha de la tecla Espacio: alterna la capa en modo Parpadeo a demanda del usuario
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (mode !== "parpadeo") {
          setMode("parpadeo");
        }
        setShowAiInParpadeo((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  // Manejo de movimiento: al arrastrar, desactiva la transición para fluidez en tiempo real
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerIsDown.current || mode !== "curtain") return;
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    },
    [mode]
  );

  const handlePointerUp = useCallback(() => {
    pointerIsDown.current = false;
    setIsDragging(false);
  }, []);

  // Al hacer clic puntual, isDragging permanece falso para que la barra se mueva con transición suave (soft)
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === "parpadeo") {
      setShowAiInParpadeo((prev) => !prev);
      return;
    }
    if (mode !== "curtain") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
    pointerIsDown.current = true;
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 font-sans select-none">
      
      {/* Barra de herramientas superior: 3 Modos */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Selector de los 3 Modos: Cortina, Parpadeo, Lado a Lado */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode("curtain")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === "curtain"
                ? "bg-white text-brand-primary shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Cortina</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("parpadeo")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === "parpadeo"
                ? "bg-white text-brand-primary shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Parpadeo</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("side")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === "side"
                ? "bg-white text-brand-primary shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Lado a lado</span>
          </button>
        </div>

        {/* Controles de apoyo según el modo activo */}
        <div className="flex items-center gap-2">
          {mode === "curtain" && (
            <button
              type="button"
              onClick={() => {
                setIsDragging(false);
                setSliderPos(50);
              }}
              title="Centrar cortina (50%)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {mode === "parpadeo" && (
            <button
              type="button"
              onClick={() => setShowAiInParpadeo((prev) => !prev)}
              title="Pulsa la tecla Espacio para alternar"
              className={`flex h-8 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                !showAiInParpadeo
                  ? "border-amber-400 bg-amber-50 text-amber-900 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {!showAiInParpadeo ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>TAC Original</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Grad-CAM</span>
                </>
              )}
              <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200">
                Espacio
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas del Visor */}
      <div
        ref={containerRef}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative w-full aspect-square bg-black rounded-xl overflow-hidden border border-slate-200 touch-none ${
          mode === "curtain" ? "cursor-ew-resize" : "cursor-pointer"
        }`}
      >
        {/* 1. MODO CORTINA */}
        {mode === "curtain" && (
          <>
            <div className="absolute inset-0">
              <Image
                src="/images/demo/sample-ct.jpg"
                alt="Tomografía Axial de Tórax original"
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover pointer-events-none"
                priority
              />
              <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/80 text-[10px] font-mono text-slate-300 rounded border border-white/10 pointer-events-none">
                TAC Original
              </span>
            </div>

            {/* Capa Grad-CAM: Animación suave en clic y seguimiento inmediato en arrastre */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDragging ? "transition-none" : "transition-[clip-path] duration-300 ease-out"
              }`}
              style={{
                clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
              }}
            >
              <Image
                src="/images/demo/sample-gradcam-overlay.jpg"
                alt="Detección Grad-CAM superpuesta"
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover pointer-events-none"
                priority
              />
              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-brand-primary/90 text-[10px] font-mono text-white rounded border border-white/20 pointer-events-none">
                Grad-CAM
              </span>
            </div>

            {/* Divisor vertical arrastrable con transición suave (soft) en clic */}
            <div
              className={`absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] pointer-events-none z-10 ${
                isDragging ? "transition-none" : "transition-[left] duration-300 ease-out"
              }`}
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center pointer-events-auto cursor-ew-resize active:scale-95 transition-transform border border-slate-300">
                <Split className="w-3.5 h-3.5 text-slate-700" />
              </div>
            </div>
          </>
        )}

        {/* 2. MODO PARPADEO (Alternado manualmente con Espacio o Clic) */}
        {mode === "parpadeo" && (
          <div className="relative w-full h-full">
            <Image
              src={
                showAiInParpadeo
                  ? "/images/demo/sample-gradcam-overlay.jpg"
                  : "/images/demo/sample-ct.jpg"
              }
              alt={showAiInParpadeo ? "Capa Grad-CAM activa" : "TAC Original pura"}
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-cover pointer-events-none transition-none"
              priority
            />
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 rounded-md text-[10px] font-mono text-slate-200 border border-white/10 pointer-events-none">
              <span
                className={`w-2 h-2 rounded-full ${
                  showAiInParpadeo ? "bg-brand-danger" : "bg-cyan-400"
                }`}
              />
              <span>{showAiInParpadeo ? "Grad-CAM" : "TAC Base"}</span>
            </div>
          </div>
        )}

        {/* 3. MODO LADO A LADO */}
        {mode === "side" && (
          <div className="w-full h-full grid grid-cols-2 gap-1 bg-black p-1">
            <div className="relative w-full h-full rounded overflow-hidden">
              <Image
                src="/images/demo/sample-ct.jpg"
                alt="TAC Original"
                fill
                sizes="(max-width: 768px) 50vw, 280px"
                className="object-cover pointer-events-none"
              />
              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 text-[9px] font-mono text-slate-300 rounded">
                TAC Base
              </span>
            </div>
            <div className="relative w-full h-full rounded overflow-hidden">
              <Image
                src={
                  showAiInParpadeo
                    ? "/images/demo/sample-gradcam-overlay.jpg"
                    : "/images/demo/sample-ct.jpg"
                }
                alt="Grad-CAM"
                fill
                sizes="(max-width: 768px) 50vw, 280px"
                className="object-cover pointer-events-none"
              />
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-brand-primary/90 text-[9px] font-mono text-white rounded">
                {showAiInParpadeo ? "Grad-CAM" : "TAC Base"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Telemetría clínica estructurada sin desbordamientos */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-brand-danger/10 text-brand-danger border-brand-danger/20">
            RIESGO ALTO
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-slate-500 font-mono">Score:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              87.4%
            </span>
          </div>
          <span className="text-slate-300">·</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded font-semibold border border-slate-200">
            Lung-RADS 4B
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Nódulo espiculado 14 mm (Lóbulo Sup. Der.)
        </div>
      </div>
    </div>
  );
}
