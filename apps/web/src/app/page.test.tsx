import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/landing/HeroDemoViewer", () => ({ HeroDemoViewer: () => null }));

import LandingPage from "./page";

afterEach(cleanup);

describe("LandingPage", () => {
  it("enlaza la demostración 3D pública", () => {
    render(<LandingPage />);
    const link = screen.getByRole("link", { name: "Ver demostración 3D" });
    expect(link).toHaveAttribute("href", "/demo/pulmon-3d");
    expect(screen.getByText("Demostración con una TC pública; no procesa estudios de pacientes.")).toBeInTheDocument();
  });
});
