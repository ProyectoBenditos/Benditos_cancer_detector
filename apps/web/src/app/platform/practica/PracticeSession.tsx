"use client";

import { useEffect, useRef, useState } from "react";
import { EyeOff, Info } from "lucide-react";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { BeforeAfterViewer } from "@/components/ui/BeforeAfterViewer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { Marker } from "@/components/ui/markerState";
import {
  PRACTICE_AI_NOTICE,
  PRACTICE_MANIFEST_URL,
  PRACTICE_VIEWER_REASON,
  parsePracticeManifest,
  type PracticeCase,
} from "@/lib/practiceCases";
import { MATCH_RADIUS_MM } from "@/lib/practiceMath";
import { PracticeResult } from "./PracticeResult";

type Step =
  | { kind: "intro" }
  | { kind: "reading"; index: number }
  | { kind: "result"; index: number }
  | { kind: "done" };

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; cases: PracticeCase[] };

const LOAD_ERROR = "No se pudieron cargar los casos de práctica.";

const STEP_HEADING = "text-xl font-bold text-slate-800 focus:outline-none";
const EYEBROW = "text-xs font-semibold uppercase tracking-wider text-slate-500";
const ACTION = "min-h-11 w-full text-center sm:w-auto";

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <ol aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className={`h-1.5 w-8 rounded-full ${i < index ? "bg-brand-primary/40" : i === index ? "bg-brand-primary" : "bg-slate-200"}`}
        />
      ))}
    </ol>
  );
}

/**
 * Modo práctica: intro → lectura sin IA → resultado → siguiente caso → cierre.
 * El manifest se carga en el navegador (public/ no está garantizado en el
 * sistema de archivos del servidor). Nada se guarda: las marcas viven en memoria.
 */
export function PracticeSession() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [request, setRequest] = useState(0);
  const [step, setStep] = useState<Step>({ kind: "intro" });
  // Cambia al repetir un caso: remonta el visor y empieza sin marcas.
  const [attempt, setAttempt] = useState(0);
  const [markers, setMarkers] = useState<Marker[]>([]);

  // Al cambiar de paso el foco va al título del paso nuevo (no en la carga inicial).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    headingRef.current?.focus();
  }, [step, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(PRACTICE_MANIFEST_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (controller.signal.aborted) return;
        const cases = json === null ? null : parsePracticeManifest(json);
        setLoad(cases && cases.length > 0 ? { status: "ready", cases } : { status: "error" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ status: "error" });
      });
    return () => controller.abort();
  }, [request]);

  const go = (next: Step) => {
    focusPending.current = true;
    setStep(next);
  };
  const read = (index: number) => {
    setMarkers([]);
    setAttempt((a) => a + 1);
    go({ kind: "reading", index });
  };
  const retry = () => {
    setLoad({ status: "loading" });
    setRequest((r) => r + 1);
  };

  const cases = load.status === "ready" ? load.cases : [];
  const total = cases.length;

  if ((step.kind === "reading" || step.kind === "result") && cases[step.index]) {
    const index = step.index;
    const current = cases[index];
    const isLast = index === total - 1;

    if (step.kind === "reading") {
      return (
        <section aria-labelledby="practica-paso">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className={EYEBROW}>Lectura sin IA</p>
              <h2 id="practica-paso" ref={headingRef} tabIndex={-1} className={`mt-1 ${STEP_HEADING}`}>
                Caso {index + 1} de {total}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Busca nódulos en el corte. Márcalos con el Marcador (M) o mídelos con Medir (L) y, cuando
                termines, pulsa «Ver resultado».
              </p>
            </div>
            <Progress index={index} total={total} />
          </div>

          <BeforeAfterViewer
            key={`${current.id}-${attempt}`}
            beforeUrl={current.imageUrl}
            heatmapBase64={null}
            aiHiddenReason={PRACTICE_VIEWER_REASON}
            pixelGeometry={current.geometry}
            onMarkersChange={setMarkers}
          />

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {markers.length === 0
                ? "Aún no tienes marcas en este caso."
                : markers.length === 1
                  ? "Llevas 1 marca."
                  : `Llevas ${markers.length} marcas.`}
            </p>
            <Button size="lg" className={ACTION} onClick={() => go({ kind: "result", index })}>
              Ver resultado
            </Button>
          </div>
        </section>
      );
    }

    return (
      <section aria-labelledby="practica-paso">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className={EYEBROW}>Comparación con la referencia</p>
            <h2 id="practica-paso" ref={headingRef} tabIndex={-1} className={`mt-1 ${STEP_HEADING}`}>
              Resultado del caso {index + 1} de {total}
            </h2>
          </div>
          <Progress index={index} total={total} />
        </div>

        <PracticeResult practiceCase={current} caseNumber={index + 1} markers={markers} />

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" className={ACTION} onClick={() => read(index)}>
            Repetir caso
          </Button>
          <Button size="lg" className={ACTION} onClick={() => (isLast ? go({ kind: "done" }) : read(index + 1))}>
            {isLast ? "Terminar" : "Siguiente caso"}
          </Button>
        </div>
      </section>
    );
  }

  if (step.kind === "done") {
    return (
      <Card>
        <CardContent className="p-5 sm:p-8">
          <h2 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
            Terminaste los casos de práctica.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Puedes volver a empezar cuando quieras: cada lectura parte de cero y no se guarda.
          </p>
          <Button className={`mt-6 ${ACTION}`} onClick={() => go({ kind: "intro" })}>
            Volver al inicio del modo práctica
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <Card>
        <CardContent className="p-6">
          <h2 ref={headingRef} tabIndex={-1} className={STEP_HEADING}>
            Cómo funciona
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">1</span>
              <span>
                Lee cada corte sin ver la IA y marca los nódulos que encuentres con el Marcador o con Medir.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">2</span>
              <span>
                Pulsa «Ver resultado» para comparar tus marcas con los nódulos que marcaron los radiólogos de
                LIDC-IDRI. Una marca acierta si está a {MATCH_RADIUS_MM} mm o menos del centro de un nódulo.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">3</span>
              <span>Después verás el resultado de la IA para ese corte y su mapa de calor.</span>
            </li>
          </ol>

          <p className="mt-6 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
            <span>{PRACTICE_AI_NOTICE}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 id="practica-casos" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Casos de práctica
          </h3>

          {load.status === "loading" && (
            <div role="status" className="mt-4">
              <span className="sr-only">Cargando los casos de práctica…</span>
              <div aria-hidden="true" className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          )}

          {load.status === "error" && (
            <div className="mt-4">
              <AlertBanner
                variant="error"
                title={LOAD_ERROR}
                description="Revisa tu conexión e inténtalo de nuevo."
              />
              <Button variant="secondary" className={`mt-4 ${ACTION}`} onClick={retry}>
                Reintentar
              </Button>
            </div>
          )}

          {load.status === "ready" && (
            <>
              <ol aria-labelledby="practica-casos" className="mt-4 space-y-2">
                {cases.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-slate-800">Caso {i + 1}</span>
                    <span className="text-xs text-slate-500">Corte axial de TC de tórax</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                La IA queda oculta mientras lees cada caso.
              </p>
              <Button size="lg" className="mt-4 min-h-11 w-full" onClick={() => read(0)}>
                Empezar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
