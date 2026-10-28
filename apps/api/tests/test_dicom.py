"""Tests del router /api/v1/dicom/upload con soporte para PNG, JPG y DICOM desidentificado."""

from __future__ import annotations

import io
import logging
from contextlib import contextmanager
from types import SimpleNamespace

import httpx
import pydicom
import pytest

import app.api.v1.routers.dicom as dicom_module
from app.core.logging import _JsonFormatter, hash_id
from tests.dicom_factory import make_test_dicom_bytes

VOLUME_GATE_DETAIL = "La carga de series ZIP y volúmenes NIfTI no está habilitada en este entorno."


@pytest.fixture
def volume_uploads_on(monkeypatch):
    """Habilita la carga y el análisis de series ZIP y volúmenes NIfTI."""
    monkeypatch.setenv("VOLUME_UPLOADS_ENABLED", "true")


@pytest.fixture
def volume_uploads_off(monkeypatch):
    """Simula producción: la variable no está definida."""
    monkeypatch.delenv("VOLUME_UPLOADS_ENABLED", raising=False)


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

    audit_rows = [
        c.args[0]
        for c in supabase_mock.table().insert.call_args_list
        if c.args and "tags_cleared_count" in c.args[0]
    ]
    assert audit_rows, "no se insertó la auditoría"
    # El archivo queda en Storage: no se afirma retención cero.
    assert audit_rows[0]["zero_retention_verified"] is False


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


def test_dicom_upload_zip_multicorte_acepta_y_extrae_volumen(client, auth_headers, supabase_mock, volume_uploads_on):
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


def test_dicom_upload_zip_sin_dicoms_devuelve_400(client, auth_headers, volume_uploads_on):
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



def test_dicom_upload_nii_acepta_y_extrae_volumen(client, auth_headers, supabase_mock, volume_uploads_on):
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


def test_dicom_upload_nii_desidentifica_cabecera(client, auth_headers, supabase_mock, volume_uploads_on):
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


def test_dicom_upload_zip_varias_series_devuelve_400(client, auth_headers, volume_uploads_on):
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


# ── VOLUME_UPLOADS_ENABLED: series y volúmenes solo donde hay RAM ────────────


def _zip_de_tres_cortes() -> bytes:
    import zipfile

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        for i in range(3):
            zf.writestr(f"slice_{i:04d}.dcm", make_test_dicom_bytes(series_uid="1.2.3.4", z=float(i)))
    return zip_buf.getvalue()


def _nifti_gz() -> bytes:
    import gzip

    import nibabel as nib
    import numpy as np

    img = nib.Nifti1Image(np.full((8, 8, 3), -600.0, dtype=np.float32), np.eye(4))
    return gzip.compress(img.to_bytes())


@pytest.mark.parametrize(
    ("filename", "content_fn", "content_type"),
    [
        ("serie.zip", _zip_de_tres_cortes, "application/zip"),
        ("torax.nii.gz", _nifti_gz, "application/gzip"),
        ("TORAX.NII", lambda: b"\x00" * 400, "application/octet-stream"),
    ],
    ids=["zip", "nii.gz", "nii"],
)
def test_upload_volumen_con_bandera_apagada_devuelve_400(
    client, auth_headers, supabase_mock, volume_uploads_off, filename, content_fn, content_type
):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": (filename, content_fn(), content_type)},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == VOLUME_GATE_DETAIL
    assert not supabase_mock.storage.from_().upload.called
    assert not supabase_mock.table().insert.called


def test_upload_dcm_sigue_funcionando_con_bandera_apagada(client, auth_headers, supabase_mock, volume_uploads_off):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("estudio.dcm", make_test_dicom_bytes(), "application/dicom")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["file_type"] == "dicom"
    assert supabase_mock.storage.from_().upload.called


