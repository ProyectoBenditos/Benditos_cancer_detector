# Resumen de requisitos del proyecto: sistema inteligente multimodal para detección temprana de cáncer de mama

## 1. Enunciado general del proyecto

El profesor propone diseñar e implementar un **sistema inteligente multimodal** para la **detección temprana de cáncer de mama** orientado al contexto colombiano, integrando imágenes mamográficas, datos clínicos, histopatología y genómica dentro de una arquitectura de IA avanzada y software moderno.[^1]
El sistema debe funcionar como **copiloto clínico** integrado al flujo hospitalario, apoyando la toma de decisiones de radiólogos, patólogos y clínicos, sin reemplazarlos, con énfasis en equidad, explicabilidad y cumplimiento regulatorio (FDA, EMA, INVIMA).

## 2. Capacidades de IA requeridas

El proyecto exige combinar múltiples paradigmas de inteligencia artificial para cubrir todo el proceso de riesgo, detección y apoyo diagnóstico:

- **Deep Learning multimodal**: modelos que integren imagen (mamografía/tomosíntesis), texto clínico, histopatología y, cuando sea posible, datos genómicos (TCGA, METABRIC). Deben aprovechar arquitecturas tipo CNN, transformers y fusion layers.
- **Vision Transformers (ViT)**: uso de ViT o variantes híbridas (CNN+ViT) para análisis avanzado de mamografía/tomosíntesis, detección de lesiones y análisis de patrones de tejido mamario asociados a riesgo futuro.
- **Medical Foundation Models**: incorporación de foundation models específicos para mamografía (p. ej. Mammo-FM) capaces de diagnóstico, localización, reporte estructurado y pronóstico de riesgo, integrados como backend de IA especializada.
- **Large Language Models médicos**: LLM adaptados al dominio médico para interpretar reportes radiológicos, guías clínicas (NCCN, ACR, OMS) y generar explicaciones estructuradas comprensibles para médicos y pacientes.
- **IA generativa**: uso responsable de modelos generativos para síntesis de datos (p. ej. augmentación de imágenes mamográficas de masas raras), generación de reportes, resúmenes y simulación de escenarios; siempre con control de sesgos y trazabilidad.
- **Radiología explicable (XAI)**: integración de técnicas como Grad-CAM, saliency maps y mapas de atención, que señalen regiones relevantes en la imagen y permitan al radiólogo entender por qué el modelo sugiere cierto riesgo o hallazgo.

## 3. Paradigma de sistemas multiagente

El profesor enfatiza una **arquitectura multiagente médica**, donde se modelan distintos roles clínicos como agentes autónomos coordinados:

- **Agente Radiólogo**: analiza mamografías/tomosíntesis, detecta lesiones, segmenta masas, calcificaciones y patrones de densidad mamaria; genera BI-RADS y puntuaciones de riesgo.
- **Agente Patólogo**: correlaciona hallazgos radiológicos con histopatología (p. ej. BreakHis, TCGA-BRCA) y biomarcadores, ayudando a estratificar riesgo y sugerir posibles subtipos.
- **Agente Gobernanza IA**: evalúa sesgos de los modelos (poblaciones subrepresentadas, distribución de densidad, variabilidad entre instituciones), monitorea métricas de equidad y verifica la calidad de las explicaciones generadas por XAI.
- **Agente Auditor regulatorio**: revisa cumplimiento frente a marcos regulatorios FDA, EMA e INVIMA para software como dispositivo médico, verificando que el uso de IA se ajuste a guías, incluyendo la nueva tendencia de plataformas de riesgo como Clairity Breast.

Estos agentes deben interactuar sobre una **infraestructura orquestada** (p. ej. mediante Ray, LangGraph y microservicios) para ofrecer decisiones coordinadas, trazables y auditables.

## 4. Arquitectura de software e infraestructura

La solución propuesta debe estar basada en **microservicios inteligentes**, desacoplados y escalables, desplegados sobre infraestructura moderna de cómputo:

### 4.1 Backend y frameworks principales

- Lenguaje base: **Python**.
- Framework de APIs: **FastAPI** para exponer servicios REST/GraphQL.
- Frameworks de DL: **PyTorch 2.x** y **TensorFlow** como motores principales.
- Marco radiológico: **MONAI** para procesamiento de imágenes médicas, segmentación y entrenamiento en mamografía/tomosíntesis.
- Orquestación de IA y agentes: **LangGraph** para flujos multiagente y coordinación entre LLM y modelos de visión, y **Ray** para ejecución distribuida y paralelización de tareas de entrenamiento e inferencia.
- Integración con **Hugging Face** para aprovechar modelos preentrenados (ViT, LLM médicos, generativos) adaptados al dominio.

