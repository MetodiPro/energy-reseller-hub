import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Parametri componenti commerciali reseller
export interface ResellerParams {
  ccvMonthly: number;              // CCV - Commercializzazione e Vendita €/mese
  spreadPerKwh: number;            // Spread applicato dal reseller al cliente €/kWh (RICAVO)
  spreadGrossistaPerKwh: number;   // Spread applicato dal grossista al reseller €/kWh (COSTO)
  otherServicesMonthly: number;    // Altri servizi €/mese
}

// Parametri componenti fattura (passanti)
export interface InvoiceComponentParams {
  punPerKwh: number;                    // PUN - Prezzo Unico Nazionale €/kWh
  dispacciamentoPerKwh: number;         // Dispacciamento €/kWh
  trasportoQuotaFissaAnno: number;      // Trasporto quota fissa €/anno
  trasportoQuotaPotenzaKwAnno: number;  // Trasporto quota potenza €/kW/anno
  trasportoQuotaEnergiaKwh: number;     // Trasporto quota energia €/kWh
  potenzaImpegnataKw: number;           // Potenza impegnata media kW
  oneriAsosKwh: number;                 // ASOS (rinnovabili) €/kWh
  oneriArimKwh: number;                 // ARIM (rimanenti) €/kWh
  acciseKwh: number;                    // Accise €/kWh
  ivaPercent: number;                   // IVA %
  clientType: 'domestico' | 'business' | 'pmi';
  perditeRetePct: number;              // Perdite di rete % (tipicamente 10.2% BT)
}

// Parametri clienti e incasso
export interface ClientParams {
  avgMonthlyConsumption: number;  // Consumo medio kWh/mese
  activationRate: number;         // Tasso attivazione %
  monthlyChurnRate: number;       // Tasso switch-out mensile % (legacy/fallback)
  churnMonth0Pct: number;         // Churn mese 0 (switch-out immediato all'attivazione) %
  churnMonth1Pct: number;         // Churn 1° mese dopo attivazione %
  churnMonth2Pct: number;         // Churn 2° mese %
  churnMonth3Pct: number;         // Churn 3° mese %
  churnDecayFactor: number;       // Fattore decadimento esponenziale (0-1)
  collectionMonth0: number;       // Incasso alla scadenza %
  collectionMonth1: number;       // Incasso entro 30gg %
  collectionMonth2: number;       // Incasso entro 60gg %
  collectionMonth3Plus: number;   // Incasso oltre 60gg %
  uncollectibleRate: number;      // Insoluti definitivi %
}

// Parametri costi grossista
export interface WholesalerParams {
  gestionePodPerPod: number;      // Fee gestione POD €/POD/mese
  depositoMesi: number;           // Mesi di fatturato stimato per deposito cauzionale
  depositoPercentualeAttivazione: number; // % fatturato stimato applicata al deposito iniziale
  depositoSvincoloPagamentiPerc?: number; // % pagamenti consumi accumulati svincolati dalla garanzia (0-100, default 50)
}

// Parametri fiscali
export interface TaxRegimeParams {
  ivaPaymentRegime: 'monthly' | 'quarterly';
}

export interface RevenueSimulationParams extends ResellerParams, InvoiceComponentParams, ClientParams, WholesalerParams, TaxRegimeParams {}

export type MonthlyContractsTarget = [number, number, number, number, number, number, number, number, number, number, number, number];

export interface RevenueSimulationData {
  id?: string;
  startDate: Date;
  monthlyContracts: MonthlyContractsTarget;
  params: RevenueSimulationParams;
}