def test_upload_png_sigue_funcionando_con_bandera_apagada(client, auth_headers, supabase_mock, volume_uploads_off):
    response = client.post(
        "/api/v1/dicom/upload",
        headers=auth_headers,
        files={"file": ("scan.png", b"\x89PNG\r\n\x1a\nfake-png-bytes", "image/png")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["file_type"] == "image"
    assert supabase_mock.storage.from_().upload.called


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


def test_analyze_zip_devuelve_corte_fuente(client, auth_headers, supabase_mock, monkeypatch, volume_uploads_on):
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


@pytest.mark.parametrize(
    ("original_name", "file_type"),
    [("serie.zip", "dicom_series"), ("torax.nii.gz", "nifti_volume")],
    ids=["zip", "nii.gz"],
)
def test_analyze_volumen_con_bandera_apagada_devuelve_400_sin_descargar(
    client, auth_headers, supabase_mock, monkeypatch, volume_uploads_off, original_name, file_type
):
    sent = _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name=original_name, file_type=file_type, file_bytes=b"no-se-descarga",
        metadata_json={"volume_metadata": {"num_slices": 3}},
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == VOLUME_GATE_DETAIL
    assert not supabase_mock.storage.from_().download.called
    assert sent == []


# ── /api/v1/dicom/analyze/{id}: errores tipados y logs sin PHI ───────────────

_FAKE_REQUEST = httpx.Request("POST", "https://ia.invalid/predict")


def _prepare_failing_analysis(supabase_mock, monkeypatch, exc):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )

    async def failing_post_predict(file, features):
        raise exc

    monkeypatch.setattr(dicom_module, "post_predict", failing_post_predict)


def _ai_errors(supabase_mock):
    return [u["ai_error"] for u in _updates(supabase_mock) if "ai_error" in u]


@contextmanager
def _capture_oncoscan_logs(caplog):
    """`configure_logging` pone `propagate=False` en el logger `oncoscan`; se engancha el handler de caplog."""
    oncoscan_logger = logging.getLogger("oncoscan")
    previous_level = oncoscan_logger.level
    oncoscan_logger.addHandler(caplog.handler)
    oncoscan_logger.setLevel(logging.DEBUG)
    try:
        yield caplog.records
    finally:
        oncoscan_logger.removeHandler(caplog.handler)
        oncoscan_logger.setLevel(previous_level)


def _rendered(record):
    """Texto que el logger emite en producción más los campos estructurados del registro."""
    return _JsonFormatter().format(record) + repr(getattr(record, "extra_fields", {}))


@pytest.mark.parametrize(
    ("exc", "status", "detail", "ai_error"),
    [
        (
            httpx.ConnectError("x"),
            503,
            "No se pudo conectar con el servicio de IA. Intenta de nuevo en unos segundos.",
            "ConnectError",
        ),
        (
            httpx.ReadTimeout("x"),
            504,
            "El servicio de IA tardó demasiado en responder. Intenta de nuevo.",
            "TimeoutException",
        ),
        (
            httpx.HTTPStatusError(
                "x", request=_FAKE_REQUEST, response=httpx.Response(500, request=_FAKE_REQUEST)
            ),
            502,
            "El servicio de IA respondió con error 500.",
            "HTTPStatusError 500",
        ),
        (
            httpx.RemoteProtocolError("x"),
            502,
            "Error comunicando con el servicio de IA.",
            "RemoteProtocolError",
        ),
        (
            RuntimeError("/ruta/secreta/paciente.dcm"),
            500,
            "Error en análisis",
            "RuntimeError",
        ),
    ],
    ids=["connect", "timeout", "http-status-500", "http-error", "inesperado"],
)
def test_analyze_errores_tipados(client, auth_headers, supabase_mock, monkeypatch, exc, status, detail, ai_error):
    _prepare_failing_analysis(supabase_mock, monkeypatch, exc)
    response = _analyze(client, auth_headers)
    assert response.status_code == status, response.text
    assert response.json()["detail"] == detail
    assert _ai_errors(supabase_mock) == [ai_error]
    assert any(u.get("upload_status") == "error" for u in _updates(supabase_mock))


def test_analyze_volumen_sin_keyframe_en_modo_source_devuelve_502(client, auth_headers, supabase_mock, monkeypatch, volume_uploads_on):
    import zipfile

    monkeypatch.setenv("AI_INPUT_MODE", "source")
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        for i in range(3):
            zf.writestr(f"slice_{i:04d}.dcm", make_test_dicom_bytes(series_uid="1.2.3.4", z=float(i)))
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="serie.zip", file_type="dicom_series", file_bytes=zip_buf.getvalue(),
        metadata_json={"volume_metadata": {"num_slices": 3}},
    )
    response = _analyze(client, auth_headers)
    assert response.status_code == 502, response.text
    assert response.json()["detail"] == "El modelo no devolvió el corte canónico del volumen"
    assert any(u.get("upload_status") == "error" for u in _updates(supabase_mock))


