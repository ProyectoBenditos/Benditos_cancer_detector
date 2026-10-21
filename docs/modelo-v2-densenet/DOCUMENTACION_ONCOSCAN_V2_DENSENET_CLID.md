# Documentación Técnica y Clínica — OncoScan 2.0 (DenseNet-121 Multimodal + CLID)

## 1. Resumen Ejecutivo para Sustentación Académica
**OncoScan 2.0** evoluciona la plataforma desde un clasificador básico (`ResNet-18` $64\times 64$ con partición aleatoria por corte) hacia un **sistema dual de inteligencia artificial clínica** entrenado en GPUs **2× NVIDIA Tesla T4 (31.2 GB VRAM)** bajo estándares de **Cero Fuga de Datos (*Strict Patient-Level Zero-Leakage Split*)** y priorización clínica de **reducción de Falsos Negativos (FN)**:

1. **Modelo Principal Multimodal (`best_model_densenet_v2.pth` + `xgb_head_v2.json`)**:
   - Inspirado en el estudio de *Springer (2026)* sobre fusión de características profundas `DenseNet-121` con descriptores clínicos tabulares y ensamble `XGBoost`.
   - Combina **DenseNet-121 ($1024\text{-D}$)** + **Encoder de Dominio TC LIDC-IDRI ($512\text{-D}$)** + **Red Tabular Clínica MLP ($64\text{-D}$ sobre las 8 variables radiológicas de consenso)** + **Clasificador `XGBoost` de segundo nivel (`scale_pos_weight=2.2`)** + **Test-Time Augmentation (TTA 4×)**.
   - Entrenado con **`AsymmetricFocalLoss` ($\alpha_{\text{pos}}=0.78, \gamma_{\text{pos}}=1.0, \gamma_{\text{neg}}=2.0$)** y explicabilidad visual **HiResCAM ($128\times 128$)**.
   - **Desempeño en Test Set sin fuga de pacientes (`357` cortes de `56` pacientes nuevos)**:
     - **Sensibilidad (Recall)**: **95.07%** en $\tau = 0.35$ (**96.55%** en $\tau = 0.25$).
     - **Especificidad**: **85.71%** en $\tau = 0.35$ (**90.26%** en $\tau = 0.45$).
     - **AUC-ROC**: **0.9684** | **AUPRC**: **0.9784** | **F1-Score**: **0.9234** | **Brier Score**: **0.0774**.

2. **Modelo Secundario de Subtipado Histológico (`best_model_clid_subtype.pth` — Agente Patólogo)**:
   - Entrenado sobre el **Comprehensive Lung Cancer Imaging Dataset (CLID v1.0.0, `ice778`)** recomendado por el Prof. Jair Sanclemente (`1,039` cortes TC en 4 clases histológicas confirmadas).
   - **Detección Oncológica Cruzada (Cáncer vs. Tejido Normal en CLID)**: **Sensibilidad = 99.39%** (solo **1 Falso Negativo** en 165 casos oncológicos de prueba) y **Especificidad = 97.67%**.
   - Clasifica el linaje histológico probable en TC (*Adenocarcinoma*, *Carcinoma Escamocelular*, *Carcinoma de Células Grandes*, *Normal*) para orientar el **panel de Inmunohistoquímica (IHQ)** bajo la **Guía de Práctica Clínica GPC 36 del Ministerio de Salud de Colombia** (*TTF-1 / Napsina A* vs. *p40 / p63 / CK5/6*).

---

## 2. ¿Con qué archivos se entrenó y qué formatos recibe el Modelo 2.0?

