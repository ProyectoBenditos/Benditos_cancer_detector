-- Policy SELECT en storage.objects: el dueño puede leer sus archivos del bucket
-- privado 'dicom-files'. Necesaria para que el signed URL del "antes" se genere
-- con la sesión del usuario en el Server Component de /platform/uploads/[id].
--
-- Los objetos se suben desde el backend con service role, por lo que la columna
-- storage.objects.owner NO queda como el auth.uid() del usuario. El control de
-- dueño se hace por el prefijo de la ruta: ambos flujos guardan en
-- "{user_id}/..." y el preview DICOM es "{storage_path}.preview.png" (conserva el
-- prefijo). storage.foldername(name)[1] es el primer segmento = user_id.
--
-- Aplicar en SQL Editor de Supabase. Idempotente vía DROP POLICY IF EXISTS.
-- ROLLBACK: DROP POLICY IF EXISTS dicom_files_select_own ON storage.objects;

DROP POLICY IF EXISTS dicom_files_select_own ON storage.objects;

CREATE POLICY dicom_files_select_own ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'dicom-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
