"""Fábrica compartida de DICOM sintéticos para las pruebas."""

from __future__ import annotations

import io
from typing import Optional

from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian


def make_test_dicom_bytes(
    modality: str = "CT",
    patient_id: str = "CC-1144123456",
    patient_name: str = "PEREZ^CARLOS ALBERTO",
    study_date: str = "20261005",
    series_uid: Optional[str] = None,
    z: Optional[float] = None,
    rows: int = 64,
    columns: int = 64,
) -> bytes:
    """Genera bytes de un archivo DICOM válido con los tags requeridos."""
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
    file_meta.MediaStorageSOPInstanceUID = "1.2.840.10008.5.1.4.1.1.2.999"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset("test.dcm", {}, file_meta=file_meta, preamble=b"\x00" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.Modality = modality
    ds.PatientID = patient_id
    ds.PatientName = patient_name
    ds.StudyInstanceUID = "1.2.840.10008.5.1.4.1.1.2.1"
    ds.SOPInstanceUID = "1.2.840.10008.5.1.4.1.1.2.999"
    if series_uid is not None:
        ds.SeriesInstanceUID = series_uid
    if z is not None:
        ds.ImagePositionPatient = [0.0, 0.0, float(z)]
    ds.StudyDate = study_date
    ds.Rows = rows
    ds.Columns = columns
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 1
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b"\x00" * (rows * columns * 2)

    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()
