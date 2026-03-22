import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, FileText, Users, Zap, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ComplianceCheck {
  id?: string;
  check_id: string;
  status: 'conforme' | 'da_verificare' | 'scaduto';
  last_verified_at: string | null;
  notes: string | null;
}

interface ComplianceItem {
  id: string;
  category: string;
  label: string;
  description: string;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  // Tariffe e Prezzi
  { id: 'arera_quarterly', category: 'Tariffe e Prezzi', label: 'Aggiornamento tariffe ARERA trimestrali', description: 'Verifica e aggiorna le componenti regolate (ASOS, ARIM, trasporto, accise) ad ogni cambio trimestre.' },
  { id: 'pun_monthly', category: 'Tariffe e Prezzi', label: 'Verifica PUN mensile e aggiornamento parametri simulazione', description: 'Controlla il PUN medio mensile e aggiorna i parametri nel simulatore finanziario.' },
  // Documentazione Cliente
  { id: 'scheda_sintetica', category: 'Documentazione Cliente', label: 'Scheda Sintetica ARERA aggiornata alla delibera vigente', description: 'La Scheda Sintetica deve riportare le condizioni economiche conformi alla delibera ARERA più recente.' },
  { id: 'bolletta_20', category: 'Documentazione Cliente', label: 'Bolletta 2.0 conforme', description: 'La bolletta deve rispettare il formato Bolletta 2.0 ARERA con tutte le voci obbligatorie.' },
  // Qualità Commerciale
  { id: 'reclami_tempi', category: 'Qualità Commerciale', label: 'Tempi risposta reclami (30gg per iscritto)', description: 'Risposta scritta ai reclami entro 30 giorni solari dalla ricezione, come da delibera ARERA.' },
  { id: 'indennizzo_auto', category: 'Qualità Commerciale', label: 'Indennizzo automatico clienti per disservizi', description: 'Erogazione automatica degli indennizzi previsti dal TIQV in caso di mancato rispetto degli standard.' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Tariffe e Prezzi': Zap,
  'Documentazione Cliente': FileText,
  'Qualità Commerciale': Users,
};

const STATUS_CONFIG = {
  conforme: { label: 'Conforme', className: 'bg-green-600 hover:bg-green-700 text-white border-green-600', icon: CheckCircle2 },
  da_verificare: { label: 'Da verificare', className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500', icon: AlertTriangle },
  scaduto: { label: 'Scaduto', className: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground', icon: XCircle },
};

interface ComplianceDashboardProps {
  projectId: string;
}

export function ComplianceDashboard({ projectId }: ComplianceDashboardProps) {
  const [checks, setChecks] = useState<Record<string, ComplianceCheck>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [punLastUpdate, setPunLastUpdate] = useState<{ pun: number; days: number; date: string } | null>(null);
  const [simLastUpdate, setSimLastUpdate] = useState<{ days: number; date: string } | null>(null);

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching compliance checks:', error);
    } else {
      const map: Record<string, ComplianceCheck> = {};
      (data as unknown as ComplianceCheck[])?.forEach(c => {
        map[c.check_id] = c;
      });
      setChecks(map);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const markAsVerified = async (checkId: string) => {
    setSavingId(checkId);
    const now = new Date().toISOString();
    const notes = editingNotes[checkId] ?? checks[checkId]?.notes ?? null;
    const { data: userData } = await supabase.auth.getUser();

    const payload = {
      project_id: projectId,
      check_id: checkId,
      status: 'conforme',
      last_verified_at: now,
      notes: notes || null,
      verified_by: userData.user?.id || null,
      updated_at: now,
    };

    if (checks[checkId]?.id) {
      const { error } = await supabase
        .from('compliance_checks')
        .update(payload as any)
        .eq('project_id', projectId)
        .eq('check_id', checkId);
      if (error) {
        toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await supabase
        .from('compliance_checks')
        .insert(payload as any);
      if (error) {
        toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      }
    }

    setSavingId(null);
    fetchChecks();
    toast({ title: 'Verificato', description: `"${COMPLIANCE_ITEMS.find(i => i.id === checkId)?.label}" segnato come conforme` });
  };

  const saveNotes = async (checkId: string) => {
    setSavingId(checkId);
    const notes = editingNotes[checkId] ?? '';
    const now = new Date().toISOString();
    const { data: userData } = await supabase.auth.getUser();

    if (checks[checkId]?.id) {
      await supabase
        .from('compliance_checks')
        .update({ notes, updated_at: now } as any)
        .eq('project_id', projectId)
        .eq('check_id', checkId);
    } else {
      await supabase
        .from('compliance_checks')
        .insert({
          project_id: projectId,
          check_id: checkId,
          status: 'da_verificare',
          notes,
          verified_by: userData.user?.id || null,
          updated_at: now,
        } as any);
    }
    setSavingId(null);
    fetchChecks();
    toast({ title: 'Note salvate' });
  };

  // Compliance index
  const complianceIndex = useMemo(() => {
    const total = COMPLIANCE_ITEMS.length;
    const conforme = COMPLIANCE_ITEMS.filter(item => checks[item.id]?.status === 'conforme').length;
    return total > 0 ? Math.round((conforme / total) * 100) : 0;
  }, [checks]);

  // Group by category
  const categories = useMemo(() => {
    const grouped: Record<string, ComplianceItem[]> = {};
    COMPLIANCE_ITEMS.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Index */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Indice di Conformità ARERA</CardTitle>
          </div>
          <span className="text-3xl font-bold">{complianceIndex}%</span>
        </CardHeader>
        <CardContent>
          <Progress value={complianceIndex} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {COMPLIANCE_ITEMS.filter(i => checks[i.id]?.status === 'conforme').length} di {COMPLIANCE_ITEMS.length} obblighi verificati come conformi
          </p>
        </CardContent>
      </Card>

      {/* Categories */}
      {Object.entries(categories).map(([category, items]) => {
        const CategoryIcon = CATEGORY_ICONS[category] || FileText;
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map(item => {
                const check = checks[item.id];
                const status = check?.status || 'da_verificare';
                const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.da_verificare;
                const StatusIcon = cfg.icon;
                const currentNotes = editingNotes[item.id] ?? check?.notes ?? '';

                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">{item.label}</span>
                          <Badge className={cfg.className}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {check?.last_verified_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ultima verifica: {format(new Date(check.last_verified_at), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={status === 'conforme' ? 'outline' : 'default'}
                        onClick={() => markAsVerified(item.id)}
                        disabled={savingId === item.id}
                        className="flex-shrink-0"
                      >
                        {savingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        {status === 'conforme' ? 'Ri-verifica' : 'Segna come verificato'}
                      </Button>
                    </div>
                    <div className="flex items-end gap-2">
                      <Textarea
                        placeholder="Note..."
                        value={currentNotes}
                        onChange={e => setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        rows={1}
                        className="text-sm resize-none"
                      />
                      {editingNotes[item.id] !== undefined && editingNotes[item.id] !== (check?.notes ?? '') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveNotes(item.id)}
                          disabled={savingId === item.id}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
