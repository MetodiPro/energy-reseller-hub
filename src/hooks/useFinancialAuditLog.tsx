import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  project_id: string;
  entity_type: 'cost' | 'revenue';
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string;
  created_at: string;
}

export const useFinancialAuditLog = (projectId: string | null) => {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLog = async () => {
    if (!projectId) {
      setAuditLog([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('financial_audit_log')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit log:', error);
      setLoading(false);
      return;
    }

    setAuditLog(data as unknown as AuditLogEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAuditLog();
  }, [projectId]);

  // Realtime subscription per aggiornamento automatico in team
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`financial-audit-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_audit_log',
          filter: `project_id=eq.${projectId}`,
        },
        () => { fetchAuditLog(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  return {
    auditLog,
    loading,
    refetch: fetchAuditLog,
  };
};
