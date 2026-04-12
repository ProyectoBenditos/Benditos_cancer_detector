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
- Fase 1: estructura base del proyecto
- Fase 2: frontend inicializado con Next.js
- Fase 3: backend inicializado con FastAPI
- Fase 4: autenticación base con Supabase
- Fase 5: tabla `dicom_uploads` y bucket privado `dicom-files` creados en Supabase

### En progreso
- Fase 6: endpoint backend para carga de archivos DICOM con validación JWT real
- Integración frontend-backend para subida real

## Objetivo inmediato
Dejar funcionando el flujo:
1. usuario inicia sesión
2. entra a la plataforma privada
3. sube un archivo DICOM
4. el backend valida el archivo
5. el archivo se guarda en Supabase Storage
6. se registra una fila en `dicom_uploads`

## Próximos módulos
- Formulario de carga DICOM en frontend
- Listado de cargas realizadas
- Visualización de metadatos básicos
- Integración progresiva con motor de IA
- Módulo de alertas y resultados