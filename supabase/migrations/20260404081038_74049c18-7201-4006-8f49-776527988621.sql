-- Crea il bucket 'config' se non esiste già
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'config',
  'config',
  false,
  5242880,
  ARRAY['application/json', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880;

-- Rimuovi eventuali policy preesistenti sullo stesso bucket per evitare conflitti
DROP POLICY IF EXISTS "service_role full access config" ON storage.objects;
DROP POLICY IF EXISTS "service_role read config" ON storage.objects;
DROP POLICY IF EXISTS "service_role write config" ON storage.objects;

-- Policy unica: service_role ha accesso completo al bucket config
CREATE POLICY "service_role full access config"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'config')
WITH CHECK (bucket_id = 'config');