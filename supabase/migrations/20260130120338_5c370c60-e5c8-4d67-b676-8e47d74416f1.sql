-- Add extended project fields
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'setup', 'active', 'paused', 'closed')),
ADD COLUMN IF NOT EXISTS market_type TEXT CHECK (market_type IN ('residential', 'business', 'mixed')),
ADD COLUMN IF NOT EXISTS expected_volumes INTEGER,
ADD COLUMN IF NOT EXISTS regions TEXT[],
ADD COLUMN IF NOT EXISTS wholesaler_name TEXT,
ADD COLUMN IF NOT EXISTS wholesaler_contact TEXT,
ADD COLUMN IF NOT EXISTS eve_license_date DATE,
ADD COLUMN IF NOT EXISTS evg_license_date DATE,
ADD COLUMN IF NOT EXISTS arera_code TEXT,
ADD COLUMN IF NOT EXISTS go_live_date DATE;

-- Create regulatory deadlines table
CREATE TABLE public.regulatory_deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deadline_type TEXT NOT NULL, -- 'eve_renewal', 'evg_renewal', 'arera_data', 'csea_payment', 'adm_excise', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  reminder_days INTEGER DEFAULT 30,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'yearly', 'quarterly', 'monthly'
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create step_documents linking table
CREATE TABLE public.step_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, step_id, document_id)
);

-- Enable RLS
ALTER TABLE public.regulatory_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory_deadlines
CREATE POLICY "Project members can view deadlines"
ON public.regulatory_deadlines
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create deadlines"
ON public.regulatory_deadlines
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can update deadlines"
ON public.regulatory_deadlines
FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete deadlines"
ON public.regulatory_deadlines
FOR DELETE
USING (is_project_admin(auth.uid(), project_id));

-- RLS policies for step_documents
CREATE POLICY "Project members can view step documents"
ON public.step_documents
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can link documents to steps"
ON public.step_documents
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can unlink step documents"
ON public.step_documents
FOR DELETE
USING (is_project_admin(auth.uid(), project_id));

-- Trigger for updated_at on regulatory_deadlines
CREATE TRIGGER update_regulatory_deadlines_updated_at
BEFORE UPDATE ON public.regulatory_deadlines
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();