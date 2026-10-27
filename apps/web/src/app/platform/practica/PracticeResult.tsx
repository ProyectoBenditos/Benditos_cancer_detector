"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatMm } from "@/components/ui/measureMath";
import type { Marker } from "@/components/ui/markerState";
import { PRACTICE_AI_NOTICE, type PracticeCase } from "@/lib/practiceCases";
import { MATCH_RADIUS_MM, anchorMatches, markerAnchor, practiceSummary } from "@/lib/practiceMath";

/** LIDC-IDRI: cada caso lo leyeron 4 radiólogos. */
const LIDC_READERS = 4;

export function formatScore(score: number): string {
  return `${(score * 100).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function referenceText(index: number, diameterMm: number, readers: number): string {
  return `Nódulo de referencia ${index + 1}: ${formatMm(diameterMm)}, marcado por ${readers} de ${LIDC_READERS} radiólogos`;
}

function markText(m: Marker, match: number | null): string {
  const label =
    m.kind === "measure" && m.sizeMm !== null ? `Marca ${m.seq} (medición de ${formatMm(m.sizeMm)})` : `Marca ${m.seq}`;
  const status =
    match === null ? "no coincide con ningún nódulo de referencia" : `coincide con el nódulo de referencia ${match + 1}`;
  return `${label}: ${status}`;
}

const H3 = "text-sm font-semibold uppercase tracking-wider text-slate-500";

/**
 * Comparación de un caso: el corte con los anillos de referencia (diámetro real)
 * y las marcas del lector, el resumen en texto y el resultado de la IA.
 * El dibujo es solo visual (aria-hidden): las listas de texto son la alternativa.
 */
export function PracticeResult({
  practiceCase,
  caseNumber,
  markers,
}: {
  practiceCase: PracticeCase;
  caseNumber: number;
  markers: Marker[];
}) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const refsTitleId = useId();
  const marksTitleId = useId();
  const { geometry, reference, ai } = practiceCase;
  const { columns, rows } = geometry;
  const colMm = geometry.pixelSpacingMm[1];

  const anchors = markers.map(markerAnchor);
  const byAnchor = anchorMatches(anchors, reference, geometry);
  const found = reference.map((_, r) => byAnchor.includes(r));
  const unmatched = byAnchor.filter((r) => r === null).length;
  const summary = practiceSummary(found, unmatched);

  // Tamaños del dibujo en unidades del viewBox (píxeles de la imagen original).
  const unit = Math.max(columns, rows);
  const pinR = unit * 0.024;
  const ringStroke = unit * 0.005;
  const haloStroke = unit * 0.011;
  const dash = `${unit * 0.012} ${unit * 0.008}`;
  const tickGap = unit * 0.012;
  const tickLen = unit * 0.03;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <figure>
            <div
              className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-black"
              style={{ aspectRatio: `${columns} / ${rows}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={practiceCase.imageUrl}
                alt={`Corte axial de tomografía del caso ${caseNumber}`}
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
              />
              {showHeatmap && (
                // El PNG ya mezcla la TAC con el mapa: se estira a la imagen completa.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={practiceCase.heatmapUrl}
                  alt={`Mapa de calor de la IA sobre el corte completo del caso ${caseNumber}`}
                  draggable={false}
                  className="absolute inset-0 h-full w-full"
                />
              )}
              <svg
                data-testid="practice-overlay"
                aria-hidden="true"
                viewBox={`0 0 ${columns} ${rows}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                {reference.map((ref, i) => {
                  const cx = ref.x * columns;
                  const cy = ref.y * rows;
                  const r = ref.diameterMm / 2 / colMm;
                  const inner = r + tickGap;
                  const outer = inner + tickLen;
                  const ticks = [
                    [cx, cy - inner, cx, cy - outer],
                    [cx, cy + inner, cx, cy + outer],
                    [cx - inner, cy, cx - outer, cy],
                    [cx + inner, cy, cx + outer, cy],
                  ];
                  return (
                    <g key={i} data-testid="reference-ring">
                      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-white/90" strokeWidth={haloStroke} />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        className="stroke-brand-primary"
                        strokeWidth={ringStroke}
                        strokeDasharray={dash}
                      />
                      {ticks.map(([x1, y1, x2, y2], t) => (
                        <g key={t}>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-white/90" strokeWidth={haloStroke} strokeLinecap="round" />
                          <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-brand-primary" strokeWidth={ringStroke} strokeLinecap="round" />
                        </g>
                      ))}
                      {reference.length > 1 && (
                        <text
                          x={cx + outer}
                          y={cy - outer}
                          fontSize={pinR * 1.1}
                          fontWeight={700}
                          className="fill-white stroke-brand-primary"
                          strokeWidth={ringStroke}
                          paintOrder="stroke"
                        >
                          {`R${i + 1}`}
                        </text>
                      )}
                    </g>
                  );
                })}
                {markers.map((m) => {
                  const anchor = markerAnchor(m);
                  const x = anchor.x * columns;
                  const y = anchor.y * rows;
                  const line = m.kind === "measure" && m.x2 !== null && m.y2 !== null;
                  return (
                    <g key={m.id} data-testid="reader-mark">
                      {line && (
                        <>
                          <line
                            x1={m.x * columns}
                            y1={m.y * rows}
                            x2={(m.x2 as number) * columns}
                            y2={(m.y2 as number) * rows}
                            className="stroke-white"
                            strokeWidth={haloStroke}
                            strokeLinecap="round"
                          />
                          <line
                            x1={m.x * columns}
                            y1={m.y * rows}
                            x2={(m.x2 as number) * columns}
                            y2={(m.y2 as number) * rows}
                            className="stroke-brand-primary"
                            strokeWidth={ringStroke}
                            strokeLinecap="round"
                          />
                        </>
                      )}
                      <circle cx={x} cy={y} r={pinR} className="fill-brand-primary stroke-white" strokeWidth={pinR * 0.2} />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={pinR * 1.05}
                        fontWeight={700}
                        className="fill-white"
                      >
                        {m.seq}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0">
                  <circle cx="10" cy="10" r="7" fill="none" className="stroke-brand-primary" strokeWidth="2" strokeDasharray="3 2" />
                </svg>
                Nódulo de referencia, con su diámetro real
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white bg-brand-primary text-[9px] font-bold text-white shadow-sm"
                >
                  1
                </span>
                Tu marca (en una medición, su punto medio)
              </span>
            </figcaption>
          </figure>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              role="switch"
              aria-checked={showHeatmap}
              onClick={() => setShowHeatmap((v) => !v)}
              className="inline-flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  showHeatmap ? "bg-brand-primary" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    showHeatmap ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </span>
              Mostrar mapa de calor de la IA
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className={H3}>Tu lectura</h3>
            <p className="mt-3 text-base font-semibold text-slate-800">{summary}</p>
            <p className="mt-1 text-xs text-slate-500">
              Una marca acierta si está a {MATCH_RADIUS_MM} mm o menos del centro de un nódulo de referencia.
            </p>

            <h4 id={refsTitleId} className="mt-5 text-sm font-medium text-slate-700">
              Nódulos de referencia
            </h4>
            <ul aria-labelledby={refsTitleId} className="mt-2 space-y-2">
              {reference.map((ref, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-2 text-sm text-slate-600">
                  <span className="min-w-0">{referenceText(i, ref.diameterMm, ref.readers)}</span>
                  <span className="sr-only">. </span>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      found[i]
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {found[i] ? "Encontrado" : "No encontrado"}
                  </span>
                </li>
              ))}
            </ul>

            <h4 id={marksTitleId} className="mt-5 text-sm font-medium text-slate-700">
              Tus marcas
            </h4>
            {markers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No hiciste marcas en este caso.</p>
            ) : (
              <ul aria-labelledby={marksTitleId} className="mt-2 space-y-1.5 text-sm text-slate-600">
                {markers.map((m, i) => (
                  <li key={m.id}>{markText(m, byAnchor[i])}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className={H3}>Resultado de la IA</h3>
            <dl className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-slate-600">Score del corte completo</dt>
                <dd className="text-xl font-bold tabular-nums text-slate-800">{formatScore(ai.score)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-slate-600">Nivel de riesgo</dt>
                <dd>
                  <RiskBadge level={ai.riskLevel} />
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">Modelo: {ai.modelVersion}</p>
            <p className="mt-4 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              <span>{PRACTICE_AI_NOTICE}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
