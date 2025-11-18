-- Add project_type field to marketing_plans table
ALTER TABLE marketing_plans
ADD COLUMN project_type TEXT DEFAULT 'generale' CHECK (project_type IN ('solare', 'eolico', 'efficienza_energetica', 'generale'));