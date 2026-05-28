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
- Framework: Next.js 16
- Root Directory: `apps/web`
- URL pública: `https://benditos-cancer-detector.vercel.app`

### Backend
- Plataforma: Railway
- Framework: FastAPI
- Root Directory: `apps/api`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- URL pública: `https://benditoscancerdetector-production.up.railway.app`
- Proyecto Railway real: `ideal-strength` (el segundo proyecto visible con el mismo repo, `endearing-education`, es un duplicado huérfano sin dominio expuesto — candidato a archivar).

### Servicios externos
- Base de datos: Supabase PostgreSQL
- Autenticación: Supabase Auth
- Almacenamiento: Supabase Storage
- Bucket DICOM: `dicom-files`

## 4. Variables de entorno

### 4.1 Frontend (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL` — URL pública del backend Railway, sin `/` al final.
- `API_URL` — mismo valor que `NEXT_PUBLIC_API_URL`. Lo usa la server action de `/platform/analyze` (server-only, no se hornea al bundle del cliente).

**Importante:** las 4 variables deben estar marcadas en los tres environments (**Production + Preview + Development**). Si solo están en Production, los deploys Preview de cualquier PR fallan en el build de Next.js al prerenderizar `/login` (`@supabase/ssr` lanza "Your project's URL and API key are required"). Las `NEXT_PUBLIC_*` se hornean al bundle al momento del build, así que cualquier cambio requiere un **redeploy** (no basta con guardar la variable).

### 4.2 Backend (Railway)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME`
- `FRONTEND_URL`
- `HF_API_BASE_URL` — URL del Space de Hugging Face que expone `/predict` (default: `https://luisdam-oncoscan-ai.hf.space`).
- `HF_PREDICT_TIMEOUT` — timeout en segundos para la inferencia (default: `120`). Subir si el Space hace cold-start frecuente.

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
- Migración IA: ejecutar `docs/ai-service-migration.sql` en el SQL editor de Supabase para añadir las columnas del flujo IA (`file_type`, `clinical_features`, `ai_score`, `ai_risk_level`, `ai_recommendation`, `ai_model_version`, `ai_processed_at`, `ai_error`).

### 5.4 Servicio de inferencia IA (OncaScan AI)
- Plataforma: Hugging Face Spaces
- URL base: `https://luisdam-oncoscan-ai.hf.space`
- Endpoint: `POST /predict` (multipart/form-data — imagen PNG/JPG + 8 features clínicas)
- Health: `GET /health`
- Comportamiento: cold-start posible de 30–60s; el backend procesa la inferencia en background y el frontend hace polling al endpoint `GET /api/v1/analysis/{id}`.

### 5.5 Next.js — límite de body de Server Actions
La page `/platform/analyze` envía imágenes hasta 10 MB a través de una Server Action. Next.js limita el body de Server Actions a **1 MB por defecto**; sin override, el framework rechaza la request antes de ejecutar la action y el cliente recibe "Body exceeded 1 MB limit". El override está en `apps/web/next.config.ts`:

```ts
experimental: { serverActions: { bodySizeLimit: "10mb" } }
```

No subir más allá de 10 MB sin revisar el límite de body de funciones serverless de Vercel (4.5 MB en Hobby).

### 5.6 Backend — encoding de `requirements.txt`
`apps/api/requirements.txt` debe estar en **UTF-8 (ASCII compatible)**, sin BOM. Si se regenera desde PowerShell 5.1 con `>` o `Out-File`, el archivo queda en UTF-16 LE y Railway falla el build con `Invalid requirement: 'f\x00a\x00s\x00t...'` porque pip lo lee carácter por carácter con bytes null intercalados.

Para regenerar desde PowerShell, usar siempre `-Encoding utf8`:
```powershell
pip freeze | Out-File -Encoding utf8 apps/api/requirements.txt
```
Mejor: regenerar desde Git Bash o WSL (`pip freeze > requirements.txt`).

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

---

### Incidencia 5: builds de Railway congelados por encoding de `requirements.txt`
**Síntoma:** Railway marcaba los últimos deploys como `FAILED` con error `ERROR: Invalid requirement: 'f\x00a\x00s\x00t\x00a\x00p\x00i==0.115.12'`. El deploy `ACTIVE` se quedó congelado dos semanas en una versión vieja porque ningún push posterior buildeaba; en runtime el backend seguía respondiendo pero contra código desactualizado.

**Causa:** `apps/api/requirements.txt` quedó codificado en UTF-16 LE con BOM (probablemente regenerado con `pip freeze > requirements.txt` desde PowerShell 5.1, que usa UTF-16 por defecto). pip en Linux lo lee carácter por carácter con bytes null intercalados.

**Acción correctiva:** reconvertir el archivo a UTF-8 (`iconv -f UTF-16LE -t UTF-8`). Ver §5.6 para la regla preventiva.

---

### Incidencia 6: payload too large en `/platform/analyze`
**Síntoma:** subir cualquier imagen >1 MB al formulario de análisis IA devolvía error "payload muy largo" antes de llegar al backend.

**Causa:** la page usa una Server Action de Next.js, y Server Actions tienen un límite de body de 1 MB por defecto; la validación interna de la action permitía hasta 10 MB, pero el framework rechazaba la request antes de ejecutarla.

**Acción correctiva:** añadir `experimental.serverActions.bodySizeLimit: "10mb"` en `apps/web/next.config.ts`. Ver §5.5.

---

### Incidencia 7: builds Preview de Vercel fallaban al prerenderizar `/login`
**Síntoma:** cada PR abierto disparaba un build Preview en Vercel que fallaba con `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!` durante la generación estática de `/login`. Producción seguía funcionando.

**Causa:** las variables `NEXT_PUBLIC_*` y `API_URL` estaban marcadas solo para el environment **Production** en Vercel. Los deploys Preview no las heredaban; al hornearse el bundle con `process.env.NEXT_PUBLIC_SUPABASE_URL === undefined`, el cliente Supabase lanzaba el error durante el prerender.

**Acción correctiva:** habilitar las 4 variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`, `API_URL`) en **Production + Preview + Development** y redesplegar. Ver §4.1.

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

- La inferencia IA depende del Space de Hugging Face (puede tener cold-starts y caídas; no hay SLA).
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