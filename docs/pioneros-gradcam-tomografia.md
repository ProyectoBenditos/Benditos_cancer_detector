# Investigación Pionera: Explicabilidad IA y Visualización en Tomografía (Grad-CAM & Chest CT)

> **Documento de Referencia Técnica y Hoja de Ruta para OncoScan**  
> *Fecha de registro:* Septiembre 2026  
> *Propósito:* Recopilar las técnicas de vanguardia en explicabilidad (Sección A) y diseño de visualizadores radiológicos (Sección B) para guiar futuras iteraciones del producto.

---

## SECCIÓN A: Pioneros en IA y Explicabilidad para Tomografía Médica

### 1. El Gran Problema de Grad-CAM: "Grad-CAM is Not Faithful" (Draelos & Carin)
En la literatura médica reciente (*Nature Machine Intelligence*, *NeurIPS*), la investigadora **Dra. Rachel Lea Draelos** (MD/PhD) demostró una limitación matemática fundamental en Grad-CAM clásico:
* **Global Average Pooling (GAP) de gradientes:** Grad-CAM promedia los gradientes de todos los canales de la última capa convolucional. Este promedio ponderado hace que Grad-CAM **ilumine zonas que la red neuronal en realidad no utilizó para decidir**.
* **Efecto en Tomografía de Tórax:** Genera manchas gigantescas y activación fantasma en las esquinas de la imagen (donde no hay tejido pulmonar). En imágenes de $64 \times 64\text{ px}$, la última capa de ResNet-18 es de solo $2 \times 2\text{ px}$; al aplicar desenfoque gaussiano, la mancha cubre el 40% del pulmón.

### 2. HiResCAM: El Estándar Matemático Superior
* **Cómo funciona:** En lugar de promediar los gradientes con GAP, HiResCAM realiza una multiplicación elemento a elemento (Hadamard product) entre el mapa de características y los gradientes:
  $$\text{HiResCAM} = \text{ReLU}\left(\sum_k A^k \odot \frac{\partial Y^c}{\partial A^k}\right)$$
* **Garantía clínica:** Está matemáticamente demostrado que HiResCAM **solo activa píxeles/vóxeles que contribuyeron directamente al score final**.
* **Migración en OncoScan:** La transición en el microservicio de Hugging Face es de menos de 10 líneas de código en PyTorch, eliminando de raíz las activaciones en esquinas.

### 3. Grad-CAM++ (Para nódulos múltiples y subcentimétricos)
* Introducido por Chattopadhay et al., añade derivadas de segundo y tercer orden ($\frac{\partial^2 Y}{\partial A^2}$) para dar mayor peso a detalles pequeños.
* **Ventaja médica:** Si un paciente tiene un nódulo grande de 15 mm y un micronódulo de 4 mm, el Grad-CAM clásico solo ilumina el grande. Grad-CAM++ detecta ambos focos.

### 4. Score-CAM (Explicabilidad libre de gradientes)
* En redes profundas, los gradientes pueden saturarse o ser ruidosos. Score-CAM utiliza perturbación de máscaras: mide la caída de probabilidad del modelo cuando se enmascara una zona específica de la tomografía.
* Genera mapas de calor sin ruido de alta frecuencia.

### 5. Vision Transformers (ViT) y Foundation Models (2024–2026)
* El estado del arte en IA para CT ya no entrena ResNet-18 2D desde cero, sino modelos fundacionales especializados:
  * **CT-CLIP / RAD-DINO:** Modelos pre-entrenados con cientos de miles de tomografías completas.
  * **Swin UNETR (MONAI):** Arquitectura jerárquica con ventanas desplazadas para volúmenes 3D.
  * **Attention Rollout:** En lugar de Grad-CAM, se extraen los pesos de auto-atención (*Self-Attention*) de los parches del Transformer, produciendo máscaras que respetan la anatomía alveolar sin artefactos de difusión.

---

## SECCIÓN B: Pioneros en Visualización Radiológica e Interfaz Clínica

Los sistemas aprobados por la FDA y la CE (*Aidoc, Lunit INSIGHT CXR/CT, Aidence Veye Lung, Zebra Medical/Nanox*) siguen principios estrictos de ergonomía médica:

### 1. Abandono del mapa de calor "Arcoíris" (JET Colormap)
* La **RSNA** (Radiological Society of North America) y comités de imagen médica desaconsejan el mapa JET (azul-verde-amarillo-rojo).
* **Motivo:** El mapa JET no es *perceptualmente uniforme*; el salto brusco del verde al amarillo crea falsas fronteras ópticas que los radiólogos confunden con bordes tumorales.
* **Alternativa moderna:**
  * **Monocolor translúcido focalizado:** Tonalidad coral/ámbar que varía únicamente en opacidad según la confianza del modelo.
  * **Contornos cerrados (Isolíneas):** Un borde fino (trazo de 1.5 px) que delimita el nódulo sin tapar su densidad interna (clave para distinguir si es sólido, subsólido o en vidrio deslustrado).

### 2. Interacción "Flicker" (Parpadeo) con Barra Espaciadora
* **Técnica preferida por radiólogos:** Al alternar a alta velocidad entre la imagen original y la superposición de la IA con una sola tecla (`Espacio`), la retina humana detecta inmediatamente si la IA está señalando un vaso sanguíneo, una atelectasia o un nódulo real.

### 3. Ficha Flotante (Smart Tooltip) sobre la Lesión
* Al colocar el cursor sobre el foco de activación de la IA, se despliega un mini-panel contextual sin salir de la imagen:
  * **Probabilidad:** e.g., $88.5\%$
  * **Categoría Lung-RADS estimada:** e.g., 4A (Sospechoso)
  * **Características determinantes:** Márgenes espiculados, calcificación ausente.

### 4. Navegación Multiplanar y Volumétrica (Cornerstone3D / OHIF Viewer)
* En tomografías reales, un nódulo no es una rebanada 2D aislada, sino una estructura tridimensional.
* Las plataformas pioneras integran librerías WebGL/WebGPU como **Cornerstone3D** para:
  * Desplazamiento axial corte por corte con la rueda del ratón.
  * Reconstrucción Multiplanar (MPR): visualización simultánea de cortes Axial, Sagital y Coronal.
  * Segmentación volumétrica (cálculo automático de volumen en $\text{mm}^3$ y tiempo de duplicación tumoral).

---

## Hoja de Ruta de Implementación para OncoScan

| Fase | Ámbito | Tarea | Impacto Clínico |
| :--- | :--- | :--- | :--- |
| **Fase 1 (Actual)** | Frontend | Corrección de orientación de la cortina + Función Flicker (Espacio) + Limpieza de esquinas | Experiencia inmediata fluida y sin confusiones |
| **Fase 2 (Próxima)** | Hugging Face (Backend) | Migrar la función Grad-CAM del microservicio a **HiResCAM** | Eliminación matemática del ruido en bordes y esquinas |
| **Fase 3 (Futura)** | Frontend / UX | Reemplazo del mapa JET por contornos suaves monocolor + Tooltip Lung-RADS al pasar el cursor | Calidad de nivel comercial aprobado por RSNA |
| **Fase 4 (Avanzada)** | Frontend / Visor | Integración de **Cornerstone3D** para navegación por serie axial completa DICOM | Visor PACS profesional completo en la nube |

