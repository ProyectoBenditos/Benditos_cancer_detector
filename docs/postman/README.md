# OncoScan — Colección Postman

Colección para probar los 6 endpoints clave de la API OncoScan.

## Importar la colección

1. Abrir Postman → "Import" → seleccionar `oncoscan.postman_collection.json`.
2. La colección aparece con las variables `base_url` (default: `http://localhost:8000`) y `access_token` (vacío — ver siguiente sección).

## Obtener el `access_token`

La API FastAPI requiere el JWT de Supabase en el header `Authorization: Bearer <token>`.

**Pasos:**
1. Entrar a la plataforma en `http://localhost:3000/login` con credenciales válidas.
2. Abrir DevTools del browser → Application → Cookies.
3. Buscar la cookie con nombre que empieza con `sb-` y termina en `-auth-token`.
4. El valor de la cookie es un JSON codificado en base64 o URL. Decodificar y extraer el campo `access_token`.
5. Pegar el token en la variable de colección `access_token`.

> El token de Supabase tiene vigencia de 1 hora. Si expiras, vuelve a iniciar sesión y repite el paso.

## Variables de la colección

| Variable | Default | Descripción |
|----------|---------|-------------|
| `base_url` | `http://localhost:8000` | URL de la API FastAPI |
| `access_token` | *(vacío)* | JWT de Supabase Auth |

## Test plan manual

### Request 1 — GET /api/v1/health
- **Esperado:** `200 OK` con body `{"status": "ok"}` o similar.
- **Sin auth requerida.**

### Request 2 — POST /api/v1/dicom/upload
- Seleccionar un archivo `.dcm`, `.png` o `.jpg` en el campo `file`.
- `case_ref`: cualquier string de referencia (opcional).
- `patient_id`: UUID de un paciente registrado (opcional, requiere migration aplicada).
- **Esperado:** `200 OK` con `dicom_id` en el response.
- Guardar el `dicom_id` para el Request 3.

### Request 3 — POST /api/v1/dicom/analyze/:dicom_id
- Reemplazar `:dicom_id` con el valor obtenido en Request 2.
- Body JSON con las 8 features clínicas (valores de ejemplo incluidos).
- **Esperado:** `200 OK` con `score`, `nivel_riesgo`, `recomendacion`, `modelo_version`.
- Nota: el modelo en Hugging Face puede tardar ~2 min en cold-start.

### Request 4 — POST /api/v1/analysis/predict
- Equivalente al flujo del form web de análisis IA.
- Adjuntar imagen PNG + 8 features como form-data.
- **Esperado:** `200 OK` con `upload_id` y resultado IA.

### Request 5 — GET /api/v1/analysis/:upload_id
- Reemplazar `:upload_id` con el valor de `upload_id` del Request 4.
- **Esperado:** `200 OK` con resultado del análisis.
- Si no existe: `404 Not Found`.

### Request 6 — GET /platform/reportes/download?tipo=alto_riesgo
- Este endpoint es de Next.js (puerto 3000), no FastAPI.
- **Mejor testearlo directamente en el browser** logueado (la cookie de sesión se envía automáticamente).
- Parámetro `tipo`: `completo`, `alto_riesgo`, `estadistico`, `con_referencia`.
- **Esperado:** descarga de archivo `.csv` con los registros filtrados.

## Checks de seguridad al probar

- Sin token (`Authorization` vacío) → todos los endpoints protegidos deben devolver `401`.
- Con token de usuario A → no debe ver datos de usuario B (RLS de Supabase).
- El body de respuesta no debe incluir emails ni paths de storage en claro.
