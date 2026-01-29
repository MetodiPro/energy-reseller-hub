export interface CostTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  cost_type: 'commercial' | 'structural' | 'direct' | 'indirect';
  is_recurring: boolean;
  recurrence_period?: string;
}

export interface RevenueTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  revenue_type: string;
  status: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  costs: CostTemplateItem[];
  revenues: RevenueTemplateItem[];
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'solar',
    name: 'Impianto Fotovoltaico',
    description: 'Template per installazione impianti fotovoltaici residenziali e commerciali',
    icon: 'Sun',
    color: 'hsl(45, 93%, 47%)',
    costs: [
      // Costi Diretti
      { name: 'Pannelli Fotovoltaici', description: 'Moduli solari monocristallini', amount: 250, quantity: 12, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Inverter', description: 'Inverter di stringa', amount: 1200, quantity: 1, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Struttura di Montaggio', description: 'Staffe e supporti per tetto', amount: 800, quantity: 1, unit: 'kit', cost_type: 'direct', is_recurring: false },
      { name: 'Cablaggio e Connettori', description: 'Cavi solari e connettori MC4', amount: 350, quantity: 1, unit: 'kit', cost_type: 'direct', is_recurring: false },
      { name: 'Manodopera Installazione', description: 'Squadra di installatori', amount: 450, quantity: 16, unit: 'ore', cost_type: 'direct', is_recurring: false },
      { name: 'Trasporto Materiali', description: 'Consegna in cantiere', amount: 150, quantity: 1, unit: 'viaggio', cost_type: 'direct', is_recurring: false },
      // Costi Commerciali
      { name: 'Commissione Commerciale', description: 'Provvigione agente vendita', amount: 500, quantity: 1, unit: 'forfait', cost_type: 'commercial', is_recurring: false },
      { name: 'Sopralluogo Tecnico', description: 'Visita preliminare cliente', amount: 80, quantity: 2, unit: 'visite', cost_type: 'commercial', is_recurring: false },
      // Costi Indiretti
      { name: 'Progettazione Tecnica', description: 'Design sistema e pratiche', amount: 400, quantity: 1, unit: 'progetto', cost_type: 'indirect', is_recurring: false },
      { name: 'Pratiche GSE', description: 'Documentazione connessione', amount: 250, quantity: 1, unit: 'pratica', cost_type: 'indirect', is_recurring: false },
      // Costi Strutturali (da allocare)
      { name: 'Quota Assicurazione', description: 'RC professionale allocata', amount: 50, quantity: 1, unit: 'quota', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Vendita Impianto FV', description: 'Impianto fotovoltaico 6kWp chiavi in mano', amount: 12000, quantity: 1, unit: 'impianto', revenue_type: 'milestone', status: 'expected' },
      { name: 'Acconto alla firma', description: '30% alla firma contratto', amount: 3600, quantity: 1, unit: 'acconto', revenue_type: 'milestone', status: 'expected' },
      { name: 'Saldo a fine lavori', description: '70% al collaudo', amount: 8400, quantity: 1, unit: 'saldo', revenue_type: 'milestone', status: 'expected' },
    ],
  },
  {
    id: 'wind',
    name: 'Mini Eolico',
    description: 'Template per installazione impianti mini-eolici',
    icon: 'Wind',
    color: 'hsl(200, 80%, 50%)',
    costs: [
      // Costi Diretti
      { name: 'Turbina Eolica', description: 'Generatore mini-eolico 5kW', amount: 8500, quantity: 1, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Torre/Palo', description: 'Struttura di sostegno 12m', amount: 2500, quantity: 1, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Inverter Eolico', description: 'Inverter dedicato', amount: 1800, quantity: 1, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Sistema di Controllo', description: 'Controller e protezioni', amount: 800, quantity: 1, unit: 'kit', cost_type: 'direct', is_recurring: false },
      { name: 'Fondazioni', description: 'Opere in calcestruzzo', amount: 2000, quantity: 1, unit: 'opera', cost_type: 'direct', is_recurring: false },
      { name: 'Manodopera Installazione', description: 'Squadra specializzata', amount: 500, quantity: 24, unit: 'ore', cost_type: 'direct', is_recurring: false },
      { name: 'Noleggio Gru', description: 'Gru per sollevamento torre', amount: 1200, quantity: 1, unit: 'giorno', cost_type: 'direct', is_recurring: false },
      // Costi Commerciali
      { name: 'Commissione Commerciale', description: 'Provvigione vendita', amount: 800, quantity: 1, unit: 'forfait', cost_type: 'commercial', is_recurring: false },
      { name: 'Studio di Fattibilità', description: 'Analisi vento e sito', amount: 600, quantity: 1, unit: 'studio', cost_type: 'commercial', is_recurring: false },
      // Costi Indiretti
      { name: 'Progettazione', description: 'Progetto tecnico esecutivo', amount: 1500, quantity: 1, unit: 'progetto', cost_type: 'indirect', is_recurring: false },
      { name: 'Autorizzazioni', description: 'Pratiche comunali e paesaggistiche', amount: 800, quantity: 1, unit: 'pratica', cost_type: 'indirect', is_recurring: false },
      { name: 'Connessione Rete', description: 'Pratica TERNA/distributore', amount: 500, quantity: 1, unit: 'pratica', cost_type: 'indirect', is_recurring: false },
      // Costi Strutturali
      { name: 'Quota Assicurazione', description: 'RC e All Risk allocata', amount: 150, quantity: 1, unit: 'quota', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Vendita Impianto Eolico', description: 'Impianto mini-eolico 5kW completo', amount: 28000, quantity: 1, unit: 'impianto', revenue_type: 'milestone', status: 'expected' },
      { name: 'Acconto alla firma', description: '40% alla firma contratto', amount: 11200, quantity: 1, unit: 'acconto', revenue_type: 'milestone', status: 'expected' },
      { name: 'SAL Fondazioni', description: '30% a fondazioni completate', amount: 8400, quantity: 1, unit: 'SAL', revenue_type: 'milestone', status: 'expected' },
      { name: 'Saldo Finale', description: '30% al collaudo', amount: 8400, quantity: 1, unit: 'saldo', revenue_type: 'milestone', status: 'expected' },
    ],
  },
  {
    id: 'efficiency',
    name: 'Efficienza Energetica',
    description: 'Template per interventi di riqualificazione energetica edifici',
    icon: 'Leaf',
    color: 'hsl(142, 71%, 45%)',
    costs: [
      // Costi Diretti
      { name: 'Cappotto Termico', description: 'Isolamento pareti esterne EPS 12cm', amount: 85, quantity: 150, unit: 'm²', cost_type: 'direct', is_recurring: false },
      { name: 'Infissi', description: 'Serramenti in PVC triplo vetro', amount: 450, quantity: 8, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Pompa di Calore', description: 'PDC aria-acqua 12kW', amount: 6500, quantity: 1, unit: 'pz', cost_type: 'direct', is_recurring: false },
      { name: 'Impianto Radiante', description: 'Pavimento radiante', amount: 55, quantity: 100, unit: 'm²', cost_type: 'direct', is_recurring: false },
      { name: 'Sistema VMC', description: 'Ventilazione meccanica controllata', amount: 3500, quantity: 1, unit: 'sistema', cost_type: 'direct', is_recurring: false },
      { name: 'Manodopera Edile', description: 'Squadra muratori', amount: 35, quantity: 200, unit: 'ore', cost_type: 'direct', is_recurring: false },
      { name: 'Manodopera Impiantistica', description: 'Idraulici e elettricisti', amount: 45, quantity: 120, unit: 'ore', cost_type: 'direct', is_recurring: false },
      { name: 'Ponteggi', description: 'Noleggio ponteggiatura', amount: 2500, quantity: 1, unit: 'mese', cost_type: 'direct', is_recurring: false },
      // Costi Commerciali
      { name: 'Commissione Commerciale', description: 'Provvigione acquisizione', amount: 1500, quantity: 1, unit: 'forfait', cost_type: 'commercial', is_recurring: false },
      { name: 'Diagnosi Energetica', description: 'APE ante e post operam', amount: 800, quantity: 1, unit: 'diagnosi', cost_type: 'commercial', is_recurring: false },
      // Costi Indiretti
      { name: 'Progettazione Integrata', description: 'Progetto architettonico e impiantistico', amount: 3500, quantity: 1, unit: 'progetto', cost_type: 'indirect', is_recurring: false },
      { name: 'Direzione Lavori', description: 'DL e coordinamento', amount: 2000, quantity: 1, unit: 'incarico', cost_type: 'indirect', is_recurring: false },
      { name: 'Pratiche Bonus', description: 'Gestione detrazioni fiscali', amount: 1200, quantity: 1, unit: 'pratica', cost_type: 'indirect', is_recurring: false },
      { name: 'Asseverazioni', description: 'Asseverazioni tecniche', amount: 800, quantity: 1, unit: 'asseverazione', cost_type: 'indirect', is_recurring: false },
      // Costi Strutturali
      { name: 'Quota Assicurazione', description: 'Polizze obbligatorie allocate', amount: 300, quantity: 1, unit: 'quota', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Contratto Riqualificazione', description: 'Intervento efficientamento completo', amount: 65000, quantity: 1, unit: 'contratto', revenue_type: 'milestone', status: 'expected' },
      { name: 'Acconto alla firma', description: '20% alla firma', amount: 13000, quantity: 1, unit: 'acconto', revenue_type: 'milestone', status: 'expected' },
      { name: 'SAL 1 - Cappotto', description: '25% a cappotto completato', amount: 16250, quantity: 1, unit: 'SAL', revenue_type: 'milestone', status: 'expected' },
      { name: 'SAL 2 - Impianti', description: '25% a impianti completati', amount: 16250, quantity: 1, unit: 'SAL', revenue_type: 'milestone', status: 'expected' },
      { name: 'Saldo Finale', description: '30% a collaudo finale', amount: 19500, quantity: 1, unit: 'saldo', revenue_type: 'milestone', status: 'expected' },
    ],
  },
];
