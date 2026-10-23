"""Desidentificación de la cabecera NIfTI."""

from __future__ import annotations

import gzip

import nibabel as nib
import numpy as np
import pytest
from nibabel.nifti1 import Nifti1Extension

from app.services.nifti_deid import deidentify_nifti_bytes


def _nifti_con_phi() -> nib.Nifti1Image:
    rng = np.random.default_rng(0)
    data = rng.normal(-600, 50, size=(4, 4, 3)).astype(np.float32)
    affine = np.diag([0.7, 0.8, 1.25, 1.0])
    img = nib.Nifti1Image(data, affine)
    img.header["descrip"] = b"PACIENTE^PRUEBA"
    img.header["aux_file"] = b"CC-123"
    img.header.extensions.append(Nifti1Extension("comment", b"PatientName=X"))
    return img


def _bytes(img: nib.Nifti1Image, gzipped: bool) -> bytes:
    raw = img.to_bytes()
    return gzip.compress(raw) if gzipped else raw


def _leer(data: bytes, gzipped: bool) -> nib.Nifti1Image:
    return nib.Nifti1Image.from_bytes(gzip.decompress(data) if gzipped else data)


def test_limpia_campos_y_extensiones_y_cuenta_tres():
    img = _nifti_con_phi()
    out, audit = deidentify_nifti_bytes(_bytes(img, True), gzipped=True)
    clean = _leer(out, True)
    assert bytes(clean.header["descrip"]).strip(b"\x00") == b""
    assert bytes(clean.header["aux_file"]).strip(b"\x00") == b""
    assert bytes(clean.header["db_name"]).strip(b"\x00") == b""
    assert len(clean.header.extensions) == 0
    assert audit["tags_cleared_count"] == 3


def test_voxeles_y_affine_identicos():
    # Se compara contra el original ya releído: pixdim se guarda en float32.
    src = _bytes(_nifti_con_phi(), True)
    img = _leer(src, True)
    out, _ = deidentify_nifti_bytes(src, gzipped=True)
    clean = _leer(out, True)
    np.testing.assert_array_equal(np.asarray(clean.dataobj), np.asarray(img.dataobj))
    np.testing.assert_array_equal(clean.affine, img.affine)


def test_auditoria_claves_y_hashes():
    src = _bytes(_nifti_con_phi(), True)
    out, audit = deidentify_nifti_bytes(src, gzipped=True)
    assert audit["sanitized_sha256"] != audit["source_sha256"]
    assert audit["pseudonymized_patient_id"].startswith("ONC-NII-")
    assert "deidentified_at" in audit
    assert audit["normative_compliance"] == (
        "NIfTI: descrip, aux_file, db_name y extensiones de cabecera eliminados"
    )
    # El archivo se conserva en Storage: no se afirma retención cero.
    assert "zero_retention_verified" not in audit


def test_sin_gzip_la_salida_no_es_gzip():
    out, _ = deidentify_nifti_bytes(_bytes(_nifti_con_phi(), False), gzipped=False)
    assert not out.startswith(b"\x1f\x8b")
    assert len(_leer(out, False).header.extensions) == 0


def test_con_gzip_la_salida_es_gzip():
    out, _ = deidentify_nifti_bytes(_bytes(_nifti_con_phi(), True), gzipped=True)
    assert out.startswith(b"\x1f\x8b")


def test_cabecera_sin_phi_cuenta_cero():
    img = nib.Nifti1Image(np.zeros((2, 2, 2), dtype=np.float32), np.eye(4))
    _, audit = deidentify_nifti_bytes(_bytes(img, False), gzipped=False)
    assert audit["tags_cleared_count"] == 0


def test_bomba_gzip_se_rechaza_sin_materializarla():
    bomba = gzip.compress(bytes(2_000_000))
    with pytest.raises(ValueError, match="supera el tamaño máximo"):
        deidentify_nifti_bytes(bomba, gzipped=True, max_uncompressed=1_000_000)


def test_archivo_bajo_el_limite_sigue_funcionando():
    src = _bytes(_nifti_con_phi(), True)
    out, audit = deidentify_nifti_bytes(src, gzipped=True, max_uncompressed=1_000_000)
    assert audit["tags_cleared_count"] == 3
    assert out.startswith(b"\x1f\x8b")


def test_gzip_truncado_es_invalido():
    src = _bytes(_nifti_con_phi(), True)
    with pytest.raises(ValueError, match="El archivo NIfTI no es válido."):
        deidentify_nifti_bytes(src[: len(src) // 2], gzipped=True)


@pytest.mark.parametrize("gzipped", [True, False])
def test_bytes_basura_lanza_value_error(gzipped):
    with pytest.raises(ValueError, match="El archivo NIfTI no es válido."):
        deidentify_nifti_bytes(b"esto no es un nifti" * 50, gzipped=gzipped)
