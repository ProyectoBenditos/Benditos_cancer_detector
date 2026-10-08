import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnonymizationCertificate, type AnonymizationAuditData } from "./AnonymizationCertificate";

describe("AnonymizationCertificate", () => {
    it("renderiza el certificado con datos completos de auditoría", () => {
        const audit: AnonymizationAuditData = {
            pseudonymized_patient_id: "ONC-PAT-A1B2C3D4E5F6",
            source_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            sanitized_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            tags_cleared_count: 34,
            normative_compliance: [
                "Ley 1581 de 2012 (Habeas Data)",
                "DICOM PS 3.15 Annex E",
                "Resolución 1995 de 1999 MinSalud",
            ],
            zero_retention_verified: true,
        };

        render(<AnonymizationCertificate audit={audit} />);

        expect(screen.getByText("Certificado de Desidentificación Clínica")).toBeInTheDocument();
        expect(screen.getByText("Verificado")).toBeInTheDocument();
        expect(screen.getByText("ONC-PAT-A1B2C3D4E5F6")).toBeInTheDocument();
        expect(screen.getByText("34+ campos vaciados")).toBeInTheDocument();
        expect(screen.getByText("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBeInTheDocument();
        expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument();
    });

    it("renderiza correctamente con valores por defecto cuando audit es null", () => {
        render(<AnonymizationCertificate audit={null} fallbackPatientId="ONC-PAT-FALLBACK" />);

        expect(screen.getByText("Certificado de Desidentificación Clínica")).toBeInTheDocument();
        expect(screen.getByText("ONC-PAT-FALLBACK")).toBeInTheDocument();
        expect(screen.getByText("Purga estricta PS 3.15")).toBeInTheDocument();
    });
});
