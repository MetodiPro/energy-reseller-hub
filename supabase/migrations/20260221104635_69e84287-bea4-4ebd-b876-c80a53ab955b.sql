
ALTER TABLE public.projects
  ADD COLUMN company_address text NULL,
  ADD COLUMN company_phone text NULL,
  ADD COLUMN company_email text NULL,
  ADD COLUMN company_pec text NULL,
  ADD COLUMN company_website text NULL,
  ADD COLUMN company_cf text NULL,
  ADD COLUMN company_piva text NULL;
