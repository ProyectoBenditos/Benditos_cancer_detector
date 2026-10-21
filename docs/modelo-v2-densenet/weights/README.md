# Pesos Entrenados de OncoScan 2.0 (GPU 2× NVIDIA Tesla T4)

Este directorio almacena los pesos entrenados de **OncoScan 2.0**:

| Archivo | Tamaño | Descripción | Estado en Git |
| :--- | :---: | :--- | :--- |
| `xgb_head_v2.json` | `218.8 KB` | Clasificador de segundo nivel `XGBoost` (`scale_pos_weight=2.2`) | Versionado en Git |
| `best_model_densenet_v2.pth` | `71.5 MB` | Modelo principal `OncoScanDenseNetMultimodal` (`DenseNet-121 + LIDC Domain + Clinical MLP`) | Local en disco (`weights/` y `Downloads/`) |
| `domain_lidc_encoder.pth` | `42.8 MB` | Codificador de dominio pulmonar preentrenado en `LIDC-IDRI` | Local en disco (`weights/` y `Downloads/`) |
| `best_model_clid_subtype.pth` | `27.1 MB` | Clasificador de subtipo histológico `DenseNet-121` de 4 clases entrenado en `CLID` | Local en disco (`weights/` y `Downloads/`) |