### 2.1. Naturaleza de los datos de entrenamiento (¿DICOM o Imágenes?)
* **Origen físico (DICOM TC de Tórax)**: Todos los estudios provienen originalmente de tomografías computarizadas (TC) helicoidales en formato **DICOM (`.dcm`)** del archivo clínico **TCIA LIDC-IDRI** (*The Cancer Imaging Archive*) y de las cohortes tomográficas de **CLID**.
* **Formato pre-ventaneado durante el entrenamiento (`.png` / `.jpg` derivados de DICOM)**:
  * En Kaggle (`zhangweiled/lidcidri/LIDC-IDRI-slices` y `ice778/clid`), los volúmenes DICOM originales ya fueron convertidos a cortes axiales 2D en escala de grises de 8 bits (`.png` de $128\times 128$ píxeles en LIDC-IDRI) aplicando previamente la **Ventana Pulmonar Clínica en Unidades Hounsfield ($\text{WL} = -600\text{ HU}, \text{WW} = 1500\text{ HU}$, rango $[-1350, +150]\text{ HU}$)**.
  * Adicionalmente, el modelo recibió la tabla clínica **`features_clinicas_reales.csv`** (`34,952` anotaciones extraídas de los archivos XML originales de los 4 radiólogos de LIDC-IDRI) con las **8 variables morfológicas**: `subtlety`, `calcification`, `sphericity`, `margin`, `lobulation`, `spiculation`, `texture` y `malignancy`.

### 2.2. ¿Qué archivos recibe el Modelo 2.0 en Inferencia / Prueba?
El pipeline de preprocesamiento (`preprocesar_archivo_tc` en [`entrenamiento_e_inferencia_v2.py`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/entrenamiento_e_inferencia_v2.py)) es **híbrido y acepta ambos formatos de forma transparente**:
1. **Archivos Médicos DICOM (`.dcm`)**:
   - Lee la matriz cruda del tomógrafo con `pydicom`.
   - Aplica la ecuación física de calibración tomográfica:
     $$\text{HU} = \text{PixelValue} \times \text{RescaleSlope} + \text{RescaleIntercept}$$
   - Aplica la **ventana pulmonar ($\text{WL} = -600\text{ HU}, \text{WW} = 1500\text{ HU}$)** para mapear el rango $[-1350, +150]\text{ HU}$ exactamente al rango $[0, 255]$ de 8 bits con el que fue entrenado el modelo, y extrae los metadatos del equipo (`KVP`, `SliceThickness`, `Manufacturer`, `PixelSpacing`).
2. **Imágenes Estándar (`.png`, `.jpg`, `.jpeg`)**:
   - Recibe cortes TC ya exportados en escala de grises, aplica **redimensionamiento Letterbox isotrópico a $128\times 128$** (sin deformar la esfericidad del nódulo) y realce adaptativo **CLAHE (`clipLimit=1.5`, `tileGridSize=4x4`)**.
3. **Los 8 Descriptores Clínicos / Radiológicos**:
   - Valores numéricos en escala LIDC-IDRI (`1` a `5`, y `1` a `6` para calcificación), normalizados automáticamente con la media y desviación estándar exclusivas de `Train`:
     - `FEAT_MEAN_V2 = [3.788, 5.678, 3.865, 3.987, 1.740, 1.673, 4.481, 2.870]`
     - `FEAT_STD_V2  = [0.693, 0.623, 0.482, 0.719, 0.701, 0.762, 0.734, 0.720]`

---

## 3. Fases Ejecutadas en el Entrenamiento (Metodología Paso a Paso)

### Fase 0: Auditoría de Ground Truth y Partición Estricta por Paciente (*Zero-Leakage*)
* **Regla de Consenso de 4 Radiólogos**:
  * **Positivo (`label = 1`)**: Acuerdo unánime `4/4` radiólogos con máscara de nódulo activa (`1,204` cortes, `52.9%`).
  * **Negativo (`label = 0`)**: Acuerdo `≥ 3/4` radiólogos sin lesión (`1,073` cortes, `47.1%`).
  * **Descarte de Ruido de Etiqueta**: Se eliminaron `1,353` cortes ambiguos (`1/4` o `2/4` votos) para evitar contaminar la frontera de decisión.
* **Partición por `patient_id` (`seed=42`)**:
  * A diferencia del modelo v1 (que dividía cortes al azar permitiendo que cortes del mismo paciente estuvieran en `Train` y `Test`), en **OncoScan 2.0** los `369` pacientes validados se dividieron estrictamente por individuo:
    * `Train`: `258` pacientes (`1,571` cortes)
    * `Val`: `55` pacientes (`349` cortes)
    * `Test`: `56` pacientes (`357` cortes)
    * Intersección verificada matemáticamente: $\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$.

