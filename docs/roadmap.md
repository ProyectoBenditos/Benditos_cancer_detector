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

### Fase 4: Modelo multimodal-v2.0 — Ensamble Híbrido (DenseNet-121 + XGBoost), Volumetría 3D y Validación Externa (Planificada)
*Documento de especificación completo:* [Plan Estratégico Modelo v2.0](./plan-modelo-v2.0-segmentacion-volumetrica.md)

- [ ] **Arquitectura Híbrida de Vanguardia (Estudio 2026 / Springer Nature):**
  - **Rama de Visión:** Migración del extractor convolucional a **DenseNet-121** (PyTorch) para reutilización densa de características de espiculación y márgenes con Grad-CAM en `norm5`.
  - **Rama Clínica y Demográfica:** Clasificador **XGBoost** con balanceo **SMOTE** para datos tabulares no lineales y antecedentes de tabaquismo.
  - **Meta-Clasificador de Fusión:** Calibración isotónica / Platt Scaling para probabilidad de malignidad unificada.
- [ ] **Datasets de Entrenamiento y Benchmarking Internacional:**
  - Reentrenamiento principal con `FangDai/Multimodal_Lung_Cancer_Dataset-CT-Mask-Clinical` (Hugging Face).
  - Validación externa independiente ciega con **NLST (National Lung Screening Trial — NCI/NIH)**.
  - Correlación radiopatológica con **CLID (Kaggle)** para sustento de la Sección E del informe.
- [ ] **Ingesta de Series DICOM Multislice 3D y Localización Lobar Automatizada:**
  - Integración de TotalSegmentator / nnU-Net para segmentar los 5 lóbulos pulmonares y la distancia pleural en $< 15$ segundos.
  - Auto-completado de localización lobar y relación pleural en el informe clínico sin requerir marcación manual previa por el radiólogo.