import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { PracticeSession } from "./PracticeSession";
import { PRACTICE_AI_NOTICE, PRACTICE_MANIFEST_URL, PRACTICE_VIEWER_REASON } from "@/lib/practiceCases";

const MANIFEST = {
  version: 1,
  cases: [
    {
      id: "caso-01",
      image: "caso-01.png",
      heatmap: "caso-01-heatmap.png",
      pixel_spacing: [0.7, 0.7],
      rows: 512,
      columns: 512,
      reference: [{ x: 0.5, y: 0.5, diameter_mm: 12.3, readers: 4 }],
      ai: { score: 0.83, risk_level: "ALTO", model_version: "multimodal-v1.2" },
    },
    {
      id: "caso-02",
      image: "caso-02.png",
      heatmap: "caso-02-heatmap.png",
      pixel_spacing: [0.8, 0.8],
      rows: 512,
      columns: 512,
      reference: [{ x: 0.2, y: 0.3, diameter_mm: 8, readers: 3 }],
      ai: { score: 0.42, risk_level: "MEDIO", model_version: "multimodal-v1.2" },
    },
  ],
};

function reply(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const heatmapImages = () =>
  Array.from(document.querySelectorAll("img")).filter((img) => img.getAttribute("src")?.includes("heatmap"));

async function start() {
  render(<PracticeSession />);
  fireEvent.click(await screen.findByRole("button", { name: "Empezar" }));
}

/** M + Enter con el visor enfocado agrega un marcador en el centro (0,5; 0,5). */
function addCenterMarker() {
  const visor = screen.getByRole("group", { name: "Visor de tomografía" });
  visor.focus();
  fireEvent.keyDown(visor, { key: "m" });
  fireEvent.keyDown(visor, { key: "Enter" });
}

describe("PracticeSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(MANIFEST)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("carga el manifest desde el navegador", async () => {
    render(<PracticeSession />);
    await screen.findByRole("button", { name: "Empezar" });
    expect(fetch).toHaveBeenCalledWith(PRACTICE_MANIFEST_URL, expect.anything());
  });

  it("la intro muestra el aviso de la IA, la lista de casos y «Empezar»", async () => {
    render(<PracticeSession />);
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeInTheDocument();
    expect(screen.getByText(PRACTICE_AI_NOTICE)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Casos de práctica" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("tras «Empezar» el visor no tiene mapa de calor y aparece «Ver resultado»", async () => {
    await start();
    expect(screen.getByRole("heading", { name: "Caso 1 de 2" })).toHaveFocus();
    expect(screen.getByRole("group", { name: "Visor de tomografía" })).toBeInTheDocument();
    expect(screen.getAllByText(PRACTICE_VIEWER_REASON).length).toBeGreaterThan(0);
    expect(heatmapImages()).toHaveLength(0);
    expect(screen.queryByText("83,0 %")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver resultado" })).toBeInTheDocument();
  });

  it("«Ver resultado» muestra el resumen, el score, el riesgo y la lista de referencia", async () => {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));

    expect(screen.getByRole("heading", { name: "Resultado del caso 1 de 2" })).toHaveFocus();
    expect(screen.getByText("Encontraste 0 de 1 nódulo de referencia.")).toBeInTheDocument();
    expect(screen.getByText("83,0 %")).toBeInTheDocument();
    expect(screen.getByLabelText("Riesgo alto")).toBeInTheDocument();
    expect(screen.getByText("Modelo: multimodal-v1.2")).toBeInTheDocument();
    expect(screen.getByText(PRACTICE_AI_NOTICE)).toBeInTheDocument();

    const refs = screen.getByRole("list", { name: "Nódulos de referencia" });
    expect(within(refs).getByText("Nódulo de referencia 1: 12,3 mm, marcado por 4 de 4 radiólogos")).toBeInTheDocument();
    expect(within(refs).getByText("No encontrado")).toBeInTheDocument();
    expect(screen.getByText("No hiciste marcas en este caso.")).toBeInTheDocument();
  });

  it("una marca sobre el nódulo cuenta como encontrada y se lista", async () => {
    await start();
    addCenterMarker();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));

    expect(screen.getByText("Encontraste 1 de 1 nódulo de referencia.")).toBeInTheDocument();
    const refs = screen.getByRole("list", { name: "Nódulos de referencia" });
    expect(within(refs).getByText("Encontrado")).toBeInTheDocument();
    const marks = screen.getByRole("list", { name: "Tus marcas" });
    expect(within(marks).getByText("Marca 1: coincide con el nódulo de referencia 1")).toBeInTheDocument();
  });

  it("la capa del dibujo está oculta a los lectores de pantalla", async () => {
    await start();
    addCenterMarker();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    const overlay = screen.getByTestId("practice-overlay");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(within(overlay).getAllByTestId("reference-ring")).toHaveLength(1);
    expect(within(overlay).getAllByTestId("reader-mark")).toHaveLength(1);
  });

  it("con un nódulo pequeño (7,8 mm) la marca en el centro deja el anillo entero a la vista", async () => {
    const small = {
      ...MANIFEST,
      cases: [
        {
          ...MANIFEST.cases[0],
          pixel_spacing: [0.728516, 0.728516],
          reference: [{ x: 0.5, y: 0.5, diameter_mm: 7.8, readers: 4 }],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(small)));
    await start();
    addCenterMarker();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));

    const overlay = screen.getByTestId("practice-overlay");
    const marks = within(overlay).getByTestId("reader-marks");
    const rings = within(overlay).getByTestId("reference-rings");
    // Los anillos se dibujan después de las marcas: quedan encima.
    expect(marks.compareDocumentPosition(rings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const dot = within(overlay).getByTestId("reader-mark-dot");
    const halo = within(overlay).getByTestId("reference-ring-halo");
    const dotOuter = Number(dot.getAttribute("r")) + Number(dot.getAttribute("stroke-width")) / 2;
    const ringInner = Number(halo.getAttribute("r")) - Number(halo.getAttribute("stroke-width")) / 2;
    expect(Number(halo.getAttribute("r"))).toBeCloseTo(7.8 / 2 / 0.728516, 6);
    expect(dotOuter).toBeLessThan(ringInner);
  });

  it("el interruptor superpone el mapa de calor de la IA", async () => {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    const toggle = screen.getByRole("switch", { name: "Mostrar mapa de calor de la IA" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(heatmapImages()).toHaveLength(0);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(heatmapImages()).toHaveLength(1);
    expect(heatmapImages()[0]).toHaveAttribute("src", "/demo/practica/caso-01-heatmap.png");
  });

  it("«Repetir caso» vuelve a la lectura del mismo caso sin marcas", async () => {
    await start();
    addCenterMarker();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Repetir caso" }));

    expect(screen.getByRole("heading", { name: "Caso 1 de 2" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: /^Marcador 1/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(screen.getByText("Encontraste 0 de 1 nódulo de referencia.")).toBeInTheDocument();
  });

  it("«Siguiente caso» pasa al caso 2 y en el último el botón es «Terminar»", async () => {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(screen.queryByRole("button", { name: "Terminar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente caso" }));

    expect(screen.getByRole("heading", { name: "Caso 2 de 2" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(screen.getByText("42,0 %")).toBeInTheDocument();
    expect(screen.getByLabelText("Riesgo medio")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente caso" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(screen.getByRole("heading", { name: "Terminaste los casos de práctica." })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Volver al inicio del modo práctica" }));
    expect(screen.getByRole("button", { name: "Empezar" })).toBeInTheDocument();
  });

  it.each([
    ["fetch falla", () => vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))],
    ["la respuesta no es 200", () => vi.fn().mockResolvedValue(reply({}, false))],
    ["el manifest no es válido", () => vi.fn().mockResolvedValue(reply({ cases: [{ id: "x" }] }))],
    ["el manifest no tiene casos", () => vi.fn().mockResolvedValue(reply({ version: 1, cases: [] }))],
  ])("si %s muestra el error con «Reintentar»", async (_name, makeFetch) => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<PracticeSession />);
    expect(await screen.findByText("No se pudieron cargar los casos de práctica.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Empezar" })).not.toBeInTheDocument();

    fetchMock.mockResolvedValue(reply(MANIFEST));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
