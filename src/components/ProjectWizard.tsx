import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Rocket, Home, Building2, Zap, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { projectTemplates, type ProjectTemplate } from '@/data/costTemplates';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProjectWizardProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Building2,
  Zap,
};

export const ProjectWizard = ({ userId, open, onClose, onProjectCreated }: ProjectWizardProps) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 1 && !projectName.trim()) {
      toast({
        title: 'Nome progetto richiesto',
        description: 'Inserisci un nome per il tuo progetto',
        variant: 'destructive',
      });
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    setIsCreating(true);

    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          owner_id: userId,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // If a template is selected, create costs and revenues
      if (selectedTemplate && project) {
        // Insert costs
        if (selectedTemplate.costs.length > 0) {
          const costsToInsert = selectedTemplate.costs.map((cost) => ({
            project_id: project.id,
            name: cost.name,
            description: cost.description,
            amount: cost.amount,
            quantity: cost.quantity,
            unit: cost.unit,
            cost_type: cost.cost_type,
            is_recurring: cost.is_recurring,
            recurrence_period: cost.recurrence_period || null,
            created_by: userId,
          }));

          const { error: costsError } = await supabase
            .from('project_costs')
            .insert(costsToInsert);

          if (costsError) console.error('Error inserting costs:', costsError);
        }

        // Insert revenues
        if (selectedTemplate.revenues.length > 0) {
          const revenuesToInsert = selectedTemplate.revenues.map((revenue) => ({
            project_id: project.id,
            name: revenue.name,
            description: revenue.description,
            amount: revenue.amount,
            quantity: revenue.quantity,
            unit: revenue.unit,
            revenue_type: revenue.revenue_type,
            status: revenue.status,
            created_by: userId,
          }));

          const { error: revenuesError } = await supabase
            .from('project_revenues')
            .insert(revenuesToInsert);

          if (revenuesError) console.error('Error inserting revenues:', revenuesError);
        }
      }

      toast({
        title: 'Progetto creato!',
        description: selectedTemplate
          ? `"${projectName}" è stato creato con il template ${selectedTemplate.name}`
          : `"${projectName}" è stato creato con successo`,
      });

      onProjectCreated(project.id);
      onClose();

      // Reset state
      setStep(1);
      setProjectName('');
      setProjectDescription('');
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il progetto',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
            s === step
              ? 'bg-primary text-primary-foreground scale-110'
              : s < step
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {s < step ? <Check className="h-5 w-5" /> : s}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Benvenuto in ResBuilder!</h3>
        <p className="text-muted-foreground mt-2">
          Iniziamo creando il tuo primo progetto. Come vuoi chiamarlo?
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Nome del progetto *</label>
          <Input
            placeholder="Es. Reseller Energia Nord Italia SRL"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Descrizione (opzionale)</label>
          <Textarea
            placeholder="Breve descrizione del progetto..."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Scegli un template</h3>
        <p className="text-muted-foreground mt-2">
          Seleziona un template per pre-popolare costi e ricavi tipici del settore
        </p>
      </div>

      <div className="grid gap-4">
        {projectTemplates.map((template) => {
          const IconComponent = iconMap[template.icon] || Zap;
          const isSelected = selectedTemplate?.id === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-primary bg-primary/5'
              )}
              onClick={() => setSelectedTemplate(isSelected ? null : template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <IconComponent
                      className="h-5 w-5"
                      style={{ color: template.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Selezionato
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{template.costs.length} voci di costo</span>
                  <span>{template.revenues.length} voci di ricavo</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md border-dashed',
            !selectedTemplate && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setSelectedTemplate(null)}
        >
          <CardHeader className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Rocket className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Progetto Vuoto
                  {!selectedTemplate && (
                    <Badge variant="default" className="text-xs">
                      Selezionato
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  Inizia da zero e aggiungi costi/ricavi manualmente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold">Tutto pronto!</h3>
        <p className="text-muted-foreground mt-2">
          Controlla i dettagli e crea il tuo progetto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{projectName}</CardTitle>
          {projectDescription && (
            <CardDescription>{projectDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Template</span>
            <span className="text-sm font-medium">
              {selectedTemplate ? selectedTemplate.name : 'Progetto Vuoto'}
            </span>
          </div>
          {selectedTemplate && (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Voci di costo</span>
                <span className="text-sm font-medium">{selectedTemplate.costs.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Voci di ricavo</span>
                <span className="text-sm font-medium">{selectedTemplate.revenues.length}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Crea il tuo primo progetto</DialogTitle>
          <DialogDescription className="sr-only">
            Wizard guidato per la creazione di un nuovo progetto
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className={step === 1 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext}>
              Avanti
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreateProject} disabled={isCreating}>
              {isCreating ? (
                'Creazione...'
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Crea Progetto
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