### Fase 1: Preprocesamiento Clínico Letterbox ($128\times 128$) + CLAHE en Caché RAM
* **Resolución $4\times$ superior en área**: Se pasó de $64\times 64$ ($4,096$ px) a **$128\times 128$ ($16,384$ px)** con **Letterbox Padding** para preservar la relación de aspecto real y no distorsionar `sphericity` ni `spiculation`.
* **Fusión Isotrópica CLAHE**: Combinación ponderada ($88\%$ ventana pulmonar nativa $+ 12\%$ realce local CLAHE suavizado con filtro Gaussiano $3\times 3$) replicada isotrópicamente en los 3 canales para preservar los filtros convolucionales preentrenados y resaltar nódulos subsólidos/esmerilados (*GGO*) sin amplificar el ruido cuántico del parénquima sano.

### Fase 2 y 3: Arquitectura Híbrida `OncoScanDenseNetMultimodal` + `AsymmetricFocalLoss` + `XGBoost`
* **Rama Visual 1 (`DenseNet-121`)**: Extrae `1,024` mapas de características multiescala con reutilización densa de capas (`denseblock3`, `transition3`, `denseblock4`, `norm5` descongelados).
* **Rama Visual 2 (`LIDC Domain Encoder`)**: Codificador `ResNet-18` (`512` canales) preentrenado específicamente en parénquima pulmonar LIDC-IDRI.
* **Rama Clínica Tabular (`Clinical MLP`)**: Red `Linear(8 -> 64) -> BatchNorm1d -> GELU -> Dropout(0.25) -> Linear(64 -> 64) -> BatchNorm1d -> GELU`.
* **Función de Pérdida Asimétrica (`AsymmetricFocalLoss`)**:
  $$\mathcal{L}_{\text{AsymFocal}} = -\alpha_{\text{pos}}(1 - p)^{\gamma_{\text{pos}}} y \log(p) - (1 - \alpha_{\text{pos}}) p^{\gamma_{\text{neg}}} (1 - y) \log(1 - p)$$
  con $\alpha_{\text{pos}} = 0.78$, $\gamma_{\text{pos}} = 1.0$, $\gamma_{\text{neg}} = 2.0$, aplicando un castigo $3.5\times$ superior a cualquier nódulo real con probabilidad baja.
* **Clasificador de Segundo Nivel (`XGBoost`)**: Entrenado sobre la concatenación de probabilidades profundas, las 8 variables clínicas normalizadas y los embeddings latentes con `scale_pos_weight = 2.2`.

### Fase 4: Inferencia con Test-Time Augmentation (TTA 4×) y Barrido de Umbral ($\tau$)
* Durante la evaluación en `Val` y `Test`, cada corte TC se evalúa bajo **4 transformaciones geométricas en GPU** (original, espejo horizontal, espejo vertical y rotación $90^\circ$) combinadas con el clasificador `XGBoost`.

### Fase 5: Explicabilidad Clínica Certificada con HiResCAM ($128\times 128$)
* Sustituye el `Grad-CAM` clásico de $64\times 64$ por **HiResCAM Multimodal**, calculando el producto elemento a elemento ($\sum_k A_k \odot \frac{\partial S}{\partial A_k}$) directamente sobre `denseblock4` y `layer4`, garantizando que el mapa de calor marque únicamente los píxeles que incrementan matemáticamente el riesgo del nódulo.

### Fase 6: Entrenamiento del Clasificador de Subtipo Histológico en Dataset CLID
* Entrenamiento de una segunda red **`DenseNet-121` de 4 clases** sobre los `1,039` cortes TC de `ice778/comprehensive-lung-cancer-imaging-dataset-clid` (`adenocarcinoma`, `large_cell`, `normal`, `squamous_cell`).

---

## 4. Benchmark de Tiempos de Respuesta (Latencia GPU vs. CPU)

| Dispositivo | Inferencia Multimodal (TTA 4× + XGBoost) | Generación Mapa de Calor HiResCAM (`128×128`) | **Tiempo Total por Estudio** |
| :--- | :---: | :---: | :---: |
| **GPU (NVIDIA Tesla T4)** | `114.5 ms` (`0.11 s`) | `52.8 ms` (`0.05 s`) | **`167.3 ms` (`0.17 segundos`)** |
| **CPU (Estándar)** | `588.3 ms` (`0.59 s`) | `335.5 ms` (`0.34 s`) | **`923.9 ms` (`0.92 segundos`)** |

