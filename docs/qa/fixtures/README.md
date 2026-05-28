# Fixtures DICOM para smoke test

Archivos de prueba **100% sintéticos** generados con pydicom. No contienen PHI real.

| Archivo | Modality | Propósito |
|---------|----------|-----------|
| `dicom_ot_modality.dcm` | OT | Debe fallar con HTTP 400: "Modalidad OT no soportada. OncoScan procesa únicamente tomografías de tórax (CT)." |
| `dicom_sin_modality.dcm` | (ausente) | Debe fallar con HTTP 400: "DICOM incompleto: falta el tag Modality." |

## Cómo fueron generados

Script ad-hoc con pydicom 3.0.1. `PatientID = "TEST-FIXTURE-001"` (dato sintético, no corresponde a ningún paciente real). Imagen 4×4 px de ceros. SOP Class UID = CT Storage para que pydicom serialice correctamente, pero el tag `Modality` se omite o se establece en `OT` según el fixture.

## DICOM CT válido

El equipo debe proveer su propio archivo CT válido con los 6 tags mínimos requeridos por `T-06`:
`Modality=CT`, `PatientID`, `StudyInstanceUID`, `SOPInstanceUID`, `Rows`, `Columns`.

**No subir DICOMs de pacientes reales a este repositorio.**
