// Configurazione del timing predefinito per i costi di investimento
// Ogni step/item ha un mese di sostenimento specifico in base alla tipologia

export interface CostTimingConfig {
  stepId: string;
  month: number; // 0-13, dove 0 = primo mese
  description: string;
}

// Mapping step -> mese di sostenimento
// Basato sul flusso logico del processo di startup
export const stepTimingConfig: Record<string, number> = {
  // FASE 1: Costituzione (Mese 0)
  'step-1-1': 0, // Costituzione società
  
  // FASE 2: Registrazioni (Mese 0-1)
  'step-2-1': 0, // Registro Imprese
  'step-2-2': 0, // PEC e firma digitale
  
  // FASE 3: Autorizzazioni (Mese 1-2)
  'step-3-1': 1, // EVE
  'step-3-1b': 1, // EVG
  'step-3-1c': 2, // Formazione normativa
  'step-3-2': 1, // ARERA
  'step-3-3': 2, // Obblighi informativi ARERA
  'step-3-4': 2, // Portale offerte
  'step-3-5': 2, // Codice condotta
  'step-3-6': 2, // CSEA
  
  // FASE 4: Accordo grossista (Mese 2-3)
  'step-4-1': 2, // Selezione grossista
  'step-4-2': 3, // Garanzie grossista
  'step-4-3': 3, // ADM/Accise
  'step-4-3b': 3, // Formazione portale
  
  // FASE 5: Setup operativo (Mese 3-4)
  'step-5-1': 3, // CRM/Billing
  'step-5-2': 4, // Struttura commerciale
  
  // FASE 6: Compliance (Mese 4)
  'step-6-1': 4, // Assicurazioni
  'step-6-2': 4, // GDPR
  
  // FASE 7: Pre-lancio (Mese 5)
  'step-7-1': 5, // Test e go-live
};

// Descrizione delle fasi temporali
export const phaseDescriptions: Record<number, string> = {
  0: 'Costituzione e registrazioni',
  1: 'Autorizzazioni EVE/EVG/ARERA',
  2: 'Compliance ARERA e codice condotta',
  3: 'Accordo grossista e setup billing',
  4: 'Struttura commerciale e assicurazioni',
  5: 'Test pre-lancio e go-live',
};

// Funzione per ottenere il mese di un costo
export const getCostMonth = (stepId: string): number => {
  return stepTimingConfig[stepId] ?? 0;
};

// Funzione per raggruppare i costi per mese
export const groupCostsByMonth = (
  costs: Array<{ stepId: string; amount: number; name: string }>
): Record<number, Array<{ stepId: string; amount: number; name: string }>> => {
  const grouped: Record<number, Array<{ stepId: string; amount: number; name: string }>> = {};
  
  costs.forEach(cost => {
    const month = getCostMonth(cost.stepId);
    if (!grouped[month]) {
      grouped[month] = [];
    }
    grouped[month].push(cost);
  });
  
  return grouped;
};

// Funzione per calcolare i costi per ogni mese (0-13)
export const calculateMonthlyCostDistribution = (
  stepCosts: Record<string, number> // stepId -> totale costi step
): number[] => {
  const monthlyTotals = new Array(14).fill(0);
  
  Object.entries(stepCosts).forEach(([stepId, amount]) => {
    const month = getCostMonth(stepId);
    if (month >= 0 && month < 14) {
      monthlyTotals[month] += amount;
    }
  });
  
  return monthlyTotals;
};
