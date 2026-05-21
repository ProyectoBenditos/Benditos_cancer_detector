# OncaScan Platform / Benditos Cancer Detector

Sistema inteligente de apoyo a la detección temprana de cáncer de pulmón en entorno académico controlado.

## Stack actual
- Frontend: Next.js + TypeScript + Tailwind
- Backend: FastAPI + Python (httpx para inferencia remota)
- Base de datos / Auth / Storage: Supabase (Postgres + Storage privado + JWT)
- Motor IA: Hugging Face Space externo (`luisdam-oncoscan-ai.hf.space`)
- Despliegue: Vercel (web) + Railway (api)

## Estructura del repositorio
- [apps/web](apps/web/): aplicación frontend (Next.js App Router)
- [apps/api](apps/api/): backend FastAPI y servicios de integración
- [docs](docs/): documentación técnica, despliegue, arquitectura e IA

## Comenzando

Para configurar el entorno de desarrollo en un nuevo equipo, consulta la [Guía de Instalación Detallada](docs/setup-nuevo-pc.md).

Documentos clave:
- [docs/setup-nuevo-pc.md](docs/setup-nuevo-pc.md) — instalación paso a paso
- [docs/deploy.md](docs/deploy.md) — variables de entorno y despliegue
- [docs/architecture_analysis.md](docs/architecture_analysis.md) — análisis cliente-servidor
- [docs/ai-model-changes.md](docs/ai-model-changes.md) — integración del modelo IA
- [docs/ai-service-migration.sql](docs/ai-service-migration.sql) — migración requerida en Supabase
- [docs/smoke-test.md](docs/smoke-test.md) — pruebas básicas end-to-end
- [docs/mvp_status.md](docs/mvp_status.md) — estado funcional del MVP
- [docs/roadmap.md](docs/roadmap.md) — hoja de ruta

## Alcance del MVP actual
- Homepage pública informativa
- Plataforma privada con autenticación Supabase
- Rutas protegidas para usuarios autenticados
- Subida de archivos DICOM con extracción de metadatos
- Análisis IA sobre imágenes PNG/JPG con 8 features clínicas LIDC-IDRI
- Historial unificado DICOM + análisis IA con búsqueda por `Case_Ref`
- Vista de detalle por carga y polling de resultado IA
- Dashboard con reporte de alertas

## Estado actual del proyecto

### Completado
- Fase 1: estructura base del proyecto
- Fase 2: frontend inicializado con Next.js
- Fase 3: backend inicializado con FastAPI
- Fase 4: autenticación base con Supabase
- Fase 5: tabla `dicom_uploads` y bucket privado `dicom-files`
- Fase 6: endpoint backend protegido con JWT real para carga DICOM
- Fase 7: integración frontend-backend para subida real
- Fase 8: historial de cargas DICOM
- Fase 9: vista detalle de carga
- Fase 10: despliegue en Vercel y Railway
- Fase 12: documentación técnica del despliegue y smoke test
- Fase 13: dashboard, módulo de alertas y `Case_Ref` con búsqueda en historial
- Fase 14: integración del módulo IA (rama `ai-service` mergeada en `main`)

### Estado operativo actual
- MVP desplegado y funcional en entorno académico
- Login operativo
- Subida DICOM operativa
- Análisis IA operativo (PNG/JPG → score, nivel de riesgo, recomendación)
- Historial unificado DICOM + IA con búsqueda
- Storage y base de datos sincronizados
- Dashboard con alertas funcional

## Flujo de análisis IA

1. El usuario sube una imagen PNG/JPG y 8 features clínicas desde `/platform/analyze`.
2. El backend valida el JWT, sube la imagen a Supabase Storage e inserta la fila en `dicom_uploads` con `upload_status=processing`.
3. Una `BackgroundTask` invoca el Space en Hugging Face y persiste el resultado (`ai_completed` o `ai_failed`).
4. El frontend hace polling cada 3 s (timeout 3 min) sobre `/api/v1/analysis/{id}` hasta obtener el resultado.

Variables de entorno relevantes del backend:

```env
HF_API_BASE_URL=https://luisdam-oncoscan-ai.hf.space   # opcional, tiene default
HF_PREDICT_TIMEOUT=120                                  # opcional, segundos
```

> Antes de promover la integración IA a un entorno nuevo, ejecutar manualmente
> [docs/ai-service-migration.sql](docs/ai-service-migration.sql) en el SQL editor de Supabase.

## Próximos módulos
- Asociación de cargas a caso/paciente con seguimiento clínico
- Endurecimiento del pipeline IA (cola de jobs, reintentos, observabilidad)
- Métricas y evaluación del modelo
- Trazabilidad requisito → prueba → evidencia
- Plan B de inferencia (contenedor propio del modelo o caché de resultados)

## Nota de uso

OncaScan Platform es una herramienta de apoyo a la decisión clínica en un entorno académico controlado y no sustituye el criterio profesional del especialista.
