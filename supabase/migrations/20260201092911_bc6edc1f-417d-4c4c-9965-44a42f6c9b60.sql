-- Add commodity_type column to projects table to track luce/gas/dual-fuel selection
ALTER TABLE public.projects 
ADD COLUMN commodity_type text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.commodity_type IS 'Type of commodity: solo-luce, solo-gas, or dual-fuel';