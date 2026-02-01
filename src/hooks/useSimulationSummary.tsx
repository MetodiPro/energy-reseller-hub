import { useMemo } from 'react';
import { useRevenueSimulation } from './useRevenueSimulation';

export interface SimulationSummary {
  // Fatturato totale (IVA inclusa)
  totalFatturato: number;
  // Margine reseller (CCV + Spread + Altro)
  totalMargine: number;
  // Costi passanti (PUN, trasporto, oneri, accise)
  totalPassanti: number;
  // IVA totale
  totalIva: number;
  // Incassato totale
  totalIncassato: number;
  // Insoluti
  totalInsoluti: number;
  // Crediti pendenti
  totalCrediti: number;
  // Clienti attivi a fine periodo
  clientiAttivi: number;
  // Contratti totali
  contrattiTotali: number;
  // Switch-out totali
  switchOutTotali: number;
  // Margine percentuale
  marginePercent: number;
  // Se i dati sono caricati
  hasData: boolean;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export const useSimulationSummary = (projectId: string | null) => {
  const { data, loading } = useRevenueSimulation(projectId);
  const { startDate, monthlyContracts, params } = data;

  const summary = useMemo((): SimulationSummary => {
    if (!projectId || loading) {
      return {
        totalFatturato: 0,
        totalMargine: 0,
        totalPassanti: 0,
        totalIva: 0,
        totalIncassato: 0,
        totalInsoluti: 0,
        totalCrediti: 0,
        clientiAttivi: 0,
        contrattiTotali: 0,
        switchOutTotali: 0,
        marginePercent: 0,
        hasData: false,
      };
    }

    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    const invoicesToCollect: { month: number; amount: number }[] = [];
    let cumulativeActiveCustomers = 0;
    let cumulativeCollection = 0;
    let cumulativeUncollected = 0;
    
    // Calcola costi mensili per singolo cliente
    const kWh = params.avgMonthlyConsumption;
    
    // Componenti passanti per cliente/mese
    const materiaEnergiaPerCliente = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
    const trasportoPerCliente = 
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh);
    const oneriPerCliente = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
    const accisePerCliente = params.acciseKwh * kWh;
    
    // Componenti margine per cliente/mese
    const ccvPerCliente = params.ccvMonthly;
    const spreadPerCliente = params.spreadPerKwh * kWh;
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;
    
    // Totale imponibile per cliente
    const imponibilePerCliente = materiaEnergiaPerCliente + trasportoPerCliente + 
                                  oneriPerCliente + accisePerCliente + marginePerCliente;
    const ivaPerCliente = imponibilePerCliente * (params.ivaPercent / 100);
    const fatturaPerCliente = imponibilePerCliente + ivaPerCliente;
    
    let totalFatturato = 0;
    let totalMargine = 0;
    let totalPassanti = 0;
    let totalIva = 0;
    let totalChurned = 0;
    let totalContracts = 0;
    
    for (let m = 0; m < 14; m++) {
      // Contratti firmati questo mese
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      totalContracts += newContracts;
      
      // Attivazioni: contratti di 2 mesi fa dopo scrematura SII
      const activatedCustomers = m >= 2
        ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) 
        : 0;
      
      // Calcola churn (switch-out)
      const churnedCustomers = m >= 3 
        ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100))
        : 0;
      totalChurned += churnedCustomers;
      
      // Aggiorna clienti attivi
      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      
      // Clienti da fatturare
      const invoicedCustomers = m >= 3 
        ? Math.max(0, cumulativeActiveCustomers)
        : 0;
      
      // Calcolo componenti fattura
      const materiaEnergia = invoicedCustomers * materiaEnergiaPerCliente;
      const trasporto = invoicedCustomers * trasportoPerCliente;
      const oneriSistema = invoicedCustomers * oneriPerCliente;
      const accise = invoicedCustomers * accisePerCliente;
      
      const margineCCV = invoicedCustomers * ccvPerCliente;
      const margineSpread = invoicedCustomers * spreadPerCliente;
      const margineAltro = invoicedCustomers * altroPerCliente;
      const commercialeReseller = margineCCV + margineSpread + margineAltro;
      
      const imponibileTotale = materiaEnergia + trasporto + oneriSistema + accise + commercialeReseller;
      const iva = imponibileTotale * (params.ivaPercent / 100);
      const fatturaTotale = imponibileTotale + iva;
      
      totalFatturato += fatturaTotale;
      totalMargine += commercialeReseller;
      totalPassanti += materiaEnergia + trasporto + oneriSistema + accise;
      totalIva += iva;
      
      // Calcola incassi
      if (fatturaTotale > 0) {
        invoicesToCollect.push({ month: m, amount: fatturaTotale });
      }
      
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        
        if (monthsAfterInvoice === 0) {
          cumulativeCollection += invoice.amount * (params.collectionMonth0 / 100);
        } else if (monthsAfterInvoice === 1) {
          cumulativeCollection += invoice.amount * (params.collectionMonth1 / 100);
        } else if (monthsAfterInvoice === 2) {
          cumulativeCollection += invoice.amount * (params.collectionMonth2 / 100);
        } else if (monthsAfterInvoice === 3) {
          cumulativeCollection += invoice.amount * (params.collectionMonth3Plus / 100);
        }
        if (monthsAfterInvoice === 4) {
          cumulativeUncollected += invoice.amount * (params.uncollectibleRate / 100);
        }
      });
    }
    
    const totalInvoiced = invoicesToCollect.reduce((sum, inv) => sum + inv.amount, 0);
    const pendingReceivables = Math.max(0, totalInvoiced - cumulativeCollection - cumulativeUncollected);
    
    return {
      totalFatturato,
      totalMargine,
      totalPassanti,
      totalIva,
      totalIncassato: cumulativeCollection,
      totalInsoluti: cumulativeUncollected,
      totalCrediti: pendingReceivables,
      clientiAttivi: cumulativeActiveCustomers,
      contrattiTotali: totalContracts,
      switchOutTotali: totalChurned,
      marginePercent: totalFatturato > 0 ? (totalMargine / totalFatturato) * 100 : 0,
      hasData: totalContracts > 0,
    };
  }, [projectId, loading, startDate, monthlyContracts, params]);

  return {
    summary,
    loading,
  };
};
