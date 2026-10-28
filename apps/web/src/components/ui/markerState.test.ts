import { describe, expect, it } from "vitest";
import {
  findingLabel,
  MARKERS_INITIAL,
  markerAriaLabel,
  markersReducer,
  markersStateFrom,
  type MarkersState,
} from "./markerState";

const add = (s: MarkersState, x = 0.5, y = 0.5) => markersReducer(s, { type: "add", x, y });

describe("markersReducer", () => {
  it("agrega numerado y lo selecciona", () => {
    const s = add(MARKERS_INITIAL);
    expect(s.markers[0]).toMatchObject({
      id: "m1",
      seq: 1,
      x: 0.5,
      y: 0.5,
      note: "",
      findingType: null,
      aiAgreement: null,
      sizeMm: null,
      kind: "point",
      x2: null,
      y2: null,
    });
    expect(s.selectedId).toBe("m1");
  });

  it("addMeasure crea una medición numerada con dos puntos acotados", () => {
    const s = markersReducer(add(MARKERS_INITIAL), { type: "addMeasure", x: -0.1, y: 0.5, x2: 1.2, y2: 0.5, sizeMm: 179.2 });
    expect(s.markers[1]).toMatchObject({ id: "m2", seq: 2, kind: "measure", x: 0, y: 0.5, x2: 1, y2: 0.5, sizeMm: 179.2 });
    expect(s.selectedId).toBe("m2");
    expect(s.nextSeq).toBe(3);
  });

  it("addMeasure con tamaño inválido no crea nada", () => {
    for (const bad of [0, -1, 301, Number.NaN]) {
      expect(markersReducer(MARKERS_INITIAL, { type: "addMeasure", x: 0, y: 0, x2: 0.5, y2: 0, sizeMm: bad })).toBe(
        MARKERS_INITIAL
      );
    }
  });

  it("move traslada los dos puntos de una medición sin salir de la imagen", () => {
    let s = markersReducer(MARKERS_INITIAL, { type: "addMeasure", x: 0.8, y: 0.5, x2: 0.9, y2: 0.6, sizeMm: 10 });
    // Se pide llevar el primer punto a x = 0.95: el segundo tocaría 1.05, así que el desplazamiento se acota a 0.1.
    s = markersReducer(s, { type: "move", id: "m1", x: 0.95, y: 0.4 });
    const m = s.markers[0];
    expect(m.x).toBeCloseTo(0.9);
    expect(m.x2).toBeCloseTo(1);
    expect(m.y).toBeCloseTo(0.4);
    expect(m.y2).toBeCloseTo(0.5);
  });

  it("update no cambia el tamaño derivado de una medición", () => {
    let s = markersReducer(MARKERS_INITIAL, { type: "addMeasure", x: 0, y: 0, x2: 0.5, y2: 0, sizeMm: 179.2 });
    s = markersReducer(s, { type: "update", id: "m1", patch: { sizeMm: 5, note: "borde" } });
    expect(s.markers[0]).toMatchObject({ sizeMm: 179.2, note: "borde" });
  });

  it("no reutiliza números al borrar", () => {
    let s = add(add(MARKERS_INITIAL));
    s = markersReducer(s, { type: "remove", id: "m2" });
    s = add(s);
    expect(s.markers.map((m) => m.seq)).toEqual([1, 3]);
  });

  it("borrar el seleccionado deja la selección vacía", () => {
    const s = markersReducer(add(MARKERS_INITIAL), { type: "remove", id: "m1" });
    expect(s.selectedId).toBeNull();
  });

  it("la nota se corta en 1000 caracteres", () => {
    const s = markersReducer(add(MARKERS_INITIAL), {
      type: "update",
      id: "m1",
      patch: { note: "x".repeat(1200) },
    });
    expect(s.markers[0].note).toHaveLength(1000);
  });

  it("tamaño fuera de (0, 300] se descarta", () => {
    let s = add(MARKERS_INITIAL);
    for (const bad of [0, -2, 301, Number.NaN]) {
      s = markersReducer(s, { type: "update", id: "m1", patch: { sizeMm: bad } });
      expect(s.markers[0].sizeMm).toBeNull();
    }
    s = markersReducer(s, { type: "update", id: "m1", patch: { sizeMm: 8.5 } });
    expect(s.markers[0].sizeMm).toBe(8.5);
  });

  it("add y move acotan a [0,1]", () => {
    const s = markersReducer(add(MARKERS_INITIAL, 1.4, -0.2), { type: "move", id: "m1", x: -1, y: 2 });
    expect(s.markers[0]).toMatchObject({ x: 0, y: 1 });
  });

  it("select cambia la selección", () => {
    const s = markersReducer(add(add(MARKERS_INITIAL)), { type: "select", id: "m1" });
    expect(s.selectedId).toBe("m1");
    expect(markersReducer(s, { type: "select", id: null }).selectedId).toBeNull();
  });

  it("acciones sobre un id inexistente no cambian el estado", () => {
    const s = add(MARKERS_INITIAL);
    expect(markersReducer(s, { type: "remove", id: "m9" })).toBe(s);
    expect(markersReducer(s, { type: "update", id: "m9", patch: { note: "x" } })).toBe(s);
    expect(markersReducer(s, { type: "move", id: "m9", x: 0, y: 0 })).toBe(s);
  });
});

