import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Rocket, Home, Building2, Zap, ArrowRight, ArrowLeft, Check, Sparkles, Info, Users, Landmark, Shield } from 'lucide-react';
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

// Only electricity reseller is supported
const COMMODITY_TYPE = 'solo-luce' as const;

interface TemplateRequirements {
  garanzie: string;
  personale: string;
  investimento: string;
  complessita: 'Bassa' | 'Media' | 'Alta';
}

const templateRequirements: Record<string, TemplateRequirements> = {
  'reseller-residenziale': {
    garanzie: '€25.000 - Fideiussioni standard per grossisti',
    personale: '2-3 risorse: 1 back-office, 1 operatore SII, agenti esterni',
    investimento: '€80.000 - €120.000 primo anno',
    complessita: 'Media',
  },
  'reseller-business': {
    garanzie: '€50.000 - Fideiussioni maggiorate per volumi B2B',
    personale: '4-5 risorse: team back-office, specialista SII, key account manager',
    investimento: '€150.000 - €200.000 primo anno',
    complessita: 'Alta',
  },
  'reseller-misto': {
    garanzie: '€60.000 - Fideiussioni combinate residenziale + business',
    personale: '5-7 risorse: team dedicati per segmento, compliance officer',
    investimento: '€200.000 - €280.000 primo anno',
    complessita: 'Alta',
  },
  'reseller-elettrico-residenziale': {
    garanzie: '€20.000 - Fideiussioni ridotte (solo luce)',
    personale: '1-2 risorse: 1 back-office multifunzione',
    investimento: '€50.000 - €80.000 primo anno',
    complessita: 'Bassa',
  },
};

export const ProjectWizard = ({ userId, open, onClose, onProjectCreated }: ProjectWizardProps) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const totalSteps = 3;

  // Filter templates for electricity only
  const filteredTemplates = useMemo(() => {
    return projectTemplates.filter((t) => t.id.includes('elettrico') || t.id === 'reseller-residenziale' || t.id === 'reseller-business');
  }, []);

  const recommendedTemplateId = 'reseller-elettrico-residenziale';

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
      // Create the project with commodity type
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          owner_id: userId,
          commodity_type: COMMODITY_TYPE,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // If a template is selected, create costs, passthrough costs, and revenues
      if (selectedTemplate && project) {
        // Insert operational costs
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
            is_passthrough: false,
            created_by: userId,
          }));

          const { error: costsError } = await supabase
            .from('project_costs')
            .insert(costsToInsert);

          if (costsError) console.error('Error inserting costs:', costsError);
        }

        // Insert passthrough costs (energia, distribuzione, etc.)
        if (selectedTemplate.passthrough_costs && selectedTemplate.passthrough_costs.length > 0) {
          const passthroughToInsert = selectedTemplate.passthrough_costs.map((cost) => ({
            project_id: project.id,
            name: cost.name,
            description: cost.description,
            amount: cost.amount,
            quantity: cost.quantity,
            unit: cost.unit,
            cost_type: cost.cost_type,
            is_recurring: cost.is_recurring,
            recurrence_period: cost.recurrence_period || null,
            is_passthrough: true,
            passthrough_recipient: cost.passthrough_recipient || null,
            calculation_basis: cost.calculation_basis || null,
            created_by: userId,
          }));

          const { error: passthroughError } = await supabase
            .from('project_costs')
            .insert(passthroughToInsert);

          if (passthroughError) console.error('Error inserting passthrough costs:', passthroughError);
        }

        // Insert revenues (now gross turnover, not margins)
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
            calculation_basis: revenue.calculation_basis || null,
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
        <h3 className="text-xl font-semibold">Benvenuto in Metodi Res Builder!</h3>
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

      <TooltipProvider delayDuration={300}>
        <div className="grid gap-4">
          {filteredTemplates.map((template) => {
            const IconComponent = iconMap[template.icon] || Zap;
            const isSelected = selectedTemplate?.id === template.id;
            const requirements = templateRequirements[template.id];
            const isRecommended = template.id === recommendedTemplateId;

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
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {template.name}
                        {isRecommended && !isSelected && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Consigliato
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selezionato
                          </Badge>
                        )}
                        {requirements && (
                          <Tooltip>
                            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs p-4" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-3">
                                <p className="font-semibold text-sm border-b pb-2">Requisiti {template.name}</p>
                                <div className="flex items-start gap-2">
                                  <Landmark className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium">Garanzie Bancarie</p>
                                    <p className="text-xs text-muted-foreground">{requirements.garanzie}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Users className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium">Personale</p>
                                    <p className="text-xs text-muted-foreground">{requirements.personale}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Landmark className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium">Investimento Stimato</p>
                                    <p className="text-xs text-muted-foreground">{requirements.investimento}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Shield className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium">Complessità</p>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-xs",
                                        requirements.complessita === 'Bassa' && 'border-green-500 text-green-600',
                                        requirements.complessita === 'Media' && 'border-yellow-500 text-yellow-600',
                                        requirements.complessita === 'Alta' && 'border-red-500 text-red-600'
                                      )}
                                    >
                                      {requirements.complessita}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
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
      </TooltipProvider>
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
            <span className="text-sm text-muted-foreground">Tipo di mercato</span>
            <span className="text-sm font-medium">Solo Energia Elettrica</span>
          </div>
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
