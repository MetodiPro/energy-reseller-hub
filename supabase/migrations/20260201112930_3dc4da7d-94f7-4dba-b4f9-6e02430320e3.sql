-- Add planned dates to step_progress for Gantt timeline
ALTER TABLE public.step_progress 
ADD COLUMN IF NOT EXISTS planned_start_date date,
ADD COLUMN IF NOT EXISTS planned_end_date date;

-- Add project start date to projects for timeline baseline
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS planned_start_date date;