describe("markersStateFrom", () => {
  it("ordena por seq, continúa la numeración y arranca sin selección", () => {
    const m3 = { ...add(MARKERS_INITIAL).markers[0], id: "m3", seq: 3 };
    const m1 = add(MARKERS_INITIAL).markers[0];
    const s = markersStateFrom([m3, m1]);
    expect(s.markers.map((m) => m.seq)).toEqual([1, 3]);
    expect(s.nextSeq).toBe(4);
    expect(s.selectedId).toBeNull();
  });

  it("sin marcadores empieza en 1", () => {
    expect(markersStateFrom([])).toEqual(MARKERS_INITIAL);
  });

  it("no reutiliza el número de una fila guardada que no se pudo mostrar", () => {
    const m1 = add(MARKERS_INITIAL).markers[0];
    expect(markersStateFrom([m1], 2).nextSeq).toBe(3);
    expect(markersStateFrom([m1], 0).nextSeq).toBe(2);
  });
});

describe("etiquetas", () => {
  it("findingLabel", () => {
    expect(findingLabel("vidrio_esmerilado")).toBe("Vidrio esmerilado");
    expect(findingLabel(null)).toBe("Sin clasificar");
  });

  it("el nombre accesible incluye número, tipo y el comienzo de la nota", () => {
    const m = {
      ...add(MARKERS_INITIAL).markers[0],
      findingType: "subsolido" as const,
      note: "Borde espiculado en lóbulo superior derecho",
    };
    expect(markerAriaLabel(m)).toBe("Marcador 1: nódulo subsólido, Borde espiculado en lóbulo superior…");
  });

  it("sin tipo ni nota", () => {
    expect(markerAriaLabel(add(MARKERS_INITIAL).markers[0])).toBe("Marcador 1: sin clasificar");
  });

  it("nota corta sin puntos suspensivos", () => {
    const m = { ...add(MARKERS_INITIAL).markers[0], findingType: "otro" as const, note: "Revisar" };
    expect(markerAriaLabel(m)).toBe("Marcador 1: otro, Revisar");
  });

  it("medición: número, mm y nota", () => {
    const s = markersReducer(MARKERS_INITIAL, { type: "addMeasure", x: 0, y: 0, x2: 0.5, y2: 0, sizeMm: 179.2 });
    expect(markerAriaLabel(s.markers[0])).toBe("Medición 1: 179,2 mm");
    expect(markerAriaLabel({ ...s.markers[0], note: "Eje largo" })).toBe("Medición 1: 179,2 mm, Eje largo");
  });
});
