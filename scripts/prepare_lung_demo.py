"""Download verified public CT + MONAI weights and build the local 3D demonstration.

Run with apps/api/.venv-ml/Scripts/python.exe from the repository root.
No patient study is sent to a remote inference endpoint.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import httpx

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "samples/real-lung"
MODEL = ROOT / "apps/api/.cache/models/monai-wholebody-lowres.pt"
CT_URL = "https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e"
CT_HASH = "4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e"
MODEL_URL = "https://developer.download.nvidia.com/assets/Clara/monai/tutorials/model_zoo/model_lowres_wholebody_ct_segmentation.pt"
MODEL_HASH = "dbdebeae650f4fb5ea7f4ad01e0d2431"


def download(url, target, algorithm, expected):
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        temporary = target.with_suffix(target.suffix + ".download")
        with httpx.stream("GET", url, follow_redirects=True, timeout=180) as response:
            response.raise_for_status()
            with temporary.open("wb") as output:
                for chunk in response.iter_bytes(1024 * 1024):
                    output.write(chunk)
        temporary.replace(target)
    actual = hashlib.new(algorithm, target.read_bytes()).hexdigest()
    if actual != expected:
        raise RuntimeError(f"Checksum incorrecto: {target}")
    print(f"Verified {target.name}: {actual}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    args = parser.parse_args()
    download(CT_URL, DATA / "CT-chest.nrrd", "sha256", CT_HASH)
    download(MODEL_URL, MODEL, "md5", MODEL_HASH)
    if args.download_only:
        return
    import nibabel as nib
    import nrrd
    import numpy as np
    sys.path.insert(0, str(ROOT / "apps/api"))
    from app.ml.volume_pipeline import prepare_volume

    values, header = nrrd.read(str(DATA / "CT-chest.nrrd"), index_order="F")
    affine = np.eye(4)
    affine[:3, :3] = np.asarray(header["space directions"]).T
    affine[:3, 3] = np.asarray(header["space origin"])
    if header.get("space") == "left-posterior-superior":
        affine = np.diag([-1, -1, 1, 1]) @ affine
    elif header.get("space") != "right-anterior-superior":
        raise RuntimeError("La orientación de la muestra no es RAS ni LPS")
    ct = nib.Nifti1Image(values.astype(np.float32), affine)
    ct.header["descrip"] = b"3D Slicer CTChest public demonstration sample"
    nifti = DATA / "CT-chest.nii.gz"
    nib.save(ct, nifti)
    output = ROOT / "apps/web/public/demo/lung-ct"
    manifest = prepare_volume(nifti.read_bytes(), nifti.name, {}, "public-slicer-ctchest", output,
        lambda progress, message: print(f"{progress:.0%} {message}", flush=True))
    manifest["sample_source"] = {"name": "3D Slicer CTChest", "url": CT_URL, "source_sha256": CT_HASH,
        "purpose": "local visualization demonstration, not independent model validation"}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "provenance.json").write_text(json.dumps(manifest["sample_source"], indent=2), encoding="utf-8")
    print("Ready: http://localhost:3000/demo/pulmon-3d", flush=True)


if __name__ == "__main__":
    main()
