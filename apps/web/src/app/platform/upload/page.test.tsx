import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() } }));
vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
  }),
}));
vi.mock("../uploads/[id]/actions", () => ({ saveAnnotationAction: vi.fn(), deleteAnnotationAction: vi.fn() }));
vi.mock("../pacientes/actions", () => ({ createPatientInline: vi.fn() }));
vi.mock("../uploads/[id]/ClinicalReviewForm", () => ({ ClinicalReviewForm: () => null }));
vi.mock("@/components/dicom/StudyViewerTabs", () => ({ StudyViewerTabs: () => null }));

import UploadDicomPage from "./page";

afterEach(() => {
  cleanup();
  toastError.mockReset();
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