### 4.2 Infraestructura de cómputo

- Contenedores: **Docker** como estándar de empaquetamiento de servicios y modelos.
- Orquestador: **Kubernetes** para desplegar y escalar microservicios de IA, API, bases de datos y agentes autónomos.
- Cómputo acelerado: **NVIDIA DGX** u otra infraestructura GPU de alto rendimiento para entrenamiento de foundation models y visión multimodal.
- Procesamiento distribuido de datos: **Apache Spark** para preprocesamiento de grandes volúmenes de datos clínicos e imagenológicos.
- **Edge AI**: diseño de componentes que puedan ejecutarse cerca de los equipos de imagen (p. ej. nodos de inferencia en el hospital), reduciendo latencia y costos de transmisión.

## 5. Bases de datos y modalidades de entrada

El sistema debe utilizar y/o ser compatible con múltiples bases de datos públicas de referencia para cáncer de mama:

- **Mamografía 2D / DBT**: RSNA Breast Cancer Detection, CBIS-DDSM, INBreast, y Duke DBT Dataset para tomosíntesis.
- **Histopatología**: BreakHis y TCGA-BRCA para correlación de patrones histológicos con hallazgos mamográficos.
- **Genómica**: TCGA y METABRIC como fuentes de datos moleculares que permiten modelos multimodales clínico-genómicos avanzados.

La arquitectura debe permitir incorporar datos locales de instituciones colombianas en el futuro, respetando normas de protección de datos y esquemas de **aprendizaje federado** para entrenar sin mover datos sensibles fuera de origen.

## 6. Interoperabilidad clínica

Se exige que el sistema se integre de manera estándar con los sistemas de información hospitalaria y radiológica.

- **HL7 FHIR**: para intercambio estructurado de datos clínicos (historias, órdenes, resultados, perfiles de riesgo).
- **DICOM**: formato estándar para imágenes médicas, necesario para ingestión de mamografía, tomosíntesis y otros estudios de imagen.
- **SNOMED CT**: terminología clínica estandarizada para codificar diagnósticos, hallazgos, procedimientos y facilitar interoperabilidad semántica.

El sistema debe ser capaz de crear reportes estructurados compatibles con guías como **NCCN Breast Cancer Screening and Diagnosis**, que ya incorporan opciones de evaluación de riesgo basada en IA mamográfica desde los 35 años.

## 7. Métricas objetivo y resultados esperados

El profesor plantea explícitamente objetivos cuantitativos de desempeño para los modelos de IA:

- **Sensibilidad** (>95%): capacidad de identificar verdaderos casos de cáncer, minimizando falsos negativos.
- **Especificidad** (>90%): evitar exceso de falsos positivos y rellamados innecesarios.
- **AUC ROC** (>0.97): alta capacidad discriminativa en clasificación binaria de riesgo o presencia de cáncer.
- **Recall** (>94%): recuperación de casos relevantes (similar a sensibilidad) en distintos escenarios de evaluación.
- **Precisión BI-RADS** (>93%): concordancia con clasificación BI-RADS de radiólogos humanos, especialmente en contextos de cribado.

Los resultados esperados incluyen:

- Desarrollo de modelos multimodales entrenados y validados con bases públicas y, idealmente, datos colombianos.
- Generación de alertas tempranas de riesgo que prioricen casos en flujos de lectura radiológica.
- Reducción de diagnósticos tardíos y optimización del uso de recursos (p. ej. priorizar resonancia a mujeres de mayor riesgo).

## 8. Estado del arte que se debe revisar

El profesor entrega un conjunto de referencias de **estado del arte** que deben ser discutidas en el proyecto:

