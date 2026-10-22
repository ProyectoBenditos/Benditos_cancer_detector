"""Authorization and spatial registration checks for 3D inference artifacts."""
import io
from types import SimpleNamespace

import nibabel as nib
import numpy as np
import pytest

from app.services.ct_volume import CTVolume, from_nifti, to_nifti, pack_atlas, read_ct


def test_volume_ras_roundtrip_keeps_voxel_identity_and_spacing():
    values = np.arange(3 * 4 * 5, dtype=np.float32).reshape(3, 4, 5)
    volume = CTVolume(values, (2.5, 0.8, 0.6))
    restored = from_nifti(to_nifti(volume))
    np.testing.assert_array_equal(restored.hu, values)
    np.testing.assert_allclose(restored.spacing, volume.spacing)


def test_physical_row_column_spacing_is_not_swapped():
    image = nib.Nifti1Image(np.zeros((5, 7, 3), dtype=np.float32), np.diag([0.6, 0.8, 2.5, 1]))
    volume = from_nifti(image)
    assert volume.hu.shape == (3, 7, 5)
    np.testing.assert_allclose(volume.metadata()["pixel_spacing"], [0.8, 0.6])


def test_label_atlas_keeps_integer_values_and_non_square_tiles():
    labels = np.arange(3 * 4 * 5, dtype=np.uint8).reshape(3, 4, 5) % 6
    atlas = np.asarray(pack_atlas(labels))
    assert atlas.shape == (8, 10)
    np.testing.assert_array_equal(atlas[:4, :5], labels[0])
    np.testing.assert_array_equal(atlas[:4, 5:], labels[1])
    np.testing.assert_array_equal(atlas[4:, :5], labels[2])
    assert not atlas[4:, 5:].any()


def test_nifti_single_slice_is_not_invented_as_a_volume():
    with pytest.raises(ValueError, match="al menos dos"):
        from_nifti(nib.Nifti1Image(np.zeros((5, 7, 1), dtype=np.float32), np.eye(4)))


@pytest.mark.parametrize("path,method", [
    ("/api/v1/dicom/example/volume/prepare", "post"),
    ("/api/v1/dicom/example/volume/jobs/abc", "get"),
    ("/api/v1/dicom/example/volume/artifacts/abc/heatmap.png", "get"),
    ("/api/v1/dicom/example/volume", "get"),
    ("/api/v1/dicom/example/atlas", "get"),
])
def test_volume_artifacts_require_auth(client, path, method):
    assert getattr(client, method)(path).status_code == 401


def test_job_cannot_be_read_for_another_owner(client, auth_headers, supabase_mock):
    supabase_mock.table().execute.return_value = SimpleNamespace(data={"id": "example", "user_id": "someone-else"})
    assert client.get("/api/v1/dicom/example/volume/jobs/abc", headers=auth_headers).status_code == 404


def test_job_must_be_bound_to_the_owned_study(client, auth_headers, supabase_mock, monkeypatch):
    import app.api.v1.routers.volume as volume
    record = {"id": "example", "user_id": "user-uuid-test", "storage_path": "study.zip"}
    supabase_mock.table().execute.return_value = SimpleNamespace(data=record)

    async def foreign_job(_key):
        return {"job_id": "abc", "status": "ready", "manifest": {"study_key": "other-study"}}

    monkeypatch.setattr(volume, "status_from_worker", foreign_job)
    assert client.get("/api/v1/dicom/example/volume/jobs/abc", headers=auth_headers).status_code == 404


def test_ready_job_exposes_authenticated_relative_asset_routes(client, auth_headers, supabase_mock, monkeypatch):
    import app.api.v1.routers.volume as volume
    record = {"id": "example", "user_id": "user-uuid-test", "storage_path": "study.zip"}
    supabase_mock.table().execute.return_value = SimpleNamespace(data=record)

    async def ready_job(_key):
        return {"job_id": "abc", "status": "ready", "manifest": {"study_key": volume.study_key(record),
            "assets": {"atlas": "atlas.png", "lobes": "lobes.png", "heatmap": "heatmap.png"}}}

    monkeypatch.setattr(volume, "status_from_worker", ready_job)
    response = client.get("/api/v1/dicom/example/volume/jobs/abc", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["manifest"]["assets"]["heatmap"] == "/api/v1/dicom/example/volume/artifacts/abc/heatmap.png"


def test_local_volume_processing_rejects_remote_worker(monkeypatch):
    from app.api.v1.routers.volume import local_ml_base
    from fastapi import HTTPException
    monkeypatch.setenv("LOCAL_ML_URL", "https://example.com")
    with pytest.raises(HTTPException):
        local_ml_base()