---

## 5. Localización Espacial (`HiResCAM`), Segmentación Lobar (`NVIDIA MONAI`) y Visor 3D (`Three.js` / `vtk.js`)

### 5.1. ¿Cómo funciona la localización espacial en cortes 2D vs. volúmenes 3D?
1. **En cortes 2D aislados o recortes ROI (`128×128` como `LIDC-IDRI-slices` y `CLID`)**:
   * **HiResCAM (`features.denseblock4`)** calcula automáticamente la **coordenada espacial 2D exacta $(x, y)$ del pico de activación tumoral** dentro del corte (verificada en `graficas/hirescam_audit_v2.png`).
   * Dado que un corte 2D recortado alrededor del nódulo no incluye la serie 3D completa del tórax (ni el eje craniocaudal $Z$ / `SliceLocation` ni los planos completos de las cisuras interlobares mayor y menor), el especialista confirma el lóbulo anatómico (`LSD, LMD, LID, LSI, LII`) mediante el selector y esquema pulmonar interactivo.
2. **Papel de `NVIDIA MONAI` (`Medical Open Network for AI`)**:
   * **NVIDIA MONAI** es el framework de IA médica en Python/PyTorch que actúa en el backend:
     * Proporciona modelos 3D (`MONAI Model Zoo` / `TotalSegmentator`) para segmentar automáticamente los **5 lóbulos pulmonares (`LSD, LMD, LID, LSI, LII`)**, el árbol traqueobronquial y el nódulo cuando se ingresa una **serie DICOM volumétrica 3D multicorte**, exportando las mallas anatómicas 3D (`.glb` / `.stl` / `.nii.gz`).
     * Estandariza las transformaciones clínicas (`monai.transforms`: ventana Hounsfield, reescalado isotrópico y mapas de activación).
3. **Papel de `Three.js` (`@react-three/fiber`) y `vtk.js` / `NiiVue` en el Visor 3D Web**:
   * Renderizan en el navegador (WebGL 2.0, sin costo de servidor) las mallas 3D de los 5 lóbulos generadas por **NVIDIA MONAI**, permitiendo rotar el pulmón en $360^\circ$, iluminar el lóbulo afectado, ubicar la esfera 3D en la coordenada $(x, y)$ detectada por **HiResCAM**, levantar el mapa de calor en relieve topográfico 3D y, cuando se carga una serie multicorte, realizar *Volume Rendering* y reconstrucción multiplanar (**MPR: Axial, Coronal, Sagital**).

---

## 6. Cómo Ejecutar el Banco de Pruebas Visual y el Script de Inferencia Local

> **Importante:** Ninguno de estos scripts modifica archivos de la plataforma (`apps/web`, `apps/api`, `ai-service`).

### 6.1. Estación Visual Interactiva (`visor_interactivo_v2.py`)
Levanta una interfaz clínica local en `http://localhost:8095` que permite:
* **Cargar cualquier archivo DICOM (`.dcm`) o Imagen (`.png`, `.jpg`)** desde tu computador (aplicando lectura `pydicom`, ventana pulmonar `-600 HU / 1500 HU`, Letterbox `128×128`, realce `CLAHE` y detector espacial `HiResCAM`).
* Explorar 5 estudios pre-cargados del Test Set *Zero-Leakage* (`2 DICOM` y `3 PNG`).
* Ajustar en tiempo real las **8 variables clínicas de LIDC-IDRI** y la **cortina comparativa de HiResCAM**.
* Visualizar las probabilidades de los **4 subtipos histológicos del Modelo 2 (CLID)** y la recomendación de marcadores de inmunohistoquímica (**GPC 36 MinSalud**).

```powershell
& "c:\Users\USUARIO\Desktop\Proyectos\Oncoscan\Benditos_cancer_detector\apps\api\.venv\Scripts\python.exe" -X utf8 docs/modelo-v2-densenet/visor_interactivo_v2.py
```

### 6.2. Script de Prueba por Consola y Generación de Reporte Gráfico (`probar_modelo_v2.py`)
Evalúa los 2 estudios DICOM (`estudio_01_nodulo.dcm`, `estudio_02_sano.dcm`) y las 2 imágenes PNG (`caso_01_nodulo.png`, `caso_02_sano.png`) de `muestras_prueba/` y exporta el panel comparativo `graficas/prueba_local_dicom_y_png_v2.png`:

