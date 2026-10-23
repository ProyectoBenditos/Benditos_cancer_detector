"""Tests del router /api/v1/dicom/upload con soporte para PNG, JPG y DICOM desidentificado."""

from __future__ import annotations

import io
from types import SimpleNamespace

import pydicom

import app.api.v1.routers.dicom as dicom_module
from tests.dicom_factory import make_test_dicom_bytes


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
    dcm_bytes = make_test_dicom_bytes(
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
    mr_bytes = make_test_dicom_bytes(modality="MR")

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("cerebro_rm.dcm", mr_bytes, "application/dicom")},
    )
    assert response.status_code == 400
    assert "Modalidad MR no soportada" in response.json().get("detail", "")


def test_dicom_upload_zip_multicorte_acepta_y_extrae_volumen(client, auth_headers, supabase_mock):
    """Subir un .zip con múltiples cortes CT genera file_type='dicom_series' y metadata 3D."""
    import zipfile

    slice1 = make_test_dicom_bytes(modality="CT", patient_id="CC-998877")
    slice2 = make_test_dicom_bytes(modality="CT", patient_id="CC-998877")
    slice3 = make_test_dicom_bytes(modality="CT", patient_id="CC-998877")

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("slice_001.dcm", slice1)
        zf.writestr("slice_002.dcm", slice2)
        zf.writestr("slice_003.dcm", slice3)

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("serie_torax_160cortes.zip", zip_buf.getvalue(), "application/zip")},
        data={"case_ref": "case-test-multislice-3d"},
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["filename"] == "serie_torax_160cortes.zip"
    assert payload["file_type"] == "dicom_series"
    assert payload["modality"] == "CT"
    assert payload["patient_id_dicom"].startswith("ONC-PAT-")
    assert payload["volume_metadata"] is not None
    assert payload["volume_metadata"]["num_slices"] == 3
    assert payload["volume_metadata"]["window_center"] == -600.0
    assert payload["volume_metadata"]["window_width"] == 1500.0
    assert supabase_mock.storage.from_().upload.called


def test_dicom_upload_zip_sin_dicoms_devuelve_400(client, auth_headers):
    """Subir un .zip que no contiene archivos DICOM devuelve error 400 explicativo."""
    import zipfile

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("documento.txt", b"este es un texto plano no dicom")

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("invalido.zip", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "no contiene cortes tomográficos" in response.json().get("detail", "")



def test_dicom_upload_nii_acepta_y_extrae_volumen(client, auth_headers, supabase_mock):
    """Subir un .nii.gz 3D procesa cortes en HU, genera Texture Atlas y volumen 3D."""
    import os
    import nibabel as nib
    import numpy as np
    import tempfile

    vol = np.zeros((64, 64, 5), dtype=np.float32) - 1000.0  # Aire
    vol[16:48, 16:48, :] = -600.0  # Pulmón
    vol[30:35, 30:35, 2] = 50.0   # Nódulo hiperdenso

    nii = nib.Nifti1Image(vol, affine=np.eye(4))
    with tempfile.NamedTemporaryFile(suffix=".nii.gz", delete=False) as tmp:
        nib.save(nii, tmp.name)
        tmp_name = tmp.name

    try:
        with open(tmp_name, "rb") as f:
            nii_bytes = f.read()
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("torax_volumen.nii.gz", nii_bytes, "application/gzip")},
        data={"case_ref": "case-test-nii-001"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "torax_volumen.nii.gz"
    assert payload["file_type"] == "nifti_volume"
    assert payload["modality"] == "CT"
    assert payload["volume_metadata"] is not None
    assert payload["volume_metadata"]["num_slices"] == 5
    assert payload["volume_metadata"]["format"] == "NIfTI-1"
    assert supabase_mock.storage.from_().upload.called


def test_dicom_upload_nii_desidentifica_cabecera(client, auth_headers, supabase_mock):
    """La cabecera NIfTI se limpia antes de guardar y la auditoría refleja lo limpiado."""
    import gzip

    import nibabel as nib
    import numpy as np

    img = nib.Nifti1Image(np.full((8, 8, 3), -600.0, dtype=np.float32), np.eye(4))
    img.header["descrip"] = b"PACIENTE^PRUEBA"
    nii_bytes = gzip.compress(img.to_bytes())

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("torax.nii.gz", nii_bytes, "application/gzip")},
    )
    assert response.status_code == 200

    stored = supabase_mock.storage.from_().upload.call_args.kwargs["file"]
    raw_stored = gzip.decompress(stored)
    stored_img = nib.Nifti1Image.from_bytes(raw_stored)
    assert bytes(stored_img.header["descrip"]).strip(b"\x00") == b""
    assert b"PACIENTE" not in raw_stored

    audit_rows = [
        c.args[0]
        for c in supabase_mock.table().insert.call_args_list
        if c.args and "tags_cleared_count" in c.args[0]
    ]
    assert audit_rows, "no se insertó la auditoría"
    assert audit_rows[0]["tags_cleared_count"] >= 1
    # El archivo queda en Storage: no se afirma retención cero.
    assert audit_rows[0]["zero_retention_verified"] is False


