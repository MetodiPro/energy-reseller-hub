import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Briefcase, 
  Scale, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Euro, 
  Plus, 
  Calendar as CalendarIcon,
  FileText,
  TrendingUp,
  Download,
  Loader2,
  ChevronDown,
  GraduationCap,
  Monitor,
  Users,
   Settings,
   FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConsultantTasks, type ConsultantTask } from '@/hooks/useConsultantTasks';
import { 
  consultantTaskTemplates, 
  getTemplatesByType, 
  calculateTotalEstimatedCost,
  consultantTypeLabels,
  getAllConsultantTypes,
  type ConsultantType
} from '@/data/consultantTasks';
 import { useExportConsultantsPDF } from '@/hooks/useExportConsultantsPDF';
 import { useExportConsultantsGuidePDF } from '@/hooks/useExportConsultantsGuidePDF';
 import { useExportConsultantsGuideDocx } from '@/hooks/useExportConsultantsGuideDocx';
 import { useToast } from '@/hooks/use-toast';
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ConsultantsManagerProps {
  projectId: string | null;
}

const phaseLabels: Record<string, string> = {
  startup: 'Avvio',
  operational: 'Operativo',
  ongoing: 'Ricorrente',
};

const priorityConfig = {
  high: { label: 'Alta', color: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'Media', color: 'bg-warning text-warning-foreground' },
  low: { label: 'Bassa', color: 'bg-muted text-muted-foreground' },
};

