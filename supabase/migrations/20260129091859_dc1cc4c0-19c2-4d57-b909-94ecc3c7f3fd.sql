-- Enum per tipo di costo
CREATE TYPE public.cost_type AS ENUM ('commercial', 'structural', 'direct', 'indirect');

-- Categorie costi predefinite
CREATE TABLE public.cost_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type cost_type NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;

-- Tutti possono vedere le categorie
CREATE POLICY "Anyone can view cost categories"
  ON public.cost_categories FOR SELECT
  USING (true);

-- Solo autenticati possono creare categorie
CREATE POLICY "Authenticated users can create cost categories"
  ON public.cost_categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Voci di costo per progetto
CREATE TABLE public.project_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.cost_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unità',
  cost_type cost_type NOT NULL DEFAULT 'direct',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period TEXT, -- 'monthly', 'yearly', etc.
  date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;

-- Policy: membri progetto possono vedere costi
CREATE POLICY "Project members can view costs"
  ON public.project_costs FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

-- Policy: membri progetto possono inserire costi
CREATE POLICY "Project members can insert costs"
  ON public.project_costs FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

-- Policy: membri progetto possono aggiornare costi
CREATE POLICY "Project members can update costs"
  ON public.project_costs FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

-- Policy: admin possono eliminare costi
CREATE POLICY "Project admins can delete costs"
  ON public.project_costs FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- Voci di ricavo per progetto
CREATE TABLE public.project_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unità',
  revenue_type TEXT DEFAULT 'one_time', -- 'one_time', 'recurring', 'milestone'
  recurrence_period TEXT,
  date DATE,
  status TEXT DEFAULT 'expected', -- 'expected', 'invoiced', 'received'
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_revenues ENABLE ROW LEVEL SECURITY;

-- Policy: membri progetto possono vedere ricavi
CREATE POLICY "Project members can view revenues"
  ON public.project_revenues FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

-- Policy: membri progetto possono inserire ricavi
CREATE POLICY "Project members can insert revenues"
  ON public.project_revenues FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id) AND created_by = auth.uid());

-- Policy: membri progetto possono aggiornare ricavi
CREATE POLICY "Project members can update revenues"
  ON public.project_revenues FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

-- Policy: admin possono eliminare ricavi
CREATE POLICY "Project admins can delete revenues"
  ON public.project_revenues FOR DELETE
  USING (is_project_admin(auth.uid(), project_id));

-- Trigger per updated_at
CREATE TRIGGER update_project_costs_updated_at
  BEFORE UPDATE ON public.project_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_project_revenues_updated_at
  BEFORE UPDATE ON public.project_revenues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Inserisci categorie costi predefinite
INSERT INTO public.cost_categories (name, type, description, icon, color, is_default) VALUES
  -- Costi Commerciali
  ('Marketing', 'commercial', 'Campagne pubblicitarie, materiale promozionale', 'Megaphone', 'blue', true),
  ('Acquisizione Clienti', 'commercial', 'Lead generation, fiere, eventi', 'Users', 'cyan', true),
  ('Commissioni Vendita', 'commercial', 'Provvigioni agenti e venditori', 'Percent', 'indigo', true),
  ('Viaggi Commerciali', 'commercial', 'Trasferte, alloggi, rappresentanza', 'Plane', 'violet', true),
  
  -- Costi Strutturali
  ('Personale', 'structural', 'Stipendi, contributi, benefit', 'Users', 'green', true),
  ('Affitto Ufficio', 'structural', 'Locazione, utenze, manutenzione', 'Building', 'emerald', true),
  ('Software e Licenze', 'structural', 'Abbonamenti, tool, piattaforme', 'Monitor', 'teal', true),
  ('Consulenze', 'structural', 'Legali, fiscali, tecniche', 'Briefcase', 'lime', true),
  ('Assicurazioni', 'structural', 'Polizze aziendali e professionali', 'Shield', 'yellow', true),
  
  -- Costi Diretti
  ('Materiali', 'direct', 'Pannelli, inverter, componenti', 'Package', 'orange', true),
  ('Manodopera Installazione', 'direct', 'Tecnici, montatori, elettricisti', 'Hammer', 'amber', true),
  ('Trasporto', 'direct', 'Logistica, spedizioni, mezzi', 'Truck', 'red', true),
  ('Pratiche e Permessi', 'direct', 'Autorizzazioni, certificazioni', 'FileText', 'rose', true),
  
  -- Costi Indiretti
  ('Ammortamenti', 'indirect', 'Ammortamento attrezzature e mezzi', 'TrendingDown', 'gray', true),
  ('Spese Generali', 'indirect', 'Cancelleria, pulizie, varie', 'MoreHorizontal', 'slate', true);