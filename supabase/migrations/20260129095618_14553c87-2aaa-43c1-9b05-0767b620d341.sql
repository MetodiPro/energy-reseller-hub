-- Create audit log table for cost and revenue changes
CREATE TABLE public.financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('cost', 'revenue')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Project members can view audit logs"
  ON public.financial_audit_log FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert audit logs"
  ON public.financial_audit_log FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_financial_audit_log_project_id ON public.financial_audit_log(project_id);
CREATE INDEX idx_financial_audit_log_created_at ON public.financial_audit_log(created_at DESC);

-- Create trigger function to log cost changes
CREATE OR REPLACE FUNCTION public.log_cost_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, new_values, user_id)
    VALUES (NEW.project_id, 'cost', NEW.id, 'create', to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect changed fields
    changed_cols := ARRAY[]::TEXT[];
    IF OLD.name IS DISTINCT FROM NEW.name THEN changed_cols := array_append(changed_cols, 'name'); END IF;
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN changed_cols := array_append(changed_cols, 'amount'); END IF;
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN changed_cols := array_append(changed_cols, 'quantity'); END IF;
    IF OLD.cost_type IS DISTINCT FROM NEW.cost_type THEN changed_cols := array_append(changed_cols, 'cost_type'); END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN changed_cols := array_append(changed_cols, 'description'); END IF;
    
    IF array_length(changed_cols, 1) > 0 THEN
      INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, old_values, new_values, changed_fields, user_id)
      VALUES (NEW.project_id, 'cost', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), changed_cols, NEW.created_by);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, old_values, user_id)
    VALUES (OLD.project_id, 'cost', OLD.id, 'delete', to_jsonb(OLD), OLD.created_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger function to log revenue changes
CREATE OR REPLACE FUNCTION public.log_revenue_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, new_values, user_id)
    VALUES (NEW.project_id, 'revenue', NEW.id, 'create', to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect changed fields
    changed_cols := ARRAY[]::TEXT[];
    IF OLD.name IS DISTINCT FROM NEW.name THEN changed_cols := array_append(changed_cols, 'name'); END IF;
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN changed_cols := array_append(changed_cols, 'amount'); END IF;
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN changed_cols := array_append(changed_cols, 'quantity'); END IF;
    IF OLD.revenue_type IS DISTINCT FROM NEW.revenue_type THEN changed_cols := array_append(changed_cols, 'revenue_type'); END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN changed_cols := array_append(changed_cols, 'description'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN changed_cols := array_append(changed_cols, 'status'); END IF;
    
    IF array_length(changed_cols, 1) > 0 THEN
      INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, old_values, new_values, changed_fields, user_id)
      VALUES (NEW.project_id, 'revenue', NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), changed_cols, NEW.created_by);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_log (project_id, entity_type, entity_id, action, old_values, user_id)
    VALUES (OLD.project_id, 'revenue', OLD.id, 'delete', to_jsonb(OLD), OLD.created_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_log_cost_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.project_costs
  FOR EACH ROW EXECUTE FUNCTION public.log_cost_changes();

CREATE TRIGGER trigger_log_revenue_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.project_revenues
  FOR EACH ROW EXECUTE FUNCTION public.log_revenue_changes();