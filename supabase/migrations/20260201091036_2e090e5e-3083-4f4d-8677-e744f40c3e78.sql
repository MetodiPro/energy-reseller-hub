-- Drop the existing foreign key constraint and recreate with ON DELETE CASCADE
-- This ensures that when a project is deleted, all related records are also deleted

-- financial_audit_log
ALTER TABLE public.financial_audit_log 
DROP CONSTRAINT IF EXISTS financial_audit_log_project_id_fkey;

ALTER TABLE public.financial_audit_log 
ADD CONSTRAINT financial_audit_log_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_costs
ALTER TABLE public.project_costs 
DROP CONSTRAINT IF EXISTS project_costs_project_id_fkey;

ALTER TABLE public.project_costs 
ADD CONSTRAINT project_costs_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_revenues  
ALTER TABLE public.project_revenues 
DROP CONSTRAINT IF EXISTS project_revenues_project_id_fkey;

ALTER TABLE public.project_revenues 
ADD CONSTRAINT project_revenues_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_taxes
ALTER TABLE public.project_taxes 
DROP CONSTRAINT IF EXISTS project_taxes_project_id_fkey;

ALTER TABLE public.project_taxes 
ADD CONSTRAINT project_taxes_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_members
ALTER TABLE public.project_members 
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;

ALTER TABLE public.project_members 
ADD CONSTRAINT project_members_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- project_invites
ALTER TABLE public.project_invites 
DROP CONSTRAINT IF EXISTS project_invites_project_id_fkey;

ALTER TABLE public.project_invites 
ADD CONSTRAINT project_invites_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- documents
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- step_documents
ALTER TABLE public.step_documents 
DROP CONSTRAINT IF EXISTS step_documents_project_id_fkey;

ALTER TABLE public.step_documents 
ADD CONSTRAINT step_documents_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- step_progress
ALTER TABLE public.step_progress 
DROP CONSTRAINT IF EXISTS step_progress_project_id_fkey;

ALTER TABLE public.step_progress 
ADD CONSTRAINT step_progress_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- step_comments
ALTER TABLE public.step_comments 
DROP CONSTRAINT IF EXISTS step_comments_project_id_fkey;

ALTER TABLE public.step_comments 
ADD CONSTRAINT step_comments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- step_assignments
ALTER TABLE public.step_assignments 
DROP CONSTRAINT IF EXISTS step_assignments_project_id_fkey;

ALTER TABLE public.step_assignments 
ADD CONSTRAINT step_assignments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- regulatory_deadlines
ALTER TABLE public.regulatory_deadlines 
DROP CONSTRAINT IF EXISTS regulatory_deadlines_project_id_fkey;

ALTER TABLE public.regulatory_deadlines 
ADD CONSTRAINT regulatory_deadlines_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- business_plans
ALTER TABLE public.business_plans 
DROP CONSTRAINT IF EXISTS business_plans_project_id_fkey;

ALTER TABLE public.business_plans 
ADD CONSTRAINT business_plans_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- marketing_plans
ALTER TABLE public.marketing_plans 
DROP CONSTRAINT IF EXISTS marketing_plans_project_id_fkey;

ALTER TABLE public.marketing_plans 
ADD CONSTRAINT marketing_plans_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;