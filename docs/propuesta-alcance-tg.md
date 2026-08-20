# Propuesta de alcance — Trabajo de Grado

**Asunto:** Propuesta de alcance — Trabajo de Grado: sistema multimodal para detección temprana de cáncer de mama

Estimado profesor Jair Enrique Sanclemente:

Reciba un cordial saludo. Tras estudiar a fondo la propuesta que nos planteó para el sistema inteligente multimodal de detección temprana de cáncer de mama, queremos presentarle el alcance con el que proponemos desarrollar el Trabajo de Grado, y contar con su visto bueno antes de formalizar el anteproyecto.

Compartimos plenamente la visión: un sistema **multimodal, multiagente y basado en foundation models**, concebido como copiloto clínico para el contexto colombiano y alineado con las tendencias actuales (Clairity Breast, guías NCCN 2026, Mammo-FM). Nuestro enfoque **conserva esa arquitectura completa a nivel de diseño** y acota lo que se **implementa y valida** dentro del plazo del TG (~4 meses), para asegurar un entregable demostrable y defendible.

## Alcance propuesto

1. **Diseño completo de la arquitectura** —multimodal, multiagente, interoperabilidad clínica y gobernanza de IA— documentada con diagramas UML y decisiones de arquitectura (ADR), bajo disciplina PSP/PMBOK.

2. **Implementación y evaluación de una rebanada vertical:**
   - Modelo de clasificación de mamografía 2D sobre **CBIS-DDSM** (transfer learning) con explicabilidad **Grad-CAM**.
   - Orquestación **multiagente con LangGraph**: agentes Radiólogo, Patólogo, Gobernanza IA y Auditor regulatorio.
   - Interoperabilidad **DICOM** y contrato **HL7 FHIR / SNOMED CT** con un endpoint demostrable.
   - Evaluación con métricas clínicas (sensibilidad, especificidad, AUC-ROC, precisión BI-RADS) frente al dataset de referencia.

## Justificación del alcance

La razón principal para acotar así el proyecto es el hardware y el presupuesto con el que contamos. Disponemos de equipos personales y, a lo sumo, una GPU de gama de consumo y niveles gratuitos de cómputo en la nube. Con eso alcanza para hacer transfer learning sobre una modalidad (mamografía 2D) y correr la orquestación de los agentes, pero no para entrenar un foundation model propio ni para montar entrenamiento distribuido.

Llevar el sistema a la escala completa que usted plantea —entrenar foundation models tipo Mammo-FM, aprendizaje federado entre instituciones, despliegue en Kubernetes sobre GPU de alto rendimiento (tipo DGX), procesamiento distribuido con Spark, Edge AI e integración de datos genómicos (TCGA/METABRIC)— implica una inversión en cómputo en la nube que se sale del presupuesto de un trabajo de grado. Por eso dejamos esos componentes diseñados dentro de la arquitectura pero planteados como **trabajo futuro**, para cuando se cuente con la infraestructura o la financiación adecuadas.

Además, reutilizamos la plataforma clínica, el backend y la disciplina PSP que ya desarrollamos en nuestro proyecto anterior de detección oncológica, lo que nos permite concentrar el tiempo y el cómputo disponible en el núcleo de IA para mama.

## Título tentativo

*Sistema multimodal con agentes de IA y foundation models para detección temprana de cáncer de mama.*

## Objetivo general (tentativo)

Diseñar e implementar un sistema inteligente multimodal, basado en agentes autónomos de IA y foundation models médicos, que apoye la detección temprana del cáncer de mama en el contexto clínico colombiano, mejorando la sensibilidad, especificidad y explicabilidad del diagnóstico.

---

Quedamos atentos a sus observaciones y a su aprobación de este alcance —o a los ajustes que considere pertinentes— para proceder con la redacción formal del anteproyecto.

Cordialmente,

**Mateo Salas · Luis De Ávila**
Ingeniería en Sistemas — Universidad Santiago de Cali
Director de TG: Jair Enrique Sanclemente