const DEFAULT_PARAMS: RevenueSimulationParams = {
  // Componenti commerciali reseller
  ccvMonthly: 8.50,
  spreadPerKwh: 0.015,
  spreadGrossistaPerKwh: 0.008,
  otherServicesMonthly: 0,
  
  // Componenti fattura (passanti)
  punPerKwh: 0.12,
  dispacciamentoPerKwh: 0.01,
  trasportoQuotaFissaAnno: 23.00,
  trasportoQuotaPotenzaKwAnno: 22.00,
  trasportoQuotaEnergiaKwh: 0.008,
  potenzaImpegnataKw: 3.0,
  oneriAsosKwh: 0.025,
  oneriArimKwh: 0.007,
  acciseKwh: 0.0227,
  ivaPercent: 10,
  clientType: 'domestico',
  perditeRetePct: 10.2,
  
  // Clienti e incasso
  avgMonthlyConsumption: 200,
  activationRate: 85,
  monthlyChurnRate: 1.5,
  churnMonth0Pct: 0,
  churnMonth1Pct: 3.0,
  churnMonth2Pct: 2.0,
  churnMonth3Pct: 1.5,
  churnDecayFactor: 0.85,
  collectionMonth0: 70,
  collectionMonth1: 18,
  collectionMonth2: 7,
  collectionMonth3Plus: 3,
  uncollectibleRate: 2,
  
  // Costi grossista
  gestionePodPerPod: 2.50,
  depositoMesi: 3,
  depositoPercentualeAttivazione: 85,
  depositoSvincoloPagamentiPerc: 50,
  
  // Regime fiscale
  ivaPaymentRegime: 'monthly',
};

const DEFAULT_MONTHLY_CONTRACTS: MonthlyContractsTarget = [30, 40, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100];

