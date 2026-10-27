import pytest

from app.services.upload_types import classify_upload, kind_of_record, volume_uploads_enabled


def test_nii_gz_en_mayusculas_es_volumen_nifti():
    assert classify_upload("ESTUDIO.NII.GZ") == "nifti_volume"


def test_tar_gz_no_se_acepta():
    assert classify_upload("x.tar.gz") is None


def test_gz_suelto_no_se_acepta():
    assert classify_upload("x.gz") is None


def test_dcm_en_mayusculas_es_dicom():
    assert classify_upload("x.DCM") == "dicom"


def test_otras_extensiones():
    assert classify_upload("a.zip") == "dicom_series"
    assert classify_upload("a.nii") == "nifti_volume"
    assert classify_upload("a.png") == "image"
    assert classify_upload("a.JPG") == "image"
    assert classify_upload("a.jpeg") == "image"
    assert classify_upload("a.exe") is None


def test_registro_png_analysis_es_imagen():
    assert kind_of_record({"file_type": "png_analysis", "original_name": "a.png"}) == "image"


def test_registro_dicom_con_nombre_raro_cae_a_imagen():
    assert kind_of_record({"file_type": "dicom", "original_name": "raro.bin"}) == "image"


def test_registro_con_file_type_de_volumen_lo_conserva():
    assert kind_of_record({"file_type": "dicom_series", "original_name": "x.bin"}) == "dicom_series"
    assert kind_of_record({"file_type": "nifti_volume", "original_name": "x.bin"}) == "nifti_volume"


@pytest.mark.parametrize("value", ["true", "TRUE", "True", "1"])
def test_volume_uploads_enabled_con_true_o_1(monkeypatch, value):
    monkeypatch.setenv("VOLUME_UPLOADS_ENABLED", value)
    assert volume_uploads_enabled() is True


@pytest.mark.parametrize("value", ["false", "0", "", "yes", "on"])
def test_volume_uploads_enabled_con_otros_valores(monkeypatch, value):
    monkeypatch.setenv("VOLUME_UPLOADS_ENABLED", value)
    assert volume_uploads_enabled() is False


def test_volume_uploads_enabled_ausente_es_false(monkeypatch):
    monkeypatch.delenv("VOLUME_UPLOADS_ENABLED", raising=False)
    assert volume_uploads_enabled() is False
