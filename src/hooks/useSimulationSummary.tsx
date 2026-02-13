import { useMemo } from 'react';
import { useRevenueSimulation, RevenueSimulationData } from './useRevenueSimulation';

export interface MonthlyDepositData {
  month: number;
  monthLabel: string;
  clientiAttivi: number;
  fatturatoMensileStimato: number;
  depositoRichiesto: number;
  deltaDeposito: number;
}

export interface MonthlyCostBreakdown {
  month: number;
  monthLabel: string;
  clientiAttivi: number;
  costoEnergia: number;
  costoPod: number;
  dispacciamento: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
}

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
  // Costi grossista
  costoGestionePodTotale: number;
  costoEnergiaTotale: number;
  // Deposito cauzionale
  depositoIniziale: number;
  depositoFinale: number;
  depositoMassimo: number;
  // Serie mensile depositi per grafico
  depositiMensili: MonthlyDepositData[];
  // Serie mensile costi per dettaglio progressivo
  costiMensili: MonthlyCostBreakdown[];
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export const useSimulationSummary = (projectId: string | null, simulationData?: { data: RevenueSimulationData; loading: boolean }) => {
  // If no external data provided, create own hook instance (backward compat)
  const ownHook = useRevenueSimulation(simulationData ? null : projectId);
  const data = simulationData?.data ?? ownHook.data;
  const loading = simulationData?.loading ?? ownHook.loading;
  const startDate = data.startDate;
  const monthlyContracts = data.monthlyContracts;
  const params = data.params;

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
        costoGestionePodTotale: 0,
        costoEnergiaTotale: 0,
        depositoIniziale: 0,
        depositoFinale: 0,
        depositoMassimo: 0,
        depositiMensili: [],
        costiMensili: [],
      };
    }

    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    // Get deposit config from simulation params
    const depositoMesi = params.depositoMesi ?? 3;
    const gestionePodPerPod = params.gestionePodPerPod ?? 2.5;
    
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
    let costoGestionePodTotale = 0;
    let costoEnergiaTotale = 0;
    
    // Deposito cauzionale tracking
    const depositiMensili: MonthlyDepositData[] = [];
    const costiMensili: MonthlyCostBreakdown[] = [];
    let depositoIniziale = 0;
    let depositoFinale = 0;
    let depositoMassimo = 0;
    let previousDeposito = 0;
    
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
      
      // Costi grossista - il reseller paga PUN + spread grossista (NON lo spread reseller!)
      let costoEnergiaMese = 0;
      let gestionePodMese = 0;
      if (m >= 2) {
        // Gestione POD: pagato per ogni cliente attivo
        gestionePodMese = cumulativeActiveCustomers * gestionePodPerPod;
        costoGestionePodTotale += gestionePodMese;
        
        // Costo energia: PUN + spread GROSSISTA (non spread reseller)
        const spreadGrossista = (data as any).params?.spreadGrossistaPerKwh ?? 0.008;
        costoEnergiaMese = cumulativeActiveCustomers * kWh * (params.punPerKwh + spreadGrossista);
        costoEnergiaTotale += costoEnergiaMese;
      }
      
      // Calcolo deposito cauzionale mensile
      // Il deposito è calcolato sul fatturato stimato dei clienti attivi × % attivazione
      const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
      const fatturatoMensileStimato = cumulativeActiveCustomers * fatturaPerCliente;
      const depositoRichiesto = fatturatoMensileStimato * depositoMesi * depositoPercentuale;
      const deltaDeposito = depositoRichiesto - previousDeposito;
      
      // Calcola etichetta mese
      const monthIndex = (startMonth + m) % 12;
      const yearOffset = Math.floor((startMonth + m) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`;
      
      depositiMensili.push({
        month: m,
        monthLabel,
        clientiAttivi: cumulativeActiveCustomers,
        fatturatoMensileStimato,
        depositoRichiesto,
        deltaDeposito,
      });
      
      const dispacciamentoMese = invoicedCustomers * (params.punPerKwh > 0 ? params.dispacciamentoPerKwh * kWh : 0);
      const trasportoMese = invoicedCustomers * trasportoPerCliente;
      const oneriSistemaMese = invoicedCustomers * oneriPerCliente;
      const acciseMese = invoicedCustomers * accisePerCliente;

      costiMensili.push({
        month: m,
        monthLabel,
        clientiAttivi: cumulativeActiveCustomers,
        costoEnergia: costoEnergiaMese,
        costoPod: gestionePodMese,
        dispacciamento: dispacciamentoMese,
        trasporto: trasportoMese,
        oneriSistema: oneriSistemaMese,
        accise: acciseMese,
      });
      if (m === 2) {
        depositoIniziale = depositoRichiesto;
      }
      if (depositoRichiesto > depositoMassimo) {
        depositoMassimo = depositoRichiesto;
      }
      previousDeposito = depositoRichiesto;
      
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
    
    depositoFinale = depositiMensili.length > 0 
      ? depositiMensili[depositiMensili.length - 1].depositoRichiesto 
      : 0;
    
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
      costoGestionePodTotale,
      costoEnergiaTotale,
      depositoIniziale,
      depositoFinale,
      depositoMassimo,
      depositiMensili,
      costiMensili,
    };
  }, [projectId, loading, startDate, monthlyContracts, params, data]);

  return {
    summary,
    loading,
  };
};
