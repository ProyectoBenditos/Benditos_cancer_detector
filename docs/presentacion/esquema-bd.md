# Esquema de Base de Datos — OncoScan

> Derivado de `supabase/migrations/` (9 migraciones aplicadas manualmente en el SQL Editor).
> Motor: PostgreSQL via Supabase. RLS habilitado en todas las tablas.

---

## Tablas

### `auth.users` _(gestionada por Supabase Auth)_

Tabla interna de Supabase. No se crea en migraciones propias.
Campos relevantes: `id uuid`, `email text`, `raw_user_meta_data jsonb`.

---

### `public.profiles`

Extensión de `auth.users` con datos profesionales del médico y su estado de aprobación.

| Columna              | Tipo         | Restricciones / Default              |
|----------------------|--------------|--------------------------------------|
| `id`                 | `uuid`       | PK, FK `auth.users(id)` ON DELETE CASCADE |
| `full_name`          | `text`       | NOT NULL                             |
| `cedula_profesional` | `text`       | NOT NULL                             |
| `especialidad`       | `text`       | NOT NULL                             |
| `institucion`        | `text`       | NOT NULL                             |
| `role`               | `text`       | NOT NULL, DEFAULT `'medico'`, CHECK (`'medico'`, `'admin'`) |
| `status`             | `text`       | NOT NULL, DEFAULT `'pending'`, CHECK (`'pending'`, `'approved'`, `'rejected'`) |
| `approved_at`        | `timestamptz`| nullable                             |
| `approved_by`        | `uuid`       | nullable, FK `auth.users(id)`        |
| `rejection_reason`   | `text`       | nullable                             |
| `created_at`         | `timestamptz`| DEFAULT `now()`                      |
| `consent_version`    | `text`       | nullable (migración T-07)            |
| `consent_at`         | `timestamptz`| nullable (migración T-07)            |

**Políticas RLS:**

| Política                   | Operación | Condición                          |
|----------------------------|-----------|------------------------------------|
| `profiles_select_own`      | SELECT    | `auth.uid() = id`                  |
| `profiles_insert_own`      | INSERT    | `auth.uid() = id`                  |
| `profiles_update_own`      | UPDATE    | `auth.uid() = id`                  |
| `profiles_admin_select`    | SELECT    | `public.is_admin()`                |
| `profiles_admin_update`    | UPDATE    | `public.is_admin()`                |

---

### `public.patients`

Pacientes registrados por un médico. No contienen datos sensibles directos; el alias es opcional.

| Columna        | Tipo         | Restricciones                          |
|----------------|--------------|----------------------------------------|
| `id`           | `uuid`       | PK, DEFAULT `gen_random_uuid()`        |
| `user_id`      | `uuid`       | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `external_id`  | `text`       | NOT NULL                               |
| `display_alias`| `text`       | nullable                               |
| `notes`        | `text`       | nullable                               |
| `created_at`   | `timestamptz`| DEFAULT `now()`                        |

**Restricción única:** `(user_id, external_id)`.

**Políticas RLS:** cada médico solo ve y gestiona sus propios pacientes (`auth.uid() = user_id`) para SELECT, INSERT, UPDATE y DELETE.

---

### `public.dicom_uploads`

Registro central de cada estudio subido y su resultado de IA. La tabla base **no está en las migraciones** (se asume existente); las migraciones solo añaden columnas.

