# Arquitectura del procesamiento 3D local

Tarea: reconstrucción visual de TC torácica, segmentación de cinco lóbulos y visualización espacial de contribuciones del clasificador existente. No se entrena ni se selecciona un nuevo clasificador de cáncer.

Se usa SegResNet 3D del bundle MONAI `wholeBody_ct_segmentation` 0.2.9, checkpoint lowres a 3 mm, publicado en el host de NVIDIA. El proveedor documenta entrenamiento con TotalSegmentator. La referencia del dataset y segmentación corporal es Wasserthal et al., *TotalSegmentator: Robust Segmentation of 104 Anatomic Structures in CT Images*, [DOI 10.1148/ryai.230024](https://pubs.rsna.org/doi/10.1148/ryai.230024). No se extrapolan sus resultados a OncoScan.

La GTX 1650 tiene 4 GB. La inferencia usa ventanas de 96³ con AMP y acumulación en CPU para evitar alojar un volumen de 105 canales en VRAM. Se seleccionan únicamente las etiquetas pulmonares publicadas 13–17, se remapean y se invierte la geometría sobre la rejilla original. Se reproduce el preprocesamiento de entrenamiento del bundle: normalización, `CropForeground`, suavizado gaussiano y escala −1/+1. La configuración de inferencia simplificada del proveedor omite pasos presentes en el entrenamiento; en CTChest esa diferencia produjo máscaras fragmentadas. También se transforma a aire el relleno fuera del campo de visión inferior a −1500 HU, sólo en la entrada del segmentador.

TotalSegmentator/nnU-Net es una alternativa apropiada si se necesita otro equilibrio entre coste y cobertura anatómica. No se integra un segundo motor sin una comparación controlada. Una malla genérica descargada de internet no es sustituto de la anatomía de la TC de un estudio.

Se conservan DenseNet-121, encoder ResNet-18, MLP clínico, calibrador de dominio, XGBoost y CLID del proyecto. La activación es HiResCAM sobre el logit neuronal, calculada independientemente por corte y registrada en 3D. No explica el ensemble XGBoost/TTA completo ni constituye un detector o segmentador tumoral 3D.

MONAI Physio genera flujos fisiológicos y escenas USD para Omniverse. No se necesita para superponer activación sobre una TC en el navegador. La simulación respiratoria actual sigue siendo ilustrativa; no se declara una simulación biomecánica validada.

La prueba con CTChest demuestra ejecución y alineación visual. Una revisión por especialistas y un conjunto independiente con anotaciones son necesarios antes de atribuir rendimiento clínico a la segmentación o al clasificador.
