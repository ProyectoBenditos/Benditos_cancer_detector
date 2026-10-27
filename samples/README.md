# Muestras para desarrollo

Los archivos `caso01`–`caso05` de `volume-rendering-v2/` son fantomas generados para probar ingesta, desidentificación y visualización. Sus identificadores y nombres de cabecera son datos de prueba; no son estudios de pacientes ni sirven para medir rendimiento clínico. El generador está en `scripts/create_test_samples.py` y escribe por defecto en `samples/volume-rendering-v2/`.

La anatomía real de la demostración procede de CTChest pública de 3D Slicer. `real-lung/provenance.json` identifica la fuente y su checksum. Los NRRD/NIfTI descargados se excluyen de Git y se recuperan con:

```powershell
.\apps\api\.venv-ml\Scripts\python.exe scripts/prepare_lung_demo.py
```

El visor usa los derivados públicos ya incluidos en `apps/web/public/demo/lung-ct/`. No copiar estudios privados a este directorio ni al directorio público de la web.

## Casos de práctica (LIDC-IDRI)

El modo práctica usa 5 casos públicos de LIDC-IDRI (The Cancer Imaging Archive, CC BY 3.0). Son los 5 primeros pacientes, en orden alfabético, del conjunto de test de la partición del modelo v2 (`docs/modelo-v2-densenet/splits/split_assignment.csv`) que tienen al menos un nódulo de referencia: marcado por al menos 3 de los 4 radiólogos y con diámetro medio entre 6 y 30 mm, según las anotaciones de `pylidc`.

Para cada paciente se toma el corte axial más cercano al centroide de su nódulo de referencia más grande. El resultado de la IA se calculó una sola vez con el servidor de inferencia, enviando el corte completo con la misma conversión que una subida `.dcm` (`model_input_png`) y las medianas del consenso de los radiólogos como variables clínicas.

- `practice/provenance.json`: paciente LIDC, serie, z, sha256 de los PNG, variables y recortes de cada caso.
- `apps/web/public/demo/practica/`: el corte con ventana pulmonar, el mapa de calor y `manifest.json`.
- `practice/dicom/`: series descargadas de TCIA. No se versionan.

Que un paciente sea del test de v2 no garantiza que la versión del servidor de inferencia no lo haya visto en su entrenamiento. Para regenerar los casos (descarga las series y vuelve a llamar a `/predict`):

```powershell
uv venv --python 3.11 .venv-practice
uv pip install --python .venv-practice\Scripts\python.exe -r scripts\requirements-practice.txt
.\.venv-practice\Scripts\python.exe scripts\prepare_practice_cases.py --dry-run
.\.venv-practice\Scripts\python.exe scripts\prepare_practice_cases.py
.\.venv-practice\Scripts\python.exe -m pytest scripts\tests -q
```
