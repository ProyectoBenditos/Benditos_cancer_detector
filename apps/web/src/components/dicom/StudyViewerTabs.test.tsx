import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Volume3DStub() {
      return <div>visor-3d</div>;
    },
}));
vi.mock("@/components/ui/BeforeAfterViewer", () => ({
  BeforeAfterViewer: () => <div>visor-2d</div>,
}));

import { StudyViewerTabs } from "./StudyViewerTabs";

const base = {
  uploadId: "u1",
  beforeUrl: null,
  heatmapBase64: "xx",
  summary: { score: 0.5, riskLevel: null, review: null },
  annotations: { uploadId: "u1", initial: [], save: vi.fn(), remove: vi.fn() },
} as unknown as React.ComponentProps<typeof StudyViewerTabs>;

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("StudyViewerTabs", () => {
  it("estudio dicom antiguo: solo 2D, sin pestañas ni lóbulo", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    const { container } = render(<StudyViewerTabs {...base} fileType="dicom" />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText(/Lóbulo/)).toBeNull();
    expect(screen.getByText("visor-2d")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("brand-danger");
  });

  it("serie DICOM con la bandera apagada: sin pestañas", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "false");
    render(<StudyViewerTabs {...base} fileType="dicom_series" />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("visor-2d")).toBeInTheDocument();
  });

  it("serie DICOM con la bandera encendida: pestañas ARIA con flechas", () => {
    vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true");
    const { container } = render(<StudyViewerTabs {...base} fileType="dicom_series" />);
    expect(screen.getByRole("tablist", { name: "Vista del estudio" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("Corte axial");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", tabs[0].getAttribute("aria-controls"));
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    const after = screen.getAllByRole("tab");
    expect(after[1]).toHaveTextContent("Volumen 3D");
    expect(after[1]).toHaveAttribute("aria-selected", "true");
    expect(after[0]).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("visor-3d")).toBeInTheDocument();
    fireEvent.keyDown(after[1], { key: "ArrowLeft" });
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
    expect(container.innerHTML).not.toContain("brand-danger");
  });

  it("muestra el lóbulo solo si existe", () => {
    const { rerender } = render(<StudyViewerTabs {...base} fileType="dicom" lobarLocation={null} />);
    expect(screen.queryByText(/Lóbulo/)).toBeNull();
    rerender(<StudyViewerTabs {...base} fileType="dicom" lobarLocation="LID" />);
    expect(screen.getByText("Lóbulo: LID")).toBeInTheDocument();
  });

  it("indica el corte usado por el análisis", () => {
    render(<StudyViewerTabs {...base} fileType="dicom_series" sourceSlice={{ index: 2, total: 5 }} />);
    expect(screen.getByText(/Análisis sobre el corte 3 de 5\./)).toBeInTheDocument();
  });

  it("enlaza la referencia del método según la versión del modelo", () => {
    const { rerender } = render(<StudyViewerTabs {...base} modelVersion="multimodal-v2.0-densenet-real" />);
    expect(screen.getByText("HiResCAM (Draelos y Carin, 2020)")).toBeInTheDocument();
    rerender(<StudyViewerTabs {...base} />);
    expect(screen.getByText("Grad-CAM (Selvaraju et al., 2017)")).toBeInTheDocument();
  });
});
