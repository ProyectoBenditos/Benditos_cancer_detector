"""Physical metadata shared by DICOM upload and the volume manifest.

The atlas is axial, ordered inferior to superior. Thickness describes acquisition
width; slice_spacing describes the distance between sample centres.
"""
import numpy as np
import pydicom


def dicom_volume_metadata(datasets: list[pydicom.Dataset]) -> dict:
    first = datasets[0]
    count = len(datasets) if len(datasets) > 1 else int(getattr(first, "NumberOfFrames", 1))
    pixel_spacing = getattr(first, "PixelSpacing", None)
    thickness = getattr(first, "SliceThickness", None)
    spacing = getattr(first, "SpacingBetweenSlices", thickness)
    positions = [float(ds.ImagePositionPatient[2]) for ds in datasets
                 if getattr(ds, "ImagePositionPatient", None) is not None]
    geometry_error = None
    if len(positions) == len(datasets) and len(positions) > 1:
        gaps = np.diff(sorted(positions))
        spacing = float(np.median(gaps))
        if spacing <= 0 or not np.allclose(gaps, spacing, rtol=0.05, atol=0.01):
            geometry_error = "La serie tiene cortes duplicados o espaciado irregular; requiere remuestreo antes del renderizado 3D."
    for ds in datasets:
        orientation = getattr(ds, "ImageOrientationPatient", None)
        if orientation is not None and not np.allclose(
            np.asarray(orientation, dtype=float), [1, 0, 0, 0, 1, 0], atol=1e-4
        ):
            geometry_error = "La orientación DICOM requiere remuestreo axial antes del renderizado 3D."
        if (ds.Rows, ds.Columns) != (first.Rows, first.Columns):
            geometry_error = "Los cortes tienen matrices diferentes; requieren remuestreo antes del renderizado 3D."
    return {
        "num_slices": count,
        "rows": int(first.Rows),
        "columns": int(first.Columns),
        "pixel_spacing": [float(v) for v in pixel_spacing] if pixel_spacing else None,
        "slice_thickness": float(thickness) if thickness is not None else None,
        "slice_spacing": abs(float(spacing)) if spacing is not None else None,
        "z_start": min(positions) if positions else None,
        "z_end": max(positions) if positions else None,
        "slice_order": "inferior_to_superior",
        "window_center": -600.0,
        "window_width": 1500.0,
        "intensity_encoding": "lung_window_uint8",
        "hu_min": -1350.0,
        "hu_max": 150.0,
        "geometry_error": geometry_error,
    }
