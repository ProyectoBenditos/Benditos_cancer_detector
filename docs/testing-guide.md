# OncoScan — Guía de Tests y Verificación Manual

## 1. Tests automatizados (Vitest)

### Requisitos
Node.js instalado. Dependencias ya en `apps/web/package.json`.

### Cómo ejecutar

```bash
cd apps/web

# Correr todos los tests una vez
npm test

# Modo watch (re-corre al guardar archivos)
npm run test:watch
```

### Suites disponibles

#### `analyzeAction` — Validación de formulario de análisis IA
**Archivo:** `src/app/platform/analyze/actions.test.ts`

| Test | Qué verifica |
|------|-------------|
| rechaza cuando no hay archivo | El campo `imagen` es obligatorio |
| rechaza archivo vacío (size 0) | No acepta File con 0 bytes |
| rechaza archivo mayor a 10 MB | Límite de 10 MB estricto |
| rechaza feature con valor NaN | `subtlety: "abc"` → error |
| rechaza feature fuera de rango (malignancy > 5) | `malignancy: "6"` → error |
| rechaza feature fuera de rango (subtlety < 1) | `subtlety: "0"` → error |
| pasa validación con datos válidos | Con todo correcto llega a capa de red |

#### `download/route` — Endpoint de descarga CSV
**Archivo:** `src/app/platform/reportes/download/route.test.ts`

| Test | Qué verifica |
|------|-------------|
| devuelve 401 sin sesión | Sin usuario autenticado → Unauthorized |
| devuelve CSV (200) autenticado | Con usuario válido → Content-Type: text/csv |
| aplica filtro `alto_riesgo` | Con `?tipo=alto_riesgo` → filename incluye "alto_riesgo" |

#### `createPatientAction` — Creación de pacientes
**Archivo:** `src/app/platform/pacientes/actions.test.ts`

| Test | Qué verifica |
|------|-------------|
| rechaza external_id vacío | Campo obligatorio |
| rechaza external_id > 100 chars | Límite de longitud |
| propaga error de unique constraint | Código de paciente duplicado → mensaje claro |
| acepta datos válidos y redirige | Sin error de validación con datos correctos |

### Resultado esperado

```
Test Files  3 passed (3)
Tests  14 passed (14)
```

---

## 2. Verificación end-to-end manual (flujo completo)

> Requiere: migration SQL aplicada en Supabase + frontend corriendo (`npm run dev`) + backend corriendo (`uvicorn main:app`).

### 2.1 Bootstrap del primer admin

1. Ir a `/signup` y registrar una cuenta con el email del admin.
2. En el **SQL Editor del dashboard Supabase** ejecutar:
   ```sql
   UPDATE public.profiles
      SET role = 'admin', status = 'approved', approved_at = now()
    WHERE id = (SELECT id FROM auth.users WHERE email = 'tu-admin@email.com');
   ```
3. Entrar a `/login` con ese email → debe llegar a `/platform` sin bloqueo.

### 2.2 Signup de médico y gate de acceso

1. Abrir ventana incógnita → ir a `/signup`.
2. Completar el formulario con datos reales: nombre, email, cédula, especialidad, institución, contraseña.
3. **Verificar en Supabase:** tabla `profiles` → debe aparecer con `status = 'pending'`.
4. El médico intenta entrar a `/platform` → debe ser redirigido a `/cuenta-pendiente`.
5. Confirmar que `/platform/pacientes`, `/platform/upload`, etc. no son accesibles.

### 2.3 Aprobación del médico (admin)

1. El admin entra a `/platform/admin/medicos`.
2. El médico registrado aparece en la sección "Pendientes de aprobación".
3. Hacer clic en "Ver" → revisar datos → clic en **Aprobar**.
4. **Verificar en Supabase:** `profiles.status` cambia a `'approved'`.
5. El médico cierra sesión y vuelve a entrar → ahora accede a `/platform`.

### 2.4 Flujo de rechazo

1. Registrar un segundo médico.
2. Admin entra a su detalle → clic en **Rechazar** con motivo "Cédula no válida".
3. El médico al entrar ve `/cuenta-pendiente` con el motivo de rechazo visible.

### 2.5 CRUD de pacientes

1. Ir a `/platform/pacientes` → debe aparecer empty state con CTA.
2. Clic en "Registrar primer paciente" → llenar `external_id: "TEST-001"`, alias opcional.
3. Submit → redirige a lista y el paciente aparece.
4. Clic en "Ver detalle" → página del paciente sin estudios aún.
5. Repetir con `external_id: "TEST-001"` → debe aparecer error de duplicado.

### 2.6 Upload DICOM con paciente

1. Ir a `/platform/upload`.
2. El `<select>` de paciente debe aparecer (si hay pacientes registrados).
3. Seleccionar "TEST-001".
4. Subir un archivo DICOM o imagen válida.
5. Completar el análisis IA.
6. Ir a `/platform/pacientes/[id-de-TEST-001]` → el estudio debe aparecer en la lista de estudios asociados.
7. Ir al detalle del upload → debe mostrar "Paciente registrado: TEST-001" con link.

