-- Add logo_url to projects for branding
ALTER TABLE public.projects ADD COLUMN logo_url text;

-- Create a public bucket for project logos
INSERT INTO storage.buckets (id, name, public) VALUES ('project-logos', 'project-logos', true);

-- Allow project members to upload logos
CREATE POLICY "Project members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users can manage logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated');