import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useExportUnifiedPDF } from '@/hooks/useExportUnifiedPDF';
import { useToast } from '@/hooks/use-toast';
import type { StepProgress } from './useStepProgress';

/**
 * Hook che esegue l'export del report unificato caricando i dati on-demand
 * (solo al click del pulsante) invece di tenerli in memoria permanente.
 */
export const useLazyUnifiedExport = () => {
  const { exportUnifiedPDF } = useExportUnifiedPDF();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(async (
    currentProject: any,
    currentProjectId: string,
    stepProgress: Record<string, StepProgress>,
  ) => {
    try {
      setExporting(true);

      // Carica tutti i dati necessari on-demand in parallelo
      const [
        { data: members },
        { data: costs },
        { count: docCount },
        { count: memberCount },
        { data: revenues },
        { data: allCosts },
      ] = await Promise.all([
        supabase.from('project_members').select('user_id, role').eq('project_id', currentProjectId),
        supabase.from('project_costs').select('id').eq('project_id', currentProjectId).limit(1),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId),
        supabase.from('project_members').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId),
        supabase.from('project_revenues').select('amount').eq('project_id', currentProjectId),
        supabase.from('project_costs').select('amount, cost_type, is_passthrough').eq('project_id', currentProjectId),
      ]);

      // Build team members
      const userIds = members?.map(m => m.user_id) || [];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] };

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.id] = p.full_name || 'Utente'; });

      const teamMembers = members?.map(m => ({
        name: profileMap[m.user_id] || 'Utente',
        role: m.role,
      })) || [];

      // Build financial summary on-the-fly
      const totalRevenue = (revenues || []).reduce((s, r) => s + (r.amount || 0), 0);
      const totalCosts = (allCosts || []).reduce((s, c) => s + (c.amount || 0), 0);
      const netMargin = totalRevenue - totalCosts;
      const netMarginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

      const financialSummary = {
        totalRevenue,
        totalCosts,
        netMargin,
        netMarginPercent,
        passthroughCosts: (allCosts || []).filter(c => c.is_passthrough).reduce((s, c) => s + (c.amount || 0), 0),
        operationalCosts: (allCosts || []).filter(c => !c.is_passthrough).reduce((s, c) => s + (c.amount || 0), 0),
        costsByType: { commercial: 0, structural: 0, direct: 0, indirect: 0 },
      };

      // Check items
      const checkItems = [
        { label: 'Iscrizione EVE', isMet: !!currentProject?.eve_license_date, severity: 'critical', category: 'admin' },
        { label: 'Codice ARERA', isMet: !!currentProject?.arera_code, severity: 'critical', category: 'admin' },
        { label: 'Grossista definito', isMet: !!currentProject?.wholesaler_name, severity: 'critical', category: 'commercial' },
        { label: 'Mercato target', isMet: !!currentProject?.market_type, severity: 'important', category: 'commercial' },
        { label: 'Data Go-Live', isMet: !!currentProject?.go_live_date, severity: 'important', category: 'operational' },
        { label: 'Documenti caricati', isMet: (docCount ?? 0) > 0, severity: 'recommended', category: 'admin' },
        { label: 'Team definito', isMet: (memberCount ?? 0) > 1, severity: 'recommended', category: 'operational' },
        { label: 'Budget definito', isMet: (costs?.length ?? 0) > 0, severity: 'recommended', category: 'operational' },
      ];

      exportUnifiedPDF(
        currentProject,
        stepProgress,
        financialSummary as any,
        { hasData: false, monthlyData: [], totals: { inflow: 0, outflow: 0, net: 0, cumulative: 0 } } as any,
        teamMembers,
        checkItems,
      );
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Errore', description: 'Impossibile generare il report', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [exportUnifiedPDF, toast]);

  return { exportReport, exporting };
};
