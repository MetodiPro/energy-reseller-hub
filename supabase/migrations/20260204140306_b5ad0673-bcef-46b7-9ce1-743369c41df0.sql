-- Create consultant tasks table for tracking activities
CREATE TABLE public.consultant_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Task categorization
  consultant_type TEXT NOT NULL CHECK (consultant_type IN ('commercialista', 'legale', 'entrambi')),
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  
  -- Status tracking
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  
  -- Cost tracking
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  cost_notes TEXT,
  
  -- Deadline tracking
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'monthly', 'quarterly', 'yearly'
  due_date DATE,
  reminder_days INTEGER DEFAULT 7,
  
  -- Priority and phase
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  phase TEXT, -- 'startup', 'operational', 'ongoing'
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultant_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project members can view consultant tasks"
  ON public.consultant_tasks FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create consultant tasks"
  ON public.consultant_tasks FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update consultant tasks"
  ON public.consultant_tasks FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete consultant tasks"
  ON public.consultant_tasks FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- Create trigger for updated_at using existing function
CREATE TRIGGER update_consultant_tasks_updated_at
  BEFORE UPDATE ON public.consultant_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for common queries
CREATE INDEX idx_consultant_tasks_project_id ON public.consultant_tasks(project_id);
CREATE INDEX idx_consultant_tasks_due_date ON public.consultant_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_consultant_tasks_consultant_type ON public.consultant_tasks(consultant_type);

-- Add comment for documentation
COMMENT ON TABLE public.consultant_tasks IS 'Tracks activities and tasks for external consultants (commercialista and legal)';