- **Clairity Breast**: plataforma de IA aprobada de novo por la FDA que predice riesgo a 5 años usando solo mamografía estándar, entrenada con millones de imágenes y validada en más de 77.000 mamografías multicéntricas.
- Incorporación de Clairity Breast en guías NCCN 2026 para evaluación de riesgo desde los 35 años, con umbral ≥1.7% a 5 años para definir “riesgo incrementado” y guiar acciones preventivas.
- Evaluaciones clínicas y revisiones de herramientas CADe/CADx basadas en IA para mamografía digital y tomosíntesis (p. ej. revisión de Lamb et al. sobre herramientas aprobadas por FDA).
- Estudios recientes sobre densidad mamaria y riesgo usando deep learning en ultrasonido que predicen categoría BI-RADS y riesgo a 5 años, mostrando que el riesgo se puede derivar de modalidades alternas como BUS.
- Revisiones multimodales de IA para cáncer de mama que comparan mamografía, ultrasonido y termografía, discuten XAI, LLM y modelos multimodales, y listan datasets públicos como CBIS-DDSM, INBreast, BreakHis y BUSI.[^1]
- Nuevos **foundation models mamográficos** como Mammo-FM, entrenado en más de 800.000 mamografías, capaz de diagnóstico, localización de patología, generación de reporte y pronóstico, superando modelos generalistas con menos parámetros.
- Modelos multimodales como OncoVision, que integran mamografía y datos clínicos mediante atención, segmentando masas, calcificaciones y otros hallazgos, y prediciendo características estructuradas (densidad ACR, BI-RADS) con reportes estructurados.
- Trabajos sobre termografía y atención basada en transformers para segmentación y XAI explicable, como el modelo UNet con Grad-CAM aplicado a imágenes infrarrojas.

Además, se pide revisar artículos de revisión y estudios clínicos que analicen:

- El paso de sistemas de apoyo tipo CAD hacia **copilotos clínicos** integrados, con evaluación prospectiva y post-implementación.
- El rol de XAI, LLM y MLLM en radiología de mama, y los retos de sesgo y validez externa.[^1]

## 9. Metodología de desarrollo: PSP/TSP y gestión de proyecto

El proyecto debe alinearse con la **metodología PSP** (Personal Software Process) y TSP según lo definido en el documento original del curso:

- Fase de **planeación**: levantamiento detallado de requerimientos funcionales y no funcionales, definición del tipo de cáncer de mama, fuentes de datos (mamografía, histopatología, genómica) y estimación de esfuerzo por módulo (ingestión, procesamiento, IA, interfaz).
- Fase de **diseño**: arquitectura modular de microservicios, flujo de datos, diagramas UML, diseño de base de datos médica (PostgreSQL/MongoDB/Neo4j) y diseño de integración clínica (FHIR, DICOM, SNOMED CT).
- Fase de **desarrollo**: programación de cada módulo registrando tiempo invertido, defectos encontrados y tipo de error, siguiendo disciplina PSP para mejorar calidad en un entorno crítico de salud.
- Fase de **pruebas y análisis**: pruebas unitarias, integración, rendimiento, seguridad, validación de modelos de IA con métricas (sensibilidad, especificidad, AUC) frente a datasets de referencia.
- Fase de **post-mortem**: análisis de resultados, causas de errores, mejora continua y preparación de versiones futuras.

En gestión de proyecto, se debe seguir el **marco PMBOK**, documentando trazabilidad de requisitos, riesgos, hitos y control de calidad, con enfoque de sostenibilidad (eficiencia computacional, impacto ambiental del uso intensivo de IA/HPC, etc.).

## 10. Base legal, ética y gobernanza

Aunque el nuevo alcance se centra en cáncer de mama, se mantienen los requisitos legales y éticos ya establecidos en el proyecto base:

- Cumplimiento de la **Ley 1581 de 2012** sobre protección de datos personales y el manejo de datos sensibles en salud.
- Respeto de la **Resolución 1995 de 1999** sobre historia clínica como documento reservado, garantizando que los resultados del sistema se integren de forma segura al registro clínico.
- Alineación con la **Resolución 2654 de 2019** sobre responsabilidad y seguridad de plataformas tecnológicas en salud.
- Cumplimiento de las nuevas resoluciones de **INVIMA** sobre software como dispositivo médico con IA, asegurando registro sanitario previo al uso asistencial.
- Incorporación de los seis principios de la guía OMS sobre ética y gobernanza de IA en salud: autonomía, bienestar y seguridad, transparencia/explicabilidad, responsabilidad, equidad e IA ambientalmente responsable.

Adicionalmente, por las referencias a Clairity Breast y NCCN, se espera que el sistema contemple:

- Gobernanza de IA que minimice sesgos poblacionales (p. ej., representación adecuada de mujeres latinoamericanas, evitando modelos entrenados solo en poblaciones caucásicas).
- Mecanismos de monitoreo continuo del desempeño del modelo y revisión por comités clínicos y éticos.

## 11. Conexión con el documento original del proyecto

El documento "Sistema inteligente de detección temprana de cáncer" de la USC ya establece:

- Contexto epidemiológico del cáncer en Colombia y Latinoamérica.
- Objetivos generales y específicos centrados en detección temprana mediante IA y análisis de datos clínicos/imágenes.
- Antecedentes en oncología digital (MASAI, PRAIM, AI-STREAM, PulmoSeek, transformers longitudinales) que pueden extenderse ahora a cáncer de mama con enfoque multimodal.
- Referente teórico sobre deep learning radiomics y multimodalidad.
- Base legal y metodología PSP.

El nuevo alcance del profesor **especializa** el proyecto en cáncer de mama y **amplía** la sofisticación tecnológica: pasa de un sistema de IA genérico a una solución **multimodal, multiagente y basada en foundation models**, alineada con las últimas tendencias (Clairity Breast, Mammo-FM, OncoVision) y guías NCCN 2026.

---

## References

1. [Proyecto-en-TI-1.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_37d24ea7-2616-405f-ad57-ae638af7f2c7/038466d1-6a42-4c8d-a9e4-c53ee87f6da4/Proyecto-en-TI-1.pdf?AWSAccessKeyId=ASIA2F3EMEYE5JXRAM33&Signature=G79SKnB%2FSKI302kcnoXcRAHPDCA%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJGMEQCICZ8GBqrl3YfF7xZZsW6bykaT547tgC%2B3nuFPeh6ubwWAiAfCkx%2FCcT7HIg9lOPj8HofZ6CyurolLQlHk4X7e06%2FVyrzBAhZEAEaDDY5OTc1MzMwOTcwNSIMEaRMiqUEGm1Lf0z5KtAEdIyiKdwJhcAG0hTYDcwfScNTt6VfE6zmH7tpxyG5teBH2lt7w4%2BjVXtqeWvB1g26h3PASfmpAFGAnb0jZYOYIvfLWsLbPx3yMofn8Ty3dzy27TDw1RJCMemJMdsv0kp9iM%2FJ7QV%2F6qO55aMKVV%2FR2EgLh6FLIFQj%2FMWZZUK07wNq7qA9rFLTxXwPzaTKxo%2BLTvfnFDJ%2BwLzMzd1eAaEZBJMoXrVSS7LEXqYPzqn7EkA8pq6vPeHuhZ5WmDS4TeAKae0oPChkEgbTsj0jqV27%2FeMI0%2B4nBWdpzY4or0b7JbCZnJSw%2B6cZ0%2FXEhp3weXQRDwd5a%2BZOvsuNlg%2FXjprNOu9t0qOPHn5zy07JUSI1iNEHCMtLZ02uV0rLe9Qzoz6%2B028aQOaWur7Zk7fOr7%2FkJxNZ93xvuuZ7eGfKVUp6otPlPkuXHOn8TrI5zucPocWlo2dLqvT1Re2S%2FlLUn7%2B%2FffYFJRE1VoiuujfBAAdHdMt0lpYQ0I1XgjtpnmefIdDEkLVH%2BnKoUxqnnVyMQD274VHaIstJPTbQ2KjAhS6hvk6Fs9TU1Q9%2B%2Fxm9NhgWDBCn1FCN6Lex8k0Hgfgk6TUg0GYXn7KoxEPuC6C%2FNMhHUkX6P2WF%2B6TNkTmcFyA0D6WSTV%2BdabPUo0quk7Mhn6hFkXfvelhZBV9LPCt2FljhRtcuu74ci%2FmJfAAWX5bnOzO6p4ClQfYvemomKMOa7LvTsr5Xbl7OGOFpZxYB%2Fn6%2BO4LE%2FrmT5fVhMF%2BUkY69M8QbiXWSabq%2FxG811Tz2pcbl%2BDC6qq%2FSBjqZAeMxsr3TZ%2FncRyOXkCtYqP6z66skCbZiHghLY28g6lppyJUPpFa4jEBAjfmFbZVJmHvJqK5yV6DgE%2FiJYazYqZj2gUWNoNtHdambiwQs8V6N64U4cas9VTpc%2BW8RDd%2Ba%2BTtJ7dA%2BbE3NBXLuNENSJwYbjTJSXarTWT4Hn0aoejB0ye7Jy7XbTzvTq21yPumVtmcsi6z76MCBDQ%3D%3D&Expires=1783358221) - 1 
SISTEMA INTELIGENTE DE DETECCIÓN TEMPRANA DE CÁNCER 
 
 
 
 
TRABAJO PRESENTADO A: 
PROFESOR JAIR...