| Columna              | Tipo         | Notas                                       |
|----------------------|--------------|---------------------------------------------|
| `id`                 | `uuid`       | PK                                          |
| `user_id`            | `uuid`       | FK `auth.users(id)`                         |
| `original_name`      | `text`       | Nombre del archivo original                 |
| `storage_path`       | `text`       | Ruta en Supabase Storage (opaca)            |
| `file_size`          | `int`        | Bytes                                       |
| `modality`           | `text`       | `CT`, `IMG`, o `png_analysis`               |
| `study_date`         | `text`       | Fecha del estudio (del tag DICOM)           |
| `patient_id_dicom`   | `text`       | Seudónimo `ONC-PAT-xxxx` (HMAC-SHA256 del PatientID). Nunca el ID real |
| `patient_id`         | `uuid`       | FK `public.patients(id)` ON DELETE SET NULL (migración 1) |
| `upload_status`      | `text`       | `uploaded` → `processing` → `analyzed` / `ai_completed` / `ai_failed` / `error` |
| `file_type`          | `text`       | `dicom`, `image`, `png_analysis`            |
| `metadata_json`      | `jsonb`      | filename, content_type, file_ext, case_ref; en DICOM también `deidentified`, `deidentified_at`, `tags_cleared`, `source_sha256`, `sanitized_sha256`, `audit_summary` |
| `clinical_features`  | `jsonb`      | 8 features radiológicas (ver modelo IA)     |
| `ai_score`           | `float`      | Score de probabilidad 0–1                   |
| `ai_risk_level`      | `text`       | `ALTO`, `MEDIO`, `BAJO`                     |
| `ai_recommendation`  | `text`       | Texto de recomendación clínica              |
| `ai_model_version`   | `text`       | Versión reportada por el Space HF           |
| `ai_processed_at`    | `timestamptz`| Timestamp de la inferencia                  |
| `ai_error`           | `text`       | Mensaje de error (si falló)                 |
| `model_version`      | `text`       | Versión env `HF_MODEL_VERSION` (migración T-05) |
| `inference_time_ms`  | `int`        | Tiempo de inferencia en ms (migración T-05) |
| `predicted_at`       | `timestamptz`| Timestamp UTC de la predicción (migración T-05) |
| `ai_heatmap_base64`  | `text`       | Mapa Grad-CAM en base64 (migración heatmap_preview) |
| `preview_storage_path` | `text`     | Ruta del PNG de vista previa de un DICOM (migración heatmap_preview) |
| `batch_id`           | `uuid`       | FK `public.batch_jobs(id)` ON DELETE SET NULL (migración batch_jobs) |
| `created_at`         | `timestamptz`| DEFAULT `now()`                             |

> **Nota:** La tabla base de `dicom_uploads` no está versionada en migraciones propias. Si se recrea la BD desde cero, hay que crearla manualmente antes de aplicar las migraciones.

---

### `public.batch_jobs`

Lote de hasta 20 estudios subidos juntos.

| Columna           | Tipo         | Restricciones / Default                |
|-------------------|--------------|----------------------------------------|
| `id`              | `uuid`       | PK, DEFAULT `gen_random_uuid()`        |
| `user_id`         | `uuid`       | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `status`          | `text`       | DEFAULT `'pending'`, CHECK (`pending`, `processing`, `completed`, `failed`, `partial`) |
| `total_items`     | `int`        | NOT NULL, CHECK 1–20                   |
| `completed_items` | `int`        | DEFAULT `0`                            |
| `failed_items`    | `int`        | DEFAULT `0`; `completed + failed <= total` |
| `patient_mode`    | `text`       | DEFAULT `'single'`, CHECK (`single`, `multi`) (migración batch_v2) |
| `patient_id`      | `uuid`       | FK `public.patients(id)` ON DELETE SET NULL (migración batch_v2) |
| `batch_sequence`  | `int`        | Número de lote del usuario (migración batch_v2) |
| `created_at`      | `timestamptz`| DEFAULT `now()`                        |
| `completed_at`    | `timestamptz`| nullable                               |

**Políticas RLS:** `batch_jobs_user_isolation` (ALL): `auth.uid() = user_id`.

---

### `public.upload_reviews`

Valoración del especialista sobre un estudio analizado por la IA. Una fila por estudio.

| Columna          | Tipo          | Restricciones                          |
|------------------|---------------|----------------------------------------|
| `id`             | `uuid`        | PK, DEFAULT `gen_random_uuid()`        |
| `upload_id`      | `uuid`        | NOT NULL, UNIQUE, FK `dicom_uploads(id)` ON DELETE CASCADE |
| `user_id`        | `uuid`        | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `concordancia`   | `text`        | CHECK (`concuerda`, `discrepa`, `indeterminado`) |
| `lung_rads`      | `text`        | CHECK (`0`, `1`, `2`, `3`, `4A`, `4B`, `4X`) |
| `nodule_size_mm` | `numeric(5,1)`| CHECK `> 0` y `<= 300`                 |
| `conducta`       | `text`        | CHECK (`sin_seguimiento`, `tac_3m`, `tac_6m`, `tac_12m`, `pet_tc`, `biopsia`, `junta`, `otra`) |
| `notes`          | `text`        | Máx. 4000 caracteres. **Es PHI** (registro clínico, Res. 1995 de 1999) |
| `created_at`     | `timestamptz` | DEFAULT `now()`                        |
| `updated_at`     | `timestamptz` | DEFAULT `now()`, se actualiza por trigger |

**Políticas RLS:** SELECT, UPDATE y DELETE con `auth.uid() = user_id`. INSERT exige además que el estudio sea del médico (`EXISTS` sobre `dicom_uploads`; no hay recursión porque consulta otra tabla).

---

### `public.dicom_anonymization_audit`

Registro de la desidentificación de cada DICOM subido. Alimenta el "Certificado de Desidentificación Clínica" en `/platform/uploads/[id]`. Una fila por estudio; la inserta el backend (service role) justo después de crear la fila en `dicom_uploads`.

