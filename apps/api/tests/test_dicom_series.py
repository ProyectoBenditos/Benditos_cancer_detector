import io
import zipfile

import pytest

from app.services import dicom_series
from app.services.dicom_series import MAX_ZIP_ENTRIES, SeriesError, read_ct_series
from tests.dicom_factory import make_test_dicom_bytes


def _zip(entries: dict[str, bytes], compression=zipfile.ZIP_STORED) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=compression) as zf:
        for name, data in entries.items():
            zf.writestr(name, data)
    return buf.getvalue()


def test_lee_cortes_en_carpetas_y_sin_extension_ignorando_macosx():
    data = _zip({
        "serie/a.dcm": make_test_dicom_bytes(z=10.0),
        "serie/B": make_test_dicom_bytes(z=5.0),
        "__MACOSX/serie/._a.dcm": b"basura",
    })
    result = read_ct_series(data)
    assert len(result) == 2
    assert [item[0] for item in result] == [5.0, 10.0]


def _fail_on_read(monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("no debe leer el contenido antes de validar")

    monkeypatch.setattr(zipfile.ZipFile, "read", fail)
    monkeypatch.setattr(zipfile.ZipFile, "open", fail)


def test_rechaza_demasiadas_entradas(monkeypatch):
    data = _zip({f"f{i}.dcm": b"" for i in range(MAX_ZIP_ENTRIES + 1)})
    _fail_on_read(monkeypatch)
    with pytest.raises(SeriesError, match="más de 1000 archivos"):
        read_ct_series(data)


def test_rechaza_tamano_descomprimido_excesivo(monkeypatch):
    data = _zip({"a.dcm": make_test_dicom_bytes()})

    _fail_on_read(monkeypatch)
    with pytest.raises(SeriesError, match="tamaño máximo"):
        read_ct_series(data, max_uncompressed=1000)


def test_rechaza_relacion_de_compresion_sospechosa(monkeypatch):
    data = _zip({"bomba.dcm": b"\x00" * (10 * 1024 * 1024)}, compression=zipfile.ZIP_DEFLATED)
    _fail_on_read(monkeypatch)
    with pytest.raises(SeriesError, match="relación de compresión"):
        read_ct_series(data)


def test_rechaza_varias_series():
    data = _zip({
        "a.dcm": make_test_dicom_bytes(series_uid="1.2.3.1", z=1.0),
        "b.dcm": make_test_dicom_bytes(series_uid="1.2.3.2", z=2.0),
    })
    with pytest.raises(SeriesError, match="varias series"):
        read_ct_series(data)


def test_zip_sin_ct_mantiene_mensaje():
    data = _zip({"a.dcm": make_test_dicom_bytes(modality="MR")})
    with pytest.raises(SeriesError) as exc:
        read_ct_series(data)
    assert str(exc.value) == (
        "El archivo .zip no contiene cortes tomográficos de tórax (CT) válidos en formato DICOM."
    )


def test_constantes():
    assert dicom_series.MAX_UPLOAD_BYTES == 50 * 1024 * 1024
    assert dicom_series.MAX_ZIP_UNCOMPRESSED_BYTES == 300 * 1024 * 1024
    assert dicom_series.MAX_COMPRESSION_RATIO == 100
