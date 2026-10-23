"""One physical coordinate system for CT, masks and attribution volumes.

Internal arrays are [inferior→superior slice, anterior→posterior row,
right→left column]. NIfTI images used by MONAI are canonical RAS [x,y,z].
No lung anatomy or heat is synthesized by this module.
"""
from dataclasses import dataclass
import io
from pathlib import Path
import tempfile

import nibabel as nib
import numpy as np
import pydicom

from app.services.dicom_series import SIZE_LIMIT_MESSAGE, SeriesError, read_ct_series


@dataclass
class CTVolume:
    hu: np.ndarray
    spacing: tuple[float, float, float]  # slice, row, column (mm)

    def metadata(self) -> dict:
        depth, rows, columns = self.hu.shape
        return {
            "num_slices": depth, "rows": rows, "columns": columns,
            "pixel_spacing": list(self.spacing[1:]), "slice_spacing": self.spacing[0],
            "slice_thickness": self.spacing[0], "slice_order": "inferior_to_superior",
            "coordinate_space": "render_voxel_column_row_slice",
            "window_center": -600, "window_width": 1500,
            "hu_min": -1350, "hu_max": 150, "intensity_encoding": "lung_window_uint8",
        }


def from_nifti(image) -> CTVolume:
    canonical = nib.as_closest_canonical(image)
    matrix = canonical.affine[:3, :3]
    if not np.allclose(matrix, np.diag(canonical.header.get_zooms()[:3]), atol=1e-4):
        from nibabel.processing import resample_to_output
        canonical = resample_to_output(canonical, voxel_sizes=canonical.header.get_zooms()[:3], order=1, cval=-1000)
    values = canonical.get_fdata(dtype=np.float32)
    if values.ndim != 3 or min(values.shape) < 2:
        raise ValueError("Se requiere una TC tridimensional con al menos dos cortes.")
    if not np.isfinite(values).all():
        raise ValueError("La TC contiene intensidades no finitas.")
    zooms = canonical.header.get_zooms()[:3]
    if min(zooms) <= 0:
        raise ValueError("El espaciado físico de la TC no es válido.")
    return CTVolume(np.ascontiguousarray(values[::-1, ::-1, :].transpose(2, 1, 0)), tuple(float(v) for v in zooms[::-1]))


def to_nifti(volume: CTVolume):
    ras = volume.hu[:, ::-1, ::-1].transpose(2, 1, 0)
    return nib.Nifti1Image(ras, np.diag([*volume.spacing[::-1], 1.0]))


