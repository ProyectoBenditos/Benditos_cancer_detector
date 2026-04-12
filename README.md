# OncaScan Platform / Benditos Cancer Detector

Sistema inteligente de apoyo a la detección temprana de cáncer de pulmón en entorno académico controlado.

## Stack actual
- Frontend: Next.js + TypeScript + Tailwind
- Backend: FastAPI + Python
- Base de datos / Auth / Storage: Supabase
- Despliegue previsto: Vercel + Railway

## Estructura del repositorio
- `apps/web`: aplicación frontend
- `apps/api`: backend y servicios
- `docs`: documentación técnica y de implementación

## Alcance del MVP inicial
- Homepage pública informativa
- Plataforma privada con autenticación
- Ruta protegida para usuarios autenticados
- Subida de archivos DICOM
- Registro de metadatos básicos del archivo
- Preparación para integración posterior del módulo IA

## Estado actual del proyecto
### Completado
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

### Estado operativo actual
- MVP desplegado y funcional en entorno académico
- Login operativo
- Subida DICOM operativa
- Storage y base de datos sincronizados
- Historial y detalle funcionales

## Próximos módulos
- Listado de cargas realizadas
- Visualización de metadatos básicos
- Integración progresiva con motor de IA
- Módulo de alertas y resultados