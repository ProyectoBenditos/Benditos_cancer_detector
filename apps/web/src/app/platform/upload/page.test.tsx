import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  session: null as { access_token: string } | null,
  blind: false as boolean | null,
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() } }));
vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
    auth: { getSession: () => Promise.resolve({ data: { session: mocks.session }, error: null }) },
  }),
}));
vi.mock("@/lib/useBlindReadingPreference", () => ({ useBlindReadingPreference: () => mocks.blind }));
vi.mock("../uploads/[id]/actions", () => ({ saveAnnotationAction: vi.fn(), deleteAnnotationAction: vi.fn() }));
vi.mock("../pacientes/actions", () => ({ createPatientInline: vi.fn() }));
vi.mock("../uploads/[id]/ClinicalReviewForm", () => ({
  ClinicalReviewForm: () => <div data-testid="review-form" />,
}));
vi.mock("@/components/dicom/StudyViewerTabs", () => ({
  StudyViewerTabs: () => <div data-testid="viewer" />,
}));

import UploadDicomPage from "./page";

afterEach(() => {
  cleanup();
  toastError.mockReset();
  mocks.session = null;
  mocks.blind = false;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function chooseFile(name: string) {
  const input = screen.getByLabelText("Archivo DICOM o imagen") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["x"], name)] } });
  return input;
}

describe("UploadDicomPage: error de archivo", () => {
  it("un formato no soportado deja un alert persistente enlazado al input", () => {
    render(<UploadDicomPage />);
    const input = chooseFile("a.tar.gz");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Formato no soportado");
    expect(alert.id).toBe("upload-file-error");
    expect(input).toHaveAttribute("aria-describedby", "upload-file-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
    // El aviso no depende del toast: está en el formulario.
    expect(toastError).toHaveBeenCalled();
  });

  it("elegir después un archivo válido quita el mensaje", () => {
    render(<UploadDicomPage />);
    chooseFile("a.tar.gz");
    const input = chooseFile("estudio.dcm");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});

const BLIND_NOTICE =
  "Análisis completado. Tienes la lectura ciega activa: abre el estudio para registrar tu impresión antes de ver la IA.";

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

// Sube un archivo y lo analiza con respuestas simuladas del backend.
async function uploadAndAnalyze() {
  render(<UploadDicomPage />);
  chooseFile("estudio.dcm");
  fireEvent.click(screen.getByRole("button", { name: "Subir DICOM" }));
  fireEvent.click(await screen.findByRole("button", { name: "Analizar con IA" }));
}

describe("UploadDicomPage: lectura ciega", () => {
  beforeEach(() => {
    mocks.session = { access_token: "token" };
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          jsonResponse({
            message: "ok",
            dicom_id: "dicom-1",
            user_id: "u1",
            filename: "estudio.dcm",
            file_type: "dicom",
            storage_path: "x",
            modality: "CT",
            study_date: null,
            patient_id_dicom: null,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            dicom_id: "dicom-1",
            score: 0.873,
            nivel_riesgo: "ALTO",
            recomendacion: "Seguimiento",
            modelo_version: "v1.2",
            heatmap_base64: "abc",
          }),
        ),
    );
  });

  it("sin lectura ciega muestra el resultado, el visor y la valoración", async () => {
    mocks.blind = false;
    await uploadAndAnalyze();
    expect(await screen.findByText("87.3%")).toBeInTheDocument();
    expect(screen.getByTestId("viewer")).toBeInTheDocument();
    expect(screen.getByTestId("review-form")).toBeInTheDocument();
    expect(screen.queryByText(BLIND_NOTICE)).toBeNull();
  });

  it("con la preferencia activa muestra el aviso y el enlace, sin score, visor ni valoración", async () => {
    mocks.blind = true;
    await uploadAndAnalyze();
    expect(await screen.findByText(BLIND_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir el estudio" })).toHaveAttribute(
      "href",
      "/platform/uploads/dicom-1",
    );
    expect(screen.queryByText("87.3%")).toBeNull();
    expect(screen.queryByText("ALTO")).toBeNull();
    expect(screen.queryByText("Resultado del análisis IA")).toBeNull();
    expect(screen.queryByTestId("viewer")).toBeNull();
    expect(screen.queryByTestId("review-form")).toBeNull();
  });

  it("mientras la preferencia carga (null) tampoco muestra el resultado", async () => {
    mocks.blind = null;
    await uploadAndAnalyze();
    // El análisis terminó: solo queda un estado de carga neutro.
    expect(await screen.findByText("Cargando el resultado…")).toBeInTheDocument();
    expect(screen.queryByText("87.3%")).toBeNull();
    expect(screen.queryByText("Resultado del análisis IA")).toBeNull();
    expect(screen.queryByTestId("viewer")).toBeNull();
    expect(screen.queryByTestId("review-form")).toBeNull();
    expect(screen.queryByText(BLIND_NOTICE)).toBeNull();
  });
});
