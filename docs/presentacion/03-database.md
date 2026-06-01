# Rol: Base de Datos

> **Leer primero:** [00-comun.md](00-comun.md)

---

## Misión en la defensa

Explicar **la estructura de la BD**, cómo se protegen los datos con RLS, cómo se automatiza la creación de perfiles con triggers, y la estrategia de migraciones. Eres el que responde "¿dónde vive cada dato y quién puede verlo?".

---

## Archivos / rutas clave

| Archivo | Descripción |
|---------|-------------|
| [supabase/migrations/20260521120000_profiles_patients.sql](../../supabase/migrations/20260521120000_profiles_patients.sql) | Crea `profiles`, `patients`, trigger `handle_new_user()`, función `is_admin()` |
| [supabase/migrations/20260530100000_predicciones_metadata.sql](../../supabase/migrations/20260530100000_predicciones_metadata.sql) | Añade columnas de metadata de predicción a `dicom_uploads` |
| [supabase/migrations/20260530110000_profiles_consent.sql](../../supabase/migrations/20260530110000_profiles_consent.sql) | Añade consentimiento informado a `profiles`; actualiza trigger |
| [docs/presentacion/esquema-bd.md](esquema-bd.md) | Esquema consolidado completo (tablas, columnas, RLS, triggers) |
| [apps/api/app/db/supabase_client.py](../../apps/api/app/db/supabase_client.py) | Cliente Python de Supabase en el backend |
| [apps/web/src/utils/supabase/](../../apps/web/src/utils/supabase/) | Clientes Supabase SSR y browser del frontend |

---

## Las 3 tablas principales

### `profiles`

Extensión de `auth.users` creada automáticamente cuando un médico se registra.

Campos clave: `full_name`, `cedula_profesional`, `especialidad`, `institucion`, `role` (`medico`/`admin`), `status` (`pending`/`approved`/`rejected`), `consent_version`, `consent_at`.

> El admin aprueba/rechaza médicos actualizando `status`.

### `patients`

Pacientes registrados por un médico. Solo el médico que los creó los puede ver.

Campos clave: `user_id` (FK al médico), `external_id` (ID opaco), `display_alias` (alias opcional), `notes`.

### `dicom_uploads`

Registro de cada estudio subido y su resultado de IA.

Campos clave: `user_id`, `storage_path` (ruta en Storage), `upload_status`, `ai_score`, `ai_risk_level`, `ai_recommendation`, `clinical_features` (jsonb), `patient_id` (FK a patients, opcional).

> Ver esquema completo con todos los campos: [esquema-bd.md](esquema-bd.md)

---

## Row Level Security (RLS)

RLS garantiza que **cada médico solo puede acceder a sus propios datos** sin importar qué cliente haga la petición.

### Patrón base

```sql
-- Médico ve sus propios registros
CREATE POLICY ejemplo_select_own ON public.tabla
  FOR SELECT USING (auth.uid() = user_id);
```

### El problema de recursión RLS

Una policy sobre `profiles` **no puede consultar `profiles`** directamente para verificar si el usuario es admin — PostgreSQL lanza error de recursión infinita (código 42P17).

**Solución:** función `is_admin()` con `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER          -- corre como el owner, bypasa RLS
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

Las policies de admin llaman `public.is_admin()` en lugar de consultar `profiles` directamente.

---

## Trigger `handle_new_user()`

Cuando un médico se registra en Supabase Auth, este trigger crea automáticamente su fila en `profiles`:

```sql
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

La función lee `raw_user_meta_data` del registro de auth (donde el frontend envía `full_name`, `cedula_profesional`, etc. al registrarse) y los inserta en `profiles` con `status = 'pending'`.

Esto permite que el frontend use la clave pública (anon) de Supabase en el registro — no necesita service_role key.

---

## Migraciones

Las migraciones se aplican **manualmente** en Supabase Dashboard → SQL Editor (no hay herramienta de migración automatizada).

| Migración | Qué hace |
|-----------|----------|
| `20260521120000_profiles_patients.sql` | Crea `profiles` + `patients` + `is_admin()` + trigger + añade `patient_id` a `dicom_uploads` |
| `20260530100000_predicciones_metadata.sql` | Añade `model_version`, `inference_time_ms`, `predicted_at` a `dicom_uploads` |
| `20260530110000_profiles_consent.sql` | Añade `consent_version`, `consent_at` a `profiles`; actualiza trigger |

> **Hueco conocido:** la tabla base `dicom_uploads` no está en las migraciones. Se asume que existe previamente en el proyecto Supabase.

---

## Preguntas probables + respuesta

**¿Qué es RLS y por qué lo usan?**
> Row Level Security es un mecanismo de PostgreSQL que filtra filas a nivel de BD según el usuario autenticado. En OncoScan garantiza que aunque dos médicos usen la misma tabla, cada uno solo ve sus propios estudios y pacientes. Es la segunda capa de seguridad (la primera es el JWT del backend).

**¿Por qué tienen `is_admin()` en vez de la policy directa?**
> Para evitar recursión. Una policy de SELECT sobre `profiles` que consulta `profiles` para ver si es admin entra en un loop infinito. `is_admin()` con `SECURITY DEFINER` corre como el owner de la tabla y evita el problema.

**¿Cómo se aprueban los médicos?**
> El admin entra a `/platform/admin/medicos`, ve la lista de médicos pendientes y aprueba/rechaza actualizando `profiles.status`. Las policies de RLS de admin usan `public.is_admin()` para darle acceso a todos los perfiles.

**¿Por qué las migraciones son manuales?**
> Es un proyecto académico y Supabase no tiene integración nativa con migraciones automáticas en todos los contextos. Se documenta el proceso para asegurar reproducibilidad.

---

## Comandos que debes saber demostrar

```sql
-- Ver estructura de profiles en SQL Editor de Supabase
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver políticas RLS activas
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Ver médicos pendientes
SELECT id, full_name, cedula_profesional, status
FROM public.profiles
WHERE status = 'pending';
```
