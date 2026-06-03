# OncoScan — Plataforma de Apoyo a la Detección Temprana de Cáncer Pulmonar

Sistema académico de pre-evaluación algorítmica para cáncer de pulmón. Procesa imágenes DICOM, ejecuta un modelo de IA alojado en Hugging Face y presenta alertas clínicas estructuradas con nivel de riesgo y recomendación.

> **Aviso clínico:** OncoScan es una herramienta de apoyo investigativo en un entorno académico controlado. No es un dispositivo médico certificado y no reemplaza el juicio del especialista oncológico o neumólogo.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind 4 — desplegado en Vercel |
| Backend | FastAPI + Python 3.11 + httpx — desplegado en Railway |
| Base de datos | Supabase (PostgreSQL + Storage + RLS) |
| Autenticación | Supabase Auth + middleware Next.js |
| Motor IA | HF Space `luisdam-oncoscan-ai` — endpoint `/predict` |

## Estructura del repositorio

| Directorio | Contenido |
|-----------|-----------|
| `apps/web/` | Next.js — UI, rutas, server actions |
| `apps/api/` | FastAPI — proxy de IA, validación DICOM, rutas autenticadas |
| `docs/` | Specs, ADRs, resúmenes técnicos, documentación PSP |
| `supabase/` | Migraciones SQL aplicadas en Supabase |

## Funcionalidades implementadas

- **Autenticación** — Login/registro con Supabase Auth, roles `admin` / `médico`, RLS por usuario
- **Carga DICOM** — Subida, validación básica, extracción de metadatos y almacenamiento en Storage privado
- **Análisis IA** — Imagen PNG/JPG + 8 features clínicas LIDC-IDRI → score, nivel de riesgo (`ALTO` / `MEDIO` / `BAJO`), recomendación
- **Gestión de pacientes** — Alta, búsqueda y detalle; vinculados a estudios DICOM
- **Historial unificado** — Cargas DICOM + resultados IA con búsqueda por `Case_Ref` y filtros
- **Dashboard de alertas** — Priorización de casos por nivel de riesgo
- **Reportes** — Vista consolidada de estudios con exportación
- **Panel de administración** — Gestión de médicos y acceso por rol
- **Ajustes de cuenta** — Perfil, institución y preferencias del médico

## Flujo de análisis IA

1. El médico sube una imagen PNG/JPG y 8 features clínicas desde `/platform/analyze`.
2. El backend valida el JWT, sube la imagen a Supabase Storage e inserta la fila en `dicom_uploads` con `upload_status=processing`.
3. Una `BackgroundTask` llama al Space en Hugging Face y persiste el resultado (`ai_completed` o `ai_failed`).
4. El frontend hace polling cada 3 s (timeout 3 min) sobre `/api/v1/analysis/{id}` hasta obtener el resultado.

Variables de entorno relevantes del backend:

```env
HF_API_BASE_URL=https://luisdam-oncoscan-ai.hf.space   # opcional, tiene default
HF_PREDICT_TIMEOUT=120                                  # opcional, segundos
```

## Comenzando

Para configurar el entorno de desarrollo en un equipo nuevo, consulta la [Guía de Instalación](docs/setup-nuevo-pc.md).

Documentos clave:

| Documento | Descripción |
|-----------|-------------|
| [docs/setup-nuevo-pc.md](docs/setup-nuevo-pc.md) | Instalación paso a paso en entorno local |
| [docs/deploy.md](docs/deploy.md) | Variables de entorno y despliegue Vercel + Railway |
| [docs/architecture_analysis.md](docs/architecture_analysis.md) | Análisis cliente-servidor |
| [docs/smoke-test.md](docs/smoke-test.md) | Pruebas básicas end-to-end |
| [docs/requisitos.md](docs/requisitos.md) | Requisitos funcionales del sistema |
| [docs/ai-model-changes.md](docs/ai-model-changes.md) | Integración del modelo IA y HF Space |

## Datos sensibles (PHI)

Campos considerados Información de Salud Protegida:

- `email` del usuario autenticado
- Rutas y nombres de archivos DICOM, `storage_path`
- `Case_Ref`, `patient_id`, `display_alias`
- `result_json` (predicción IA), `score`, `nivel_riesgo`
- URLs de Supabase Storage (solo exponer como signed URL server-side)

**Regla:** nunca loguear PHI en `console.log` ni en logs de FastAPI. Ver `apps/api/app/core/logging.py` para la lista completa de `PHI_KEYS`.

## Equipo

| Nombre | Rol |
|--------|-----|
| Juan Esteban Aldana | Backend Developer |
| Nicolás Chávez Oliveros | Tech Lead & Data Engineer |
| Juan Pablo Sotelo Mejía | Frontend & UI/UX |
| Luis De Ávila Mosquera | AI Engineer & QA |
| Juan Mateo Salas Arturo | Project Manager & DevOps |

## Mejoras futuras

- Visor DICOM clínico avanzado (ventaneo, multi-corte, mediciones) — ya existe un visor interactivo básico de la imagen + mapa de calor Grad-CAM (zoom, pan, superpuesto/lado a lado, opacidad, pantalla completa)
- Pipeline de reintentos con cola de jobs para inferencia IA
- Métricas de evaluación del modelo (AUC, sensibilidad, especificidad)
- Trazabilidad requisito → prueba → evidencia
- Plan B de inferencia (contenedor propio o caché de resultados)
- Alta disponibilidad y monitoreo de producción

