-- ============================================================
-- Marcadores del visor sobre un estudio analizado (Fase C)
-- Aplicar manualmente en el dashboard Supabase > SQL Editor
-- Requiere: 20261002120000_upload_reviews.sql (función public.set_updated_at)
-- ROLLBACK: DROP TABLE IF EXISTS public.upload_annotations;
-- ============================================================
-- Una fila por marcador. Las coordenadas van normalizadas (0 a 1) sobre la
-- imagen, no en píxeles de pantalla. `upload_reviews` sigue siendo el
-- veredicto del caso; esta tabla es el detalle por lesión.
-- `note` es PHI: hace parte del registro clínico (Res. 1995 de 1999).

CREATE TABLE IF NOT EXISTS public.upload_annotations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id     uuid        NOT NULL REFERENCES public.dicom_uploads(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seq           smallint    NOT NULL CHECK (seq > 0),
  kind          text        NOT NULL DEFAULT 'point' CHECK (kind IN ('point', 'measure')),
  x             real        NOT NULL CHECK (x BETWEEN 0 AND 1),
  y             real        NOT NULL CHECK (y BETWEEN 0 AND 1),
  -- Segundo punto de la herramienta Medir (fase posterior).
  x2            real        CHECK (x2 BETWEEN 0 AND 1),
  y2            real        CHECK (y2 BETWEEN 0 AND 1),
  finding_type  text        CHECK (finding_type IN (
                              'solido', 'subsolido', 'vidrio_esmerilado',
                              'calcificado', 'artefacto', 'otro'
                            )),
  ai_agreement  text        CHECK (ai_agreement IN ('ia_marco', 'ia_no_marco', 'ia_falso_positivo')),
  size_mm       numeric(5,1) CHECK (size_mm > 0 AND size_mm <= 300),
  note          text        NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- El número visible es único por estudio; el guardado hace upsert por esta clave.
  CONSTRAINT upload_annotations_upload_seq_key UNIQUE (upload_id, seq)
);

-- --------------------------------------------------------
-- updated_at automático (reutiliza la función de upload_reviews)
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS upload_annotations_set_updated_at ON public.upload_annotations;
CREATE TRIGGER upload_annotations_set_updated_at
  BEFORE UPDATE ON public.upload_annotations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- --------------------------------------------------------
-- RLS: cada médico solo ve y edita sus marcadores, y solo puede
-- crearlos sobre estudios que él mismo subió. La subconsulta es sobre
-- dicom_uploads (otra tabla), así que no hay recursión.
-- --------------------------------------------------------
ALTER TABLE public.upload_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY upload_annotations_select_own ON public.upload_annotations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY upload_annotations_insert_own ON public.upload_annotations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dicom_uploads d
      WHERE d.id = upload_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY upload_annotations_update_own ON public.upload_annotations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.dicom_uploads d
      WHERE d.id = upload_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY upload_annotations_delete_own ON public.upload_annotations
  FOR DELETE USING (auth.uid() = user_id);
