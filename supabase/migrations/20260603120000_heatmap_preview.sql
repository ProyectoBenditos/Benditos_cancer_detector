-- Heatmap Grad-CAM (base64) + preview PNG para originales DICOM
-- Aplicar en SQL Editor de Supabase. Idempotente gracias a IF NOT EXISTS.
-- ROLLBACK: ALTER TABLE dicom_uploads DROP COLUMN IF EXISTS ai_heatmap_base64, DROP COLUMN IF EXISTS preview_storage_path;

ALTER TABLE public.dicom_uploads
    ADD COLUMN IF NOT EXISTS ai_heatmap_base64    text,
    ADD COLUMN IF NOT EXISTS preview_storage_path text;
