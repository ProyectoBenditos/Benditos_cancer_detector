# OncoScan — Roadmap Oficial del Proyecto

> **Estado General:** Fase 3 (Producción y Validación Clínica)  
> **Versión Activa del Modelo:** `multimodal-v1.2`  
> **Próxima Generación:** `multimodal-v2.0`  
> **Última Actualización:** Octubre 2026  

---

## Fases del Proyecto

### Fase 1: Arquitectura Base y Repositorio (Completada)
- [x] Estructura monorepo del proyecto (`apps/web`, `apps/api`, `docs`).
- [x] Conexión y control de versiones en GitHub.
- [x] Configuración de linters, TypeScript y estándares de código.

### Fase 2: Plataforma Clínica y Modelo Multimodal v1.1 (Completada)
- [x] Frontend moderno con Next.js (App Router), Tailwind CSS y Radix UI.
- [x] Backend clínico con FastAPI y PostgreSQL/Supabase.
- [x] Autenticación médica y seguridad con Row-Level Security (RLS).
- [x] Entrenamiento del primer modelo multimodal `v1.1` (ResNet-18 + Clinical MLP, Accuracy 89.8%, AUC 0.950).
- [x] Explicabilidad visual con Grad-CAM en tiempo real.

### Fase 3: Modelo v1.2, Informe Estandarizado y Cumplimiento Regulatorio (Estado Actual - Activo)
- [x] Despliegue del microservicio en servidor dedicado Oracle Cloud (Always-On ARM64).
- [x] Modelo `multimodal-v1.2` optimizado para reducción drástica de Falsos Negativos (Sensibilidad $\ge 91.6\%$).
- [x] Motor de Desidentificación DICOM en origen conforme a la Ley 1581 de 2012 y el estándar internacional DICOM PS 3.15 (Anexo E).
- [x] Visor de tomografía interactivo con cortina deslizante (Before/After) y mapa térmico.
- [x] Generación del **Informe Clínico Estandarizado** en línea y descargable en PDF (Secciones A–G, ACR Lung-RADS v2022, GPC 36 MinSalud y CLAIM 2024).
- [x] Formulario estructurado de valoración médica por el especialista (`upload_reviews`).

### Fase 4: OncoScan 2.0 — Foundation Models Médicos 3D, Estación Multiplanar (MPR) y Ecosistema Multiagente (Planificada)
*Documento de especificación completo:* [Plan Estratégico OncoScan 2.0](./plan-modelo-v2.0-segmentacion-volumetrica.md)

- [ ] **Ingesta Inteligente y Liviana de Series DICOM:**
  - Descompresión en el navegador con Web Streams / WebAssembly Worker (`fflate`) en $< 350\text{ ms}$.
  - Filtrado inteligente de metadatos: descarte automático de Scouts y reportes de dosis, aislando la serie axial pulmonar (-60% de peso).
- [ ] **Estación de Trabajo Radiológica Web 3D (Ergonomía Clínica):**
  - Reconstrucción Multiplanar (MPR) con **Cornerstone3D** (Axial, Sagital, Coronal sincronizados con crosshairs 3D).
  - Presets clínicos instantáneos: Ventana Pulmonar (`WL: -600, WW: 1500`) y Mediastínica (`WL: 40, WW: 400`).
  - Renderizado volumétrico 3D rotatorio con `vtk.js` y centrado de nódulos a un solo clic.
- [ ] **Backbone Foundation Model 3D y Razonamiento Clínico:**
  - Integración del backbone de **NV-Reason-CT** (NVIDIA / NIH) o **MedGemma-4B** (Google DeepMind) con *Chain-of-Thought* médico.
  - Segmentación anatómica de los 5 lóbulos y pleura con **TotalSegmentator** en GPU.
  - Estimación volumétrica ($mm^3$), histograma de atenuación en $\text{HU}$ (sólido vs. subsólido) y Duplicación de Volumen (VDT).
- [ ] **Datasets de Entrenamiento y Benchmarking Internacional:**
  - Reentrenamiento y ajuste fino con **`LIDC-annot-NLST501`** (NCI Imaging Data Commons Octubre 2026, 6.505 nódulos segmentados por 4 radiólogos).
  - Validación externa independiente ciega con la cohorte completa del **NLST** (>50.000 pacientes).
- [ ] **Tríada de Agentes Clínicos (Nature Reviews Cancer 2026):**
  - Coordinación entre Agente Radiólogo (Lung-RADS v2022), Agente Patólogo (Guía GPC 36 MinSalud) y Agente Oncólogo.