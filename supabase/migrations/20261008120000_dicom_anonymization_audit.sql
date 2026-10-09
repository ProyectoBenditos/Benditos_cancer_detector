-- ============================================================
-- Auditoría de Desidentificación Clínica y Cadena de Custodia DICOM
-- Cumplimiento: Ley 1581 de 2012, DICOM PS 3.15 Anexo E, Res. 1995/1999
-- Aplicar manualmente en el dashboard Supabase > SQL Editor
-- ROLLBACK: DROP TABLE IF EXISTS public.dicom_anonymization_audit;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dicom_anonymization_audit (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id                 uuid        NOT NULL UNIQUE REFERENCES public.dicom_uploads(id) ON DELETE CASCADE,
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonymized_patient_id  text        NOT NULL,
  source_sha256             text        NOT NULL,
  sanitized_sha256          text        NOT NULL,
  tags_cleared_count        int         NOT NULL DEFAULT 0,
  normative_compliance      text[]      NOT NULL DEFAULT ARRAY[
                                          'Ley 1581 de 2012 (Habeas Data Clínico)',
                                          'Decreto 1377 de 2013',
                                          'DICOM PS 3.15 Annex E Basic Profile',
                                          'Resolución 1995 de 1999 MinSalud',
                                          'Ley 2015 de 2020 Interoperabilidad'
                                        ],
  zero_retention_verified   boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dicom_anonymization_audit_user_idx
  ON public.dicom_anonymization_audit (user_id, created_at DESC);

-- --------------------------------------------------------
-- RLS: Cada médico solo puede auditar los estudios que le pertenecen.
-- Inserción permitida al dueño del estudio o rol de servicio.
-- Tabla inmutable: No se permiten UPDATE ni DELETE por usuarios.
-- --------------------------------------------------------
ALTER TABLE public.dicom_anonymization_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dicom_anonymization_audit_select_own ON public.dicom_anonymization_audit;
CREATE POLICY dicom_anonymization_audit_select_own ON public.dicom_anonymization_audit
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS dicom_anonymization_audit_insert_own ON public.dicom_anonymization_audit;
CREATE POLICY dicom_anonymization_audit_insert_own ON public.dicom_anonymization_audit
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dicom_uploads
      WHERE id = upload_id AND user_id = auth.uid()
    )
  );

