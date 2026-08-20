-- Migración: Mejoras en Batch Processing v2
-- Fecha: 2026-08-20
-- Descripción: Agrega soporte para modo paciente (single/multi), vínculo con patients y secuencia de lotes por usuario.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'batch_jobs'
          AND column_name = 'patient_mode'
    ) THEN
        ALTER TABLE public.batch_jobs
            ADD COLUMN patient_mode TEXT DEFAULT 'single' CHECK (patient_mode IN ('single', 'multi')),
            ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
            ADD COLUMN batch_sequence INTEGER;
    END IF;
END $$;
