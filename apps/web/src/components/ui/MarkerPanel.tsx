"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crosshair, Pencil, Trash2 } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import { CONCORDANCIA_OPTIONS, CONDUCTA_OPTIONS, LUNG_RADS_OPTIONS } from "@/lib/uploadReview";
import { MarkerEditor } from "./MarkerEditor";
import { findingLabel, type Marker, type MarkerAction } from "./markerState";
import { formatMm } from "./measureMath";
import { DARK_PANEL } from "./ViewerToolbar";
import type { ViewerSummary } from "./BeforeAfterViewer";
import type { SaveStatus } from "./useMarkerAutosave";

const H2 = "text-sm font-semibold uppercase tracking-wider text-slate-500 viewer-full:text-slate-400";
const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:text-slate-300 viewer-full:hover:bg-slate-700 viewer-full:hover:text-white viewer-full:focus-visible:outline-sky-300";
const NOTE_PREVIEW_CHARS = 40;

const SAVE_STATUS_TEXT: Record<Exclude<SaveStatus, "error">, string> = {
  idle: "Los marcadores se guardan automáticamente.",
  saving: "Guardando…",
  saved: "Guardado.",
};

function optionLabel(options: ReadonlyArray<{ value: string; label: string }>, value: string | null): string {
  return options.find((o) => o.value === value)?.label ?? "Sin indicar";
}

/**
 * Panel lateral del caso, como la lista de Lunit: resultado IA, marcadores
 * (con su nota editable) y valoración resumida. Se renderiza dentro del visor
 * para que también se vea en pantalla completa.
 */
