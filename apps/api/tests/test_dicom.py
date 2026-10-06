"""Tests del router /api/v1/dicom/upload con soporte para PNG, JPG y DICOM desidentificado."""

from __future__ import annotations

import io
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian


def _create_test_dicom_bytes(
    modality: str = "CT",
    patient_id: str = "CC-1144123456",
    patient_name: str = "PEREZ^CARLOS ALBERTO",
    study_date: str = "20261005",
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
    ds.StudyDate = study_date
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 1
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = b"\x00" * (64 * 64 * 2)

    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()


def test_dicom_upload_sin_auth_devuelve_401(client):
    response = client.post(
        "/api/v1/dicom/upload",
        files={"file": ("scan.png", b"fake-bytes", "image/png")},
    )
    assert response.status_code == 401


def test_dicom_upload_extension_invalida_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.exe", b"PE\x00\x00", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Formato no soportado" in response.json().get("detail", "")


def test_dicom_upload_archivo_vacio_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.png", b"", "image/png")},
    )
    assert response.status_code == 400


def test_dicom_upload_png_acepta_y_persiste(client, auth_headers, supabase_mock):
    """Subir un .png válido devuelve 200, file_type='image' y persiste en storage."""
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.png", b"\x89PNG\r\n\x1a\nfake-png-bytes", "image/png")},
        data={"case_ref": "case-test-png-001"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "scan.png"
    assert payload["file_type"] == "image"
    assert payload["modality"] == "IMG"
    assert payload["case_ref"] == "case-test-png-001"
    assert supabase_mock.storage.from_().upload.called


def test_dicom_upload_jpg_acepta_y_persiste(client, auth_headers, supabase_mock):
    """Subir un .jpg válido devuelve 200, file_type='image' y persiste en storage."""
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("tomografia.jpg", b"\xff\xd8\xff\xe0fake-jpg-bytes", "image/jpeg")},
        data={"case_ref": "case-test-jpg-002"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "tomografia.jpg"
    assert payload["file_type"] == "image"
    assert payload["modality"] == "IMG"
    assert payload["case_ref"] == "case-test-jpg-002"
    assert supabase_mock.storage.from_().upload.called


def test_dicom_upload_dcm_desidentifica_en_origen_y_persiste(client, auth_headers, supabase_mock):
    """Subir un .dcm purga PHI, seudonimiza el ID del paciente y guarda bytes limpios."""
    dcm_bytes = _create_test_dicom_bytes(
        modality="CT",
        patient_id="CC-1144123456",
        patient_name="PEREZ^CARLOS ALBERTO",
        study_date="20261005",
    )

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("estudio_pulmon.dcm", dcm_bytes, "application/dicom")},
        data={"case_ref": "case-test-dcm-003"},
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["filename"] == "estudio_pulmon.dcm"
    assert payload["file_type"] == "dicom"
    assert payload["modality"] == "CT"
    assert payload["study_date"] == "20261005"

    # Verificar seudonimización del PatientID en BD
    assert payload["patient_id_dicom"].startswith("ONC-PAT-")
    assert "1144123456" not in payload["patient_id_dicom"]

    # Verificar que el archivo subido a Storage NO contiene el nombre ni la cédula original
    assert supabase_mock.storage.from_().upload.called
    upload_call_kwargs = supabase_mock.storage.from_().upload.call_args.kwargs
    uploaded_file_bytes = upload_call_kwargs["file"]

    # Parsear los bytes que llegaron a Storage
    uploaded_ds = pydicom.dcmread(io.BytesIO(uploaded_file_bytes))
    assert uploaded_ds.PatientName == "ONCOSCAN-ANON"
    assert str(uploaded_ds.PatientID).startswith("ONC-PAT-")
    assert "1144123456" not in str(uploaded_ds.PatientID)
    assert uploaded_ds.StudyDate == "20261005"
    assert uploaded_ds.Modality == "CT"


def test_dicom_upload_dcm_modalidad_no_ct_devuelve_400(client, auth_headers):
    """Subir un .dcm de resonancia (MR) o rayos X (XR) es rechazado."""
    mr_bytes = _create_test_dicom_bytes(modality="MR")

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("cerebro_rm.dcm", mr_bytes, "application/dicom")},
    )
    assert response.status_code == 400
    assert "Modalidad MR no soportada" in response.json().get("detail", "")