| Columna                    | Tipo          | Restricciones / Default                |
|----------------------------|---------------|----------------------------------------|
| `id`                       | `uuid`        | PK, DEFAULT `gen_random_uuid()`        |
| `upload_id`                | `uuid`        | NOT NULL, UNIQUE, FK `dicom_uploads(id)` ON DELETE CASCADE |
| `user_id`                  | `uuid`        | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `pseudonymized_patient_id` | `text`        | NOT NULL. Seudónimo `ONC-PAT-xxxx`     |
| `source_sha256`            | `text`        | NOT NULL. Huella SHA-256 del archivo original, antes de limpiar |
| `sanitized_sha256`         | `text`        | NOT NULL. Huella SHA-256 del archivo limpio que se guarda en Storage |
| `tags_cleared_count`       | `int`         | DEFAULT `0`. Campos de texto con PHI vaciados |
| `normative_compliance`     | `text[]`      | Normas aplicadas (Ley 1581, Decreto 1377, PS 3.15 Anexo E, Res. 1995, Ley 2015) |
| `zero_retention_verified`  | `boolean`     | DEFAULT `true`. Lo fija el backend; no es una verificación automática |
| `created_at`               | `timestamptz` | DEFAULT `now()`                        |

**Políticas RLS:** SELECT con `auth.uid() = user_id`. INSERT con `auth.uid() = user_id` y el estudio debe ser del médico. No hay políticas de UPDATE ni DELETE, así que los usuarios no pueden modificar ni borrar registros (la service role sí). Si se borra el estudio, su registro se borra en cascada.

> Si la inserción falla, la subida no se interrumpe: el backend registra el error y la página arma el certificado desde `dicom_uploads.metadata_json`.

---

## Storage

### Política `dicom_files_select_own` en `storage.objects`

El médico autenticado puede leer (SELECT) los objetos del bucket privado `dicom-files` cuyo primer segmento de ruta sea su `user_id` (`{user_id}/...`). Se necesita para generar el signed URL del "antes" en `/platform/uploads/[id]` con la sesión del usuario. El control es por prefijo de ruta porque el backend sube con service role y `owner` no queda como el usuario.

---

## Funciones y Triggers

### `public.is_admin() → boolean` _(SECURITY DEFINER)_

```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin'
);
```

Corre con privilegios del owner de la tabla para evitar recursión RLS. Las policies de `profiles` que necesitan verificar si el usuario es admin la invocan en lugar de consultar `profiles` directamente.

### Trigger `on_auth_user_created` → `handle_new_user()`

Se dispara `AFTER INSERT ON auth.users`. Crea automáticamente la fila en `public.profiles` con los datos de `raw_user_meta_data` del registro, estado `pending` y rol `medico`. Desde la migración T-07 también persiste `consent_version` y `consent_at`.

### Trigger `upload_reviews_set_updated_at` → `set_updated_at()`

Se dispara `BEFORE UPDATE ON public.upload_reviews` y pone `updated_at = now()`.

---

## Historial de migraciones

| Archivo                                  | Qué hace                                         |
|------------------------------------------|--------------------------------------------------|
| `20260521120000_profiles_patients.sql`   | Crea `profiles`, `patients`, función `is_admin()`, trigger `handle_new_user()`, añade `patient_id` a `dicom_uploads` |
| `20260530100000_predicciones_metadata.sql` | Añade `model_version`, `inference_time_ms`, `predicted_at` a `dicom_uploads` |
| `20260530110000_profiles_consent.sql`    | Añade `consent_version`, `consent_at` a `profiles`; actualiza trigger |
| `20260603120000_heatmap_preview.sql`     | Añade `ai_heatmap_base64`, `preview_storage_path` a `dicom_uploads` |
| `20260603130000_storage_select_policy.sql` | Política `dicom_files_select_own` en `storage.objects` (lectura por prefijo `{user_id}/`) |
| `20260820_batch_jobs.sql`                | Crea `batch_jobs` con RLS; añade `batch_id` a `dicom_uploads` |
| `20260820_batch_v2_features.sql`         | Añade `patient_mode`, `patient_id`, `batch_sequence` a `batch_jobs` |
| `20261002120000_upload_reviews.sql`      | Crea `upload_reviews`, función `set_updated_at()` y su trigger, con RLS |
| `20261008120000_dicom_anonymization_audit.sql` | Crea `dicom_anonymization_audit` (huellas SHA-256 y seudónimo por estudio DICOM) con RLS de solo lectura e inserción |

---

_Ver también: [api-reference.md](api-reference.md) para los campos que expone la API._
