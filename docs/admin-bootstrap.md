# OncoScan — Bootstrap de administrador

## Primer admin del sistema

Cuando se habilite el signup público (`/signup`), se debe crear el primer admin **antes** de compartir la URL con usuarios externos. Sin un admin, ningún médico registrado puede ser aprobado.

### Pasos

1. Registrar una cuenta en `/signup` usando el email del administrador del equipo.
   - Completar todos los campos del formulario (cédula, especialidad, institución — pueden ser placeholders para el admin).
   - Al enviar, la cuenta queda en estado `pending`.

2. En el dashboard de Supabase → **SQL Editor**, ejecutar:

```sql
UPDATE public.profiles
   SET role     = 'admin',
       status   = 'approved',
       approved_at = now()
 WHERE id = (
   SELECT id FROM auth.users WHERE email = '<email-del-admin>'
 );
```

3. El admin ya puede entrar a `/login` y ver el panel `/platform/admin/medicos`.

### Crear admins adicionales

Para promover a un médico aprobado a admin:

```sql
UPDATE public.profiles
   SET role = 'admin'
 WHERE id = '<uuid-del-usuario>';
```

> **Nota de seguridad:** El formulario de aprobación de médicos no expone el campo `role`. Cambiar a admin solo puede hacerse mediante SQL manual en el dashboard. Esto es intencional.

### Revocar un admin

```sql
UPDATE public.profiles
   SET role = 'medico'
 WHERE id = '<uuid-del-admin>';
```

## Verificar la migración

Antes de habilitar `/signup`, confirmar en el dashboard de Supabase que:

1. La tabla `profiles` existe con columnas: `id`, `full_name`, `cedula_profesional`, `especialidad`, `institucion`, `role`, `status`, `approved_at`, `approved_by`, `rejection_reason`, `created_at`.
2. La tabla `patients` existe con columnas: `id`, `user_id`, `external_id`, `display_alias`, `notes`, `created_at`.
3. La tabla `dicom_uploads` tiene la columna `patient_id` (uuid, nullable, FK a `patients(id)`).
4. RLS está habilitada en `profiles` y `patients`.
5. Las 5 policies de `profiles` y 4 de `patients` están activas.

Si alguna verificación falla, aplicar la migration en `supabase/migrations/20260521120000_profiles_patients.sql`.
