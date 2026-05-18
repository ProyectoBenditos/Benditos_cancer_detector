-- Migracion para habilitar el flujo de analisis IA (OncaScan AI / HF Space).
-- Ejecutar en el SQL editor de Supabase contra la base de produccion/staging.
-- Idempotente: usa IF NOT EXISTS, se puede correr varias veces sin efecto adverso.

ALTER TABLE public.dicom_uploads
    ADD COLUMN IF NOT EXISTS file_type        text                  NOT NULL DEFAULT 'dicom',
    ADD COLUMN IF NOT EXISTS clinical_features jsonb,
    ADD COLUMN IF NOT EXISTS ai_score          double precision,
    ADD COLUMN IF NOT EXISTS ai_risk_level     text,
    ADD COLUMN IF NOT EXISTS ai_recommendation text,
    ADD COLUMN IF NOT EXISTS ai_model_version  text,
    ADD COLUMN IF NOT EXISTS ai_processed_at   timestamptz,
    ADD COLUMN IF NOT EXISTS ai_error          text;

-- Indice opcional para listados filtrados por tipo y por usuario.
CREATE INDEX IF NOT EXISTS dicom_uploads_user_file_type_idx
    ON public.dicom_uploads (user_id, file_type, created_at DESC);

-- Notas:
-- * Los registros DICOM existentes quedan con file_type='dicom' por el DEFAULT.
-- * Las nuevas filas de analisis IA usaran file_type='png_analysis'.
-- * upload_status pasa por: 'processing' -> 'ai_completed' | 'ai_failed'.
-- * Las RLS policies actuales (SELECT por user_id) siguen aplicando.
