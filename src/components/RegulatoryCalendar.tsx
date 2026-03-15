import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  Bell, 
  Plus, 
  Check, 
  Clock,
  FileText,
  Building2,
  Zap,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RegulatoryDeadline {
  id: string;
  project_id: string;
  deadline_type: string;
  title: string;
  description: string | null;
  due_date: string;
  reminder_days: number;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  completed: boolean;
  completed_at: string | null;
}

interface RegulatoryCalendarProps {
  projectId: string | null;
  eveLicenseDate: string | null;
  evgLicenseDate: string | null;
  commodityType?: string | null;
}

const deadlineTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  eve_renewal: { label: 'Rinnovo EVE', icon: Zap, color: 'text-blue-500' },
  arera_data: { label: 'Comunicazione ARERA', icon: FileText, color: 'text-purple-500' },
  csea_payment: { label: 'Contributo CSEA', icon: Building2, color: 'text-green-500' },
  adm_excise: { label: 'Dichiarazione Accise ADM', icon: FileText, color: 'text-red-500' },
  custom: { label: 'Scadenza Personalizzata', icon: CalendarIcon, color: 'text-gray-500' },
};

const defaultDeadlines = [
  {
    deadline_type: 'eve_renewal',
    title: 'Rinnovo Autocertificazione EVE',
    description: 'Rinnovo annuale autocertificazione Elenco Venditori Energia Elettrica presso MASE',
    reminder_days: 30,
    is_recurring: true,
    recurrence_pattern: 'yearly',
    default_month: 1,
    default_day: 31,
  },
  {
    deadline_type: 'arera_data',
    title: 'Raccolta Dati Annuale ARERA',
    description: 'Comunicazione dati annuali vendite e qualità commerciale ad ARERA',
    reminder_days: 30,
    is_recurring: true,
    recurrence_pattern: 'yearly',
    default_month: 3,
    default_day: 31,
  },
  {
    deadline_type: 'csea_payment',
    title: 'Contributo Trimestrale CSEA',
    description: 'Versamento contributi CSEA per oneri di sistema',
    reminder_days: 15,
    is_recurring: true,
    recurrence_pattern: 'quarterly',
    default_month: 1,
    default_day: 20,
  },
  {
    deadline_type: 'adm_excise',
    title: 'Dichiarazione Accise ADM',
    description: 'Dichiarazione annuale accise energia elettrica presso Agenzia delle Dogane',
    reminder_days: 30,
    is_recurring: true,
    recurrence_pattern: 'yearly',
    default_month: 3,
    default_day: 31,
  },
];

