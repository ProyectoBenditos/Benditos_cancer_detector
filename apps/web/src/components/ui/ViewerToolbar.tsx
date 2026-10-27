"use client";

import { useId, useRef } from "react";
import {
  Columns2,
  Download,
  Eye,
  EyeOff,
  Hand,
  Keyboard,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  Ruler,
  Split,
  SunMedium,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { nextRadioIndex } from "./viewerKeys";
import type { ViewerTool } from "./viewerTools";

export type ViewMode = "curtain" | "side" | "overlay";

// Controles en reposo dentro de la pantalla completa oscura. brand-primary no
// tiene contraste sobre fondo oscuro, por eso los acentos usan sky.
export const DARK_CONTROL =
  "viewer-full:border-slate-700 viewer-full:bg-slate-800 viewer-full:text-slate-200 viewer-full:hover:bg-slate-700 viewer-full:hover:text-white";
export const DARK_PANEL = "viewer-full:border-slate-700 viewer-full:bg-slate-900 viewer-full:text-slate-300";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary viewer-full:focus-visible:outline-sky-300";

export const TOOL_LABELS: Record<ViewerTool, string> = {
  pan: "Mover",
  adjust: "Brillo/Contraste",
  marker: "Marcador",
  measure: "Medir",
};

export const MEASURE_UNAVAILABLE = "No disponible: este estudio no trae calibración en mm (PixelSpacing).";

export function ToolbarButton({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${FOCUS_RING} cursor-pointer ${
        active
          ? "border-brand-primary bg-brand-primary/10 text-brand-primary viewer-full:border-sky-300 viewer-full:bg-sky-300/15 viewer-full:text-sky-200"
          : `border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-brand-primary ${DARK_CONTROL}`
      }`}
    >
      {children}
    </button>
  );
}

type RadioOption<T extends string> = {
  value: T;
  icon: LucideIcon;
  /** Texto visible (variante "segment") o nombre accesible (variante "icon"). */
  label: string;
  disabled?: boolean;
  description?: string;
};

/**
 * Grupo de radios con tabindex móvil (patrón ARIA de radio): Tab entra en el
 * marcado y las flechas, Home y End cambian la selección. Las flechas no se
 * propagan al visor, que si no las usaría para desplazar la imagen.
 */
function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  variant,
}: {
  label: string;
  options: ReadonlyArray<RadioOption<T>>;
  value: T;
  onChange: (v: T) => void;
  variant: "segment" | "icon";
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const descId = useId();
  const disabled = options.map((o) => o.disabled === true);
  const checkedIndex = options.findIndex((o) => o.value === value);
  const tabbableIndex = checkedIndex >= 0 ? checkedIndex : disabled.indexOf(false);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextRadioIndex(e.key, index, disabled);
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${variant === "segment" ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex"} gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 ${DARK_PANEL}`}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        const Icon = o.icon;
        const base = `${FOCUS_RING} cursor-pointer transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-50`;
        const state = checked
          ? "bg-brand-primary text-white shadow-sm viewer-full:bg-sky-300 viewer-full:text-slate-950"
          : "text-slate-600 hover:text-brand-primary viewer-full:text-slate-300 viewer-full:hover:text-white";
        const shape =
          variant === "segment"
            ? "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold sm:flex-none sm:px-3"
            : "flex h-7 w-7 items-center justify-center rounded-md";
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={o.disabled || undefined}
            aria-label={variant === "icon" ? o.label : undefined}
            aria-describedby={o.description ? `${descId}-${i}` : undefined}
            title={o.description ? `${o.label}. ${o.description}` : variant === "icon" ? o.label : undefined}
            tabIndex={i === tabbableIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`${base} ${state} ${shape}`}
          >
            {/* En móvil los modos van sin icono para que quepan en una línea. */}
            <Icon className={variant === "segment" ? "hidden h-3.5 w-3.5 sm:block" : "h-4 w-4"} aria-hidden="true" />
            {variant === "segment" && o.label}
            {o.description && (
              <span id={`${descId}-${i}`} className="sr-only">
                {o.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const MODE_OPTIONS: ReadonlyArray<RadioOption<ViewMode>> = [
  { value: "curtain", icon: Split, label: "Cortina" },
  { value: "side", icon: Columns2, label: "Lado a lado" },
  { value: "overlay", icon: Layers, label: "Superpuesto" },
];

const BASE_TOOL_OPTIONS: ReadonlyArray<RadioOption<ViewerTool>> = [
  { value: "pan", icon: Hand, label: "Mover (H)" },
  { value: "adjust", icon: SunMedium, label: "Brillo/Contraste (A)" },
  { value: "marker", icon: MapPin, label: "Marcador (M)" },
];
const TOOL_OPTIONS_WITH_MEASURE: ReadonlyArray<RadioOption<ViewerTool>> = [
  ...BASE_TOOL_OPTIONS,
  { value: "measure", icon: Ruler, label: "Medir (L)" },
];
const TOOL_OPTIONS_WITHOUT_MEASURE: ReadonlyArray<RadioOption<ViewerTool>> = [
  ...BASE_TOOL_OPTIONS,
  { value: "measure", icon: Ruler, label: "Medir (L)", disabled: true, description: MEASURE_UNAVAILABLE },
];

export type ViewerToolbarProps = {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  tool: ViewerTool;
  onToolChange: (t: ViewerTool) => void;
  /** Solo con calibración real en mm (PixelSpacing y la imagen a su tamaño original). */
  measureAvailable: boolean;
  showAi: boolean;
  onToggleAi: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExport: () => void;
  onHelp: () => void;
};

export function ViewerToolbar({
  mode,
  onModeChange,
  tool,
  onToolChange,
  measureAvailable,
  showAi,
  onToggleAi,
  isFullscreen,
  onToggleFullscreen,
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
  onHelp,
}: ViewerToolbarProps) {
  const toolOptions = measureAvailable ? TOOL_OPTIONS_WITH_MEASURE : TOOL_OPTIONS_WITHOUT_MEASURE;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <RadioGroup
          label="Modo de visualización"
          options={MODE_OPTIONS}
          value={mode}
          onChange={onModeChange}
          variant="segment"
        />
        <RadioGroup label="Herramienta" options={toolOptions} value={tool} onChange={onToolChange} variant="icon" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton onClick={onZoomIn} label="Acercar (+)">
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton onClick={onZoomOut} label="Alejar (-)">
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton onClick={onReset} label="Restablecer vista (0)">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>

        {/* Parpadeo (con Espacio) */}
        <button
          type="button"
          onClick={onToggleAi}
          title={showAi ? "Parpadeo: Ocultar IA (Barra Espaciadora)" : "Parpadeo: Mostrar IA (Barra Espaciadora)"}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors cursor-pointer ${FOCUS_RING} ${
            !showAi
              ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
              : `border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-primary ${DARK_CONTROL}`
          }`}
        >
          {!showAi ? (
            <>
              <EyeOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span>TAC Pura</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-brand-primary viewer-full:text-sky-200" aria-hidden="true" />
              <span>Parpadeo</span>
            </>
          )}
        </button>

        <ToolbarButton onClick={onExport} label="Descargar imagen">
          <Download className="h-4 w-4 text-emerald-600 viewer-full:text-emerald-400" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton onClick={onHelp} label="Atajos de teclado (?)">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          onClick={onToggleFullscreen}
          label={isFullscreen ? "Salir de pantalla completa (F)" : "Pantalla completa (F)"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
        </ToolbarButton>
      </div>
    </div>
  );
}