export const ConsultantsManager = ({ projectId }: ConsultantsManagerProps) => {
  const {
    tasks,
    loading,
    stats,
    initializeFromTemplates,
    toggleTaskCompletion,
    updateTask,
    addTask,
    deleteTask,
  } = useConsultantTasks(projectId);

   const { exportToPDF } = useExportConsultantsPDF();
   const { exportGuidePDF } = useExportConsultantsGuidePDF();
   const { exportGuideDocx } = useExportConsultantsGuideDocx();
   const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | ConsultantType>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ConsultantTask | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    consultantType: 'commercialista' as ConsultantType,
    category: '',
    estimatedCost: 0,
    dueDate: null as Date | null,
    priority: 'medium' as const,
    isRecurring: false,
    recurrencePattern: null as string | null,
  });

  // Icons for consultant types
  const typeIcons: Record<ConsultantType, React.ReactNode> = {
    commercialista: <Briefcase className="h-4 w-4" />,
    legale: <Scale className="h-4 w-4" />,
    formazione: <GraduationCap className="h-4 w-4" />,
    it_software: <Monitor className="h-4 w-4" />,
    operativo: <Users className="h-4 w-4" />,
    entrambi: <Settings className="h-4 w-4" />,
    tutti: <FileText className="h-4 w-4" />,
  };

  // Filter tasks by active tab
  const filteredTasks = useMemo(() => {
    if (activeTab === 'all') return tasks;
    if (activeTab === 'entrambi') {
      return tasks.filter(t => 
        t.consultantType === 'commercialista' || 
        t.consultantType === 'legale' || 
        t.consultantType === 'entrambi'
      );
    }
    return tasks.filter(t => t.consultantType === activeTab || t.consultantType === 'entrambi');
  }, [tasks, activeTab]);

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, ConsultantTask[]> = {};
    filteredTasks.forEach(task => {
      const key = task.category;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  // Handle initialize from templates
  const handleInitialize = async (type: 'all' | ConsultantType) => {
    const templates = type === 'all' 
      ? consultantTaskTemplates 
      : getTemplatesByType(type);
    await initializeFromTemplates(templates);
  };

  // Handle add task
  const handleAddTask = async () => {
    await addTask({
      title: newTask.title,
      description: newTask.description,
      consultantType: newTask.consultantType,
      category: newTask.category || 'Altro',
      estimatedCost: newTask.estimatedCost,
      dueDate: newTask.dueDate?.toISOString().split('T')[0] || null,
      priority: newTask.priority,
      isRecurring: newTask.isRecurring,
      recurrencePattern: newTask.recurrencePattern,
    });
    setShowAddDialog(false);
    setNewTask({
      title: '',
      description: '',
      consultantType: 'commercialista',
      category: '',
      estimatedCost: 0,
      dueDate: null,
      priority: 'medium',
      isRecurring: false,
      recurrencePattern: null,
    });
  };

  // Handle save task edits
  const handleSaveTask = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      notes: editingTask.notes,
      actualCost: editingTask.actualCost,
      costNotes: editingTask.costNotes,
      dueDate: editingTask.dueDate,
    });
    setEditingTask(null);
  };

   // Handle PDF export
   const handleExportPDF = () => {
     try {
       exportToPDF(tasks, 'Progetto');
       toast({
         title: 'PDF esportato',
         description: 'Il report delle attività consulenti è stato scaricato.',
       });
     } catch (error) {
       toast({
         title: 'Errore',
         description: 'Impossibile esportare il PDF.',
         variant: 'destructive',
       });
     }
   };
 
  if (!projectId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Seleziona un progetto per gestire le attività consulenziali</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show initialization options if no tasks
  if (tasks.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Gestione Consulenti Esterni
          </CardTitle>
          <CardDescription>
            Inizializza le attività per consulenti esterni: commercialista, legale, formazione, IT e operativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Carica le checklist predefinite con tutte le attività necessarie per avviare e gestire un reseller di energia.
            Potrai poi personalizzarle, aggiungere costi effettivi e scadenze.
          </p>

          <div className="grid gap-4">
            <Button 
              onClick={() => handleInitialize('all')} 
              className="w-full h-auto py-4"
              variant="default"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Carica tutte le attività</p>
                  <p className="text-sm opacity-80">
                    {consultantTaskTemplates.length} attività • Costo stimato: €{calculateTotalEstimatedCost(consultantTaskTemplates).toLocaleString()}
                  </p>
                </div>
              </div>
            </Button>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button 
                onClick={() => handleInitialize('commercialista')} 
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <Briefcase className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium text-sm">Commercialista</p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplatesByType('commercialista').length} attività
                  </p>
                </div>
              </Button>

              <Button 
                onClick={() => handleInitialize('legale')} 
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <Scale className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium text-sm">Legale</p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplatesByType('legale').length} attività
                  </p>
                </div>
              </Button>

              <Button 
                onClick={() => handleInitialize('formazione')} 
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <GraduationCap className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium text-sm">Formazione</p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplatesByType('formazione').length} attività
                  </p>
                </div>
              </Button>

              <Button 
                onClick={() => handleInitialize('it_software')} 
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <Monitor className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium text-sm">IT / Software</p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplatesByType('it_software').length} attività
                  </p>
                </div>
              </Button>

              <Button 
                onClick={() => handleInitialize('operativo')} 
                variant="outline"
                className="h-auto py-3"
              >
                <div className="text-center">
                  <Users className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-medium text-sm">Operativo / On-Site</p>
                  <p className="text-xs text-muted-foreground">
                    {getTemplatesByType('operativo').length} attività
                  </p>
                </div>
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Oppure scarica la guida completa con tutte le attività e le spiegazioni:
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => exportGuidePDF()}>
                <FileDown className="h-4 w-4 mr-2" />
                Guida PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportGuideDocx()}>
                <FileDown className="h-4 w-4 mr-2" />
                Guida Word
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completate</p>
                <p className="text-2xl font-bold">{stats.completed}/{stats.total}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
            </div>
            <Progress value={completionPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Scadenza</p>
                <p className="text-2xl font-bold text-warning">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Stimato</p>
                <p className="text-2xl font-bold">€{stats.estimatedCostTotal.toLocaleString()}</p>
              </div>
              <Euro className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Effettivo</p>
                <p className="text-2xl font-bold text-success">€{stats.actualCostTotal.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Attività Consulenti
              </CardTitle>
              <CardDescription>
                Gestisci checklist e costi per tutti i consulenti esterni
              </CardDescription>
            </div>
             <div className="flex items-center gap-2">
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" size="sm">
                   <FileDown className="h-4 w-4 mr-2" />
                   Esporta
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={handleExportPDF}>
                   <FileDown className="h-4 w-4 mr-2" />
                   Report attività (PDF)
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => exportGuidePDF('Progetto')}>
                   <FileDown className="h-4 w-4 mr-2" />
                   Guida completa (PDF)
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => exportGuideDocx('Progetto')}>
                   <FileDown className="h-4 w-4 mr-2" />
                   Guida completa (Word)
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
               <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                 <DialogTrigger asChild>
                   <Button size="sm">
                     <Plus className="h-4 w-4 mr-2" />
                     Aggiungi Attività
                   </Button>
                 </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuova Attività</DialogTitle>
                  <DialogDescription>Aggiungi un'attività personalizzata</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Titolo</Label>
                    <Input 
                      value={newTask.title}
                      onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                      placeholder="Es: Consulenza straordinaria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea 
                      value={newTask.description}
                      onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descrivi l'attività..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consulente</Label>
                      <Select 
                        value={newTask.consultantType}
                        onValueChange={v => setNewTask(p => ({ ...p, consultantType: v as ConsultantType }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="commercialista">Commercialista</SelectItem>
                          <SelectItem value="legale">Legale</SelectItem>
                          <SelectItem value="formazione">Formazione</SelectItem>
                          <SelectItem value="it_software">IT / Software</SelectItem>
                          <SelectItem value="operativo">Operativo / On-Site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorità</Label>
                      <Select 
                        value={newTask.priority}
                        onValueChange={v => setNewTask(p => ({ ...p, priority: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Bassa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Input 
                        value={newTask.category}
                        onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                        placeholder="Es: Fiscale"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Costo stimato (€)</Label>
                      <Input 
                        type="number"
                        value={newTask.estimatedCost}
                        onChange={e => setNewTask(p => ({ ...p, estimatedCost: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Scadenza</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.dueDate ? format(newTask.dueDate, 'PPP', { locale: it }) : 'Seleziona data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newTask.dueDate || undefined}
                          onSelect={d => setNewTask(p => ({ ...p, dueDate: d || null }))}
                          locale={it}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annulla</Button>
                  <Button onClick={handleAddTask} disabled={!newTask.title}>Aggiungi</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
            <div className="overflow-x-auto">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tutte</span> ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="commercialista" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Comm.</span> ({stats.commercialista})
                </TabsTrigger>
                <TabsTrigger value="legale" className="gap-1.5">
                  <Scale className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Legale</span> ({stats.legale})
                </TabsTrigger>
                <TabsTrigger value="formazione" className="gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Form.</span> ({stats.formazione})
                </TabsTrigger>
                <TabsTrigger value="it_software" className="gap-1.5">
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">IT</span> ({stats.it_software})
                </TabsTrigger>
                <TabsTrigger value="operativo" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">On-Site</span> ({stats.operativo})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <Accordion type="multiple" defaultValue={Object.keys(tasksByCategory)} className="space-y-2">
                {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                  const completedCount = categoryTasks.filter(t => t.isCompleted).length;
                  const categoryCost = categoryTasks.reduce((sum, t) => sum + t.estimatedCost, 0);

                  return (
                    <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium">{category}</span>
                          <Badge variant="outline" className="ml-2">
                            {completedCount}/{categoryTasks.length}
                          </Badge>
                          <span className="text-sm text-muted-foreground ml-auto mr-4">
                            €{categoryCost.toLocaleString()}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {categoryTasks.map(task => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggle={() => toggleTaskCompletion(task.id, !task.isCompleted)}
                              onEdit={() => setEditingTask(task)}
                              onDelete={() => deleteTask(task.id)}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Attività</DialogTitle>
            <DialogDescription>{editingTask?.title}</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea 
                  value={editingTask.notes || ''}
                  onChange={e => setEditingTask(p => p ? { ...p, notes: e.target.value } : null)}
                  placeholder="Aggiungi note..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Costo stimato</Label>
                  <div className="text-lg font-medium">€{editingTask.estimatedCost.toLocaleString()}</div>
                </div>
                <div className="space-y-2">
                  <Label>Costo effettivo (€)</Label>
                  <Input 
                    type="number"
                    value={editingTask.actualCost || ''}
                    onChange={e => setEditingTask(p => p ? { ...p, actualCost: e.target.value ? Number(e.target.value) : null } : null)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note costo</Label>
                <Input 
                  value={editingTask.costNotes || ''}
                  onChange={e => setEditingTask(p => p ? { ...p, costNotes: e.target.value } : null)}
                  placeholder="Es: Fattura n. 123"
                />
              </div>
              <div className="space-y-2">
                <Label>Scadenza</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingTask.dueDate ? format(new Date(editingTask.dueDate), 'PPP', { locale: it }) : 'Nessuna scadenza'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingTask.dueDate ? new Date(editingTask.dueDate) : undefined}
                      onSelect={d => setEditingTask(p => p ? { ...p, dueDate: d?.toISOString().split('T')[0] || null } : null)}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Annulla</Button>
            <Button onClick={handleSaveTask}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Task Item Component
interface TaskItemProps {
  task: ConsultantTask;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
  const isOverdue = !task.isCompleted && task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        task.isCompleted ? "bg-success/5" : isOverdue ? "bg-destructive/5" : "bg-muted/50"
      )}
    >
      <Checkbox 
        checked={task.isCompleted}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn(
              "text-sm font-medium",
              task.isCompleted && "text-muted-foreground line-through"
            )}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.isRecurring && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {task.recurrencePattern === 'monthly' ? 'Mensile' : 
                 task.recurrencePattern === 'quarterly' ? 'Trimestrale' : 'Annuale'}
              </Badge>
            )}
            <Badge className={priorityConfig[task.priority].color}>
              {priorityConfig[task.priority].label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {task.actualCost !== null ? (
              <span className="text-success">€{task.actualCost.toLocaleString()}</span>
            ) : (
              <span>€{task.estimatedCost.toLocaleString()} (stima)</span>
            )}
          </span>
          {task.dueDate && (
            <span className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(task.dueDate), 'dd/MM/yyyy')}
            </span>
          )}
          {task.phase && (
            <Badge variant="secondary" className="text-xs">
              {phaseLabels[task.phase] || task.phase}
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Modifica
      </Button>
    </div>
  );
};

export default ConsultantsManager;
