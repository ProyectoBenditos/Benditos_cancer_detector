-- Migración: Soporte para subida de lotes (batch upload)
-- Fecha: 2026-08-20
-- Descripción: Crea tabla batch_jobs y vincula dicom_uploads con batch_id

-- ── Tabla de lotes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    total_items INTEGER NOT NULL CHECK (total_items > 0 AND total_items <= 20),
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT batch_items_sum_check
        CHECK (completed_items + failed_items <= total_items)
);

-- ── Columna de vínculo en dicom_uploads ─────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dicom_uploads'
          AND column_name = 'batch_id'
    ) THEN
        ALTER TABLE public.dicom_uploads
            ADD COLUMN batch_id UUID REFERENCES public.batch_jobs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS batch_jobs_user_created_idx
    ON public.batch_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dicom_uploads_batch_idx
    ON public.dicom_uploads(batch_id)
    WHERE batch_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- Política: cada usuario solo ve sus propios lotes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'batch_jobs' AND policyname = 'batch_jobs_user_isolation'
    ) THEN
        CREATE POLICY batch_jobs_user_isolation ON public.batch_jobs
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
