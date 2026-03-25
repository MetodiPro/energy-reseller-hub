
CREATE TABLE public.simulation_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Prodotto Base',
  ccv_monthly numeric NOT NULL DEFAULT 8.50,
  spread_per_kwh numeric NOT NULL DEFAULT 0.015,
  other_services_monthly numeric NOT NULL DEFAULT 0,
  avg_monthly_consumption numeric NOT NULL DEFAULT 200,
  client_type text NOT NULL DEFAULT 'domestico',
  iva_percent numeric NOT NULL DEFAULT 10,
  activation_rate numeric NOT NULL DEFAULT 85,
  churn_month1_pct numeric NOT NULL DEFAULT 3.0,
  churn_month2_pct numeric NOT NULL DEFAULT 2.0,
  churn_month3_pct numeric NOT NULL DEFAULT 1.5,
  churn_decay_factor numeric NOT NULL DEFAULT 0.85,
  collection_month_0 numeric NOT NULL DEFAULT 70,
  collection_month_1 numeric NOT NULL DEFAULT 18,
  collection_month_2 numeric NOT NULL DEFAULT 7,
  collection_month_3_plus numeric NOT NULL DEFAULT 3,
  uncollectible_rate numeric NOT NULL DEFAULT 2,
  channel_id uuid REFERENCES public.project_sales_channels(id) ON DELETE SET NULL,
  contract_share numeric NOT NULL DEFAULT 100,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_simulation_products_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

ALTER TABLE public.simulation_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view simulation products"
  ON public.simulation_products FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can insert simulation products"
  ON public.simulation_products FOR INSERT TO authenticated
  WITH CHECK (public.is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

CREATE POLICY "Project members can update simulation products"
  ON public.simulation_products FOR UPDATE TO authenticated
  USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project admins can delete simulation products"
  ON public.simulation_products FOR DELETE TO authenticated
  USING (public.is_project_admin(auth.uid(), project_id));
