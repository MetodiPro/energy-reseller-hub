import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SimulationProduct {
  id: string;
  project_id: string;
  name: string;
  ccv_monthly: number;
  spread_per_kwh: number;
  other_services_monthly: number;
  avg_monthly_consumption: number;
  client_type: string;
  iva_percent: number;
  activation_rate: number;
  churn_month1_pct: number;
  churn_month2_pct: number;
  churn_month3_pct: number;
  churn_decay_factor: number;
  collection_month_0: number;
  collection_month_1: number;
  collection_month_2: number;
  collection_month_3_plus: number;
  uncollectible_rate: number;
  channel_id: string | null;
  contract_share: number;
  sort_order: number;
  is_active: boolean;
}

const fromProducts = () => (supabase as any).from('simulation_products');

export const useSimulationProducts = (projectId: string | null) => {
  const [products, setProducts] = useState<SimulationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadProducts = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await fromProducts()
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      setProducts((data || []).map((r: any) => ({
        id: r.id,
        project_id: r.project_id,
        name: r.name,
        ccv_monthly: Number(r.ccv_monthly),
        spread_per_kwh: Number(r.spread_per_kwh),
        other_services_monthly: Number(r.other_services_monthly),
        avg_monthly_consumption: Number(r.avg_monthly_consumption),
        client_type: r.client_type,
        iva_percent: Number(r.iva_percent),
        activation_rate: Number(r.activation_rate),
        churn_month1_pct: Number(r.churn_month1_pct),
        churn_month2_pct: Number(r.churn_month2_pct),
        churn_month3_pct: Number(r.churn_month3_pct),
        churn_decay_factor: Number(r.churn_decay_factor),
        collection_month_0: Number(r.collection_month_0),
        collection_month_1: Number(r.collection_month_1),
        collection_month_2: Number(r.collection_month_2),
        collection_month_3_plus: Number(r.collection_month_3_plus),
        uncollectible_rate: Number(r.uncollectible_rate),
        channel_id: r.channel_id,
        contract_share: Number(r.contract_share),
        sort_order: Number(r.sort_order),
        is_active: Boolean(r.is_active),
      })));
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createProduct = useCallback(async (overrides?: Partial<Record<string, any>>) => {
    if (!projectId) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await fromProducts()
      .insert({
        project_id: projectId,
        created_by: user.id,
        sort_order: products.length,
        ...overrides,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    await loadProducts();
    toast.success('Prodotto creato');
    return data;
  }, [projectId, products.length, loadProducts]);

  const updateProduct = useCallback((id: string, updates: Partial<SimulationProduct>) => {
    // Optimistic local update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    // Debounced DB write
    if (saveTimeouts.current[id]) clearTimeout(saveTimeouts.current[id]);
    saveTimeouts.current[id] = setTimeout(async () => {
      const { error } = await fromProducts().update(updates).eq('id', id);
      if (error) toast.error('Errore salvataggio: ' + error.message);
    }, 600);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await fromProducts().delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Prodotto eliminato');
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  return { products, loading, createProduct, updateProduct, deleteProduct, refetch: loadProducts };
};
