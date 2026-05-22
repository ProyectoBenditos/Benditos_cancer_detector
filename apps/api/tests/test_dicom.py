"""Tests del router /api/v1/dicom/upload con supabase mockeado."""

from __future__ import annotations


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


def test_dicom_upload_png_acepta_y_persiste(client, auth_headers, supabase_mock):
    """Subir un .png válido devuelve 200 + dicom_id."""
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.png", b"fake-png-bytes", "image/png")},
        data={"case_ref": "case-test-001"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "scan.png"
    assert payload["file_type"] == "image"
    # Verificación de que se invocó al storage
    assert supabase_mock.storage.from_().upload.called


def test_dicom_upload_archivo_vacio_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.png", b"", "image/png")},
    )
    assert response.status_code == 400
