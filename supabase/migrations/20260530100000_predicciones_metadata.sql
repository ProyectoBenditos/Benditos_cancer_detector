-- T-05: Metadata de inferencia en cada prediccion
-- Aplicar en SQL Editor de Supabase. Idempotente gracias a IF NOT EXISTS.
-- ROLLBACK: ALTER TABLE dicom_uploads DROP COLUMN IF EXISTS model_version, DROP COLUMN IF EXISTS inference_time_ms, DROP COLUMN IF EXISTS predicted_at;

ALTER TABLE public.dicom_uploads
    ADD COLUMN IF NOT EXISTS model_version     text,
    ADD COLUMN IF NOT EXISTS inference_time_ms int,
    ADD COLUMN IF NOT EXISTS predicted_at      timestamptz;
