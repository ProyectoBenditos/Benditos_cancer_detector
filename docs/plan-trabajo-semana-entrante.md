# OncoScan — Plan de Trabajo y Ejecución Técnica (Semana Entrante)
## Mejoras del Modelo v1.2, Nuevas Referencias del Docente y Estrategia de Sustentación Clínica

> **Documento Maestro de Planificación y Referencias**  
> **Fecha de Creación:** Octubre 2026  
> **Proyecto:** OncoScan Platform — Sistema de IA Multimodal para Apoyo a la Detección Temprana de Cáncer de Pulmón  
> **Destinatarios:** Equipo de Desarrollo (Luis & Juan), Docente Asesor y Médica Patóloga Evaluadora  
> **Estado:** Documento congelado para ejecución programada la próxima semana

---

## 1. Resumen Ejecutivo y Metas de la Semana

El presente documento consolida **todas las directrices, enlaces de investigación y requerimientos** recibidos del docente asesor, así como la preparación para la sustentación ante la especialista en patología y el plan de entrenamiento técnico para evolucionar el modelo desde la versión **`multimodal-v1.1`** (activa en producción) hacia la versión **`multimodal-v1.2`**.

### 1.1 Metas Clave de Rendimiento para la Versión 1.2
| Métrica | Estado Actual (`v1.1`) | Meta Planificada (`v1.2`) | Justificación Médica |
| :--- | :---: | :---: | :--- |
| **Falsos Negativos (FN)** | **25 casos** (de 296 enfermos) | **< 15 casos** | Un falso negativo en cáncer pulmonar representa un paciente que pierde la ventana de tratamiento curativo temprano. |
| **Sensibilidad (Recall)** | **91.6%** | **$\ge$ 95.0%** | Exigencia clínica internacional para herramientas de tamizaje tomográfico (ACR Lung-RADS). |
| **AUC-ROC** | **0.950** | **$\ge$ 0.955** | Alta capacidad de discriminación entre tejido benigno/normal y nódulos sospechosos. |
| **Exactitud Global** | **89.8%** | **$\ge$ 90.0%** | Rendimiento global balanceado en cohorte independiente de 687 casos. |
| **Resolución de Entrada** | $64 \times 64$ px | **$128 \times 128$ px** (o $224 \times 224$ px) | Aumenta el mapa de características convolucionales de $2\times 2$ a $4\times 4$ / $7\times 7$, mejorando la nitidez de Grad-CAM. |
| **Fidelidad Grad-CAM** | JET estándar ($0.4 L3 + 0.6 L4$) | **HiResCAM + CLAHE** | Elimina artefactos en bordes y enfoca la activación en la morfología real del nódulo. |

---

## 2. Compilado de Referencias del Docente y su Aplicación en OncoScan

El docente asesor compartió tres fuentes fundamentales para robustecer el proyecto antes de entrenar la nueva versión. A continuación se detalla qué enseña cada una y cómo se integrará exactamente en OncoScan:

```mermaid
flowchart TD
    subgraph Referencias["📚 Referencias del Docente Asesor"]
        R1["1. Google Research (Oct 2026)\nFederated Data, TEEs & DP"]
        R2["2. FreeCodeCamp\nPreprocesamiento de Imágenes Médicas"]
        R3["3. Lunit INSIGHT MMG\nLíder Comercial de IA Radiológica"]
    end

    subgraph Aplicacion["🛠️ Implementación en OncoScan"]
        A1["Arquitectura de Privacidad Multihospitalaria\nTLS 1.3 + Supabase AES-256 + RLS + Zero-Retention"]
        A2["Pipeline Tomográfico Kaggle\nCLAHE + Aspect-Ratio Letterbox + Ventana HU"]
        A3["Semántica y UX Clínica\nAbnormality Score + Visor Cortina + Rol Triaje"]
    end

    R1 --> A1
    R2 --> A2
    R3 --> A3
```

---

### Referencia 1: Google Research (2 de Octubre, 2026)

> **Estado: ✅ Fase 1 implementada. No requiere trabajo esta semana.** La parte de privacidad ya está en producción:
> * Desidentificación DICOM bajo PS 3.15 (`dc10d41`).
> * Certificado de desidentificación con trazabilidad SHA-256 (`5efc789`, `28e81f9`).
> * Documentación de la tabla de auditoría (`a3c5f4c`).
>
> La Fase 2 (aprendizaje federado entre hospitales) sigue siendo **trabajo futuro** (ver sección 7.3).

* **Artículo:** *"Toward provably private learning from federated data"* (Google Research & University of Waterloo).
* **Concepto Clave:** Demuestra cómo entrenar modelos de aprendizaje profundo a partir de fuentes distribuidas y sensibles sin centralizar los datos originales, garantizando privacidad mediante la combinación de **Federated Learning (FL)**, **Trusted Execution Environments (TEEs)** y **Privacidad Diferencial (DP)**.
* **Aplicación Concreta en OncoScan:**
  1. **Privacidad Actual (Fase 1 - Desplegada):**
     * **Anonimización DICOM:** Purgado estricto de PHI (`PatientName`, `PatientID`, `InstitutionName`) antes de guardar en almacenamiento persistente; solo se retienen metadatos de calibración física (`RescaleIntercept`, `RescaleSlope`, `WindowCenter`, `WindowWidth`).
     * **Cifrado Integral:** TLS 1.3 en tránsito (HTTPS) y AES-256 en reposo (Supabase Storage).
     * **Aislamiento por Médico:** Políticas de *Row-Level Security* (RLS) en PostgreSQL impiden que un centro de salud o médico acceda a estudios de otro.
     * **Modo Cero-Retención (Zero-Retention Mode):** Para centros de alta sensibilidad, la imagen se procesa exclusivamente en la memoria RAM del servidor de IA dedicado en Oracle Cloud (`oncoscan-ai.duckdns.org`) y se destruye inmediatamente tras generar el score y Grad-CAM.
  2. **Hoja de Ruta Multicéntrica (Fase 2 - Evolutiva):**
     * Para futuros reentrenamientos colaborativos entre instituciones (ej. Hospital Universitario del Valle, Clínica Imbanaco y Fundación Valle del Lili), OncoScan adoptará agregación federada dentro de enclaves seguros (TEEs), garantizando que **ninguna tomografía pulmonar abandone los servidores locales del hospital**.

---

### Referencia 2: FreeCodeCamp — Preprocesamiento de Imágenes Médicas
* **Guía:** *"How to Preprocess Medical Images for Machine Learning"* (FreeCodeCamp).
* > **Nota de precisión:** el artículo trabaja con **radiografía de tórax 2D** usando OpenCV. **No** cubre DICOM, unidades Hounsfield, ventaneo ni remuestreo. El pilar 1 y las partes específicas de TC de los pilares 2, 4 y 6 (marcas de tomógrafo, etiquetas DICOM, *beam hardening*, baja dosis) vienen de la práctica estándar en TC, no del artículo. Lo que el artículo sí aporta se detalla en la sección 10.1.
* **Concepto Clave:** Detalla los 6 pilares indispensables para preparar imágenes radiológicas antes de alimentarlas a una red neuronal convolucional (CNN), evitando distorsiones que destruyan las características anatómicas.
* **Los 6 Pilares Adaptados al Pipeline de OncoScan:**