### 2.7 Checks de seguridad (RLS)

Con dos médicos aprobados en navegadores distintos:

```sql
-- Ejecutar en SQL Editor de Supabase como cada usuario
-- Debe retornar vacío (no ve pacientes de otros)
SELECT * FROM patients WHERE user_id != auth.uid();
```

Médico aprobado intenta entrar a `/platform/admin/medicos` → debe recibir **404** (no 403, no redirect).

---

## 3. Colección Postman

### Importar

1. Abrir Postman → **Import** → seleccionar `docs/postman/oncoscan.postman_collection.json`.
2. Configurar las variables de la colección:
   - `base_url`: `http://localhost:8000` (o URL de producción)
   - `access_token`: ver sección siguiente

### Obtener el access_token

1. Entrar a `http://localhost:3000/login`.
2. Abrir DevTools → **Application** → **Cookies** → buscar cookie `sb-*-auth-token`.
3. Copiar el valor → decodificar el JSON (puede estar en base64 o URL-encoded).
4. Extraer el campo `access_token`.
5. Pegarlo en la variable `access_token` de la colección.

> El token expira en ~1 hora. Si ves 401, vuelve a loguear y repite.

### Requests incluidos

| # | Nombre | Método | URL | Auth |
|---|--------|--------|-----|------|
| 1 | Health Check | GET | `/api/v1/health` | No |
| 2 | Subir DICOM | POST | `/api/v1/dicom/upload` | Bearer token |
| 3 | Analizar DICOM | POST | `/api/v1/dicom/analyze/:dicom_id` | Bearer token |
| 4 | Análisis con imagen | POST | `/api/v1/analysis/predict` | Bearer token |
| 5 | Obtener resultado | GET | `/api/v1/analysis/:upload_id` | Bearer token |
| 6 | Descargar CSV | GET | `localhost:3000/platform/reportes/download` | Cookie sesión |

### Test plan por request

#### Request 1 — Health Check
- Sin configuración extra.
- **Esperado:** `200 OK`.

#### Request 2 — Subir DICOM
- En el campo `file` → seleccionar un archivo `.dcm`, `.png` o `.jpg`.
- `case_ref`: cualquier texto (opcional).
- `patient_id`: UUID de un paciente (opcional, se obtiene de Supabase → tabla `patients`).
- **Esperado:** `200 OK` con `dicom_id` en el body.
- **Guardar** el `dicom_id` para el Request 3.
- Sin token → **esperado:** `401 Unauthorized`.

#### Request 3 — Analizar DICOM
- Reemplazar `:dicom_id` con el valor del paso anterior.
- Body JSON ya incluye valores de ejemplo (los 8 features clínicos).
- **Esperado:** `200 OK` con `score`, `nivel_riesgo`, `recomendacion`, `modelo_version`.
- ⚠️ El modelo en HF Space puede tardar hasta 2 min en cold-start.
- Con `dicom_id` inexistente → **esperado:** `404 Not Found`.

#### Request 4 — Análisis con imagen
- Adjuntar imagen PNG en el campo `imagen`.
- Los 8 fields numéricos ya están pre-llenados como texto.
- **Esperado:** `200 OK` con `upload_id` y resultado del análisis.

#### Request 5 — Obtener resultado
- Reemplazar `:upload_id` con el valor del Request 4.
- **Esperado:** `200 OK` con resultado del análisis.
- Con ID inexistente → **esperado:** `404 Not Found`.

#### Request 6 — Descargar CSV
- Este endpoint es Next.js (puerto 3000), no FastAPI.
- **Recomendado:** testearlo directamente en el browser (la cookie de sesión se envía automáticamente).
- Parámetro `tipo`:
  - `completo` — todos los registros del usuario
  - `alto_riesgo` — solo con `ai_risk_level = 'ALTO'`
  - `estadistico` — solo los que tienen score IA
  - `con_referencia` — solo los que tienen `case_ref`
- **Esperado:** descarga de archivo `.csv` con headers + datos.
- Sin sesión → **esperado:** `401 Unauthorized`.

---

## 4. Migration SQL — Verificación en Supabase

Antes de arrancar el smoke test manual, confirmar en el dashboard que:

```sql
-- 1. Tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'patients');

-- 2. Columna patient_id en dicom_uploads
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'dicom_uploads' AND column_name = 'patient_id';

-- 3. RLS habilitada
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('profiles', 'patients');

-- 4. Policies existentes
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'patients');
```

Si alguna verificación falla, aplicar la migration en `supabase/migrations/20260521120000_profiles_patients.sql`.

---

## 5. Checklist de seguridad clínica

- [ ] Ningún `console.log` loguea `external_id`, `display_alias` ni `email` del médico
- [ ] La RLS de `patients` se prueba con 2 usuarios distintos (ver sección 2.7)
- [ ] Los tests unitarios usan fixtures sintéticos (`"TEST-XYZ"`, `"CT-001"`) — sin PHI real
- [ ] El form de signup NO envía la cédula profesional al backend FastAPI (queda solo en Supabase `profiles`)
- [ ] Admin no puede ver/cambiar el campo `role` desde el panel de aprobación (solo `status`)
