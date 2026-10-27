"""
Generador de fantomas sintéticos para pruebas de OncoScan 2.0.
No son estudios de pacientes ni datos para validar rendimiento clínico.
  1. dicom_unitario_caso01.dcm (DICOM 512x512 con ventana pulmonar, nódulo en LSI)
  2. dicom_multicorte_serie_caso02.zip (30 cortes axiales contiguos con anatomía 3D)
  3. volumen_toracico_caso03.nii.gz (Volumen NIfTI 3D 128x128x32 en HU)
  4. corte_axial_caso04.png (Corte axial PNG de alta resolución)
  5. corte_axial_caso05.jpg (Corte axial JPG)
"""

import os
import io
import math
import zipfile
import numpy as np
from PIL import Image
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian
import nibabel as nib

OUTPUT_DIR = os.path.join(os.getcwd(), "samples", "volume-rendering-v2")


def generate_realistic_chest_ct_hu(dim: int = 512, z_ratio: float = 0.5, has_nodule: bool = True) -> np.ndarray:
    """
    Genera un fantoma axial en HU; z_ratio avanza de inferior a superior.
    Campo de visión XY de 360 mm y cobertura Z de 300 mm.
    """
    rng = np.random.RandomState(42 + int(z_ratio * 100))
    hu = np.full((dim, dim), -1000.0, dtype=np.float32)
    noise = rng.normal(0.0, 5.0, (dim, dim)).astype(np.float32)
    hu += noise

    y, x = np.ogrid[:dim, :dim]
    cx = (x - dim / 2.0) / (dim / 2.0)
    cy = (y - dim / 2.0) / (dim / 2.0)

    # 2. Contorno Corporal y Tejidos Blandos
    body_r = np.sqrt((cx / 0.86) ** 2 + (cy / 0.72) ** 2)
    body_mask = body_r <= 1.0

    # Grasa subcutánea (-90 a -40 HU)
    hu[body_mask] = rng.uniform(-80.0, -40.0, np.count_nonzero(body_mask))

    # Pared muscular y fascia (+35 a +50 HU)
    muscle_mask = (body_r <= 0.94) & body_mask
    hu[muscle_mask] = rng.uniform(35.0, 55.0, np.count_nonzero(muscle_mask))

    # 3. Estructuras Óseas
    # A. Columna Vertebral Posterior
    spine_dist = np.sqrt(cx ** 2 + ((cy - 0.48) / 0.8) ** 2)
    spine_body = spine_dist <= 0.11
    spine_cortex = (spine_dist <= 0.11) & (spine_dist >= 0.08)
    hu[spine_body] = 220.0
    hu[spine_cortex] = 850.0
    canal = np.sqrt(cx ** 2 + ((cy - 0.44) / 0.8) ** 2) <= 0.035
    hu[canal] = -5.0
    spinous = (abs(cx) <= 0.025) & (cy >= 0.54) & (cy <= 0.65)
    hu[spinous] = 750.0

    # B. Esternón Anterior
    sternum = (abs(cx) <= 0.07) & (abs(cy + 0.62) <= 0.03)
    sternum_cortex = sternum & ((abs(cx) >= 0.05) | (abs(cy + 0.62) >= 0.02))
    hu[sternum] = 300.0
    hu[sternum_cortex] = 900.0

    # C. Arcos Costales
    num_ribs = 14
    for i in range(num_ribs):
        theta = (i / num_ribs) * 2.0 * math.pi
        rx = 0.80 * math.cos(theta)
        ry = 0.64 * math.sin(theta)
        if abs(rx) < 0.15 and ry < -0.4: continue
        if abs(rx) < 0.15 and ry > 0.4: continue
        rib_d = np.sqrt(((cx - rx) / 0.035) ** 2 + ((cy - ry) / 0.025) ** 2)
        rib_mask = rib_d <= 1.0
        rib_cortex = (rib_d <= 1.0) & (rib_d >= 0.55)
        hu[rib_mask] = 350.0
        hu[rib_cortex] = 950.0

    # 4. Cavidades Pleurales y Parénquima Pulmonar (-850 a -700 HU)
    # A real 3D phantom must change its cross-section along Z. Repeating the
    # same ellipses at every height creates extruded pillars in any renderer.
    z = float(np.clip(z_ratio, 0.0, 1.0))
    profile = max(0.0, math.sin(math.pi * z)) ** 0.6
    profile = max(profile, 1e-4)
    lung_center = 0.17 + 0.21 * profile
    r_cx = cx + lung_center
    r_cy = cy + 0.02
    r_lung_base = ((r_cx / (0.28 * profile)) ** 2 + (r_cy / (0.42 * profile)) ** 2 <= 1.0)
    r_medial_notch = (cx > -0.16) & (abs(cy) < 0.35)
    right_lung = r_lung_base & (~r_medial_notch) & (cx < -0.05)

    l_cx = cx - lung_center
    l_cy = cy + 0.06
    l_lung_base = ((l_cx / (0.26 * profile)) ** 2 + (l_cy / (0.40 * profile)) ** 2 <= 1.0)
    cardiac_notch = np.sqrt(((cx - 0.18) / 0.18) ** 2 + ((cy - 0.05) / 0.25) ** 2) <= 1.0
    left_lung = l_lung_base & (~cardiac_notch) & (cx > 0.05)

    p_noise = rng.normal(0.0, 15.0, (dim, dim)).astype(np.float32)
    lung_dens = -780.0 + (cy * 40.0) + p_noise
    hu[right_lung] = lung_dens[right_lung]
    hu[left_lung] = lung_dens[left_lung]

    # 5. Mediastino, Corazón y Grandes Vasos (+35 a +50 HU)
    heart_area = cardiac_notch | ((abs(cx) < 0.16) & (cy > -0.45) & (cy < 0.38))
    hu[heart_area & muscle_mask] = 45.0 + rng.normal(0.0, 8.0, np.count_nonzero(heart_area & muscle_mask))

    aorta_d = np.sqrt((cx - 0.10) ** 2 + (cy - 0.36) ** 2) <= 0.045
    hu[aorta_d] = 50.0

    trachea_lumen = np.sqrt(cx ** 2 + (cy + 0.05) ** 2) <= 0.03
    trachea_wall = (np.sqrt(cx ** 2 + (cy + 0.05) ** 2) <= 0.042) & (~trachea_lumen)
    hu[trachea_wall] = 75.0
    hu[trachea_lumen] = -980.0

    # 6. Vasculatura Pulmonar Arborizada
    for angle in np.linspace(-1.2, 1.2, 18):
        angle += 0.2 * math.sin(z * math.pi * 2.0)
        for dist_step in np.linspace(0.05, 0.28, 45):
            bx = -0.16 - dist_step * math.cos(angle)
            by = 0.02 + dist_step * math.sin(angle) * 1.4
            v_radius = max(0.003, 0.015 * (1.0 - dist_step / 0.32))
            v_mask = np.sqrt((cx - bx) ** 2 + (cy - by) ** 2) <= v_radius
            hu[v_mask & right_lung] = rng.uniform(20.0, 70.0)

        for dist_step in np.linspace(0.05, 0.26, 45):
            bx = 0.16 + dist_step * math.cos(angle)
            by = 0.05 + dist_step * math.sin(angle) * 1.4
            v_radius = max(0.003, 0.015 * (1.0 - dist_step / 0.30))
            v_mask = np.sqrt((cx - bx) ** 2 + (cy - by) ** 2) <= v_radius
            hu[v_mask & left_lung] = rng.uniform(20.0, 70.0)

    # 7. Nódulo Pulmonar Sólido Espiculado en LSI
    if has_nodule:
        nod_cx = 0.32
        nod_cy = -0.14
        # Physical spherical focus, rather than a repeated circular cylinder.
        nod_z = (z - 0.52) * 300.0 / 180.0
        nod_dist = np.sqrt((cx - nod_cx) ** 2 + (cy - nod_cy) ** 2 + nod_z ** 2)
        angle = np.arctan2(cy - nod_cy, cx - nod_cx)

        spic_pattern = 0.008 * np.sin(angle * 7.0) + 0.005 * np.cos(angle * 13.0)
        eff_radius = 0.038 + spic_pattern

        halo_mask = (nod_dist <= (eff_radius + 0.015)) & (nod_dist > eff_radius) & left_lung
        hu[halo_mask] = rng.uniform(-400.0, -200.0, np.count_nonzero(halo_mask))

        core_mask = (nod_dist <= eff_radius) & left_lung
        hu[core_mask] = rng.uniform(35.0, 75.0, np.count_nonzero(core_mask))

        calc_mask = (np.sqrt((cx - (nod_cx + 0.005)) ** 2 + (cy - (nod_cy - 0.004)) ** 2 + nod_z ** 2) <= 0.006) & core_mask
        hu[calc_mask] = 380.0

    return hu