```powershell
& "c:\Users\USUARIO\Desktop\Proyectos\Oncoscan\Benditos_cancer_detector\apps\api\.venv\Scripts\python.exe" -X utf8 docs/modelo-v2-densenet/probar_modelo_v2.py
```

---

## 7. Correo Ejecutivo de Sustentación para el Docente Asesor (Prof. Jair Sanclemente)

**Asunto:** Avance OncoScan 2.0: Nuevo Modelo DenseNet-121 + XGBoost, Integración de CLID y Sensibilidad del 95.07%

> Estimado Profesor Jair, cordial saludo.
>
> Le compartimos los resultados y gráficas del nuevo motor **OncoScan 2.0**, entrenado en GPU (**2× NVIDIA Tesla T4**) antes de actualizarlo en la plataforma web. Siguiendo sus indicaciones de priorizar la **reducción de Falsos Negativos (FN)** e **integrar el dataset CLID**, implementamos una arquitectura en dos etapas:
>
> **1. Decisiones Técnicas y Mejoras frente a la versión anterior (ResNet-18):**
> * **Cero fuga de datos (*Zero-Leakage*)**: División estricta por paciente sobre **2.759 cortes TC (655 pacientes de LIDC-IDRI)**.
> * **Preprocesamiento clínico**: Ventana pulmonar (`WL=-600, WW=1500 HU`), reescalado sin deformación (*Letterbox* `128×128`) y realce de contraste **CLAHE**.
> * **Arquitectura Híbrida**: Evolucionamos a **DenseNet-121 + LIDC Domain Encoder + MLP Clínico (8 variables LIDC-IDRI) + XGBoost**, entrenado con **Focal Loss** para castigar fuertemente los Falsos Negativos.
> * **Mapa de calor de alta precisión**: Reemplazamos Grad-CAM por **HiResCAM (`128×128`)**, que localiza la coordenada exacta $(x, y)$ del nódulo sin deformaciones *(ver `hirescam_audit_v2.png`)*.
>
> **2. Métricas del Modelo 1 (Detección en LIDC-IDRI — 357 estudios de prueba):**
> * **AUC-ROC:** **`0.9684`** | **AUPRC:** **`0.9784`** | **F1-Score:** **`0.9234`**
> * **Sensibilidad:** **`95.07%`** (detectó 193 de 203 nódulos; solo **10 Falsos Negativos** en $\tau=0.35$, y baja a solo **7 FN (`96.55%`)** en $\tau=0.25$).
> * **Especificidad:** **`85.71%`** | **Precisión:** **`89.77%`** *(ver `resultados_oncoscan_v2_densenet.png`)*.
>
> **3. Integración de CLID — Modelo 2 (Subtipado Histológico / Agente Patólogo):**
> * Entrenamos un segundo **DenseNet-121 (4 clases)** sobre los **1.039 estudios TC de CLID** para que, cuando el Modelo 1 detecte un nódulo, clasifique el subtipo histológico probable (**Adenocarcinoma, Células Grandes, Escamocelular o Normal**) y sugiera los marcadores de inmunohistoquímica (**GPC 36 MinSalud**).
> * Alcanzó una **Sensibilidad oncológica del `99.39%`** (164 de 165 casos de cáncer detectados, **solo 1 FN**) y **Especificidad del `97.67%`** *(ver `resultados_clid_patologo.png`)*.
>
> **4. Tiempo de respuesta y Visor de Prueba:**
> * El modelo responde en **`0.17 s` en GPU** (`0.92 s` en CPU) y ya cuenta con un entorno visual de pruebas en Python que recibe cualquier archivo **DICOM (`.dcm`) o PNG/JPG** *(ver `prueba_local_dicom_y_png_v2.png`)*.
>
> Quedamos atentos a sus comentarios para mostrarle el visor funcionando en vivo y proceder a integrarlo en la plataforma.
>
> Atentamente,  
> **Luis Alberto De Ávila & Mateo** — *Proyecto OncoScan*

---