def test_dicom_upload_tar_gz_devuelve_400(client, auth_headers):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("estudio.tar.gz", b"datos", "application/gzip")},
    )
    assert response.status_code == 400
    assert "Formato no soportado" in response.json().get("detail", "")


def test_dicom_upload_mayor_a_50mb_devuelve_413(client, auth_headers):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("a.png", b"0" * (50 * 1024 * 1024 + 1), "image/png")},
    )
    assert response.status_code == 413
    assert response.json().get("detail") == "El archivo supera el máximo de 50 MB."


def test_dicom_upload_zip_varias_series_devuelve_400(client, auth_headers):
    import zipfile

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("a.dcm", make_test_dicom_bytes(series_uid="1.2.3.1", z=1.0))
        zf.writestr("b.dcm", make_test_dicom_bytes(series_uid="1.2.3.2", z=2.0))

    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("dos_series.zip", zip_buf.getvalue(), "application/zip")},
    )
    assert response.status_code == 400
    assert "2 series CT" in response.json().get("detail", "")


# ── /api/v1/dicom/analyze/{id}: contrato con el servicio de IA ───────────────

V12_RESPONSE = {
    "score": 0.7,
    "nivel_riesgo": "ALTO",
    "recomendacion": "r",
    "modelo_version": "multimodal-v1.2",
    "heatmap_base64": "QQ==",
}


def _prepare_analysis(supabase_mock, monkeypatch, *, original_name, file_type, file_bytes, metadata_json=None):
    record = {
        "id": "upload-uuid-test",
        "user_id": "user-uuid-test",
        "original_name": original_name,
        "storage_path": "user-uuid-test/obj",
        "preview_storage_path": None,
        "file_type": file_type,
        "metadata_json": metadata_json or {},
    }
    supabase_mock.table.return_value.execute.return_value = SimpleNamespace(data=record)
    supabase_mock.storage.from_().download.return_value = file_bytes
    supabase_mock.storage.from_().create_signed_url.return_value = {"signedURL": "https://signed.invalid"}

    sent = []

    async def fake_post_predict(file, features):
        sent.append((file, features))
        return dict(V12_RESPONSE)

    monkeypatch.setattr(dicom_module, "post_predict", fake_post_predict)
    return sent


def _analyze(client, auth_headers):
    return client.post("/api/v1/dicom/analyze/upload-uuid-test", headers=auth_headers, json={})


def _updates(supabase_mock):
    return [c.args[0] for c in supabase_mock.table().update.call_args_list if c.args]


def test_analyze_dcm_envia_png_por_defecto(client, auth_headers, supabase_mock, monkeypatch):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    sent = _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    assert len(sent) == 1
    file, features = sent[0]
    assert file.content_type == "image/png"
    assert file.content[:8] == b"\x89PNG\r\n\x1a\n"
    assert "lobar_location" not in features
    payload = response.json()
    assert payload["modelo_version"] == "multimodal-v1.2"
    assert payload["source_slice"] is None


def test_analyze_dcm_envia_fuente_con_ai_input_mode_source(client, auth_headers, supabase_mock, monkeypatch):
    monkeypatch.setenv("AI_INPUT_MODE", "source")
    dcm = make_test_dicom_bytes()
    sent = _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=dcm,
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    file, _ = sent[0]
    assert file.content_type == "application/octet-stream"
    assert file.content == dcm


def test_analyze_respuesta_v12_sin_explicabilidad_guarda_heatmap(client, auth_headers, supabase_mock, monkeypatch):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["heatmap_base64"] == "QQ=="
    assert any(u.get("ai_heatmap_base64") == "QQ==" for u in _updates(supabase_mock))


def test_analyze_guarda_model_version_como_main(client, auth_headers, supabase_mock, monkeypatch):
    """`model_version` = HF_MODEL_VERSION; `ai_model_version` = `modelo_version` de la respuesta."""
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    monkeypatch.delenv("HF_MODEL_VERSION", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    update = next(u for u in _updates(supabase_mock) if "ai_model_version" in u)
    assert update["model_version"] == "oncoscan-ai@multimodal-v1.2"
    assert update["ai_model_version"] == "multimodal-v1.2"
    payload = response.json()
    assert payload["model_version"] == "oncoscan-ai@multimodal-v1.2"
    assert payload["modelo_version"] == "multimodal-v1.2"


def test_analyze_zip_devuelve_corte_fuente(client, auth_headers, supabase_mock, monkeypatch):
    import zipfile

    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        for i in range(5):
            zf.writestr(f"slice_{i:04d}.dcm", make_test_dicom_bytes(series_uid="1.2.3.4", z=float(i)))
    sent = _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="serie.zip", file_type="dicom_series", file_bytes=zip_buf.getvalue(),
        metadata_json={"volume_metadata": {"num_slices": 5}},
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    assert sent[0][0].content_type == "image/png"
    assert response.json()["source_slice"] == {"index": 2, "total": 5}
    assert any(
        (u.get("metadata_json") or {}).get("analysis_source_slice") == 2 for u in _updates(supabase_mock)
    )