1. **Ventaneo en Unidades Hounsfield (HU Scaling):**
   * El tomógrafo captura valores de atenuación entre $-1000\text{ HU}$ (aire) y $+3000\text{ HU}$ (hueso compacto o implantes metálicos). El parénquima pulmonar y los nódulos residen en el rango de $-600\text{ HU}$ con un ancho de ventana de $1500\text{ HU}$.
   * **Implementación:** Calibrar la matriz de entrada en la ventana pulmonar estándar $[-1350, +150]\text{ HU}$ o $[-1000, +400]\text{ HU}$, recortando atenuaciones externas antes de escalar a $[0, 1]$.
2. **Normalización Estandarizada (Z-score):**
   * Ajustar cada corte a media cero y desviación unitaria: $\hat{X} = \frac{X - \mu}{\sigma + \epsilon}$, mitigando diferencias de calibración entre marcas de tomógrafos (GE, Siemens, Toshiba, Philips).
3. **Mejora de Contraste Adaptativo Local (CLAHE):**
   * *Contrast Limited Adaptive Histogram Equalization*. Vital para nódulos en vidrio deslustrado (GGO) y nódulos subsólidos que tienen densidades muy cercanas al tejido aéreo circundante. CLAHE amplifica el contraste local de los márgenes y las espiculaciones sin saturar el ruido de fondo.
4. **Validación y Auditoría DICOM:**
   * Verificación automática de la orientación axial estándar, integridad de las etiquetas de rescale de Hounsfield y descarte de cortes corruptos o con grosor de corte excesivo ($> 5.0\text{ mm}$).
5. **Redimensionamiento con Preservación de Relación de Aspecto (Letterbox / Padding):**
   * **Problema detectado en pipelines genéricos:** Forzar una imagen no cuadrada a $128\times 128$ o $224\times 224$ mediante interpolación bilineal distorsiona la morfología del nódulo (un nódulo benigno circular se estira en un óvalo que simula espiculación maligna).
   * **Solución v1.2:** Escalar manteniendo el *aspect ratio* y rellenar los bordes (*letterboxing*) con el valor mínimo de atenuación del aire ($-1000\text{ HU}$).
6. **Supresión de Ruido y Artefactos:**
   * Filtrado suave de artefactos de haz (*beam hardening*) y ruido cuántico en tomografías de baja dosis (LDCT).

---

### Referencia 3: Lunit INSIGHT MMG / Challenge
* **Referente:** Lunit Inc. (Software de IA radiológica para mamografía y tórax con certificaciones FDA y CE). Enlaces: [Lunit INSIGHT MMG](https://www.lunit.io/en/ai-radiology-software/insight-mmg/) y [Insight Challenge](https://insight-challenge.csg-krc.lunit.io/).
* **Lecciones de Producto, Regulación e Interfaz para OncoScan:**
  1. **Semántica de "Abnormality Score":**
     * Lunit no entrega un veredicto absolutista ("cáncer sí" / "cáncer no"), sino un **Score de Anormalidad (0% a 100%)** que cuantifica la probabilidad de que una lesión requiera acción médica o biopsia.
     * En OncoScan utilizaremos formalmente el término **Score de Sospecha / Anormalidad (0.00 – 1.00)** categorizado en rangos clínicos (Bajo: $< 0.30$, Indeterminado: $0.30 - 0.60$, Alto: $> 0.60$).
  2. **Rol de Asistente de Triaje ("Second Reader"):**
     * Lunit posiciona su IA como un "segundo lector concurrente" que prioriza la lista de trabajo del radiólogo para que los casos sospechosos se atiendan de primeros, reduciendo los falsos negativos hasta en un 50% y acortando los tiempos de lectura.
     * Este enfoque valida exactamente la propuesta de valor de OncoScan para el sistema de salud colombiano.
  3. **Visor Interactivo en Cortina (Before / After Slider):**
     * La interfaz insignia de Lunit permite al radiólogo deslizar una cortina vertical entre la imagen nativa limpia y la imagen con el mapa de calor/contornos.
     * En OncoScan ya contamos con este componente (`BeforeAfterViewer.tsx`); la versión v1.2 lo potenciará integrando el mapa térmico de HiResCAM de alta resolución.
  4. **Procesamiento Efímero en Memoria:**
     * Lunit garantiza en sus acuerdos comerciales que las imágenes clínicas de los clientes no se utilizan para reentrenar modelos sin consentimiento expreso y se procesan de forma transitoria en la memoria RAM del servidor de inferencia. OncoScan replica esta arquitectura en su servidor de IA dedicado en Oracle Cloud.

---

## 3. Dossier de Sustentación ante la Médica Patóloga

Cuando la especialista en patología examine el proyecto, el debate no girará en torno a hiperparámetros de redes neuronales, sino a la **validez biológica, el origen de las etiquetas y el estándar de oro**.

### 3.1 Anatomía y Composición del Dataset LIDC-IDRI
* **Volumen General:** 1,010 pacientes únicos con tomografías helicoidales de tórax.
* **La Verdad Histológica (Crucial para la Patóloga):**
  * De los 1,010 pacientes, **sólo 157 cuentan con confirmación histopatológica en TCIA**:
    * **~98 pacientes con neoplasia maligna confirmada por biopsia/resección:** Predominio de Carcinoma No Microcítico (Adenocarcinoma con patrones acinar/papilar/lepídico y Carcinoma Escamocelular).
    * **~59 pacientes con diagnóstico benigno confirmado:** Granulomas tuberculosos o micóticos inactivos, hamartomas y nódulos con estabilidad volumétrica mayor a 2 años.
  * **Los restantes ~850 pacientes:** La etiqueta no proviene de patología quirúrgica, sino del **consenso independiente de 4 radiólogos torácicos certificados**.

### 3.2 El Filtro de Consenso Riguroso de OncoScan
Para no entrenar la IA con casos dudosos o ruidosos:
* **Clase Positiva (Nódulo - 1):** Cortes donde **los 4 radiólogos (100% de acuerdo unánime)** delimitaron la lesión.
* **Clase Negativa (Normal - 0):** Cortes de parénquima donde al menos **3 de los 4 radiólogos** confirmaron ausencia de anomalías.
* **Cortes con desacuerdo (1/4 o 2/4):** Fueron excluidos del entrenamiento para proteger la pureza del gradiente.
* **Evaluación Independiente:** Conjunto de prueba congelado de **687 casos** (296 positivos y 391 sanos).

### 3.3 Correlación Histopatológica de los 8 Parámetros de Entrada
| Parámetro Clínico | Escala | Correlato Tisular e Histopatológico en el Microscopio |
| :--- | :---: | :--- |
| **Espiculación (`spiculation`)** | 1–5 | **Signo cardinal de malignidad.** Refleja **desmoplasia estromal** (reacción fibroblástica densa del huésped) e infiltración celular tumoral que progresa a lo largo de los septos interlobulillares y vías linfáticas peribroncovasculares (*corona radiata*). |
| **Calcificación (`calcification`)** | 1–6 | Patrones en "palomitas de maíz", concéntricos o centrales corresponden a patología benigna inactiva (hamartomas o granulomas antiguos). En carcinomas invasivos activos la calcificación suele ser **nula (valor 6)** o manifestarse como microcalcificaciones distróficas amorfas. |
| **Lobulación (`lobulation`)** | 1–5 | Bordes lobulados traducen tasas heterogéneas de proliferación celular entre diferentes subclones tumorales, o zonas donde el tumor encuentra resistencia mecánica contra pleura o cartílago bronquial. |
| **Textura (`texture`)** | 1–5 | Nódulos en vidrio deslustrado puro (GGO) correlacionan típicamente con adenocarcinoma *in situ* o hiperplasia adenomatosa atípica (crecimiento lepídico sobre paredes alveolares preservadas). El desarrollo de un núcleo sólido central marca invasión del estroma fibroso. |
| **Margen (`margin`)** | 1–5 | Márgenes mal definidos u oscilantes denotan un frente infiltrativo tumoral agresivo invadiendo los espacios aéreos contiguos. |
| **Esfericidad (`sphericity`)** | 1–5 | Las lesiones perfectamente esféricas suelen corresponder a granulomas benignos o metástasis hematógenas secundarias. El carcinoma broncogénico primario típicamente prolifera de forma irregular y asimétrica. |
| **Sutileza (`subtlety`)** | 1–5 | Contraste de atenuación entre el nódulo y el aire pulmonar circundante. |
| **Sospecha (`malignancy`)** | 1–5 | Juicio radiológico global estructurado. |

### 3.4 Guion Magistral para Sustentar ante la Patóloga
> *"Doctora, tenemos absoluta claridad en que **en oncología el único estándar de oro de certeza diagnóstica es la biopsia histopatológica y la tipificación celular en el microscopio**. OncoScan no pretende en ningún momento sustituir al patólogo ni emitir un diagnóstico citológico.*
>
> *OncoScan se diseñó como una herramienta de **triaje y priorización temprana en tomografía computarizada**. Su objetivo es identificar a los pacientes con nódulos de alta sospecha biológica (por ejemplo, aquellos que exhiben desmoplasia estromal reflejada en espiculaciones radiológicas y ausencia de calcificaciones benignas), para que sean **remitidos oportunamente a neumología intervencionista y a su servicio de patología**, evitando que un cáncer pulmonar en estadio temprano progrese silenciosamente mientras espera semanas por una cita."*

---

## 4. Plan de Acción Técnico Día a Día (Semana Entrante)

Este es el cronograma de trabajo paso a paso para ejecutar la próxima semana en el notebook de Kaggle y el microservicio:

```mermaid
flowchart LR
    Lunes["Lunes\nData Pipeline\nCLAHE + Letterbox"] --> Martes["Martes\nAsymmetric Loss\n+ Augmentations"]
    Martes --> Miercoles["Miércoles\nEntrenamiento\nGPU Kaggle (40 ep)"]
    Miercoles --> Jueves["Jueves\nEvaluación 687 Casos\n+ TTA + HiResCAM"]
    Jueves --> Viernes["Viernes\nDespliegue HF\n+ Actualización Web"]
```

### Lunes: Data Pipeline & Preprocesamiento en Kaggle
1. **Resolución Espacial:** Configurar el tamaño de imagen de entrada a **$128 \times 128$ px** (o $224 \times 224$ px según memoria VRAM de la GPU T4).
2. **Aspect-Ratio Preserving Resize (Letterbox):**
   * Crear la función de transformación que escala la dimensión mayor a 128/224 px y aplica relleno (*padding*) simétrico con valor $-1000\text{ HU}$ (aire), evitando distorsionar nódulos esféricos.
3. **Integración de CLAHE:**
   * Aplicar `cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))` sobre la ventana pulmonar normalizada para realzar bordes espiculados y nódulos subsólidos.
4. **Verificación de Split por Paciente (Zero-Leakage):**
   * Confirmar mediante `sklearn.model_selection.GroupKFold` que todos los cortes de un mismo `patient_id` queden estrictamente en el mismo subconjunto (Train, Val o Test), garantizando que no haya fuga entre particiones.

### Martes: Asymmetric Focal Loss & Data Augmentation
1. **Implementación de `AsymmetricFocalLoss` en PyTorch:**
   * Penalizar con factor $\alpha=0.75$ la omisión de nódulos positivos y amortiguar el gradiente de ejemplos fáciles negativos ($\gamma=2.0$):
   $$\mathcal{L}_{\text{asym}}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$
2. **Pipeline de Data Augmentation con `albumentations`:**
   * Rotaciones leves ($\pm 15^\circ$).
   * *HorizontalFlip* ($p=0.5$).
   * *RandomBrightnessContrast* sutil para simular variaciones de dosis de radiación.
   * *ShiftScaleRotate* con preservación de escala.
3. **Prueba Unitaria de Gradientes:**
   * Ejecutar un mini-batch sintético para validar que la función de pérdida converge y no produce NaNs.

### Miércoles: Entrenamiento en Kaggle (GPU T4)
1. **Configuración de Hiperparámetros:**
   * Épocas: 40.
   * Batch size: 32 (o 64).
   * Optimizador: `AdamW(lr=1e-4, weight_decay=1e-2)`.
   * Scheduler: `CosineAnnealingLR(optimizer, T_max=40, eta_min=1e-6)`.
   * Early Stopping: Paciencia de 6 épocas monitorizando **Validation Recall** (priorizando la reducción de Falsos Negativos).
2. **Guardado de Checkpoints:**
   * Serializar `best_model_multimodal_v1.2.pth` junto con el archivo de configuración `config_v1.2.json` (incluyendo medias y desviaciones de las 8 variables clínicas).

### Jueves: Evaluación Rigurosa, TTA & HiResCAM
1. **Evaluación Formal sobre los 687 Casos de Prueba Congelados:**
   * Generar predicciones probabilísticas para los 391 casos sanos y los 296 casos patológicos.
2. **Test-Time Augmentation (TTA):**
   * Evaluar cada tomografía en 4 variantes (original, flip horizontal, rotación $+90^\circ$, rotación $-90^\circ$). Promediar probabilidades para estabilizar la predicción.
3. **Migración a HiResCAM:**
   * Implementar la formulación de HiResCAM (multiplicación elemento a elemento de activaciones y gradientes) para erradicar las manchas térmicas en las esquinas de la imagen.
4. **Construcción de Métricas Consolidadas:**
   * Calcular la nueva Matriz de Confusión oficial.
   * Verificar cumplimiento: **FN $\le 15$**, **Sensibilidad $\ge 95\%$**, **AUC $\ge 0.950$**.

### Viernes: Despliegue en el Servidor de IA (Oracle Cloud) & Frontend
1. **Actualización del Microservicio de Inferencia:**
   * Actualizar el servicio de inferencia en el servidor de Oracle Cloud (`oncoscan-ai.duckdns.org`).
   * Reemplazar archivo de pesos con `best_model_multimodal_v1.2.pth`.
   * Actualizar `app.py` con el pipeline de preprocesamiento (CLAHE + Letterbox + TTA + HiResCAM).
   * Probar endpoint `POST /predict` con casos de prueba conocidos y verificar respuesta 200 OK en $< 1.5$ segundos.
2. **Sincronización en Aplicación Web (`apps/web`):**
   * Actualizar `apps/web/src/components/modelo/modelData.ts` con las métricas finales de `v1.2`.
   * Actualizar la matriz de confusión y curvas ROC en `/platform/modelo` y la landing page.
   * Realizar prueba integral desde el navegador: Subida de tomografía $\rightarrow$ Backend Render $\rightarrow$ Servidor IA Oracle $\rightarrow$ Visor con HiResCAM.

---

## 5. Tabla de Archivos Involucrados la Próxima Semana

| Ruta del Archivo | Lenguaje / Tipo | Acción Requerida la Próxima Semana |
| :--- | :---: | :--- |
| `notebooks/train_multimodal_v1.2.ipynb` | Jupyter / Python | Notebook en Kaggle con resolución $128\times 128$, CLAHE, Letterbox, Asymmetric Focal Loss y entrenamiento GPU. |
| `kaggle_evaluation_script.py` | Python | Script de validación en batch de los 687 casos del test set para generar métricas oficiales. |
| `hf_space/app.py` | Python / FastAPI | Microservicio de inferencia (servidor Oracle Cloud) con soporte para pesos v1.2, TTA y HiResCAM. |
| `apps/web/src/components/modelo/modelData.ts` | TypeScript | Archivo fuente de verdad de métricas, matriz de confusión y curvas para la plataforma web. |
| `docs/evaluacion-v1.1-plan-v1.2.md` | Markdown | Registrar el cierre de la versión 1.1 y archivar formalmente los resultados alcanzados por la versión 1.2. |

---

## 6. Lista de Chequeo de Cierre (Audit Checklist)

Antes de dar por concluida la actualización la próxima semana, se deberán verificar los siguientes puntos de control:
* [ ] ¿El modelo v1.2 redujo los Falsos Negativos a menos de 15 casos?
* [ ] ¿La Sensibilidad clínica alcanzó o superó el 95.0%?
* [ ] ¿El preprocesamiento preserva la relación de aspecto mediante Letterbox sin estirar nódulos?
* [ ] ¿El mapa térmico HiResCAM está centrado exactamente sobre la región de interés y no en el fondo?
* [ ] ¿El endpoint del servidor de IA (Oracle Cloud) responde en menos de 2 segundos en CPU?
* [ ] ¿Las métricas mostradas en la plataforma web coinciden exactamente con la evaluación empírica de los 687 casos?
* [ ] ¿El guion para la médica patóloga está memorizado y claro para el equipo?

---

## 7. Nuevas Referencias: Modelos 3D y Foundation Models (NV-Reason-CT, MONAI, nnFoundation)

> Análisis de los enlaces recopilados en [nv_reason_ct.md](nv_reason_ct.md) frente al estado actual de OncoScan (octubre 2026).

### 7.1 Conclusión general

La novedad de fondo es que **ya existen modelos abiertos que leen el volumen de tomografía 3D completo** y detectan, miden y describen hallazgos por sí solos. OncoScan `multimodal-v1.2` hace algo mucho más acotado: recibe un recorte PNG de 64 px más **8 features LIDC que el radiólogo ya calificó a mano** (incluida `malignancy`) y responde "nódulo / sin nódulo". Hoy el sistema **confirma** un hallazgo que el médico ya encontró; estos recursos permiten que lo **encuentre**.

### 7.2 Riesgo a verificar en el modelo actual

Los negativos del entrenamiento son cortes **sin nódulo** (sección 3.2 de este documento). Las 8 features LIDC solo existen para nódulos anotados. Si a los negativos se les rellenaron las features con valores por defecto, la rama clínica puede estar separando las clases **por el relleno y no por la imagen**. Eso explicaría el salto de 80.6% (solo imagen) a 89.8% (multimodal).

**Acción:** revisar en el notebook de Kaggle cómo se asignan las features a los negativos y confirmar que la división train/test sea **por paciente**.

### 7.3 Qué aporta cada referencia

| Recurso | Qué es | Utilidad para OncoScan | ¿Usable hoy? (presupuesto cero, Oracle ARM sin GPU) |
|---|---|---|---|
| **MONAI Lung Nodule CT Detection** (NGC) | RetinaNet 3D (Apache 2.0). Recibe el volumen CT completo y devuelve cajas con score | **La pieza más valiosa.** Detección automática y diámetro del nódulo, base para estimar Lung-RADS por tamaño | **Sí, con matices.** En CPU tarda minutos (en A100 ~36 s de punta a punta), así que debe correr como trabajo asíncrono con polling, igual que el flujo actual |
| **nnFoundation** (arXiv 2609.26924, DKFZ) | Modelos 3D preentrenados con 2.1 M de estudios. Pesos en HF: `MIC-DKFZ/nnFoundationCNN` (102 M parámetros) y `nnFoundationViT`. Integrados con nnU-Net y nnDetection | Afinar con pocos datos: con el 10% de los datos, el preentrenamiento sumó **+4.2 puntos de Dice** en sitios externos | Afinar sí, en Kaggle (GPU T4). Servirlo en CPU es más pesado que el detector MONAI |
| **NV-Reason-CT** (NVIDIA; arXiv 2609.27511) | Modelo 3D de visión y lenguaje (Qwen3.5-4B + ViT 3D, 4.7 B parámetros, licencia OpenMDW-1.1). Genera informe estructurado, responde preguntas y muestra su razonamiento. Incluye *lung nodule* entre 18 hallazgos (CT-RATE: macro-F1 0.614, macro-AUROC 0.871) | Borrador de informe radiológico y preguntas sobre el estudio. En un estudio preliminar redujo ~50% el tiempo de lectura | **No en producción** (requiere GPU en BF16). Sí como demo o investigación en Kaggle o Colab |
| **Nature Medicine s41591-026-04626-w** (MedGemma, Google) | Modelo abierto de visión y lenguaje + el encoder MedSigLIP | En TC 3D rinde poco (macro-F1 0.303 en CT-RATE, frente a 0.614 de NV-Reason-CT). Puede servir para el proyecto de mama | Baja prioridad para pulmón |
| **RSNA News (oct 2026)** | Revisión de *RadioGraphics* (doi 10.1148/rg.260012): la tomografía de tamizaje muestra mucho más que nódulos | **Idea de producto:** módulo de hallazgos incidentales. Enfisema en ~31% de NLST (más del 80% sin diagnosticar), calcio coronario, osteoporosis (L1 < 100 HU → pedir DXA) | **Sí, y es barato** (ver hoja de ruta) |
| **MONAI Physio** | Herramientas de movimiento pulmonar y cardíaco 4D y gemelos digitales | Solo sus segmentadores (TotalSegmentator, NV-Segment-CT), para obtener la máscara de pulmón y de vértebras | Solo los segmentadores |
| **NVIDIA Clara** | Página general (MONAI, NIM, FLARE) | **NVIDIA FLARE** es la herramienta práctica para aprendizaje federado | Trabajo futuro |
| **Google Research (aprendizaje federado + TEE)** | El mismo artículo ya citado en [arquitectura-privacidad-y-lidc-patologia.md](arquitectura-privacidad-y-lidc-patologia.md) | Nada nuevo frente a lo ya documentado | Trabajo futuro |
| **vllm-sr Decision 3.0** (HF) | Modelos de enrutamiento genéricos, sin relación médica | **Descartado** | — |
| **Segmentación con conciencia de bordes + incertidumbre** | Técnica de segmentación | La incertidumbre aplica ya (vía TTA). La conciencia de bordes, solo cuando haya segmentación | Parcial |

### 7.4 Hoja de ruta propuesta

**Corto plazo (sin cambiar la infraestructura):**
1. Verificar el riesgo de fuga de datos y la división por paciente. Si se confirma, entrenar una v1.3 que **prediga** las 8 features en lugar de recibirlas: el modelo produce los atributos (espiculación, margen…) y eso además sirve como explicabilidad.
2. **Incertidumbre visible:** usar la varianza entre las variantes del TTA (ya planeado en v1.2) como indicador de confianza y marcar "indeterminado, revisión prioritaria" cuando sea alta.

**Mediano plazo (crecimiento de la plataforma):**

3. Subir la **serie DICOM completa** en lugar del recorte PNG y procesarla con el detector MONAI de forma asíncrona. Como resultado se ven los nódulos con su ubicación y diámetro, más un "Lung-RADS estimado solo por tamaño" con advertencia. El visor Cornerstone3D ([pioneros-gradcam-tomografia.md](pioneros-gradcam-tomografia.md), fase 4) pasa a ser necesario.
4. **Módulo de hallazgos incidentales:** con la máscara de pulmón de TotalSegmentator, el **índice de enfisema** es el porcentaje de vóxeles por debajo de −950 HU. La **densidad de L1** es el promedio de HU dentro de la máscara de la vértebra. No requiere entrenar nada y corre en CPU.

**Futuro / demostración:**

5. NV-Reason-CT como demo de informe generado (Kaggle o Colab), no en producción.
6. NVIDIA FLARE para la fase de aprendizaje federado.

### 7.5 Restricciones

- **El servidor de IA no tiene GPU** (Oracle Always Free ARM64; restricción R1 de presupuesto cero). Esto descarta NV-Reason-CT y MedGemma en producción. El detector MONAI en CPU es viable, pero hay que medir cuánto tarda en ARM.
- **Almacenamiento:** una serie de TC pesa entre 100 y 300 MB y el plan gratuito de Supabase Storage es limitado. Hay que procesar sin guardar (zero retention) y conservar solo los resultados.
- **El detector MONAI se entrenó con LUNA16, que es un subconjunto de LIDC-IDRI**: evaluarlo sobre LIDC infla las métricas.
- Todos estos modelos son de investigación y no son dispositivos médicos, lo cual es coherente con el aviso de OncoScan.

---

## 8. Datos Necesarios para las Nuevas Mejoras

**En resumen:** la mayor parte se cubre con **LIDC-IDRI**, siempre que se tengan las **series DICOM completas** y no solo los recortes PNG. Hace falta **al menos un dataset nuevo**, por dos motivos:

1. **Validación externa del detector:** el detector MONAI ya conoce los casos de LIDC (LUNA16), así que evaluarlo ahí no es válido.
2. **Verdad de cáncer:** LIDC solo tiene 157 pacientes con confirmación por patología; el resto es consenso de radiólogos. Para hablar de "riesgo de cáncer" y no solo de "hay nódulo" se necesitan datos con malignidad confirmada.

### 8.1 Datos por mejora

| Mejora | ¿Basta LIDC-IDRI? | Qué hace falta |
|---|---|---|
| 1. Revisar la fuga y entrenar la v1.3 que predice las 8 features | ✅ Sí | Los mismos datos, rearmados: división por paciente (con `pylidc`) y negativos sin features rellenadas |
| 2. Incertidumbre con TTA | ✅ Sí | Ningún dato nuevo: se calcula en inferencia y se valida con el mismo test |
| 3. Detección 3D con MONAI | ⚠️ Solo para la demo | El modelo ya viene entrenado, así que no se necesitan datos para entrenar. Para **evaluarlo** hace falta un conjunto externo: **LUNA25** (recomendado) o LNDb |
| 4. Lung-RADS estimado por tamaño | ✅ Sí | LIDC trae los diámetros por nódulo (`pylidc`), para comprobar que el diámetro que mide el detector coincide con el de los radiólogos |
| 5. Hallazgos incidentales (enfisema, densidad de L1) | ✅ Para calcularlos | TotalSegmentator ya viene entrenado y el índice de enfisema es un umbral de HU. Para **validarlos**: **CT-RATE** (etiquetas *emphysema* y *coronary artery wall calcification*) |
| 6. Demo de NV-Reason-CT | ✅ | Unos pocos volúmenes de LIDC o CT-RATE |
| 7. Riesgo de malignidad real (cáncer vs benigno) | ❌ | **LUNA25**: 555 nódulos malignos y 5.608 benignos, de NLST |

### 8.2 Datasets nuevos, por prioridad

1. **LUNA25** ([imágenes](https://zenodo.org/records/14223624), [anotaciones](https://zenodo.org/records/14673658), [challenge](https://luna25.grand-challenge.org/)): 4.069 tomografías de baja dosis de 2.120 pacientes de NLST, con etiqueta maligno o benigno por nódulo.
   - Es tamizaje real con baja dosis.
   - No se solapa con LUNA16, así que sirve de prueba externa para el detector MONAI.
   - Permite pasar de "detecta nódulos" a "estima malignidad".

   Trae una carpeta con recortes ya extraídos alrededor de cada nódulo (6.163 archivos `.npy`), liviana para Kaggle. Licencia por verificar en Zenodo.
2. **CT-RATE** ([Hugging Face](https://huggingface.co/datasets/ibrahimhamamci/CT-RATE)): ~25.700 tomografías de tórax con informe y 18 etiquetas. Sirve para validar el módulo de hallazgos incidentales y para la demo de NV-Reason-CT. Acceso restringido: hay que pedirlo y aceptar los términos. Licencia CC BY-NC-SA.
3. **LNDb** ([Grand Challenge](https://lndb.grand-challenge.org/Data/)), opcional: 294 tomografías de Portugal; aporta un tomógrafo y una población distintos. Licencia probablemente CC BY-NC-ND.

**Descartado por ahora:** Duke DLCS24 tiene acceso restringido y sus anotaciones se hicieron con un detector entrenado en LUNA16.

### 8.3 Pendiente de confirmar con el equipo de IA

¿Qué versión de LIDC usa hoy el notebook de Kaggle?
- **Recortes + `features_clinicas_reales.csv`:** sirve para las mejoras 1 y 2. Para las mejoras 3 a 5 se necesitan los volúmenes completos. La opción más práctica es LUNA16 (888 tomografías en `.mhd`, ~60 GB, con copias en Kaggle) o un subconjunto de LIDC descargado de TCIA. No hace falta el archivo completo, de ~125 GB.
- **Series DICOM completas:** solo falta LUNA25.

### 8.4 Consideraciones

- La restricción R2 prohíbe procesar pacientes reales ([ccii-n2016-02-documentacion-proyecto.md](ccii-n2016-02-documentacion-proyecto.md)). Todos estos datasets son públicos y vienen desidentificados. Las pruebas de subida en la plataforma también deben usar series de LIDC o LUNA25.
- Licencias: LIDC es CC BY 3.0, CT-RATE es no comercial y LUNA25 está por verificar. Hay que documentarlas por si en el futuro hay uso comercial.

---

## 9. Fuentes Consultadas (Secciones 7 y 8)

- [MONAI Lung Nodule CT Detection (NGC)](https://catalog.ngc.nvidia.com/orgs/nvidia/monaitoolkit/models/monai_lung_nodule_ct_detection)
- [NV-Reason-CT en Hugging Face](https://huggingface.co/nvidia/NV-Reason-CT) · [Paper NV-Reason-CT (arXiv 2609.27511)](https://arxiv.org/html/2609.27511v2) · [Código en GitHub](https://github.com/NVIDIA-Medtech/NV-Reason-CT)
- [nnFoundation (arXiv 2609.26924)](https://arxiv.org/html/2609.26924v1) · [nnFoundationCNN](https://huggingface.co/MIC-DKFZ/nnFoundationCNN) · [nnssl](https://github.com/MIC-DKFZ/nnssl)
- [MedGemma – Nature Medicine](https://www.nature.com/articles/s41591-026-04626-w) · [MedGemma 1.5 – Google Research](https://research.google/blog/next-generation-medical-image-interpretation-with-medgemma-15-and-medical-speech-to-text-with-medasr/)
- [RSNA News – Lung Cancer Screening (oct 2026)](https://www.rsna.org/news/2026/october/lung-cancer-ct-screening)
- [MONAI Physio](https://project-monai.github.io/monai-physio/installation.html) · [NVIDIA Clara Medical Imaging](https://www.nvidia.com/es-la/clara/medical-imaging/)
- [Google Research – Provably private federated learning](https://research.google/blog/toward-provably-private-learning-from-federated-data/)
- [LUNA25 – imágenes](https://zenodo.org/records/14223624) · [LUNA25 – anotaciones](https://zenodo.org/records/14673658)
- [CT-RATE](https://huggingface.co/datasets/ibrahimhamamci/CT-RATE) · [LNDb](https://lndb.grand-challenge.org/Data/) · [Duke DLCS](https://zenodo.org/records/13799069)

---

## 10. Mejora del Visor: Marcadores con Notas, Herramientas y Pantalla Completa

> **Estado (21 oct 2026): ✅ Fases A, B y C terminadas.** Fase A: PR #18, plan en [2026-10-20-visor-fase-a.md](superpowers/plans/2026-10-20-visor-fase-a.md). Fase B: plan en [2026-10-20-visor-fase-b.md](superpowers/plans/2026-10-20-visor-fase-b.md); paleta de herramientas, brillo/contraste, marcadores con notas y panel del caso dentro de la pantalla completa (problema 3). Fase C: plan en [2026-10-21-visor-fase-c.md](superpowers/plans/2026-10-21-visor-fase-c.md); tabla `upload_annotations` con RLS y guardado automático de los marcadores (requiere aplicar la migración `20261021120000_upload_annotations.sql` en el SQL Editor). **Siguiente: Fase D** (lectura ciega y modo práctica).
>
> **Prioridad:** es lo **primero** que se implementa en la plataforma. No depende del reentrenamiento del modelo ni de datos nuevos.
> **Referentes:** Lunit INSIGHT MMG (producto comercial) y Lunit INSIGHT Challenge (visor de lectura con marcadores), más el artículo de freeCodeCamp sobre preprocesamiento.

### 10.1 Qué se aprende de cada referente

**Lunit INSIGHT Challenge.** Es el visor donde un lector clasifica un caso y marca la lesión; luego compara contra el resultado. Lo que se observa en su interfaz:

| Elemento | Cómo lo hace Lunit | ¿Lo tiene OncoScan hoy? |
|---|---|---|
| Barra de herramientas por modo | Pan · Adjust (brillo/contraste arrastrando) · Reset · Marker. Una sola herramienta activa a la vez | ❌ Hay botones sueltos (zoom, parpadeo, descarga). No existe el concepto de "herramienta activa" |
| Marcadores sobre la imagen | Pin numerado sobre la lesión. Panel lateral con la lista de marcadores por vista y botón para borrar cada uno | ❌ |
| Clasificación del caso | Botones Cancer / Non-Cancer en el panel lateral, junto a la imagen | ⚠️ La valoración existe (`ClinicalReviewForm`, tabla `upload_reviews`), pero está **debajo** del visor y no es visible en pantalla completa |
| Lectura antes del resultado | El lector clasifica y marca **antes** de pulsar "Check The Result" | ❌ La IA se muestra de entrada, lo que favorece el sesgo de automatización |
| Información en cada panel | Nombre de la vista arriba (RCC, LMLO…). Zoom y WW/WL abajo | ⚠️ Solo un % de zoom en la barra |
| Tema oscuro | Todo el área de lectura es oscura, como en una estación de radiología | ⚠️ El lienzo es negro, pero la tarjeta y la pantalla completa son blancas |
| Ayuda con atajos | Modal "Instruction" con los atajos (Pan = arrastrar, Adjust = arrastre horizontal, Marker = clic, Zoom = rueda) | ⚠️ Solo una pista sobre la barra espaciadora |
| Gamificación | Puntaje y cronómetro | No aplica en clínica. Sí sirve para un modo de práctica (10.6) |

**Lunit INSIGHT MMG (producto).** La página pública aporta lecciones de producto, no de interfaz:
- El score expresa **probabilidad de malignidad, no severidad**, y su **escala no es lineal**. OncoScan debe explicar lo mismo junto a su score.
- **No marca hallazgos benignos** (por ejemplo, calcificaciones de piel) salvo que tengan rasgos sospechosos. Marcar menos y mejor reduce la fatiga del lector.
- Funciona en lectura simple y en **doble lectura**, e integrado al visor o PACS del hospital.
- Tiene aprobación FDA, CE y Health Canada. OncoScan mantiene su aviso de "no es dispositivo médico".

**freeCodeCamp: preprocesamiento.** El artículo es sobre radiografía 2D (ver la nota en la Referencia 2). Lo que sí aplica:
- Validación del dataset: archivos corruptos, imágenes casi negras y, sobre todo, **duplicados entre train y test**, que inflan las métricas (relacionado con la sección 7.2).
- Las estadísticas de normalización se calculan **solo con train**. Usar validación o test es fuga de información.
- Redimensionar con *padding* (letterbox) en lugar de estirar, CLAHE con `clipLimit=2.0, tileGridSize=(8,8)` y eliminación de ruido suave (mediana k=3). Ya están en el plan v1.2.
- Advertencia del artículo: la imagen limpia debe **seguir pareciendo la original a los ojos de un radiólogo**. Aplica también al filtro "Enfocar nódulo" del visor.

### 10.2 Diagnóstico del visor actual

Revisión de [BeforeAfterViewer.tsx](../apps/web/src/components/ui/BeforeAfterViewer.tsx):

| # | Problema | Efecto |
|---|---|---|
| 1 | En pantalla completa el lienzo sigue siendo `aspect-square w-full` | En una pantalla 16:9 la imagen es tan alta como el ancho de la pantalla y **se sale por abajo**. Hay que hacer scroll, y en pantalla completa no hay scroll |
| 2 | La pantalla completa tiene fondo blanco (`data-[fullscreen=true]:bg-white`) | Deslumbra. Las estaciones de lectura usan un entorno oscuro |
| 3 | Solo entra a pantalla completa el visor | El médico pierde de vista el score, la valoración y (en el futuro) los marcadores. No puede trabajar el caso en pantalla completa |
| 4 | La barra espaciadora se escucha en `window` con `preventDefault` en toda la página | Si el foco está en un **botón** (por ejemplo, "Guardar valoración"), Espacio no lo activa y alterna la IA. Además bloquea el scroll con Espacio. **Es un problema de accesibilidad (WCAG 2.1.1)** |
| 5 | En iPhone Safari no existe la Fullscreen API para elementos (solo para video) | El botón no hace nada en iPhone. Hace falta un modo alternativo con `position: fixed` |
| 6 | No hay ajuste de brillo/contraste | Es la herramienta más usada en lectura (el "Adjust" de Lunit) |
| 7 | No hay herramienta activa ni marcadores | Todo lo de la sección 10.3 |

### 10.3 Diseño propuesto

**A. Paleta de herramientas (máquina de estados).** Reemplaza los botones sueltos por un selector de una sola herramienta activa:

| Herramienta | Atajo | Gesto |
|---|---|---|
| Mover (Pan) | `H` | Arrastrar. La rueda hace zoom en cualquier herramienta, como hoy |
| Ajustar | `A` | Arrastre horizontal = contraste; vertical = brillo. Doble clic restablece |
| Marcador | `M` | Clic = nuevo marcador numerado y se abre su nota |
| Medir (fase posterior) | `L` | Dos clics = diámetro en mm (solo si se conoce el *PixelSpacing*, ver 10.5) |
| Restablecer | `0` | Zoom, pan y ajuste vuelven al inicio |
| Parpadeo IA | `Espacio` | Igual que hoy, pero **solo con el foco dentro del visor** (corrige el problema 4) |
| Ayuda | `?` | Modal con todos los atajos, como el "Instruction" de Lunit |

Con la imagen PNG actual (8 bits), "Ajustar" es **brillo/contraste con filtro CSS**, no WW/WL real. La etiqueta debe decir "Brillo/Contraste" y no "WW/WL", para no prometer algo que no es. El WW/WL real con presets (pulmón W1500/L−600, mediastino W350/L50) llega con los datos HU de la serie DICOM (fase E).

**B. Marcadores con notas.**
- Clic con la herramienta Marcador → pin numerado (1, 2, 3…) y una ventana flotante con:
  - **Tipo de hallazgo:** nódulo sólido, subsólido, vidrio esmerilado, calcificado, artefacto u otro.
  - **Opinión frente a la IA:** "la IA lo marcó", "la IA no lo marcó (posible falso negativo)", "la IA marcó algo que no es lesión (falso positivo)".
  - **Nota libre** de hasta 1.000 caracteres.
  - **Tamaño estimado en mm** (opcional).
- **Panel lateral de marcadores**, como la lista de Lunit: número, tipo y comienzo de la nota. Cada fila permite:
  - clic para centrar y hacer zoom sobre el marcador;
  - editar;
  - borrar, con confirmación.
- Los pins se dibujan **dentro de la capa transformada** (la misma de `layerStyle`), para que sigan a la imagen con zoom, pan y pantalla completa. Su tamaño en pantalla se mantiene constante (escala inversa al zoom).
- Las coordenadas se guardan **normalizadas a la imagen** (`x`, `y` entre 0 y 1 sobre el tamaño natural del PNG), no en píxeles de pantalla. Así sobreviven a cambios de zoom, de tamaño de ventana y de dispositivo. Ojo: `object-contain` deja franjas si la imagen no es cuadrada, así que hay que calcular el rectángulo real que ocupa la imagen. Esa conversión va en funciones puras con tests, igual que `panZoomMath.ts`.
- **Accesibilidad:** cada pin es un `<button>` con `aria-label="Marcador 2: nódulo subsólido, nota…"`. Desde teclado se puede "agregar marcador en el centro" y moverlo con las flechas. Los colores salen de los tokens: `brand-primary` para los pins y nunca `brand-danger`, que está reservado para alertas clínicas.
- **Exportar imagen:** incluye los pins numerados, pero **no** el texto de las notas, salvo que el médico lo pida explícitamente. Las notas son PHI.

**C. Panel lateral y pantalla completa.**
- Disposición tipo Lunit: imagen a la izquierda y **panel lateral a la derecha** con:
  1. score y nivel de riesgo;
  2. lista de marcadores;
  3. valoración resumida (concordancia, Lung-RADS, conducta), con enlace al formulario completo.
- La **pantalla completa abarca imagen + panel**, no solo la imagen (corrige el problema 3), con **tema oscuro** (corrige el problema 2).
- El lienzo se dimensiona por la **altura disponible**: `h-[calc(100dvh-barra)]` con `aspect-square` y `max-w-full`, centrado (corrige el problema 1).
- Si `requestFullscreen` no existe (iPhone), se usa un modo "expandido" con `position: fixed; inset: 0` y se bloquea el scroll del body (corrige el problema 5).
- Indicadores en las esquinas del lienzo, como Lunit: arriba el nombre del estudio/vista; abajo el zoom y el brillo/contraste.
- En pantallas angostas (móvil) el panel pasa a una hoja inferior plegable.

### 10.4 Modelo de datos (Supabase)

Nueva tabla `upload_annotations`, una fila por marcador. Sigue el mismo patrón de `upload_reviews` ([20261002120000_upload_reviews.sql](../supabase/migrations/20261002120000_upload_reviews.sql)):

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `upload_id` | `uuid` FK → `dicom_uploads(id)` | `ON DELETE CASCADE` |
| `user_id` | `uuid` FK → `auth.users(id)` | autor del marcador |
| `seq` | `smallint` | número visible (1, 2, 3…), único por `upload_id` |
| `kind` | `text` | `CHECK IN ('point','measure')` |
| `x`, `y` | `real` | `CHECK BETWEEN 0 AND 1`. Para `measure` se agregan `x2`, `y2` |
| `finding_type` | `text` | `CHECK IN ('solido','subsolido','vidrio_esmerilado','calcificado','artefacto','otro')` |
| `ai_agreement` | `text` | `CHECK IN ('ia_marco','ia_no_marco','ia_falso_positivo')` |
| `size_mm` | `numeric(5,1)` | opcional, `> 0 AND <= 300` |
| `note` | `text` | `char_length <= 1000`. **Es PHI** |
| `created_at`, `updated_at` | `timestamptz` | se reutiliza el trigger `set_updated_at()` |

- **RLS:** igual que `upload_reviews`. Cada médico ve y edita solo sus marcadores, y solo puede crearlos sobre estudios que él subió. La subconsulta va sobre `dicom_uploads`, nunca sobre la misma tabla, para evitar la recursión que ya se presentó antes.
- **Guardado:** *server actions* en `apps/web/src/app/platform/uploads/[id]/actions.ts`, como la valoración. Se guarda al cerrar la nota, sin botón global.
- **PHI:** `note` nunca se envía a `console.*` ni a logs. Los errores se reportan solo con su tipo.
- **Relación con la valoración:** `upload_reviews` sigue siendo el **veredicto del caso**; `upload_annotations` es el **detalle por lesión**. Si un marcador tiene `size_mm` y la valoración no, el formulario lo puede sugerir.

### 10.5 Valor clínico y académico de los marcadores

1. **Retroalimentación localizada para el modelo.** Hoy la valoración dice "discrepa" para todo el caso. Con marcadores se sabe **dónde** estaba el nódulo que la IA no vio. Eso alimenta el ciclo de retroalimentación ya propuesto en [plan-anonimizacion-y-feedback-futuro.md](plan-anonimizacion-y-feedback-futuro.md) y sirve como etiqueta para futuros reentrenamientos.
2. **Alerta de falso negativo crítico.** Un marcador "la IA no lo marcó" más Lung-RADS 4A/4B en la valoración activa la alerta de omisión que ya está diseñada en ese documento.
3. **Concordancia objetiva.** Se puede medir automáticamente si el marcador del médico cae dentro de la zona caliente del Grad-CAM/HiResCAM.
4. **Medición en mm, solo con calibración.** Medir requiere el `PixelSpacing` del DICOM. En PNG sin calibración la herramienta Medir se desactiva con una explicación. **Nunca** se muestra un tamaño en mm inventado.

### 10.6 Lectura ciega y modo práctica (inspirado en el Challenge)

- **Lectura ciega (opcional, por médico):** la IA queda oculta hasta que el médico registra su impresión inicial y sus marcadores. Luego "Ver resultado de la IA" revela el mapa y el score. Así se reduce el **sesgo de automatización**, y el sistema guarda la impresión antes y después de ver la IA.
- **Modo práctica / estudio de lectores (para la sustentación):**
  - casos de LIDC-IDRI (o LUNA25) donde el usuario marca y clasifica;
  - al pulsar "Ver resultado" se comparan sus marcadores con la anotación de referencia y con la IA;
  - se mide la sensibilidad y el tiempo de lectura **con y sin IA**, el mismo tipo de evidencia que presentan NV-Reason-CT (−50% en el tiempo de lectura) y Lunit.

  Es un aporte académico fuerte y no requiere pacientes reales (restricción R2).

### 10.7 Plan de implementación por fases

| Fase | Contenido | Archivos principales | Esfuerzo |
|---|---|---|---|
| **A. Correcciones** ✅ | Problemas 1, 2, 4 y 5 de la sección 10.2: tamaño en pantalla completa, tema oscuro, Espacio solo con foco en el visor, modo expandido para iPhone y modal de ayuda `?`. El problema 3 pasa a la Fase B | `BeforeAfterViewer.tsx`, `viewerKeys.ts`, `useViewerFullscreen.ts`, `ViewerHelpDialog.tsx`, `globals.css` (variante `viewer-full:`) | Hecho (PR #18) |
| **B. Herramientas y marcadores (solo en el navegador)** ✅ | Paleta de herramientas, brillo/contraste, pins con notas, panel lateral (incluye el problema 3: panel dentro de pantalla completa) y conversión de coordenadas con tests | `BeforeAfterViewer.tsx` (dividir en `ViewerToolbar`, `MarkerLayer`, `MarkerPanel`), nuevo `markerMath.ts` + `markerMath.test.ts` | Hecho (rama `feat/visor-fase-b`) |
| **C. Persistencia** ✅ | Migración `upload_annotations` con RLS, server actions, carga inicial en `uploads/[id]/page.tsx` y en el flujo de subida | `supabase/migrations/2026XXXX_upload_annotations.sql`, `uploads/[id]/actions.ts`, `uploads/[id]/page.tsx`, `upload/page.tsx` | Hecho (rama `feat/visor-fase-c`) |
| **D. Lectura ciega y modo práctica** ✅ | Preferencia por médico (interruptor en Ajustes); impresión inicial inmutable antes de ver la IA, que luego prellena la valoración; ningún lugar (historial, alertas, reportes, informe) revela un estudio pendiente; modo práctica con 5 casos LIDC-IDRI y comparación con la anotación de referencia. La Tarea 9 (enlaces en el sidebar y lectura ciega en el dashboard) queda pendiente hasta que el PR de versiones esté en `main` | `supabase/migrations/20261028120000_blind_reading.sql`, `lib/blindReading.ts`, `lib/initialImpression.ts`, `uploads/[id]/BlindReadingWorkspace.tsx`, `ajustes/BlindReadingToggle.tsx`, nueva ruta `/platform/practica`, `scripts/prepare_practice_cases.py` | Hecho (rama `feat/visor-fase-d`, sin push) |
| **E. Visor DICOM real (futuro)** | Cornerstone3D: serie completa, WW/WL real con presets, herramientas nativas (`ArrowAnnotateTool`, `LengthTool`, `BidirectionalTool`) y exportación como DICOM SR | Depende de la sección 7.4, punto 3 (subir la serie DICOM completa) | Proyecto aparte |

**Verificación de cada fase:**
- tests de `markerMath` y `panZoomMath`;
- `/oncoscan-a11y` sobre el visor;
- `/oncoscan-clinical-review` sobre marcadores y notas (PHI);
- prueba manual en una pantalla 16:9, en móvil y en iPhone;
- comprobar que un pin queda en el mismo punto de la anatomía tras hacer zoom, pan, entrar a pantalla completa y recargar.

**Pendientes que dejó la Fase A (resueltos en la Fase B):**
- ✅ El selector de modos (`role="radiogroup"`) no se recorre con flechas, como pide el patrón ARIA de radio. Se resuelve al reemplazarlo por la paleta de herramientas.
- ✅ Alternar la IA con Espacio no se anuncia a lectores de pantalla. Falta una región `aria-live="polite"`.
- ✅ En el modo expandido, Tab puede llevar el foco a la página tapada. Falta contener el foco dentro del visor.

### 10.8 Lista de chequeo del visor

* [x] ¿En pantalla completa la imagen cabe entera en una pantalla 16:9 sin hacer scroll?
* [x] ¿La pantalla completa incluye el panel lateral (score, marcadores y valoración) con tema oscuro?
* [x] ¿Espacio activa normalmente los botones fuera del visor?
* [ ] ¿Los marcadores mantienen su posición anatómica tras zoom, pan, pantalla completa y recarga? (zoom, pan y pantalla completa: sí; recarga: implementada en la Fase C, falta comprobarla tras aplicar la migración)
* [x] ¿Las notas nunca aparecen en logs ni en la imagen exportada sin consentimiento explícito?
* [x] ¿La herramienta Medir está desactivada cuando no hay `PixelSpacing`?
* [x] ¿Todo el visor se puede operar con teclado y los pins tienen nombre accesible?

### 10.9 Fuentes (sección 10)

- [Lunit INSIGHT MMG](https://www.lunit.io/en/ai-radiology-software/insight-mmg/) · [Lunit INSIGHT Challenge](https://insight-challenge.csg-krc.lunit.io/) (capturas de su interfaz revisadas por el equipo)
- [freeCodeCamp – How to Preprocess Medical Images for Machine Learning](https://www.freecodecamp.org/news/how-to-preprocess-medical-images-for-machine-learning/)
- Visor actual: [BeforeAfterViewer.tsx](../apps/web/src/components/ui/BeforeAfterViewer.tsx), [usePanZoom.ts](../apps/web/src/components/ui/usePanZoom.ts), [panZoomMath.ts](../apps/web/src/components/ui/panZoomMath.ts)