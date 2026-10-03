-- ============================================================
-- Valoración del especialista sobre un estudio analizado por IA
-- Aplicar manualmente en el dashboard Supabase > SQL Editor
-- ROLLBACK: DROP TABLE IF EXISTS public.upload_reviews; DROP FUNCTION IF EXISTS public.set_updated_at();
-- ============================================================
-- Una fila por estudio. El médico registra si concuerda con la IA, la
-- categoría Lung-RADS que asigna, el tamaño del nódulo, la conducta de
-- seguimiento (GPC No. 36 MinSalud, Rec. 2.1) y notas libres.
-- `notes` es PHI: hace parte del registro clínico (Res. 1995 de 1999).

CREATE TABLE IF NOT EXISTS public.upload_reviews (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id       uuid        NOT NULL UNIQUE REFERENCES public.dicom_uploads(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concordancia    text        CHECK (concordancia IN ('concuerda', 'discrepa', 'indeterminado')),
  lung_rads       text        CHECK (lung_rads IN ('0', '1', '2', '3', '4A', '4B', '4X')),
  nodule_size_mm  numeric(5,1) CHECK (nodule_size_mm > 0 AND nodule_size_mm <= 300),
  conducta        text        CHECK (conducta IN (
                                'sin_seguimiento', 'tac_3m', 'tac_6m', 'tac_12m',
                                'pet_tc', 'biopsia', 'junta', 'otra'
                              )),
  notes           text        CHECK (char_length(notes) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upload_reviews_user_idx
  ON public.upload_reviews (user_id, updated_at DESC);

-- --------------------------------------------------------
-- updated_at automático
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS upload_reviews_set_updated_at ON public.upload_reviews;
CREATE TRIGGER upload_reviews_set_updated_at
  BEFORE UPDATE ON public.upload_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- --------------------------------------------------------
-- RLS: cada médico solo ve y edita sus valoraciones, y solo puede
-- valorar estudios que él mismo subió. La subconsulta es sobre
-- dicom_uploads (otra tabla), así que no hay recursión.
-- --------------------------------------------------------
ALTER TABLE public.upload_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY upload_reviews_select_own ON public.upload_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY upload_reviews_insert_own ON public.upload_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dicom_uploads d
      WHERE d.id = upload_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY upload_reviews_update_own ON public.upload_reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY upload_reviews_delete_own ON public.upload_reviews
  FOR DELETE USING (auth.uid() = user_id);
