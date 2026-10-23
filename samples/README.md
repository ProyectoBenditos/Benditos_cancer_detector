# Muestras para desarrollo

Los archivos `caso01`–`caso05` de `volume-rendering-v2/` son fantomas generados para probar ingesta, desidentificación y visualización. Sus identificadores y nombres de cabecera son datos de prueba; no son estudios de pacientes ni sirven para medir rendimiento clínico. El generador está en `scripts/create_test_samples.py` y escribe por defecto en `samples/volume-rendering-v2/`.

La anatomía real de la demostración procede de CTChest pública de 3D Slicer. `real-lung/provenance.json` identifica la fuente y su checksum. Los NRRD/NIfTI descargados se excluyen de Git y se recuperan con:

```powershell
.\apps\api\.venv-ml\Scripts\python.exe scripts/prepare_lung_demo.py
```

El visor usa los derivados públicos ya incluidos en `apps/web/public/demo/lung-ct/`. No copiar estudios privados a este directorio ni al directorio público de la web.