const parseStoredDate = (value: string | null | undefined) => {
  if (!value) return new Date(2026, 0, 1);

  const [year, month, day] = value.split('-').map(Number);
  if ([year, month, day].every((part) => Number.isFinite(part))) {
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(2026, 0, 1) : parsed;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const useRevenueSimulation = (projectId: string | null) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<RevenueSimulationData>({
    startDate: new Date(2026, 0, 1),
    monthlyContracts: DEFAULT_MONTHLY_CONTRACTS,
    params: DEFAULT_PARAMS,
  });

  // Keep a ref to always have the latest data for debounced saves
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load simulation from database
  const loadSimulation = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: simulation, error } = await supabase
        .from('project_revenue_simulations')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (simulation) {
        const monthlyContracts = (simulation.monthly_contracts as number[]) || DEFAULT_MONTHLY_CONTRACTS;
        
        setData({
          id: simulation.id,
          startDate: new Date(simulation.start_date),
          monthlyContracts: monthlyContracts.length === 12 
            ? monthlyContracts as MonthlyContractsTarget 
            : DEFAULT_MONTHLY_CONTRACTS,
          params: {
            // Componenti commerciali
            ccvMonthly: Number(simulation.ccv_monthly),
            spreadPerKwh: Number(simulation.spread_per_kwh),
            spreadGrossistaPerKwh: Number(simulation.spread_grossista_per_kwh ?? DEFAULT_PARAMS.spreadGrossistaPerKwh),
            otherServicesMonthly: Number(simulation.other_services_monthly),
            
            // Componenti fattura
            punPerKwh: Number(simulation.pun_per_kwh ?? DEFAULT_PARAMS.punPerKwh),
            dispacciamentoPerKwh: Number(simulation.dispacciamento_per_kwh ?? DEFAULT_PARAMS.dispacciamentoPerKwh),
            trasportoQuotaFissaAnno: Number(simulation.trasporto_quota_fissa_anno ?? DEFAULT_PARAMS.trasportoQuotaFissaAnno),
            trasportoQuotaPotenzaKwAnno: Number(simulation.trasporto_quota_potenza_kw_anno ?? DEFAULT_PARAMS.trasportoQuotaPotenzaKwAnno),
            trasportoQuotaEnergiaKwh: Number(simulation.trasporto_quota_energia_kwh ?? DEFAULT_PARAMS.trasportoQuotaEnergiaKwh),
            potenzaImpegnataKw: Number(simulation.potenza_impegnata_kw ?? DEFAULT_PARAMS.potenzaImpegnataKw),
            oneriAsosKwh: Number(simulation.oneri_asos_kwh ?? DEFAULT_PARAMS.oneriAsosKwh),
            oneriArimKwh: Number(simulation.oneri_arim_kwh ?? DEFAULT_PARAMS.oneriArimKwh),
            acciseKwh: Number(simulation.accise_kwh ?? DEFAULT_PARAMS.acciseKwh),
            ivaPercent: Number(simulation.iva_percent ?? DEFAULT_PARAMS.ivaPercent),
            clientType: (simulation.client_type as 'domestico' | 'business' | 'pmi') ?? DEFAULT_PARAMS.clientType,
            perditeRetePct: Number((simulation as any).perdite_rete_pct ?? DEFAULT_PARAMS.perditeRetePct),
            ivaPaymentRegime: (simulation.iva_payment_regime as 'monthly' | 'quarterly') ?? DEFAULT_PARAMS.ivaPaymentRegime,
            
            // Clienti e incasso
            avgMonthlyConsumption: Number(simulation.avg_monthly_consumption),
            activationRate: Number(simulation.activation_rate),
            monthlyChurnRate: Number(simulation.monthly_churn_rate ?? DEFAULT_PARAMS.monthlyChurnRate),
            churnMonth0Pct: Number((simulation as any).churn_month0_pct ?? DEFAULT_PARAMS.churnMonth0Pct),
            churnMonth1Pct: Number((simulation as any).churn_month1_pct ?? DEFAULT_PARAMS.churnMonth1Pct),
            churnMonth2Pct: Number((simulation as any).churn_month2_pct ?? DEFAULT_PARAMS.churnMonth2Pct),
            churnMonth3Pct: Number((simulation as any).churn_month3_pct ?? DEFAULT_PARAMS.churnMonth3Pct),
            churnDecayFactor: Number((simulation as any).churn_decay_factor ?? DEFAULT_PARAMS.churnDecayFactor),
            collectionMonth0: Number(simulation.collection_month_0),
            collectionMonth1: Number(simulation.collection_month_1),
            collectionMonth2: Number(simulation.collection_month_2),
            collectionMonth3Plus: Number(simulation.collection_month_3_plus),
            uncollectibleRate: Number(simulation.uncollectible_rate),
            
            // Costi grossista
            gestionePodPerPod: Number(simulation.gestione_pod_per_pod ?? DEFAULT_PARAMS.gestionePodPerPod),
            depositoMesi: Number(simulation.deposito_cauzionale_mesi ?? DEFAULT_PARAMS.depositoMesi),
            depositoPercentualeAttivazione: Number(simulation.deposito_percentuale_attivazione ?? DEFAULT_PARAMS.depositoPercentualeAttivazione),
            depositoSvincoloPagamentiPerc: Number((simulation as any).deposito_svincolo_pagamenti_perc ?? DEFAULT_PARAMS.depositoSvincoloPagamentiPerc),
          },
        });
      } else {
        setData({
          startDate: new Date(2026, 0, 1),
          monthlyContracts: DEFAULT_MONTHLY_CONTRACTS,
          params: DEFAULT_PARAMS,
        });
      }
    } catch (error) {
      console.error('Error loading simulation:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Save simulation to database
  const saveSimulation = useCallback(async () => {
    if (!projectId) return;

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Always read from ref to get the latest state (critical for debounced saves)
      const currentData = dataRef.current;

      const simulationData = {
        project_id: projectId,
        start_date: currentData.startDate.toISOString().split('T')[0],
        monthly_contracts: currentData.monthlyContracts,
        commodity_type: 'luce',
        
        // Componenti commerciali
        ccv_monthly: currentData.params.ccvMonthly,
        spread_per_kwh: currentData.params.spreadPerKwh,
        spread_grossista_per_kwh: currentData.params.spreadGrossistaPerKwh,
        other_services_monthly: currentData.params.otherServicesMonthly,
        
        // Componenti fattura
        pun_per_kwh: currentData.params.punPerKwh,
        dispacciamento_per_kwh: currentData.params.dispacciamentoPerKwh,
        trasporto_quota_fissa_anno: currentData.params.trasportoQuotaFissaAnno,
        trasporto_quota_potenza_kw_anno: currentData.params.trasportoQuotaPotenzaKwAnno,
        trasporto_quota_energia_kwh: currentData.params.trasportoQuotaEnergiaKwh,
        potenza_impegnata_kw: currentData.params.potenzaImpegnataKw,
        oneri_asos_kwh: currentData.params.oneriAsosKwh,
        oneri_arim_kwh: currentData.params.oneriArimKwh,
        accise_kwh: currentData.params.acciseKwh,
        iva_percent: currentData.params.ivaPercent,
        client_type: currentData.params.clientType,
        perdite_rete_pct: currentData.params.perditeRetePct,
        iva_payment_regime: currentData.params.ivaPaymentRegime,
        
        // Clienti e incasso
        avg_monthly_consumption: currentData.params.avgMonthlyConsumption,
        activation_rate: currentData.params.activationRate,
        monthly_churn_rate: currentData.params.monthlyChurnRate,
        churn_month0_pct: currentData.params.churnMonth0Pct ?? 0,
        churn_month1_pct: currentData.params.churnMonth1Pct,
        churn_month2_pct: currentData.params.churnMonth2Pct,
        churn_month3_pct: currentData.params.churnMonth3Pct,
        churn_decay_factor: currentData.params.churnDecayFactor,
        collection_month_0: currentData.params.collectionMonth0,
        collection_month_1: currentData.params.collectionMonth1,
        collection_month_2: currentData.params.collectionMonth2,
        collection_month_3_plus: currentData.params.collectionMonth3Plus,
        uncollectible_rate: currentData.params.uncollectibleRate,
        
        // Costi grossista
        gestione_pod_per_pod: currentData.params.gestionePodPerPod,
        deposito_cauzionale_mesi: currentData.params.depositoMesi,
        deposito_percentuale_attivazione: currentData.params.depositoPercentualeAttivazione,
        deposito_svincolo_pagamenti_perc: currentData.params.depositoSvincoloPagamentiPerc ?? 50,
        
        created_by: user.id,
      };

      if (currentData.id) {
        const { error } = await supabase
          .from('project_revenue_simulations')
          .update(simulationData)
          .eq('id', currentData.id);
        if (error) throw error;
      } else {
        const { data: newSim, error } = await supabase
          .from('project_revenue_simulations')
          .upsert(simulationData, { onConflict: 'project_id' })
          .select()
          .single();
        if (error) throw error;
        setData(prev => ({ ...prev, id: newSim.id }));
      }

      toast({
        title: 'Salvato',
        description: 'Configurazione simulatore salvata con successo',
      });
    } catch (error: any) {
      console.error('Error saving simulation:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare la configurazione',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, toast]);

  const updateParams = useCallback((key: keyof RevenueSimulationParams, value: number | string) => {
    setData(prev => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }));
  }, []);

  const updateMonthlyContract = useCallback((monthIndex: number, value: number) => {
    setData(prev => {
      const updated = [...prev.monthlyContracts] as MonthlyContractsTarget;
      updated[monthIndex] = value;
      return { ...prev, monthlyContracts: updated };
    });
  }, []);

  const updateStartDate = useCallback((date: Date) => {
    setData(prev => ({ ...prev, startDate: date }));
  }, []);

  useEffect(() => {
    loadSimulation();
  }, [loadSimulation]);

  return {
    data,
    loading,
    saving,
    updateParams,
    updateMonthlyContract,
    updateStartDate,
    saveSimulation,
    refetch: loadSimulation,
  };
};
