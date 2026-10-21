"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AI_AGREEMENT_OPTIONS,
  FINDING_TYPE_OPTIONS,
  MARKER_NOTE_MAX,
  MARKER_SIZE_MAX_MM,
  type AiAgreement,
  type FindingType,
  type Marker,
  type MarkerPatch,
} from "./markerState";

const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary viewer-full:border-slate-600 viewer-full:bg-slate-800 viewer-full:text-slate-100 viewer-full:focus-visible:border-sky-300 viewer-full:focus-visible:ring-sky-300";
const LABEL = "mb-1 block text-xs font-medium text-slate-700 viewer-full:text-slate-300";

/**
 * Formulario de un marcador. Los cambios se aplican al instante: en la Fase B
 * no hay persistencia, así que no hay botón de guardar. La nota es PHI.
 */
export function MarkerEditor({
  marker,
  onChange,
  onClose,
}: {
  marker: Marker;
  onChange: (patch: MarkerPatch) => void;
  onClose: () => void;
}) {
  const id = useId();
  const firstRef = useRef<HTMLSelectElement>(null);
  const [sizeDraft, setSizeDraft] = useState(marker.sizeMm == null ? "" : String(marker.sizeMm));

  // Al abrirse, el foco va al primer campo.
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label htmlFor={`${id}-tipo`} className={LABEL}>
          Tipo de hallazgo
        </label>
        <select
          ref={firstRef}
          id={`${id}-tipo`}
          value={marker.findingType ?? ""}
          onChange={(e) => onChange({ findingType: (e.target.value || null) as FindingType | null })}
          className={FIELD}
        >
          <option value="">Sin indicar</option>
          {FINDING_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-ia`} className={LABEL}>
          Opinión frente a la IA
        </label>
        <select
          id={`${id}-ia`}
          value={marker.aiAgreement ?? ""}
          onChange={(e) => onChange({ aiAgreement: (e.target.value || null) as AiAgreement | null })}
          className={FIELD}
        >
          <option value="">Sin indicar</option>
          {AI_AGREEMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-nota`} className={LABEL}>
          Nota
        </label>
        <textarea
          id={`${id}-nota`}
          value={marker.note}
          maxLength={MARKER_NOTE_MAX}
          rows={3}
          aria-describedby={`${id}-contador`}
          onChange={(e) => onChange({ note: e.target.value })}
          className={`${FIELD} resize-y`}
        />
        <p id={`${id}-contador`} className="mt-1 text-right text-xs tabular-nums text-slate-500 viewer-full:text-slate-400">
          {marker.note.length}/{MARKER_NOTE_MAX}
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-mm`} className={LABEL}>
          Tamaño estimado (mm, opcional)
        </label>
        <input
          id={`${id}-mm`}
          type="number"
          inputMode="decimal"
          min="0.1"
          max={MARKER_SIZE_MAX_MM}
          step="0.1"
          value={sizeDraft}
          onChange={(e) => {
            // Borrador local: escribir «0.5» pasa por «0», que el estado descarta.
            setSizeDraft(e.target.value);
            onChange({ sizeMm: e.target.value === "" ? null : Number(e.target.value) });
          }}
          className={FIELD}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer viewer-full:bg-sky-300 viewer-full:text-slate-950 viewer-full:hover:bg-sky-200 viewer-full:focus-visible:outline-sky-300"
      >
        Listo
      </button>
    </div>
  );
}
