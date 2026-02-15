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
    const smc = params.avgMonthlyConsumptionGas;
    const commodityType = params.simulationCommodityType ?? 'luce';
    const includeLuce = commodityType === 'luce' || commodityType === 'dual';
    const includeGas = commodityType === 'gas' || commodityType === 'dual';
    
    // Componenti passanti LUCE per cliente/mese
    const materiaEnergiaPerCliente = includeLuce ? (params.punPerKwh + params.dispacciamentoPerKwh) * kWh : 0;
    const trasportoPerCliente = includeLuce ? (
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh)
    ) : 0;
    const oneriPerCliente = includeLuce ? (params.oneriAsosKwh + params.oneriArimKwh) * kWh : 0;
    const accisePerCliente = includeLuce ? params.acciseKwh * kWh : 0;
    
    // Componenti passanti GAS per cliente/mese
    const materiaGasPerCliente = includeGas ? params.psvPerSmc * smc : 0;
    const trasportoGasPerCliente = includeGas ? (
      (params.trasportoGasQuotaFissaAnno / 12) +
      (params.trasportoGasQuotaEnergiaSmc * smc)
    ) : 0;
    const oneriGasPerCliente = includeGas ? (params.oneriGasReSmc + params.oneriGasUgSmc) * smc : 0;
    const acciseGasPerCliente = includeGas ? (params.acciseGasSmc + params.addizionaleRegionaleGasSmc) * smc : 0;
    
    // Componenti margine per cliente/mese
    const ccvPerCliente = (includeLuce ? params.ccvMonthly : 0) + (includeGas ? params.ccvGasMonthly : 0);
    const spreadPerCliente = (includeLuce ? params.spreadPerKwh * kWh : 0) + (includeGas ? params.spreadGasPerSmc * smc : 0);
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;
    
    // Totale imponibile per cliente (luce + gas)
    const passantiLucePerCliente = materiaEnergiaPerCliente + trasportoPerCliente + oneriPerCliente + accisePerCliente;
    const passantiGasPerCliente = materiaGasPerCliente + trasportoGasPerCliente + oneriGasPerCliente + acciseGasPerCliente;
    const imponibilePerCliente = passantiLucePerCliente + passantiGasPerCliente + marginePerCliente;
    
    // IVA media ponderata (semplificazione: usa IVA luce per luce, IVA gas per gas)
    const ivaLucePerCliente = includeLuce ? (passantiLucePerCliente + (includeLuce ? (params.ccvMonthly + params.spreadPerKwh * kWh) : 0)) * (params.ivaPercent / 100) : 0;
    const ivaGasPerCliente = includeGas ? (passantiGasPerCliente + (includeGas ? (params.ccvGasMonthly + params.spreadGasPerSmc * smc) : 0)) * (params.ivaPercentGas / 100) : 0;
    const ivaAltroPerCliente = altroPerCliente * (params.ivaPercent / 100);
    const ivaPerCliente = ivaLucePerCliente + ivaGasPerCliente + ivaAltroPerCliente;
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
    // Deposits are required only for NEW activations;
    // payments for actual consumption reduce the outstanding deposit
    const depositiMensili: MonthlyDepositData[] = [];
    const costiMensili: MonthlyCostBreakdown[] = [];
    let depositoIniziale = 0;
    let depositoFinale = 0;
    let depositoMassimo = 0;
    let previousDeposito = 0;
    let totalDepositoLordo = 0;
    let totalPagamentiConsumi = 0;
    
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
      
      // Calcolo componenti fattura (luce + gas combinati)
      const materiaEnergia = invoicedCustomers * materiaEnergiaPerCliente;
      const trasporto = invoicedCustomers * trasportoPerCliente;
      const oneriSistema = invoicedCustomers * oneriPerCliente;
      const accise = invoicedCustomers * accisePerCliente;
      const materiaGas = invoicedCustomers * materiaGasPerCliente;
      const trasportoGas = invoicedCustomers * trasportoGasPerCliente;
      const oneriGas = invoicedCustomers * oneriGasPerCliente;
      const acciseGas = invoicedCustomers * acciseGasPerCliente;
      
      const passantiLuce = materiaEnergia + trasporto + oneriSistema + accise;
      const passantiGas = materiaGas + trasportoGas + oneriGas + acciseGas;
      
      const margineCCV = invoicedCustomers * ccvPerCliente;
      const margineSpread = invoicedCustomers * spreadPerCliente;
      const margineAltro = invoicedCustomers * altroPerCliente;
      const commercialeReseller = margineCCV + margineSpread + margineAltro;
      
      const imponibileTotale = passantiLuce + passantiGas + commercialeReseller;
      const iva = invoicedCustomers * ivaPerCliente;
      const fatturaTotale = imponibileTotale + iva;
      
      totalFatturato += fatturaTotale;
      totalMargine += commercialeReseller;
      totalPassanti += passantiLuce + passantiGas;
      totalIva += iva;
      
      // Costi grossista
      let costoEnergiaMese = 0;
      let gestionePodMese = 0;
      if (m >= 2) {
        // Gestione POD/PDR: pagato per ogni cliente attivo
        const gestionePerCliente = (includeLuce ? gestionePodPerPod : 0) + (includeGas ? (params.gestionePdrPerPdr ?? 2.5) : 0);
        gestionePodMese = cumulativeActiveCustomers * gestionePerCliente;
        costoGestionePodTotale += gestionePodMese;
        
        // Costo energia: PUN + spread GROSSISTA (luce) + PSV + spread grossista gas
        const costoLuce = includeLuce ? cumulativeActiveCustomers * kWh * (params.punPerKwh + params.spreadGrossistaPerKwh) : 0;
        const costoGas = includeGas ? cumulativeActiveCustomers * smc * (params.psvPerSmc + params.spreadGrossistaGasPerSmc) : 0;
        costoEnergiaMese = costoLuce + costoGas;
        costoEnergiaTotale += costoEnergiaMese;
      }
      
      // Calcolo deposito cauzionale mensile
      // Il deposito è richiesto solo sui NUOVI clienti attivati
      // I clienti churned rilasciano il deposito, i pagamenti consumi riducono la garanzia
      const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
      const nuovoDepositoAttivazioni = activatedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      const depositoRilasciatoChurn = churnedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      totalDepositoLordo += nuovoDepositoAttivazioni;
      totalPagamentiConsumi += depositoRilasciatoChurn; // churn releases count as "payments" reducing deposit
      
      // Costi passanti pagati al grossista questo mese riducono il deposito
      const passantiPerCliente = passantiLucePerCliente + passantiGasPerCliente;
      const costiPassantiMese = m >= 2 
        ? cumulativeActiveCustomers * passantiPerCliente
        : 0;
      totalPagamentiConsumi += costiPassantiMese;
      
      const fatturatoMensileStimato = cumulativeActiveCustomers * fatturaPerCliente;
      const depositoRichiesto = Math.max(0, totalDepositoLordo - totalPagamentiConsumi);
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
      
      const dispacciamentoMese = includeLuce ? invoicedCustomers * params.dispacciamentoPerKwh * kWh : 0;
      const trasportoMese = invoicedCustomers * (trasportoPerCliente + trasportoGasPerCliente);
      const oneriSistemaMese = invoicedCustomers * (oneriPerCliente + oneriGasPerCliente);
      const acciseMese = invoicedCustomers * (accisePerCliente + acciseGasPerCliente);

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
