-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Create document categories table
CREATE TABLE public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document versions table for tracking history
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document shares table for team sharing
CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, shared_with)
);

-- Enable RLS on all tables
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_categories (public read)
CREATE POLICY "Anyone can view categories"
ON public.document_categories FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create categories"
ON public.document_categories FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their projects"
ON public.documents FOR SELECT
USING (
  public.is_project_member(auth.uid(), project_id) OR
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.document_shares
    WHERE document_id = documents.id AND shared_with = auth.uid()
  )
);

CREATE POLICY "Project members can upload documents"
ON public.documents FOR INSERT
WITH CHECK (
  public.is_project_member(auth.uid(), project_id) AND
  uploaded_by = auth.uid()
);

CREATE POLICY "Document owners can update their documents"
ON public.documents FOR UPDATE
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.document_shares
    WHERE document_id = documents.id 
    AND shared_with = auth.uid() 
    AND permission = 'edit'
  )
);

CREATE POLICY "Document owners and admins can delete documents"
ON public.documents FOR DELETE
USING (
  uploaded_by = auth.uid() OR
  public.is_project_admin(auth.uid(), project_id)
);

-- RLS Policies for document_versions
CREATE POLICY "Users can view versions of accessible documents"
ON public.document_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_versions.document_id
    AND (
      public.is_project_member(auth.uid(), project_id) OR
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_shares
        WHERE document_id = documents.id AND shared_with = auth.uid()
      )
    )
  )
);

CREATE POLICY "System can create version records"
ON public.document_versions FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

-- RLS Policies for document_shares
CREATE POLICY "Users can view shares for their documents or documents shared with them"
ON public.document_shares FOR SELECT
USING (
  shared_with = auth.uid() OR
  shared_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_shares.document_id AND uploaded_by = auth.uid()
  )
);

CREATE POLICY "Document owners can create shares"
ON public.document_shares FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_shares.document_id 
    AND (uploaded_by = auth.uid() OR public.is_project_admin(auth.uid(), project_id))
  )
);

CREATE POLICY "Share creators and document owners can delete shares"
ON public.document_shares FOR DELETE
USING (
  shared_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = document_shares.document_id AND uploaded_by = auth.uid()
  )
);

-- Storage policies for documents bucket
CREATE POLICY "Users can view documents in their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = storage.objects.name
    AND (
      public.is_project_member(auth.uid(), d.project_id) OR
      d.uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.document_shares
        WHERE document_id = d.id AND shared_with = auth.uid()
      )
    )
  )
);

CREATE POLICY "Project members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Document owners can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE file_path = storage.objects.name AND uploaded_by = auth.uid()
  )
);

CREATE POLICY "Document owners can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE file_path = storage.objects.name AND uploaded_by = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default categories
INSERT INTO public.document_categories (name, color, icon) VALUES
  ('Contratti', '#3b82f6', 'FileText'),
  ('Fatture', '#10b981', 'Receipt'),
  ('Documenti Legali', '#ef4444', 'Scale'),
  ('Presentazioni', '#f59e0b', 'Presentation'),
  ('Report', '#8b5cf6', 'BarChart'),
  ('Altro', '#6b7280', 'Folder');