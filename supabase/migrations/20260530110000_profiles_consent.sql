-- T-07: Consentimiento informado versionado en profiles
-- Aplicar en SQL Editor de Supabase. Idempotente gracias a IF NOT EXISTS.
-- ROLLBACK: ALTER TABLE profiles DROP COLUMN IF EXISTS consent_version, DROP COLUMN IF EXISTS consent_at;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS consent_version text,
    ADD COLUMN IF NOT EXISTS consent_at      timestamptz;

-- Actualizar el trigger para persistir consent_version y consent_at desde metadata.
-- Los registros pre-existentes quedan con NULL en ambas columnas (nullable).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    cedula_profesional,
    especialidad,
    institucion,
    role,
    status,
    consent_version,
    consent_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'cedula_profesional', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'especialidad', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'institucion', 'N/A'),
    'medico',
    'pending',
    NEW.raw_user_meta_data->>'consent_version',
    CASE
      WHEN NEW.raw_user_meta_data->>'consent_at' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'consent_at')::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
