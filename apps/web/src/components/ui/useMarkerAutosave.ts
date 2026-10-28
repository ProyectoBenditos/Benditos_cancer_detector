"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Marker } from "./markerState";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Espera tras el último cambio de un marcador antes de guardarlo. */
export const AUTOSAVE_DELAY_MS = 700;

const PERSISTED_FIELDS = ["x", "y", "x2", "y2", "findingType", "aiAgreement", "note", "sizeMm"] as const;

/** Por seq: marcadores nuevos o con algún campo guardable distinto → upserts; seq que ya no está → removals. */
export function diffMarkers(prev: Marker[], next: Marker[]): { upserts: Marker[]; removals: number[] } {
  const before = new Map(prev.map((m) => [m.seq, m]));
  const after = new Set(next.map((m) => m.seq));
  const upserts = next.filter((m) => {
    const old = before.get(m.seq);
    return !old || PERSISTED_FIELDS.some((f) => old[f] !== m[f]);
  });
  const removals = prev.filter((m) => !after.has(m.seq)).map((m) => m.seq);
  return { upserts, removals };
}

/**
 * Guarda los marcadores solos. Los que llegan en el primer render son los ya
 * guardados y no se reenvían. Cada marcador espera `delayMs` tras su último
 * cambio (la nota no se guarda en cada letra); borrar es inmediato. Las
 * operaciones de un mismo marcador van en cadena: un borrado nunca llega antes
 * que un guardado previo. Al desmontar se envía lo pendiente.
 */
export function useMarkerAutosave(opts: {
  markers: Marker[];
  enabled: boolean;
  save: (m: Marker) => Promise<boolean>;
  remove: (seq: number) => Promise<boolean>;
  delayMs?: number;
}): { status: SaveStatus; retry: () => void } {
  const { markers, enabled, delayMs = AUTOSAVE_DELAY_MS } = opts;
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Todo lo mutable vive en refs: lo leen temporizadores y promesas.
  const prevRef = useRef(markers);
  const currentRef = useRef(markers);
  const saveRef = useRef(opts.save);
  const removeRef = useRef(opts.remove);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<number, Promise<void>>());
  const inFlight = useRef(0);
  const failed = useRef(new Set<number>());

  useEffect(() => {
    saveRef.current = opts.save;
    removeRef.current = opts.remove;
  });

  const refreshStatus = useCallback(() => {
    if (timers.current.size > 0 || inFlight.current > 0) setStatus("saving");
    else setStatus(failed.current.size > 0 ? "error" : "saved");
  }, []);

  const enqueue = useCallback(
    (seq: number, op: () => Promise<boolean>) => {
      inFlight.current += 1;
      const prev = chains.current.get(seq) ?? Promise.resolve();
      const next: Promise<void> = prev
        .then(async () => {
          let ok = false;
          try {
            ok = await op();
          } catch {
            ok = false;
          }
          if (ok) failed.current.delete(seq);
          else failed.current.add(seq);
        })
        .finally(() => {
          inFlight.current -= 1;
          if (chains.current.get(seq) === next) chains.current.delete(seq);
          refreshStatus();
        });
      chains.current.set(seq, next);
      refreshStatus();
    },
    [refreshStatus]
  );

  /** Envía el valor actual del marcador; si ya no existe, no hace nada. */
  const sendUpsert = useCallback(
    (seq: number) => {
      const marker = currentRef.current.find((m) => m.seq === seq);
      if (marker) enqueue(seq, () => saveRef.current(marker));
    },
    [enqueue]
  );

  useEffect(() => {
    currentRef.current = markers;
    const prev = prevRef.current;
    prevRef.current = markers;
    if (!enabled) return;

    const { upserts, removals } = diffMarkers(prev, markers);
    for (const m of upserts) {
      clearTimeout(timers.current.get(m.seq));
      timers.current.set(
        m.seq,
        setTimeout(() => {
          timers.current.delete(m.seq);
          sendUpsert(m.seq);
        }, delayMs)
      );
    }
    for (const seq of removals) {
      clearTimeout(timers.current.get(seq));
      timers.current.delete(seq);
      enqueue(seq, () => removeRef.current(seq));
    }
    if (upserts.length > 0 || removals.length > 0) refreshStatus();
  }, [markers, enabled, delayMs, enqueue, sendUpsert, refreshStatus]);

  // Al desmontar (p. ej. al navegar), lo pendiente se envía sin esperar.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [seq, t] of pending) {
        clearTimeout(t);
        sendUpsert(seq);
      }
      pending.clear();
    };
  }, [sendUpsert]);

  // Con cambios pendientes o fallidos, el navegador pide confirmación al salir.
  useEffect(() => {
    if (status !== "saving" && status !== "error") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  const retry = useCallback(() => {
    for (const seq of [...failed.current]) {
      if (currentRef.current.some((m) => m.seq === seq)) sendUpsert(seq);
      else enqueue(seq, () => removeRef.current(seq));
    }
  }, [enqueue, sendUpsert]);

  return { status, retry };
}
