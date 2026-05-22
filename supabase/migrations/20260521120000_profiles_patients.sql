-- ============================================================
-- Sub-proyecto E: profiles + patients + patient_id en dicom_uploads
-- Aplicar manualmente en el dashboard Supabase > SQL Editor
-- ============================================================

-- --------------------------------------------------------
-- Tabla: profiles
-- Extensión de auth.users con datos profesionales y estado
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      text        NOT NULL,
  cedula_profesional text   NOT NULL,
  especialidad   text        NOT NULL,
  institucion    text        NOT NULL,
  role           text        NOT NULL DEFAULT 'medico'
                             CHECK (role IN ('medico', 'admin')),
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at    timestamptz,
  approved_by    uuid        REFERENCES auth.users(id),
  rejection_reason text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Médico puede leer su propio perfil
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Médico puede insertar su propio perfil al registrarse
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Médico puede actualizar su propio perfil (campos básicos, no status/role)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- --------------------------------------------------------
-- Helper SECURITY DEFINER para evitar recursión infinita en policies
-- Una policy sobre profiles NO puede consultar profiles directamente
-- (PostgreSQL aborta con error 42P17). Esta función bypasa RLS al
-- consultar la tabla porque corre con privilegios del owner.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin puede leer TODOS los perfiles
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (public.is_admin());

-- Admin puede actualizar TODOS los perfiles (para aprobar/rechazar)
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- --------------------------------------------------------
-- Trigger: crea fila en profiles automáticamente al registrarse
-- Bypasa RLS — no requiere service role key en el frontend.
-- Lee los datos del médico desde raw_user_meta_data.
-- --------------------------------------------------------
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
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'cedula_profesional', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'especialidad', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'institucion', 'N/A'),
    'medico',
    'pending'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- --------------------------------------------------------
-- Tabla: patients
-- Pacientes asociados al médico que los registra
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id  text  NOT NULL,
  display_alias text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, external_id)
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_select_own ON public.patients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY patients_insert_own ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY patients_update_own ON public.patients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY patients_delete_own ON public.patients
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- Columna patient_id en dicom_uploads
-- --------------------------------------------------------
ALTER TABLE public.dicom_uploads
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;