def read_ct(data: bytes, filename: str) -> CTVolume:
    if filename.lower().endswith((".nii", ".nii.gz")):
        suffix = ".nii.gz" if filename.lower().endswith(".gz") else ".nii"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ("ct" + suffix)
            path.write_bytes(data)
            return from_nifti(nib.load(path, mmap=False))
    if filename.lower().endswith(".zip"):
        try:
            series = read_ct_series(data, max_uncompressed=1_500_000_000)
        except SeriesError as error:
            if str(error) == SIZE_LIMIT_MESSAGE:
                raise ValueError("La serie excede el límite local de 1,5 GB descomprimidos.") from error
            raise
        datasets = [item[2] for item in series]
    elif filename.lower().endswith(".dcm"):
        datasets = [pydicom.dcmread(io.BytesIO(data))]
    else:
        raise ValueError("El volumen requiere una serie DICOM ZIP, DICOM multiframe o NIfTI.")
    if not datasets:
        raise ValueError("No se encontraron cortes CT.")
    first = datasets[0]
    spacing = getattr(first, "PixelSpacing", None)
    orientation = np.asarray(getattr(first, "ImageOrientationPatient", [1, 0, 0, 0, 1, 0]), dtype=float)
    if spacing is None or len(spacing) != 2:
        raise ValueError("Falta PixelSpacing en la serie DICOM.")
    normal = np.cross(orientation[:3], orientation[3:])
    if len(datasets) > 1:
        if any(getattr(ds, "ImagePositionPatient", None) is None for ds in datasets):
            raise ValueError("Falta ImagePositionPatient; no se puede alinear la serie en 3D.")
        datasets.sort(key=lambda ds: float(np.dot(ds.ImagePositionPatient, normal)))
        positions = np.asarray([ds.ImagePositionPatient for ds in datasets], dtype=float)
        deltas = np.diff(positions, axis=0)
        if not np.allclose(deltas, deltas[0], rtol=0.02, atol=0.01) or np.linalg.norm(deltas[0]) <= 0:
            raise ValueError("La serie tiene cortes duplicados o espaciado irregular.")
        slice_vector = deltas[0]
    else:
        count = int(getattr(first, "NumberOfFrames", 1))
        if count < 2:
            raise ValueError("Un corte aislado no contiene anatomía 3D.")
        if getattr(first, "PerFrameFunctionalGroupsSequence", None) is not None:
            raise ValueError("Enhanced multiframe requiere extraer primero su geometría por frame.")
        distance = getattr(first, "SpacingBetweenSlices", getattr(first, "SliceThickness", None))
        if distance is None or float(distance) <= 0:
            raise ValueError("Falta el espaciado entre frames.")
        slice_vector = normal * float(distance)
    pixels = []
    for ds in datasets:
        if (ds.Rows, ds.Columns) != (first.Rows, first.Columns):
            raise ValueError("Los cortes deben compartir matriz.")
        if not np.allclose(np.asarray(getattr(ds, "ImageOrientationPatient", orientation), dtype=float), orientation):
            raise ValueError("Las orientaciones de los cortes no coinciden.")
        if not np.allclose(np.asarray(getattr(ds, "PixelSpacing", spacing), dtype=float), spacing):
            raise ValueError("El espaciado in-plane cambia entre cortes.")
        hu = ds.pixel_array.astype(np.float32) * float(getattr(ds, "RescaleSlope", 1)) + float(getattr(ds, "RescaleIntercept", 0))
        pixels.extend(hu if hu.ndim == 3 else [hu])
    affine = np.eye(4)
    affine[:3, 0] = orientation[:3] * float(spacing[1])
    affine[:3, 1] = orientation[3:] * float(spacing[0])
    affine[:3, 2] = slice_vector
    affine[:3, 3] = np.asarray(getattr(datasets[0], "ImagePositionPatient", [0, 0, 0]), dtype=float)
    affine = np.diag([-1, -1, 1, 1]) @ affine  # LPS -> RAS
    return from_nifti(nib.Nifti1Image(np.stack(pixels, axis=2).transpose(1, 0, 2), affine))


def render_grid(volume: CTVolume, max_xy=384, max_slices=384) -> CTVolume:
    from scipy.ndimage import zoom
    shape = volume.hu.shape
    target = (min(shape[0], max_slices), min(shape[1], max_xy), min(shape[2], max_xy))
    factors = tuple(new / old for new, old in zip(target, shape))
    values = zoom(volume.hu, factors, order=1, prefilter=False) if target != shape else volume.hu.copy()
    spacing = tuple(old_spacing / factor for old_spacing, factor in zip(volume.spacing, factors))
    return CTVolume(np.ascontiguousarray(values), spacing)


def pack_atlas(volume: np.ndarray, labels=False):
    from PIL import Image
    count, height, width = volume.shape
    cols = int(np.ceil(np.sqrt(count)))
    rows = int(np.ceil(count / cols))
    atlas = np.zeros((rows * height, cols * width), dtype=np.uint8)
    values = np.clip(volume, 0, 255).astype(np.uint8)
    for index in range(count):
        row, col = divmod(index, cols)
        atlas[row * height:(row + 1) * height, col * width:(col + 1) * width] = values[index]
    return Image.fromarray(atlas)
