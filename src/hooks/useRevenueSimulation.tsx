import { useState, useEffect, useCallback } from 'react';
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
}

// Parametri clienti e incasso
export interface ClientParams {
  avgMonthlyConsumption: number;  // Consumo medio kWh/mese
  activationRate: number;         // Tasso attivazione %
  monthlyChurnRate: number;       // Tasso switch-out mensile %
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
  spreadPerKwh: 0.015,            // Spread al cliente (RICAVO)
  spreadGrossistaPerKwh: 0.008,   // Spread dal grossista (COSTO)
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
  
  // Clienti e incasso
  avgMonthlyConsumption: 200,
  activationRate: 85,
  monthlyChurnRate: 1.5,
  collectionMonth0: 70,
  collectionMonth1: 18,
  collectionMonth2: 7,
  collectionMonth3Plus: 3,
  uncollectibleRate: 2,
  
  // Costi grossista
  gestionePodPerPod: 2.50,
  depositoMesi: 3,
  
  // Regime fiscale
  ivaPaymentRegime: 'monthly',
};

const DEFAULT_MONTHLY_CONTRACTS: MonthlyContractsTarget = [30, 40, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100];

export const useRevenueSimulation = (projectId: string | null) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<RevenueSimulationData>({
    startDate: new Date(2026, 0, 1),
    monthlyContracts: DEFAULT_MONTHLY_CONTRACTS,
    params: DEFAULT_PARAMS,
  });

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
            spreadGrossistaPerKwh: Number((simulation as any).spread_grossista_per_kwh ?? DEFAULT_PARAMS.spreadGrossistaPerKwh),
            otherServicesMonthly: Number(simulation.other_services_monthly),
            
            // Componenti fattura (con fallback a default)
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
            ivaPaymentRegime: ((simulation as any).iva_payment_regime as 'monthly' | 'quarterly') ?? DEFAULT_PARAMS.ivaPaymentRegime,
            
            // Clienti e incasso
            avgMonthlyConsumption: Number(simulation.avg_monthly_consumption),
            activationRate: Number(simulation.activation_rate),
            monthlyChurnRate: Number((simulation as any).monthly_churn_rate ?? DEFAULT_PARAMS.monthlyChurnRate),
            collectionMonth0: Number(simulation.collection_month_0),
            collectionMonth1: Number(simulation.collection_month_1),
            collectionMonth2: Number(simulation.collection_month_2),
            collectionMonth3Plus: Number(simulation.collection_month_3_plus),
            uncollectibleRate: Number(simulation.uncollectible_rate),
            
            // Costi grossista
            gestionePodPerPod: Number(simulation.gestione_pod_per_pod ?? DEFAULT_PARAMS.gestionePodPerPod),
            depositoMesi: Number(simulation.deposito_cauzionale_mesi ?? DEFAULT_PARAMS.depositoMesi),
          },
        });
      } else {
        // Reset to defaults if no simulation found
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

      const simulationData = {
        project_id: projectId,
        start_date: data.startDate.toISOString().split('T')[0],
        monthly_contracts: data.monthlyContracts,
        
        // Componenti commerciali
        ccv_monthly: data.params.ccvMonthly,
        spread_per_kwh: data.params.spreadPerKwh,
        spread_grossista_per_kwh: data.params.spreadGrossistaPerKwh,
        other_services_monthly: data.params.otherServicesMonthly,
        
        // Componenti fattura
        pun_per_kwh: data.params.punPerKwh,
        dispacciamento_per_kwh: data.params.dispacciamentoPerKwh,
        trasporto_quota_fissa_anno: data.params.trasportoQuotaFissaAnno,
        trasporto_quota_potenza_kw_anno: data.params.trasportoQuotaPotenzaKwAnno,
        trasporto_quota_energia_kwh: data.params.trasportoQuotaEnergiaKwh,
        potenza_impegnata_kw: data.params.potenzaImpegnataKw,
        oneri_asos_kwh: data.params.oneriAsosKwh,
        oneri_arim_kwh: data.params.oneriArimKwh,
        accise_kwh: data.params.acciseKwh,
        iva_percent: data.params.ivaPercent,
        client_type: data.params.clientType,
        iva_payment_regime: data.params.ivaPaymentRegime,
        
        // Clienti e incasso
        avg_monthly_consumption: data.params.avgMonthlyConsumption,
        activation_rate: data.params.activationRate,
        monthly_churn_rate: data.params.monthlyChurnRate,
        collection_month_0: data.params.collectionMonth0,
        collection_month_1: data.params.collectionMonth1,
        collection_month_2: data.params.collectionMonth2,
        collection_month_3_plus: data.params.collectionMonth3Plus,
        uncollectible_rate: data.params.uncollectibleRate,
        
        // Costi grossista
        gestione_pod_per_pod: data.params.gestionePodPerPod,
        deposito_cauzionale_mesi: data.params.depositoMesi,
        
        created_by: user.id,
      };

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('project_revenue_simulations')
          .update(simulationData)
          .eq('id', data.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data: newSim, error } = await supabase
          .from('project_revenue_simulations')
          .insert(simulationData)
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
  }, [projectId, data, toast]);

  // Update params
  const updateParams = useCallback((key: keyof RevenueSimulationParams, value: number | string) => {
    setData(prev => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }));
  }, []);

  // Update monthly contract
  const updateMonthlyContract = useCallback((monthIndex: number, value: number) => {
    setData(prev => {
      const updated = [...prev.monthlyContracts] as MonthlyContractsTarget;
      updated[monthIndex] = value;
      return { ...prev, monthlyContracts: updated };
    });
  }, []);

  // Update start date
  const updateStartDate = useCallback((date: Date) => {
    setData(prev => ({ ...prev, startDate: date }));
  }, []);

  // Load on mount
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