def test_analyze_respuesta_vacia_de_la_ia_devuelve_502(client, auth_headers, supabase_mock, monkeypatch):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )

    async def empty_post_predict(file, features):
        return {}

    monkeypatch.setattr(dicom_module, "post_predict", empty_post_predict)
    response = _analyze(client, auth_headers)
    assert response.status_code == 502, response.text
    assert response.json()["detail"] == "No se obtuvo respuesta del modelo de IA"


def test_analyze_no_registra_ruta_en_logs(client, auth_headers, supabase_mock, monkeypatch, caplog):
    _prepare_failing_analysis(supabase_mock, monkeypatch, RuntimeError("/ruta/secreta/paciente.dcm"))
    with _capture_oncoscan_logs(caplog) as records:
        response = _analyze(client, auth_headers)
    assert response.status_code == 500
    assert "/ruta/secreta" not in response.text
    failed = [r for r in records if r.getMessage() == "dicom_analysis_failed"]
    assert len(failed) == 1, "El fallo del análisis debe quedar registrado"
    assert failed[0].levelname == "ERROR"
    assert failed[0].extra_fields == {
        "error_type": "RuntimeError",
        "upload_id_hash": hash_id("upload-uuid-test"),
    }
    for record in records:
        assert "/ruta/secreta" not in _rendered(record), record.getMessage()


def test_analyze_signed_url_fallida_registra_solo_tipo_de_error(client, auth_headers, supabase_mock, monkeypatch, caplog):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )
    supabase_mock.storage.from_().create_signed_url.side_effect = RuntimeError("/ruta/secreta/obj.preview.png")
    with _capture_oncoscan_logs(caplog) as records:
        response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["original_signed_url"] is None
    failed = [r for r in records if r.getMessage() == "signed_url_failed"]
    assert len(failed) == 1
    assert failed[0].levelname == "ERROR"
    assert failed[0].extra_fields == {"error_type": "RuntimeError"}
    for record in records:
        assert "/ruta/secreta" not in _rendered(record), record.getMessage()


def test_analyze_exitoso_registra_dicom_analysis_completed(client, auth_headers, supabase_mock, monkeypatch, caplog):
    monkeypatch.delenv("AI_INPUT_MODE", raising=False)
    monkeypatch.delenv("HF_MODEL_VERSION", raising=False)
    _prepare_analysis(
        supabase_mock, monkeypatch,
        original_name="estudio.dcm", file_type="dicom", file_bytes=make_test_dicom_bytes(),
    )
    with _capture_oncoscan_logs(caplog) as records:
        response = _analyze(client, auth_headers)
    assert response.status_code == 200, response.text
    completed = [r for r in records if r.getMessage() == "dicom_analysis_completed"]
    assert len(completed) == 1
    fields = completed[0].extra_fields
    assert fields["upload_id_hash"] == hash_id("upload-uuid-test")
    assert fields["model_version"] == "oncoscan-ai@multimodal-v1.2"
    assert isinstance(fields["inference_time_ms"], int)
    assert set(fields) == {"upload_id_hash", "inference_time_ms", "model_version"}
