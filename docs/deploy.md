# Deploy OncaScan MVP

## 1. Propósito

Este documento registra la configuración de despliegue del MVP de OncaScan Platform, incluyendo frontend, backend, servicios asociados, variables de entorno, incidencias resueltas y validaciones realizadas. Su objetivo es dejar evidencia técnica verificable del sistema desplegado en un entorno académico controlado.

## 2. Alcance del despliegue

El despliegue actual cubre las funcionalidades mínimas del MVP:

- homepage pública informativa
- autenticación de usuarios autorizados
- acceso a plataforma privada
- carga de archivos DICOM
- almacenamiento del archivo en Supabase Storage
- registro de metadatos básicos en base de datos
- consulta de historial y detalle de cargas

Este despliegue corresponde a una versión prototipo académica y no a un sistema clínico productivo.

## 3. Arquitectura desplegada

### Frontend
- Plataforma: Vercel
- Framework: Next.js
- Root Directory: `apps/web`
- URL pública: `PEGAR_URL_FRONTEND`

### Backend
- Plataforma: Railway
- Framework: FastAPI
- Root Directory: `apps/api`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- URL pública: `PEGAR_URL_BACKEND`

### Servicios externos
- Base de datos: Supabase PostgreSQL
- Autenticación: Supabase Auth
- Almacenamiento: Supabase Storage
- Bucket DICOM: `dicom-files`

## 4. Variables de entorno

### 4.1 Frontend (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`

### 4.2 Backend (Railway)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME`
- `FRONTEND_URL`

## 5. Configuración relevante

### 5.1 Supabase Auth
Configuración de URLs de autenticación:

- Site URL: `PEGAR_URL_FRONTEND`
- Redirect URLs:
  - `http://localhost:3000/**`
  - `PEGAR_URL_FRONTEND/**`

### 5.2 Supabase Storage
- Bucket: `dicom-files`
- Tipo: privado

### 5.3 Tabla operativa
- Tabla: `public.dicom_uploads`

## 6. Flujo operativo validado

El flujo desplegado y validado es el siguiente:

1. El usuario accede a la homepage pública.
2. El usuario autorizado inicia sesión.
3. El sistema permite acceso a la plataforma privada.
4. El usuario selecciona un archivo DICOM.
5. El frontend envía el archivo al backend mediante `POST /api/v1/dicom/upload`.
6. El backend valida el JWT del usuario.
7. El backend valida y procesa el archivo DICOM.
8. El archivo se almacena en Supabase Storage.
9. Los metadatos básicos se registran en `dicom_uploads`.
10. El usuario puede consultar historial y detalle de cargas.

## 7. Incidencias resueltas durante el despliegue

### Incidencia 1: fallo de despliegue por dependencias de Windows
**Síntoma:** Railway falló al instalar `pywin32`.

**Causa:** `requirements.txt` fue generado desde Windows con dependencias no compatibles con Linux.

**Acción correctiva:** limpieza manual de `requirements.txt` y conservación únicamente de dependencias necesarias del backend.

---

### Incidencia 2: fallo de arranque por variables no cargadas
**Síntoma:** crash con `ValueError: SUPABASE_URL no está cargada`.

**Causa:** las variables de entorno necesarias no estaban configuradas en Railway.

**Acción correctiva:** registrar manualmente en Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME`
- `FRONTEND_URL`

---

### Incidencia 3: error RLS al insertar en `dicom_uploads`
**Síntoma:** `new row violates row-level security policy`.

**Causa:** inserción desde backend con políticas no alineadas al flujo actual.

**Acción correctiva:** ajustar políticas y asegurar uso de `service_role` en backend.

---

### Incidencia 4: fallo de upload en producción
**Síntoma:** el sistema desplegado no subía el archivo.

**Causa:** `NEXT_PUBLIC_API_URL` apuntaba incorrectamente al backend local o sin protocolo correcto.

**Acción correctiva:** actualización de `NEXT_PUBLIC_API_URL` con la URL pública HTTPS del backend en Railway y redeploy del frontend.

## 8. Validación funcional del despliegue

### Estado de validación
- Homepage pública: OK
- Login: OK
- Acceso a `/platform`: OK
- Upload DICOM: OK
- Registro en Storage: OK
- Registro en `dicom_uploads`: OK
- Historial de cargas: OK
- Detalle de carga: OK

## 9. Limitaciones actuales del MVP

- No incluye aún inferencia IA operativa en producción.
- No incorpora visor clínico DICOM avanzado.
- No reemplaza el criterio del especialista.
- No está diseñado para uso hospitalario productivo.
- No cuenta con certificación clínica o regulatoria.

## 10. Evidencias recomendadas para anexar

Se recomienda capturar y archivar como evidencia:

- pantalla de homepage pública
- pantalla de login
- pantalla de plataforma privada
- carga exitosa de un archivo DICOM
- historial de cargas
- detalle de una carga
- registro del archivo en Supabase Storage
- registro de la fila en `dicom_uploads`
- URL pública del frontend
- URL pública del backend

## 11. Conclusión

El MVP de OncaScan Platform quedó desplegado en un entorno académico funcional, con autenticación, carga DICOM, persistencia de metadatos y navegación básica de plataforma. El sistema cumple el objetivo de entregar una base técnica verificable para la evolución posterior hacia módulos clínicos, trazabilidad extendida y motor de inteligencia artificial.