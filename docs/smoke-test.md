# Smoke Test MVP - OncaScan Platform

## 1. Objetivo

Verificar que el MVP desplegado funciona correctamente en el entorno productivo académico y que sus rutas, autenticación, carga DICOM y persistencia básica operan de forma consistente.

## 2. Entorno validado

- Frontend: Vercel
- Backend: Railway
- Base de datos / Auth / Storage: Supabase

## 3. Casos de prueba

### ST-01 Homepage pública
**Entrada:** acceder a la URL principal del frontend  
**Resultado esperado:** carga correcta de la homepage  
**Estado:** OK 

---

### ST-02 Login válido
**Entrada:** usuario autorizado + contraseña correcta  
**Resultado esperado:** ingreso correcto a `/platform`  
**Estado:** OK 

---

### ST-03 Protección de ruta privada
**Entrada:** acceder a `/platform` sin sesión  
**Resultado esperado:** redirección a `/login`  
**Estado:** OK 

---

### ST-04 Upload DICOM válido
**Entrada:** archivo `.dcm` válido desde `/platform/upload`  
**Resultado esperado:** carga exitosa y mensaje de confirmación  
**Estado:** OK 

---

### ST-05 Registro en Storage
**Entrada:** revisar bucket `dicom-files` después del upload  
**Resultado esperado:** el archivo aparece almacenado  
**Estado:** OK

---

### ST-06 Registro en base de datos
**Entrada:** revisar tabla `dicom_uploads` después del upload  
**Resultado esperado:** existe fila con metadatos básicos  
**Estado:** OK 

---

### ST-07 Historial de cargas
**Entrada:** acceder a `/platform/uploads`  
**Resultado esperado:** se visualiza la lista de uploads del usuario  
**Estado:** OK 

---

### ST-08 Detalle de carga
**Entrada:** acceder a un upload específico desde historial  
**Resultado esperado:** se visualiza el detalle del archivo cargado  
**Estado:** OK 

## 4. Incidencias detectadas

Registrar aquí cualquier error encontrado durante el smoke test:

- Incidencia:
- Síntoma:
- Causa:
- Acción correctiva:
- Estado final:

## 5. Resultado global

- Smoke test completado: SÍ 
- MVP operativo en producción académica: SÍ 
- Observaciones finales: Todo esta fucnionado bien en el MVP. Ahora toca seguir con la siguiente fase.