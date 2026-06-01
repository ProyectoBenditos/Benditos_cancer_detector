# Esquema de Base de Datos — OncoScan

> Derivado de `supabase/migrations/` (3 migraciones aplicadas manualmente).
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
| `patient_id_dicom`   | `text`       | PatientID del tag DICOM (sin cambios)       |
| `patient_id`         | `uuid`       | FK `public.patients(id)` ON DELETE SET NULL (migración 1) |
| `upload_status`      | `text`       | `uploaded` → `processing` → `analyzed` / `ai_completed` / `ai_failed` / `error` |
| `file_type`          | `text`       | `dicom`, `image`, `png_analysis`            |
| `metadata_json`      | `jsonb`      | filename, content_type, file_ext, case_ref  |
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
| `created_at`         | `timestamptz`| DEFAULT `now()`                             |

> **Nota:** La tabla base de `dicom_uploads` no está versionada en migraciones propias. Si se recrea la BD desde cero, hay que crearla manualmente antes de aplicar las migraciones.

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

---

## Historial de migraciones

| Archivo                                  | Qué hace                                         |
|------------------------------------------|--------------------------------------------------|
| `20260521120000_profiles_patients.sql`   | Crea `profiles`, `patients`, función `is_admin()`, trigger `handle_new_user()`, añade `patient_id` a `dicom_uploads` |
| `20260530100000_predicciones_metadata.sql` | Añade `model_version`, `inference_time_ms`, `predicted_at` a `dicom_uploads` |
| `20260530110000_profiles_consent.sql`    | Añade `consent_version`, `consent_at` a `profiles`; actualiza trigger |

---

_Ver también: [api-reference.md](api-reference.md) para los campos que expone la API._
