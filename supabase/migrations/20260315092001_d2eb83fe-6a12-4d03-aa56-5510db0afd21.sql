-- Create config bucket for storing ARERA tariffs JSON
INSERT INTO storage.buckets (id, name, public)
VALUES ('config', 'config', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service_role full access (default behavior for private buckets)
-- Allow authenticated users to read config files
CREATE POLICY "Authenticated users can read config files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'config');

CREATE POLICY "Service role can manage config files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'config')
WITH CHECK (bucket_id = 'config');