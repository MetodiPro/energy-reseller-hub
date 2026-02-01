-- Fix project deletion failing due to audit log FK during cascading deletes
-- The audit log should remain even if the project is deleted, so we remove the FK constraint.

ALTER TABLE public.financial_audit_log
DROP CONSTRAINT IF EXISTS financial_audit_log_project_id_fkey;

-- Keep fast filtering by project_id
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_project_id
ON public.financial_audit_log (project_id);