def hu_to_dicom_raw(hu: np.ndarray, intercept: float = -1024.0, slope: float = 1.0) -> np.ndarray:
    raw = (hu - intercept) / slope
    return np.clip(raw, 0, 65535).astype(np.uint16)


def create_dicom_dataset(
    pixel_hu: np.ndarray,
    filename: str,
    patient_id: str = "CC-80123456",
    patient_name: str = "RESTREPO^JUAN GUILLERMO",
    study_date: str = "20261022",
    instance_num: int = 1,
    z_coord: float = 0.0,
    slice_spacing: float = 1.25,
) -> bytes:
    dim = pixel_hu.shape[0]
    intercept = -1024.0
    slope = 1.0
    raw_pixels = hu_to_dicom_raw(pixel_hu, intercept, slope)

    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
    file_meta.MediaStorageSOPInstanceUID = f"1.2.840.10008.5.1.4.1.1.2.2026.{instance_num}"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset(filename, {}, file_meta=file_meta, preamble=b"\x00" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.Modality = "CT"
    ds.PatientID = patient_id
    ds.PatientName = patient_name
    ds.PatientBirthDate = "19680514"
    ds.PatientSex = "M"
    ds.StudyInstanceUID = "1.2.840.10008.5.1.4.1.1.2.2026.1"
    ds.SeriesInstanceUID = "1.2.840.10008.5.1.4.1.1.2.2026.2"
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.StudyDate = study_date
    ds.SeriesDate = study_date
    ds.SeriesDescription = "SYNTHETIC THORAX PHANTOM - NOT CLINICAL"
    ds.InstanceNumber = instance_num
    ds.SliceLocation = z_coord
    ds.ImagePositionPatient = ["-180.0", "-180.0", f"{z_coord:.6f}"]
    ds.ImageOrientationPatient = ["1.0", "0.0", "0.0", "0.0", "1.0", "0.0"]
    ds.SliceThickness = f"{slice_spacing:.6f}"
    ds.SpacingBetweenSlices = f"{slice_spacing:.6f}"
    ds.PixelSpacing = [str(360.0 / dim), str(360.0 / dim)]
    ds.WindowCenter = "-600"
    ds.WindowWidth = "1500"
    ds.RescaleIntercept = f"{intercept:.1f}"
    ds.RescaleSlope = f"{slope:.1f}"
    ds.RescaleType = "HU"

    ds.Rows = dim
    ds.Columns = dim
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = raw_pixels.tobytes()

    buf = io.BytesIO()
    ds.save_as(buf)
    return buf.getvalue()


def main(output_dir: str = OUTPUT_DIR, num_slices: int = 30):
    if num_slices < 2:
        raise ValueError("Se requieren al menos dos cortes para un fantoma 3D.")
    os.makedirs(output_dir, exist_ok=True)
    print("Generando fantomas sintéticos para pruebas de renderizado...")

    # 1. DICOM Unitario 512x512
    slice_hu_512 = generate_realistic_chest_ct_hu(dim=512, z_ratio=0.5, has_nodule=True)
    dcm_bytes = create_dicom_dataset(
        slice_hu_512,
        filename="dicom_unitario_caso01.dcm",
        patient_id="CC-71829304",
        patient_name="JARAMILLO^HERNAN DARIO",
        study_date="20261022",
        instance_num=15,
        z_coord=18.75,
    )
    p_dcm = os.path.join(output_dir, "dicom_unitario_caso01.dcm")
    with open(p_dcm, "wb") as f:
        f.write(dcm_bytes)
    print(f"  [+] DICOM unitario fidedigno: {p_dcm} ({len(dcm_bytes) // 1024} KB)")

    # 2. Whole-phantom coverage, with honest coarse spacing at 30 slices.
    # Use --slices 160 for a less sparsely sampled reference volume.
    p_zip = os.path.join(output_dir, "dicom_multicorte_serie_caso02.zip")
    with zipfile.ZipFile(p_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx in range(1, num_slices + 1):
            z_ratio = (idx - 1) / (num_slices - 1)
            z_pos = -150.0 + z_ratio * 300.0
            slice_hu = generate_realistic_chest_ct_hu(dim=256, z_ratio=z_ratio, has_nodule=True)
            slice_bytes = create_dicom_dataset(
                slice_hu,
                filename=f"CT_slice_{idx:03d}.dcm",
                patient_id="CC-98765432",
                patient_name="VILLEGAS^AMPARO ELENA",
                study_date="20261022",
                instance_num=idx,
                z_coord=z_pos,
                slice_spacing=300.0 / (num_slices - 1),
            )
            zf.writestr(f"CT_slice_{idx:03d}.dcm", slice_bytes)
    print(f"  [+] Serie sintética ({num_slices} cortes): {p_zip} ({os.path.getsize(p_zip) // 1024} KB)")

    # 3. Volumen NIfTI 3D (.nii.gz)
    nii_slices = []
    for s in range(32):
        nii_slice = generate_realistic_chest_ct_hu(dim=128, z_ratio=s / 31.0, has_nodule=True)
        nii_slices.append(nii_slice)
    # Image [row,column,slice] LPS -> NIfTI [x,y,z] RAS.
    vol_3d = np.stack(nii_slices, axis=-1).transpose(1, 0, 2)[::-1, ::-1, :]

    affine = np.diag([360.0 / 128, 360.0 / 128, 300.0 / 31, 1.0])
    nii_img = nib.Nifti1Image(vol_3d, affine=affine)
    p_nii = os.path.join(output_dir, "volumen_toracico_caso03.nii.gz")
    nib.save(nii_img, p_nii)
    print(f"  [+] Volumen NIfTI 3D: {p_nii} ({os.path.getsize(p_nii) // 1024} KB)")

    # 4. Corte Axial PNG (Ventana Pulmonar -600 HU Centro, 1500 HU Ancho -> [-1350, +150] HU)
    hu_min = -1350.0
    hu_max = 150.0
    w_slice = np.clip(slice_hu_512, hu_min, hu_max)
    norm_u8 = ((w_slice - hu_min) / (hu_max - hu_min) * 255.0).astype(np.uint8)
    pil_img = Image.fromarray(norm_u8)
    p_png = os.path.join(output_dir, "corte_axial_caso04.png")
    pil_img.save(p_png)
    print(f"  [+] Corte Axial PNG realista: {p_png} ({os.path.getsize(p_png) // 1024} KB)")

    # 5. Corte Axial JPG
    p_jpg = os.path.join(output_dir, "corte_axial_caso05.jpg")
    pil_img.save(p_jpg, quality=95)
    print(f"  [+] Corte Axial JPG realista: {p_jpg} ({os.path.getsize(p_jpg) // 1024} KB)")

    print("\n¡Muestras de prueba regeneradas exitosamente!")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fantomas sintéticos para probar la reconstrucción 3D.")
    parser.add_argument("--output-dir", default=OUTPUT_DIR)
    parser.add_argument("--slices", type=int, default=30)
    args = parser.parse_args()
    main(args.output_dir, args.slices)