export const RegulatoryCalendar = ({ projectId, eveLicenseDate, evgLicenseDate, commodityType }: RegulatoryCalendarProps) => {
  const [deadlines, setDeadlines] = useState<RegulatoryDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    deadline_type: 'custom',
    title: '',
    description: '',
    due_date: '',
    reminder_days: 30,
    is_recurring: false,
    recurrence_pattern: '',
  });

  useEffect(() => {
    if (projectId) {
      fetchDeadlines();
    }
  }, [projectId]);

  const fetchDeadlines = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('regulatory_deadlines')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setDeadlines(data || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultDeadlines = async () => {
    if (!projectId) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    
    const deadlinesToCreate = defaultDeadlines.map((d) => {
      // Calculate the due date: if the default date is in the past this year, use next year
      let dueYear = currentYear;
      const defaultDate = new Date(currentYear, d.default_month - 1, d.default_day);
      
      // If the deadline would be in the past, schedule it for next year
      if (isBefore(defaultDate, today)) {
        dueYear = currentYear + 1;
      }
      
      return {
        project_id: projectId,
        deadline_type: d.deadline_type,
        title: d.title,
        description: d.description,
        due_date: new Date(dueYear, d.default_month - 1, d.default_day).toISOString().split('T')[0],
        reminder_days: d.reminder_days,
        is_recurring: d.is_recurring,
        recurrence_pattern: d.recurrence_pattern,
        completed: false,
      };
    });

    try {
      const { error } = await supabase
        .from('regulatory_deadlines')
        .insert(deadlinesToCreate);

      if (error) throw error;

      toast({
        title: 'Scadenze inizializzate',
        description: 'Le scadenze normative standard sono state aggiunte',
      });
      fetchDeadlines();
    } catch (error: any) {
      console.error('Error initializing deadlines:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile inizializzare le scadenze',
        variant: 'destructive',
      });
    }
  };

  const createDeadline = async () => {
    if (!projectId || !formData.title || !formData.due_date) return;

    try {
      const { error } = await supabase
        .from('regulatory_deadlines')
        .insert({
          project_id: projectId,
          deadline_type: formData.deadline_type,
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date,
          reminder_days: formData.reminder_days,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        });

      if (error) throw error;

      toast({
        title: 'Scadenza creata',
        description: `"${formData.title}" aggiunta al calendario`,
      });
      setDialogOpen(false);
      setFormData({
        deadline_type: 'custom',
        title: '',
        description: '',
        due_date: '',
        reminder_days: 30,
        is_recurring: false,
        recurrence_pattern: '',
      });
      fetchDeadlines();
    } catch (error: any) {
      console.error('Error creating deadline:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la scadenza',
        variant: 'destructive',
      });
    }
  };

  const toggleCompleted = async (deadline: RegulatoryDeadline) => {
    try {
      const newCompleted = !deadline.completed;
      const { error } = await supabase
        .from('regulatory_deadlines')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', deadline.id);

      if (error) throw error;

      setDeadlines(deadlines.map(d => 
        d.id === deadline.id 
          ? { ...d, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : d
      ));

      toast({
        title: newCompleted ? 'Scadenza completata' : 'Scadenza riaperta',
      });
    } catch (error) {
      console.error('Error toggling deadline:', error);
    }
  };

  const deleteDeadline = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa scadenza?')) return;

    try {
      const { error } = await supabase
        .from('regulatory_deadlines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDeadlines(deadlines.filter(d => d.id !== id));
      toast({ title: 'Scadenza eliminata' });
    } catch (error) {
      console.error('Error deleting deadline:', error);
    }
  };

  const getDeadlineStatus = (deadline: RegulatoryDeadline) => {
    if (deadline.completed) return { status: 'completed', label: 'Completato', color: 'bg-success/10 text-success' };
    
    const daysUntil = differenceInDays(new Date(deadline.due_date), new Date());
    
    if (daysUntil < 0) return { status: 'overdue', label: 'Scaduto', color: 'bg-destructive/10 text-destructive' };
    if (daysUntil <= deadline.reminder_days) return { status: 'warning', label: `${daysUntil} giorni`, color: 'bg-warning/10 text-warning' };
    return { status: 'ok', label: `${daysUntil} giorni`, color: 'bg-muted text-muted-foreground' };
  };

  // Group deadlines
  const overdueDeadlines = deadlines.filter(d => !d.completed && differenceInDays(new Date(d.due_date), new Date()) < 0);
  const upcomingDeadlines = deadlines.filter(d => !d.completed && differenceInDays(new Date(d.due_date), new Date()) >= 0 && differenceInDays(new Date(d.due_date), new Date()) <= 30);
  const futureDeadlines = deadlines.filter(d => !d.completed && differenceInDays(new Date(d.due_date), new Date()) > 30);
  const completedDeadlines = deadlines.filter(d => d.completed);

  if (!projectId) {
    return (
      <Card className="p-8 text-center">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun progetto selezionato</h3>
        <p className="text-muted-foreground">Seleziona un progetto per visualizzare lo scadenzario</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Caricamento scadenze...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scadenzario Normativo</h2>
          <p className="text-muted-foreground">Gestisci le scadenze obbligatorie del reseller</p>
        </div>
        <div className="flex gap-2">
          {deadlines.length === 0 && (
            <Button variant="outline" onClick={initializeDefaultDeadlines}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Carica Scadenze Standard
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Scadenza
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Scadenza</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo Scadenza</Label>
                  <Select 
                    value={formData.deadline_type} 
                    onValueChange={(v) => setFormData({ ...formData, deadline_type: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(deadlineTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titolo</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Es. Rinnovo autorizzazione..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Dettagli sulla scadenza..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Data Scadenza</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formData.due_date 
                          ? format(new Date(formData.due_date), 'dd/MM/yyyy', { locale: it })
                          : 'Seleziona data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date ? new Date(formData.due_date) : undefined}
                        onSelect={(date) => setFormData({ ...formData, due_date: date?.toISOString().split('T')[0] || '' })}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Giorni Preavviso</Label>
                  <Input
                    type="number"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: parseInt(e.target.value) || 30 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
                  />
                  <Label htmlFor="recurring">Scadenza ricorrente</Label>
                </div>
                {formData.is_recurring && (
                  <div>
                    <Label>Ricorrenza</Label>
                    <Select 
                      value={formData.recurrence_pattern} 
                      onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="quarterly">Trimestrale</SelectItem>
                        <SelectItem value="yearly">Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={createDeadline} className="w-full" disabled={!formData.title || !formData.due_date}>
                  Aggiungi Scadenza
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueDeadlines.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Scadenze Superate ({overdueDeadlines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueDeadlines.map((deadline) => {
                const config = deadlineTypeConfig[deadline.deadline_type] || deadlineTypeConfig.custom;
                const Icon = config.icon;
                return (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Scaduto il {format(new Date(deadline.due_date), 'dd/MM/yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleCompleted(deadline)}>
                        <Check className="h-4 w-4 mr-1" />
                        Segna Completato
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDeadline(deadline.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming (within 30 days) */}
      {upcomingDeadlines.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Bell className="h-5 w-5" />
              In Scadenza ({upcomingDeadlines.length})
            </CardTitle>
            <CardDescription>Prossimi 30 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDeadlines.map((deadline) => {
                const config = deadlineTypeConfig[deadline.deadline_type] || deadlineTypeConfig.custom;
                const Icon = config.icon;
                const status = getDeadlineStatus(deadline);
                return (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(deadline.due_date), 'dd MMMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Button variant="outline" size="sm" onClick={() => toggleCompleted(deadline)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDeadline(deadline.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Future Deadlines */}
      {futureDeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Scadenze Future ({futureDeadlines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {futureDeadlines.map((deadline) => {
                const config = deadlineTypeConfig[deadline.deadline_type] || deadlineTypeConfig.custom;
                const Icon = config.icon;
                const status = getDeadlineStatus(deadline);
                return (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(deadline.due_date), 'dd MMMM yyyy', { locale: it })}
                          {deadline.is_recurring && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {deadline.recurrence_pattern === 'yearly' && 'Annuale'}
                              {deadline.recurrence_pattern === 'quarterly' && 'Trimestrale'}
                              {deadline.recurrence_pattern === 'monthly' && 'Mensile'}
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteDeadline(deadline.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {completedDeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Completate ({completedDeadlines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedDeadlines.slice(0, 5).map((deadline) => {
                const config = deadlineTypeConfig[deadline.deadline_type] || deadlineTypeConfig.custom;
                const Icon = config.icon;
                return (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-60">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <div>
                        <p className="font-medium line-through">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Completato il {deadline.completed_at && format(new Date(deadline.completed_at), 'dd/MM/yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleCompleted(deadline)}>
                      Riapri
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {deadlines.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessuna scadenza configurata</h3>
          <p className="text-muted-foreground mb-4">
            Inizia caricando le scadenze normative standard o aggiungine una personalizzata
          </p>
          <Button onClick={initializeDefaultDeadlines}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Carica Scadenze Standard
          </Button>
        </Card>
      )}
    </div>
  );
};
