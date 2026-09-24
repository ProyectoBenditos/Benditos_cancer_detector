# Registro de Cambios: Actualización del Visor Grad-CAM y Resiliencia del Modelo

**Fecha:** 23 de Septiembre de 2026  
**Rama:** `feature/gradcam-radiology-viewer` $\to$ `main`  
**Autor:** Antigravity & Equipo OncoScan  

---

## 1. Resumen Ejecutivo
Esta actualización moderniza y simplifica la experiencia visual del visor explicativo Grad-CAM para tomografías de tórax, además de dotar al backend de tolerancia a fallos transitorios y arranques en frío (*cold starts*) provenientes del microservicio de IA en Hugging Face.

---

## 2. Cambios en el Frontend (`apps/web`)

### Visor de Tomografía y Grad-CAM (`BeforeAfterViewer.tsx`)
- **Orientación Corregida de la Cortina (Split-Slider):**
  - `0%`: Muestra el $100\%$ de la **TAC Original pura**.
  - Al deslizar hacia la derecha: Se revela progresivamente la capa de **Detección IA (Grad-CAM)**.
  - `100%`: Muestra la **Detección IA completa**.
  - Sincronización exacta entre el valor del slider, el divisor visual, las etiquetas de texto y los distintivos de esquina.
- **Función de Parpadeo (Blink Comparator):**
  - Activación instantánea mediante la tecla **`Espacio`** (con prevención de scroll).
  - Botón dedicado en la barra de herramientas superior con ícono visual (`Eye` / `EyeOff`).
  - Distintivo flotante de estado: *"Parpadeo Activo: Mostrando TAC Pura (Presiona Espacio para ver IA)"*.
- **Simplificación de Interfaz:**
  - Se eliminaron los selectores de "Ventana Tomográfica" (*Estándar, Pulmón, Mediastino, Negativo*) que saturaban la experiencia clínica. La tomografía ahora se visualiza con su contraste original y nítido.
  - Se eliminaron controles deslizantes complejos de umbral matemático, reemplazándolos por un switch intuitivo: `☑ Enfocar nódulo (eliminar ruido de esquinas)`.
- **Filtro de Ruido en Esquinas:**
  - Atenuación automática del $35\%$ sobre el canal de calor en Canvas para neutralizar el desenfoque gaussiano de las esquinas propio de la baja resolución de entrada ($64 \times 64\text{ px}$).

---

## 3. Cambios en el Backend (`apps/api`)

### Resiliencia y Manejo de Red (`dicom.py` y `hf_client.py`)
- **Bucle de Reintentos Automáticos (Retry con Backoff):**
  - Implementación de hasta 2 reintentos con intervalo de 2.0 segundos ante fallos de conexión (`httpx.ConnectError`) y tiempos de espera (`httpx.TimeoutException`).
  - Previene que un arranque en frío o un hipo de resolución DNS en Windows (`[Errno 11001] getaddrinfo failed`) interrumpa el análisis del usuario.
- **Mapeo de Errores Amigables:**
  - Reemplazo de códigos crudos de sockets por explicaciones clínicas claras (HTTP 503 y 504) orientadas a acción.
- **Beneficio para Subida por Lotes (`batch.py`):**
  - El procesamiento concurrente de lotes de hasta 20 tomografías ahora es tolerante a pausas de red en el microservicio.

---

## 4. Documentación de Investigación
- Se incorporó [`docs/pioneros-gradcam-tomografia.md`](file:///c:/Users/USUARIO/Desktop/Proyectos/Oncoscan/Benditos_cancer_detector/docs/pioneros-gradcam-tomografia.md), documentando las técnicas de vanguardia en explicabilidad (*HiResCAM*, *Grad-CAM++*, *Transformers*) y visualización radiológica (*abandono de mapas JET*, *contornos cerrados*, *Cornerstone3D*).

---

## 5. Verificación y Pruebas
- Pruebas unitarias de Vitest: **56/56 tests pasados exitosamente**.
- Comprobación TypeScript (`npx tsc --noEmit`): **0 errores**.
- Linting ESLint: **0 advertencias, 0 errores**.
- Verificación de imports Python y llamadas API: **OK**.