export function MarkerPanel({
  summary,
  markers,
  selectedId,
  dispatch,
  onCenter,
  onGoToReview,
  onAnnounce,
  isFullscreen,
  sheetOpen,
  onSheetOpenChange,
  saveState,
}: {
  /** Ausente = sin persistencia (el visor se usa sin estudio guardado). */
  saveState?: { status: SaveStatus; loadFailed: boolean; onRetry: () => void };
  isFullscreen: boolean;
  /** Hoja inferior abierta (pantalla completa por debajo de lg). */
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  summary?: ViewerSummary;
  markers: Marker[];
  selectedId: string | null;
  dispatch: (a: MarkerAction) => void;
  onCenter: (m: Marker) => void;
  onGoToReview: () => void;
  onAnnounce: (msg: string) => void;
}) {
  const uid = useId();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const contentId = `${uid}-contenido`;
  const count = markers.length;
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Al pedir confirmación, el foco va a «Cancelar» (la opción segura).
  useEffect(() => {
    if (confirmId) cancelRef.current?.focus();
  }, [confirmId]);

  const deleteButtonId = (id: string) => `${uid}-borrar-${id}`;

  const confirmDelete = (m: Marker) => {
    setConfirmId(null);
    dispatch({ type: "remove", id: m.id });
    onAnnounce(`Marcador ${m.seq} borrado`);
    listHeadingRef.current?.focus();
  };

  const cancelDelete = (m: Marker) => {
    setConfirmId(null);
    document.getElementById(deleteButtonId(m.id))?.focus();
  };

  return (
    <aside
      aria-label="Panel del caso"
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 max-lg:viewer-full:p-3 max-lg:viewer-full:shadow-2xl ${DARK_PANEL}`}
    >
      {/* Solo en pantalla completa y por debajo de lg: el panel pasa a hoja inferior plegable. */}
      {isFullscreen && (
        <button
          type="button"
          aria-expanded={sheetOpen}
          aria-controls={contentId}
          onClick={() => onSheetOpenChange(!sheetOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-md text-sm font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 cursor-pointer lg:hidden"
        >
          {`Panel del caso · ${count} ${count === 1 ? "marcador" : "marcadores"}`}
          {sheetOpen ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      )}

      <div
        id={contentId}
        className={`space-y-5 max-lg:viewer-full:mt-3 max-lg:viewer-full:max-h-[50dvh] max-lg:viewer-full:overflow-y-auto ${
          isFullscreen && !sheetOpen ? "max-lg:hidden" : ""
        }`}
      >
      {/* Solo en pantalla completa: fuera de ella el resultado IA ya está en la
          página, justo arriba del visor, y repetirlo es ruido. */}
      {summary && isFullscreen && (
        <section className="space-y-2">
          <h2 className={H2}>Resultado IA</h2>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-slate-800 viewer-full:text-slate-100">
              {summary.score != null ? `${(summary.score * 100).toFixed(1)}%` : "N/D"}
            </span>
            <RiskBadge level={summary.riskLevel} />
          </div>
          <p className="text-xs text-slate-500 viewer-full:text-slate-400">
            Probabilidad estimada por el modelo, no severidad.
          </p>
          {/* En pantalla completa el aviso de la página queda tapado: el panel lo repite. */}
          <p className="text-xs font-medium text-slate-600 viewer-full:text-slate-300">
            Apoyo diagnóstico: no reemplaza el criterio del especialista.
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 ref={listHeadingRef} tabIndex={-1} className={`${H2} outline-none`}>
          Marcadores ({markers.length})
        </h2>
        {/* Estado del guardado. aria-live sin role="status": el visor ya tiene uno. */}
        <p aria-live="polite" className="text-xs text-slate-500 viewer-full:text-slate-400">
          {!saveState ? (
            "Los marcadores todavía no se guardan: se pierden al recargar la página."
          ) : saveState.loadFailed ? (
            "No se pudieron cargar los marcadores guardados. Para no sobrescribirlos, los cambios de esta sesión no se guardarán; recarga la página para intentarlo de nuevo."
          ) : saveState.status === "error" ? (
            <>
              No se pudieron guardar los últimos cambios.{" "}
              <button
                type="button"
                onClick={saveState.onRetry}
                className="font-semibold text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:text-sky-200 viewer-full:focus-visible:outline-sky-300"
              >
                Reintentar
              </button>
            </>
          ) : (
            SAVE_STATUS_TEXT[saveState.status]
          )}
        </p>
        {markers.length === 0 ? (
          <p className="text-sm text-slate-600 viewer-full:text-slate-300">
            Elige la herramienta Marcador (M) y haz clic sobre la imagen.
          </p>
        ) : (
          <ul className="space-y-2">
            {markers.map((m) => {
              const note = m.note.trim();
              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 viewer-full:border-slate-700 viewer-full:bg-slate-800"
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-white viewer-full:bg-sky-300 viewer-full:text-slate-950"
                    >
                      {m.seq}
                    </span>
                    <div className="min-w-0 flex-1">
                      {m.kind === "measure" && m.sizeMm != null ? (
                        <p className="text-sm font-semibold tabular-nums text-slate-800 viewer-full:text-slate-100">
                          Medición<span className="sr-only"> {m.seq}</span>: {formatMm(m.sizeMm)}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 viewer-full:text-slate-100">
                          <span className="sr-only">Marcador {m.seq}: </span>
                          {findingLabel(m.findingType)}
                          {m.sizeMm != null && ` · ${m.sizeMm} mm`}
                        </p>
                      )}
                      {note && (
                        <p className="truncate text-xs text-slate-500 viewer-full:text-slate-400">
                          {note.length > NOTE_PREVIEW_CHARS ? `${note.slice(0, NOTE_PREVIEW_CHARS)}…` : note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        aria-label={`Centrar marcador ${m.seq}`}
                        title={`Centrar marcador ${m.seq}`}
                        onClick={() => onCenter(m)}
                        className={ICON_BTN}
                      >
                        <Crosshair className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar marcador ${m.seq}`}
                        title={`Editar marcador ${m.seq}`}
                        aria-expanded={selectedId === m.id}
                        onClick={() => dispatch({ type: "select", id: m.id })}
                        className={ICON_BTN}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        id={deleteButtonId(m.id)}
                        aria-label={`Borrar marcador ${m.seq}`}
                        title={`Borrar marcador ${m.seq}`}
                        onClick={() => setConfirmId(m.id)}
                        className={ICON_BTN}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Grupo con la pregunta como nombre: al llegar el foco a «Cancelar»
                      el lector de pantalla anuncia también qué se está confirmando.
                      El editor no se desmonta mientras tanto (si se remontara, su foco
                      inicial le quitaría el foco al botón de borrar al cancelar). */}
                  {confirmId === m.id && (
                    <div
                      role="group"
                      aria-labelledby={`${uid}-confirmar-${m.id}`}
                      className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700 viewer-full:text-slate-200"
                    >
                      <span id={`${uid}-confirmar-${m.id}`}>¿Borrar el marcador {m.seq}?</span>
                      <button
                        type="button"
                        onClick={() => confirmDelete(m)}
                        className="rounded-md bg-slate-700 px-2.5 py-1 font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:bg-slate-200 viewer-full:text-slate-900 viewer-full:hover:bg-white viewer-full:focus-visible:outline-sky-300"
                      >
                        Borrar
                      </button>
                      <button
                        ref={cancelRef}
                        type="button"
                        onClick={() => cancelDelete(m)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:border-slate-400 viewer-full:text-slate-200 viewer-full:hover:bg-slate-700 viewer-full:focus-visible:outline-sky-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  {selectedId === m.id && (
                    <MarkerEditor
                      key={m.id}
                      marker={m}
                      onChange={(patch) => dispatch({ type: "update", id: m.id, patch })}
                      onClose={() => dispatch({ type: "select", id: null })}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {markers.some((m) => m.kind === "measure") && (
          <p className="text-xs text-slate-500 viewer-full:text-slate-400">
            Medición sobre el corte mostrado; no reemplaza la medición en la estación de trabajo.
          </p>
        )}
      </section>

      {summary && (
        <section className="space-y-2">
          <h2 className={H2}>Valoración</h2>
          {summary.review ? (
            <dl className="space-y-1 text-sm text-slate-700 viewer-full:text-slate-200">
              <div>
                <dt className="inline font-medium">Concordancia: </dt>
                <dd className="inline">{optionLabel(CONCORDANCIA_OPTIONS, summary.review.concordancia)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Lung-RADS: </dt>
                <dd className="inline">{optionLabel(LUNG_RADS_OPTIONS, summary.review.lung_rads)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Conducta: </dt>
                <dd className="inline">{optionLabel(CONDUCTA_OPTIONS, summary.review.conducta)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600 viewer-full:text-slate-300">Sin valoración registrada.</p>
          )}
          <button
            type="button"
            onClick={onGoToReview}
            className="text-xs font-semibold text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:text-sky-200 viewer-full:hover:text-sky-100 viewer-full:focus-visible:outline-sky-300"
          >
            Ir al formulario completo
          </button>
        </section>
      )}
      </div>
    </aside>
  );
}
