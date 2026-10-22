import os

exts = (".dcm", ".nii", ".nii.gz", ".zip", ".png", ".jpg", ".jpeg")
exclude = {".git", "node_modules", ".venv", ".next"}

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in exclude]
    for f in files:
        if f.lower().endswith(exts):
            full = os.path.join(root, f)
            print(f"{os.path.getsize(full):>10} bytes: {full}")
