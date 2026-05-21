-- ============================================================
-- Sub-proyecto E: profiles + patients + patient_id en dicom_uploads
-- Aplicar manualmente en el dashboard Supabase
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

-- Admin puede leer TODOS los perfiles
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admin puede actualizar TODOS los perfiles (para aprobar/rechazar)
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

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
