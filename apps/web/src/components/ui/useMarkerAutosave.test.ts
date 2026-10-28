import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { diffMarkers, useMarkerAutosave } from "./useMarkerAutosave";
import type { Marker } from "./markerState";

const mk = (seq: number, over: Partial<Marker> = {}): Marker => ({
  id: `m${seq}`,
  seq,
  x: 0.5,
  y: 0.5,
  findingType: null,
  aiAgreement: null,
  note: "",
  sizeMm: null,
  kind: "point",
  x2: null,
  y2: null,
  ...over,
});

function setup(initial: Marker[], opts: { enabled?: boolean } = {}) {
  const save = vi.fn<(m: Marker) => Promise<boolean>>().mockResolvedValue(true);
  const remove = vi.fn<(seq: number) => Promise<boolean>>().mockResolvedValue(true);
  const hook = renderHook(
    ({ markers }: { markers: Marker[] }) =>
      useMarkerAutosave({ markers, enabled: opts.enabled ?? true, save, remove }),
    { initialProps: { markers: initial } }
  );
  return { ...hook, save, remove };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("diffMarkers", () => {
  it("detecta nuevos y cambiados", () => {
    expect(diffMarkers([mk(1), mk(2)], [mk(1), mk(2, { note: "x" }), mk(3)])).toEqual({
      upserts: [mk(2, { note: "x" }), mk(3)],
      removals: [],
    });
  });

  it("detecta borrados", () => {
    expect(diffMarkers([mk(1), mk(2)], [mk(2)])).toEqual({ upserts: [], removals: [1] });
  });

  it("sin cambios no hay nada que hacer", () => {
    expect(diffMarkers([mk(1)], [mk(1)])).toEqual({ upserts: [], removals: [] });
  });

  it("mover el segundo punto de una medición es un cambio que se guarda", () => {
    const measure = mk(1, { kind: "measure", x2: 0.7, y2: 0.5, sizeMm: 10 });
    expect(diffMarkers([measure], [{ ...measure, x2: 0.8 }]).upserts).toHaveLength(1);
    expect(diffMarkers([measure], [{ ...measure, y2: 0.6 }]).upserts).toHaveLength(1);
  });
});

describe("useMarkerAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("no guarda los marcadores con los que arranca", async () => {
    const { result, save } = setup([mk(1)]);
    await advance(2000);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("agrupa la escritura de la nota: un solo save con el último valor", async () => {
    const { result, rerender, save } = setup([mk(1)]);
    for (const note of ["B", "Bo", "Bor"]) {
      rerender({ markers: [mk(1, { note })] });
      await advance(100);
    }
    expect(result.current.status).toBe("saving");
    expect(save).not.toHaveBeenCalled();
    await advance(700);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(mk(1, { note: "Bor" }));
    expect(result.current.status).toBe("saved");
  });

  it("borrar cancela el guardado pendiente y no lo reenvía", async () => {
    const { rerender, save, remove } = setup([mk(1)]);
    rerender({ markers: [mk(1), mk(2)] });
    await advance(200);
    rerender({ markers: [mk(1)] });
    await advance(2000);
    expect(remove).toHaveBeenCalledWith(2);
    expect(save).not.toHaveBeenCalled();
  });

  it("un borrado espera al guardado en curso del mismo marcador", async () => {
    const { rerender, save, remove } = setup([]);
    let resolveSave: (ok: boolean) => void = () => {};
    save.mockImplementationOnce(() => new Promise<boolean>((r) => (resolveSave = r)));
    rerender({ markers: [mk(2)] });
    await advance(700);
    expect(save).toHaveBeenCalledTimes(1);
    rerender({ markers: [] });
    await advance(0);
    expect(remove).not.toHaveBeenCalled();
    await act(async () => resolveSave(true));
    expect(remove).toHaveBeenCalledWith(2);
  });

  it("error y reintento", async () => {
    const { result, rerender, save } = setup([]);
    save.mockResolvedValueOnce(false);
    rerender({ markers: [mk(1)] });
    await advance(700);
    expect(result.current.status).toBe("error");
    await act(async () => result.current.retry());
    await advance(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
  });

  it("una excepción del guardado cuenta como error", async () => {
    const { result, rerender, save } = setup([]);
    save.mockRejectedValueOnce(new Error("red"));
    rerender({ markers: [mk(1)] });
    await advance(700);
    expect(result.current.status).toBe("error");
  });

  it("al desmontar envía lo pendiente", async () => {
    const { rerender, unmount, save } = setup([mk(1)]);
    rerender({ markers: [mk(1, { note: "x" })] });
    unmount();
    // Sin avanzar el reloj: solo se deja correr la microtarea de la cola del marcador.
    await Promise.resolve();
    await Promise.resolve();
    expect(save).toHaveBeenCalledWith(mk(1, { note: "x" }));
  });

  it("avisa antes de salir con cambios pendientes", async () => {
    const { rerender } = setup([mk(1)]);
    rerender({ markers: [mk(1, { note: "x" })] });
    const ev = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    await advance(700);
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("deshabilitado no guarda", async () => {
    const { result, rerender, save, remove } = setup([mk(1)], { enabled: false });
    rerender({ markers: [mk(2)] });
    await advance(2000);
    expect(save).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
