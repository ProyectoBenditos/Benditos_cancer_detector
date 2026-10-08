"""Pruebas unitarias para el módulo de desidentificación y seudonimización DICOM."""

import io
import unittest
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian

from app.core.deidentifier import (
    ANONYMIZED_PATIENT_NAME,
    DEFAULT_STUDY_DESCRIPTION,
    deidentify_dataset,
    deidentify_dicom_bytes,
    pseudonymize_patient_id,
    sanitize_filename,
)


def create_sample_dicom() -> pydicom.Dataset:
    """Crea un dataset DICOM sintético con PHI y metadatos clínicos/físicos."""
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = "1.2.840.10008.5.1.4.1.1.2.12345"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset("test.dcm", {}, file_meta=file_meta, preamble=b"\x00" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    # Datos Personales (PHI) que deben ser eliminados o seudonimizados
    ds.PatientName = "PEREZ^CARLOS ALBERTO"
    ds.PatientID = "CC-1144123456"
    ds.PatientBirthDate = "19600514"
    ds.PatientSex = "M"
    ds.InstitutionName = "CLINICA OCCIDENTE CALI"
    ds.InstitutionAddress = "Calle 5 No 38-12"
    ds.ReferringPhysicianName = "DR^RAMIREZ^JORGE"
    ds.OperatorsName = "TEC^MARTINEZ^ANA"
    ds.StudyDescription = "TAC TORAX ALTA RESOLUCION PACIENTE CARLOS"

    # Datos Clínicos y Físicos que DEBEN PRESERVARSE
    ds.Modality = "CT"
    ds.StudyDate = "20261005"
    ds.SeriesDate = "20261005"
    ds.SliceThickness = "1.25"
    ds.KVP = "120"
    ds.RescaleIntercept = "-1024.0"
    ds.RescaleSlope = "1.0"
    ds.WindowCenter = "-600"
    ds.WindowWidth = "1500"
    ds.PixelSpacing = ["0.70", "0.70"]
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 1
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b"\x00" * (512 * 512 * 2)

    return ds


class TestDeidentifier(unittest.TestCase):
    def test_pseudonymize_patient_id_deterministic_and_irreversible(self):
        """Verifica que el seudónimo sea determinista e inicie con ONC-PAT-."""
        salt = "test-clinical-salt-123"
        id1 = pseudonymize_patient_id("CC-1144123456", salt=salt)
        id2 = pseudonymize_patient_id("CC-1144123456", salt=salt)
        id3 = pseudonymize_patient_id("CC-9876543210", salt=salt)

        self.assertTrue(id1.startswith("ONC-PAT-"))
        self.assertEqual(id1, id2, "El mismo ID debe generar el mismo seudónimo determinista")
        self.assertNotEqual(id1, id3, "IDs diferentes deben generar seudónimos distintos")
        self.assertNotIn("1144123456", id1, "La cédula no debe estar expuesta en el seudónimo")

    def test_sanitize_filename_removes_personal_names(self):
        """Verifica que el nombre del archivo no contenga nombres del paciente."""
        original = "CARLOS_PEREZ_TAC_TORAX.dcm"
        sanitized = sanitize_filename(original)

        self.assertTrue(sanitized.startswith("study_"))
        self.assertTrue(sanitized.endswith(".dcm"))
        self.assertNotIn("CARLOS", sanitized)
        self.assertNotIn("PEREZ", sanitized)

    def test_deidentify_dataset_purges_phi_and_preserves_physics(self):
        """Verifica que se limpie el PHI mientras los parámetros físicos y clínicos quedan intactos."""
        ds = create_sample_dicom()
        cleaned_ds, audit = deidentify_dataset(ds, salt="test-salt")

        # 1. Verificación de PHI purgado o seudonimizado
        self.assertEqual(cleaned_ds.PatientName, ANONYMIZED_PATIENT_NAME)
        self.assertTrue(str(cleaned_ds.PatientID).startswith("ONC-PAT-"))
        self.assertNotIn("1144123456", str(cleaned_ds.PatientID))
        self.assertEqual(cleaned_ds.InstitutionName, "")
        self.assertEqual(cleaned_ds.InstitutionAddress, "")
        self.assertEqual(cleaned_ds.ReferringPhysicianName, "")
        self.assertEqual(cleaned_ds.OperatorsName, "")
        self.assertEqual(cleaned_ds.StudyDescription, DEFAULT_STUDY_DESCRIPTION)

        # 2. Verificación de fecha de nacimiento truncada a año
        self.assertEqual(cleaned_ds.PatientBirthDate, "19600101")
        self.assertEqual(cleaned_ds.PatientAge, "066Y")  # 2026 - 1960 = 66 años calculados

        # 3. Verificación de Preservación de Parámetros Físicos y Clínicos
        self.assertEqual(cleaned_ds.Modality, "CT")
        self.assertEqual(cleaned_ds.StudyDate, "20261005")
        self.assertEqual(cleaned_ds.PatientSex, "M")
        self.assertEqual(cleaned_ds.SliceThickness, "1.25")
        self.assertEqual(cleaned_ds.KVP, "120")
        self.assertEqual(cleaned_ds.RescaleIntercept, "-1024.0")
        self.assertEqual(cleaned_ds.RescaleSlope, "1.0")
        self.assertEqual(cleaned_ds.WindowCenter, "-600")
        self.assertEqual(cleaned_ds.WindowWidth, "1500")
        self.assertEqual(cleaned_ds.PixelSpacing, ["0.70", "0.70"])
        self.assertEqual(cleaned_ds.Rows, 512)
        self.assertEqual(cleaned_ds.Columns, 512)
        self.assertEqual(len(cleaned_ds.PixelData), 512 * 512 * 2)

        # 4. Auditoría
        self.assertTrue(audit["had_patient_name"])
        self.assertTrue(audit["had_patient_id"])
        self.assertEqual(audit["study_date"], "20261005")

    def test_deidentify_dicom_bytes_end_to_end(self):
        """Verifica la serialización y deserialización binaria en memoria."""
        ds = create_sample_dicom()
        raw_buffer = io.BytesIO()
        ds.save_as(raw_buffer)
        raw_bytes = raw_buffer.getvalue()

        clean_bytes, audit = deidentify_dicom_bytes(raw_bytes, salt="test-salt")
        self.assertGreater(len(clean_bytes), 0)

        # Re-parsear los bytes limpios para asegurar que son un DICOM válido
        reparsed = pydicom.dcmread(io.BytesIO(clean_bytes))
        self.assertEqual(reparsed.PatientName, ANONYMIZED_PATIENT_NAME)
        self.assertTrue(str(reparsed.PatientID).startswith("ONC-PAT-"))
        self.assertEqual(reparsed.RescaleIntercept, "-1024.0")

        # Verificación de hashes criptográficos y cumplimiento normativo
        self.assertIn("source_sha256", audit)
        self.assertIn("sanitized_sha256", audit)
        self.assertEqual(len(audit["source_sha256"]), 64)
        self.assertEqual(len(audit["sanitized_sha256"]), 64)
        self.assertNotEqual(audit["source_sha256"], audit["sanitized_sha256"])
        self.assertTrue(audit["zero_retention_verified"])
        self.assertIn("Ley 1581 de 2012 (Habeas Data Clínico)", audit["normative_compliance"])


if __name__ == "__main__":
    unittest.main()
