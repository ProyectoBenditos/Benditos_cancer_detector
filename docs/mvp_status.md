# Estado del MVP - OncaScan Platform

## 1. Resumen general

OncaScan Platform dispone actualmente de un MVP funcional desplegado en la nube, orientado a validar la arquitectura base, el acceso controlado y el flujo de carga de imágenes médicas en un entorno académico controlado.

## 2. Funcionalidades completadas

### Plataforma pública
- homepage informativa desplegada

### Autenticación y acceso
- login con Supabase Auth
- plataforma privada protegida
- cierre de sesión

### Backend y API
- backend FastAPI operativo
- endpoint de salud
- endpoint protegido para carga DICOM
- validación de JWT del usuario autenticado

### Gestión de archivos DICOM
- selección y envío de archivo desde frontend
- validación básica del archivo DICOM
- extracción de metadatos mínimos
- almacenamiento en Supabase Storage
- registro en tabla `dicom_uploads`

### Consulta del prototipo
- historial de cargas por usuario
- vista de detalle de una carga

## 3. Funcionalidades en progreso o pendientes

### Pendientes inmediatos
- mejorar presentación del dashboard principal
- evidencias formales de smoke test
- documentación final de operación básica

### Pendientes posteriores
- asociación de DICOM a caso/paciente
- registro de observaciones o seguimiento clínico
- módulo de alertas
- integración del motor IA
- evaluación de métricas del modelo
- trazabilidad ampliada tipo requisito → prueba → evidencia

## 4. Alcance real de la versión actual

La versión actual del MVP permite validar el flujo técnico base del sistema, pero no ejecuta todavía análisis oncológico automatizado en producción.

El prototipo actual debe entenderse como una plataforma de apoyo técnico y no como una solución clínica final.

## 5. Restricciones vigentes

- uso académico
- recursos limitados
- sin operación clínica real
- sin certificación regulatoria
- sin monitoreo avanzado de producción
- sin alta disponibilidad garantizada

## 6. Valor alcanzado hasta el momento

La versión desplegada demuestra que el proyecto ya cuenta con:

- arquitectura funcional real
- autenticación operativa
- backend y frontend desplegados
- integración con Supabase
- flujo DICOM mínimo verificable
- base sólida para continuar con módulos clínicos e IA

## 7. Siguiente fase recomendada

La siguiente fase recomendada es consolidar el prototipo funcional con:

1. mejora del dashboard
2. asociación de archivos a caso/paciente
3. seguimiento y observaciones
4. baseline inicial del motor de IA

## 8. Nota de uso

OncaScan Platform es una herramienta de apoyo a la decisión clínica en un entorno académico controlado y no sustituye el criterio profesional del especialista.