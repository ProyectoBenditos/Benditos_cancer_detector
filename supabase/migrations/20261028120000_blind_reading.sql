-- ============================================================
-- Lectura ciega: impresión inicial del especialista antes de ver la IA
-- Aplicar manualmente en el dashboard Supabase > SQL Editor
-- ROLLBACK: DROP TABLE IF EXISTS public.upload_initial_impressions; ALTER TABLE public.profiles DROP COLUMN IF EXISTS blind_reading;
-- ============================================================
-- Con `profiles.blind_reading` activo, la IA de un estudio queda oculta hasta
-- que el médico registra su impresión inicial (Lung-RADS + conducta).
-- `notes` y `markers_snapshot` son PHI: hacen parte del registro clínico.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blind_reading boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.upload_initial_impressions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id         uuid        NOT NULL UNIQUE REFERENCES public.dicom_uploads(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lung_rads         text        NOT NULL CHECK (lung_rads IN ('0', '1', '2', '3', '4A', '4B', '4X')),
  conducta          text        NOT NULL CHECK (conducta IN (
                                  'sin_seguimiento', 'tac_3m', 'tac_6m', 'tac_12m',
                                  'pet_tc', 'biopsia', 'junta', 'otra'
                                )),
  notes             text        CHECK (char_length(notes) <= 4000),
  markers_snapshot  jsonb       NOT NULL DEFAULT '[]',
  revealed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upload_initial_impressions_user_idx
  ON public.upload_initial_impressions (user_id, revealed_at DESC);

-- --------------------------------------------------------
-- RLS: cada médico solo ve sus impresiones y solo puede registrarlas sobre
-- estudios que él mismo subió. La subconsulta es sobre dicom_uploads (otra
-- tabla), así que no hay recursión.
-- Sin políticas UPDATE ni DELETE: inmutable: es la lectura antes de la IA.
-- --------------------------------------------------------
ALTER TABLE public.upload_initial_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY upload_initial_impressions_select_own ON public.upload_initial_impressions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY upload_initial_impressions_insert_own ON public.upload_initial_impressions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dicom_uploads d
      WHERE d.id = upload_id AND d.user_id = auth.uid()
    )
  );