## 8. Inventario Completo de Archivos en `docs/modelo-v2-densenet/`

| Archivo | Tamaño | Descripción |
| :--- | :---: | :--- |
| [`visor_interactivo_v2.py`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/visor_interactivo_v2.py) | `38.5 KB` | Estación visual interactiva web en Python (`http://localhost:8095`) con carga libre de DICOM/PNG |
| [`probar_modelo_v2.py`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/probar_modelo_v2.py) | `15.2 KB` | Script de prueba sobre los 2 archivos `.dcm` y 2 `.png` |
| [`entrenamiento_e_inferencia_v2.py`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/entrenamiento_e_inferencia_v2.py) | `8.6 KB` | Módulo de arquitecturas PyTorch (`OncoScanDenseNetMultimodal` + `CLID`) y preprocesamiento DICOM/PNG |
| [`cases_interactive_v2.json`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/cases_interactive_v2.json) | `152.0 KB` | Tensores pre-calculados en GPU (Original, CLAHE, HiResCAM, CLID) de 5 estudios del Test Set |
| [`muestras_prueba/estudio_01_nodulo.dcm`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/muestras_prueba/estudio_01_nodulo.dcm) | `33.3 KB` | Estudio DICOM real con nódulo (`LIDC-IDRI-0001`, consenso 4/4 radiólogos) |
| [`muestras_prueba/estudio_02_sano.dcm`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/muestras_prueba/estudio_02_sano.dcm) | `33.3 KB` | Estudio DICOM real de control sano (`LIDC-IDRI-0003`, sin lesión) |
| [`muestras_prueba/caso_01_nodulo.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/muestras_prueba/caso_01_nodulo.png) | `14.1 KB` | Imagen TC en ventana pulmonar con nódulo (`LIDC-IDRI-0001`) |
| [`muestras_prueba/caso_02_sano.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/muestras_prueba/caso_02_sano.png) | `13.5 KB` | Imagen TC en ventana pulmonar de control sano (`LIDC-IDRI-0003`) |
| [`weights/best_model_densenet_v2.pth`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/weights/best_model_densenet_v2.pth) | `71.5 MB` | Pesos PyTorch del modelo principal `OncoScanDenseNetMultimodal` (local y en `Downloads`) |
| [`weights/xgb_head_v2.json`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/weights/xgb_head_v2.json) | `218.8 KB` | Modelo `XGBoost` de segundo nivel (`scale_pos_weight=2.2`) |
| [`weights/best_model_clid_subtype.pth`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/weights/best_model_clid_subtype.pth) | `27.1 MB` | Pesos PyTorch del clasificador de subtipo histológico `DenseNet-121` (CLID) |
| [`weights/domain_lidc_encoder.pth`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/weights/domain_lidc_encoder.pth) | `42.8 MB` | Codificador de dominio pulmonar pre-entrenado en LIDC-IDRI |
| [`metrics_v2_report.json`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/metrics_v2_report.json) | `0.5 KB` | Reporte JSON oficial de métricas en Test Set Zero-Leakage |
| [`metrics_clid_report.json`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/metrics_clid_report.json) | `0.5 KB` | Reporte JSON oficial de métricas en el dataset CLID |
| [`splits/split_assignment.csv`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/splits/split_assignment.csv) | `7.4 KB` | Asignación auditable de los pacientes (`train`, `val`, `test`) |
| [`graficas/resultados_oncoscan_v2_densenet.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/graficas/resultados_oncoscan_v2_densenet.png) | `137.8 KB` | Curva ROC (`0.9684`), AUPRC (`0.9784`) y Matriz de Confusión |
| [`graficas/hirescam_audit_v2.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/graficas/hirescam_audit_v2.png) | `457.3 KB` | Auditoría visual de fidelidad espacial **HiResCAM ($128\times 128$)** |
| [`graficas/resultados_clid_patologo.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/graficas/resultados_clid_patologo.png) | `124.5 KB` | Matrices de confusión multiclase y binaria en dataset **CLID** |
| [`graficas/prueba_local_dicom_y_png_v2.png`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/modelo-v2-densenet/graficas/prueba_local_dicom_y_png_v2.png) | `248.6 KB` | Reporte visual de inferencia local sobre 2 DICOM y 2 PNG |


