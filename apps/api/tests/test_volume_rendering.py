"""Regression checks for the physical geometry and GPU atlas data contract."""
import numpy as np
import pydicom
import pytest
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian

from app.services.volume_geometry import dicom_volume_metadata


def _slice(z=0, hu=-780):
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds = FileDataset("slice.dcm", {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.Rows, ds.Columns = 8, 12
    ds.ImagePositionPatient = [0, 0, z]
    ds.PixelSpacing = [0.8, 0.6]
    ds.SliceThickness = 1.25
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated, ds.BitsStored, ds.HighBit, ds.PixelRepresentation = 16, 16, 15, 1
    ds.RescaleSlope, ds.RescaleIntercept = 1, -1024
    ds.WindowCenter, ds.WindowWidth = -500, 1000  # Scanner preset must not change atlas encoding.
    ds.PixelData = np.full((8, 12), hu + 1024, dtype="<i2").tobytes()
    return ds


def test_slice_spacing_uses_positions_and_keeps_thickness_separate():
    meta = dicom_volume_metadata([_slice(0), _slice(2.5), _slice(5)])
    assert meta["slice_spacing"] == 2.5
    assert meta["slice_thickness"] == 1.25
    assert meta["pixel_spacing"] == [0.8, 0.6]
    assert (meta["rows"], meta["columns"]) == (8, 12)
    assert meta["slice_order"] == "inferior_to_superior"


@pytest.mark.parametrize("positions", [[0, 0, 2.5], [0, 2.5, 10]])
def test_irregular_series_cannot_be_treated_as_uniform(positions):
    meta = dicom_volume_metadata([_slice(z) for z in positions])
    assert "espaciado irregular" in meta["geometry_error"]


def test_nonstandard_orientation_is_reported_to_viewer():
    ds = _slice()
    ds.ImageOrientationPatient = [0, 1, 0, -1, 0, 0]
    assert "orientación DICOM" in dicom_volume_metadata([ds])["geometry_error"]


def test_missing_geometry_does_not_invent_millimetres():
    ds = _slice()
    del ds.PixelSpacing
    del ds.SliceThickness
    meta = dicom_volume_metadata([ds])
    assert meta["pixel_spacing"] is None
    assert meta["slice_spacing"] is None


def test_endpoints_de_atlas_retirados(client, auth_headers):
    assert client.get("/api/v1/dicom/x/atlas", headers=auth_headers).status_code == 404


@pytest.mark.parametrize("oblique", [False, True])
def test_nifti_upload_exposes_row_column_spacing_after_canonicalization(
    client, auth_headers, tmp_path, monkeypatch, oblique
):
    import nibabel as nib
    monkeypatch.setenv("VOLUME_UPLOADS_ENABLED", "true")
    volume = np.full((10, 12, 4), -780, dtype=np.float32)
    path = tmp_path / "volume.nii"
    affine = np.diag([2.0, 3.0, 4.0, 1.0])
    if oblique:
        angle = np.deg2rad(10)
        rotation = np.array([[1, 0, 0, 0], [0, np.cos(angle), -np.sin(angle), 0],
                             [0, np.sin(angle), np.cos(angle), 0], [0, 0, 0, 1]])
        affine = rotation @ affine
    nib.save(nib.Nifti1Image(volume, affine), path)
    response = client.post("/api/v1/dicom/upload", headers=auth_headers,
                           files={"file": (path.name, path.read_bytes(), "application/octet-stream")})
    assert response.status_code == 200
    meta = response.json()["volume_metadata"]
    assert meta["pixel_spacing"] == [3, 2]
    assert [meta["rows"], meta["columns"], meta["num_slices"]] == [12, 10, 4]
    assert meta["slice_spacing"] == 4
    if oblique:
        assert "oblicuo" in meta["geometry_error"]
    else:
        assert meta["geometry_error"] is None


def test_synthetic_phantom_changes_silhouette_along_z():
    import runpy
    from pathlib import Path
    generator = runpy.run_path(str(Path(__file__).resolve().parents[3] / "scripts/create_test_samples.py"))
    generate = generator["generate_realistic_chest_ct_hu"]
    lung_areas = []
    for z in (0.0, 0.08, 0.5, 0.92, 1.0):
        hu = generate(dim=64, z_ratio=z, has_nodule=False)
        lung_areas.append(int(np.count_nonzero((hu > -950) & (hu < -500))))
    assert lung_areas[0] == lung_areas[-1] == 0
    assert lung_areas[2] > lung_areas[1] > 0
    assert lung_areas[2] > lung_areas[3] > 0
