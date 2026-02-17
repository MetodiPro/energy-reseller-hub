import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Shield, 
  Users, 
  Settings,
  Building2,
  Zap,
  FileText,
  DollarSign,
  Phone,
  Download,
  Upload,
  Image,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processSteps } from '@/data/processSteps';
import type { StepProgress } from '@/hooks/useStepProgress';
import { useContractPackage } from '@/hooks/useContractPackage';
import { useProjectLogo } from '@/hooks/useProjectLogo';

interface PreLaunchChecklistProps {
  stepProgress: Record<string, StepProgress>;
  project: {
    id?: string;
    name?: string;
    eve_license_date: string | null;
    evg_license_date: string | null;
    arera_code: string | null;
    wholesaler_name: string | null;
    go_live_date: string | null;
    status: string;
    market_type: string | null;
    regions: string[] | null;
    commodity_type?: string | null;
    logo_url?: string | null;
  } | null;
  hasDocuments: boolean;
  hasCosts: boolean;
  hasTeamMembers: boolean;
  projectId?: string | null;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  category: 'legal' | 'administrative' | 'technical' | 'operational' | 'commercial';
  isMet: boolean;
  severity: 'critical' | 'important' | 'recommended';
}

const categoryConfig = {
  legal: { icon: Shield, label: 'Legale', color: 'text-red-500' },
  administrative: { icon: FileCheck, label: 'Amministrativo', color: 'text-blue-500' },
  technical: { icon: Settings, label: 'Tecnico', color: 'text-purple-500' },
  operational: { icon: Zap, label: 'Operativo', color: 'text-orange-500' },
  commercial: { icon: Users, label: 'Commerciale', color: 'text-green-500' },
};

const severityConfig = {
  critical: { label: 'Critico', color: 'bg-destructive text-destructive-foreground' },
  important: { label: 'Importante', color: 'bg-warning text-warning-foreground' },
  recommended: { label: 'Consigliato', color: 'bg-muted text-muted-foreground' },
};

// Critical steps that must be completed before go-live
const criticalStepIds = [
  'step-1-1', // Costituzione SRL
  'step-2-1', // Iscrizione Registro Imprese
  'step-2-2', // PEC e Firma Digitale
  'step-3-1', // EVE
  'step-3-2', // ARERA
  'step-3-6', // CSEA
  'step-4-1', // Grossista
  'step-4-3', // Accise ADM
];

const importantStepIds = [
  'step-3-1b', // EVG (se vendi gas)
  'step-3-3', // Obblighi ARERA
  'step-3-4', // Portale Offerte
  'step-3-5', // Codice Condotta
  'step-4-2', // SII
];

export const PreLaunchChecklist = ({ 
  stepProgress, 
  project, 
  hasDocuments, 
  hasCosts, 
  hasTeamMembers,
  projectId
}: PreLaunchChecklistProps) => {
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [loadingChecks, setLoadingChecks] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { generatePackage, generating } = useContractPackage();
  const { uploadLogo, removeLogo, uploading: logoUploading } = useProjectLogo(
    project ? { id: project.id || '', name: project.name || '', description: null, owner_id: '', commodity_type: project.commodity_type || null, planned_start_date: null, go_live_date: project.go_live_date, logo_url: project.logo_url || null, created_at: '', updated_at: '' } : null
  );

  // Load manual checks from DB
  useEffect(() => {
    if (!projectId) {
      setManualChecks({});
      setLoadingChecks(false);
      return;
    }
    const fetchChecks = async () => {
      const { data } = await supabase
        .from('prelaunch_manual_checks')
        .select('check_id, checked')
        .eq('project_id', projectId);
      const checksMap: Record<string, boolean> = {};
      data?.forEach(row => { checksMap[row.check_id] = row.checked; });
      setManualChecks(checksMap);
      setLoadingChecks(false);
    };
    fetchChecks();
  }, [projectId]);

  const checkItems = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // Step-based checks (critical)
    criticalStepIds.forEach(stepId => {
      const step = processSteps.find(s => s.id === stepId);
      if (step) {
        items.push({
          id: `step-${stepId}`,
          label: step.title,
          description: step.description,
          category: step.category,
          isMet: !!stepProgress[stepId]?.completed,
          severity: 'critical',
        });
      }
    });

    // Step-based checks (important)
    importantStepIds.forEach(stepId => {
      const step = processSteps.find(s => s.id === stepId);
      if (step) {
        items.push({
          id: `step-${stepId}`,
          label: step.title,
          description: step.description,
          category: step.category,
          isMet: !!stepProgress[stepId]?.completed,
          severity: 'important',
        });
      }
    });

    // Project configuration checks
    items.push({
      id: 'eve-license',
      label: 'Iscrizione EVE registrata',
      description: 'Data iscrizione Elenco Venditori Energia Elettrica',
      category: 'administrative',
      isMet: !!project?.eve_license_date,
      severity: 'critical',
    });

    items.push({
      id: 'arera-code',
      label: 'Codice Operatore ARERA',
      description: 'Codice identificativo operatore presso ARERA',
      category: 'administrative',
      isMet: !!project?.arera_code,
      severity: 'critical',
    });

    items.push({
      id: 'wholesaler',
      label: 'Grossista Partner definito',
      description: 'Contratto con Utente del Dispacciamento (grossista)',
      category: 'commercial',
      isMet: !!project?.wholesaler_name,
      severity: 'critical',
    });

    items.push({
      id: 'market-type',
      label: 'Mercato target definito',
      description: 'Tipologia di clientela (residenziale, business, misto)',
      category: 'commercial',
      isMet: !!project?.market_type,
      severity: 'important',
    });

    items.push({
      id: 'regions',
      label: 'Regioni operative definite',
      description: 'Aree geografiche di operatività',
      category: 'commercial',
      isMet: (project?.regions?.length ?? 0) > 0,
      severity: 'important',
    });

    items.push({
      id: 'go-live-date',
      label: 'Data Go-Live pianificata',
      description: 'Data prevista per avvio operativo',
      category: 'operational',
      isMet: !!project?.go_live_date,
      severity: 'important',
    });

    // Document and team checks
    items.push({
      id: 'documents',
      label: 'Documentazione caricata',
      description: 'Almeno un documento caricato nel sistema',
      category: 'administrative',
      isMet: hasDocuments,
      severity: 'recommended',
    });

    items.push({
      id: 'costs',
      label: 'Budget e costi definiti',
      description: 'Analisi finanziaria del progetto',
      category: 'operational',
      isMet: hasCosts,
      severity: 'recommended',
    });

    items.push({
      id: 'team',
      label: 'Team progetto definito',
      description: 'Almeno un membro del team assegnato',
      category: 'operational',
      isMet: hasTeamMembers,
      severity: 'recommended',
    });

    // Manual operational checks
    const manualOperationalChecks = [
      { id: 'crm-configured', label: 'Sistema CRM/Billing configurato', description: 'Software per gestione clienti e fatturazione' },
      { id: 'call-center', label: 'Call Center attivo', description: 'Servizio assistenza clienti operativo' },
      { id: 'contracts-ready', label: 'Modelli contrattuali pronti', description: 'Template contratti conformi a normativa' },
      { id: 'pricing-defined', label: 'Listino prezzi definito', description: 'Offerte commerciali pronte per pubblicazione' },
      { id: 'staff-trained', label: 'Personale formato', description: 'Training su normativa e procedure operative' },
    ];

    manualOperationalChecks.forEach(check => {
      items.push({
        id: check.id,
        label: check.label,
        description: check.description,
        category: 'operational',
        isMet: !!manualChecks[check.id],
        severity: 'recommended',
      });
    });

    return items;
  }, [stepProgress, project, hasDocuments, hasCosts, hasTeamMembers, manualChecks]);

  const toggleManualCheck = useCallback(async (id: string) => {
    if (!projectId) return;
    const newValue = !manualChecks[id];
    setManualChecks(prev => ({ ...prev, [id]: newValue }));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase
      .from('prelaunch_manual_checks')
      .upsert({
        project_id: projectId,
        check_id: id,
        checked: newValue,
        checked_by: user.id,
      }, { onConflict: 'project_id,check_id' });
  }, [projectId, manualChecks]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, CheckItem[]> = {};
    checkItems.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checkItems]);

  // Statistics
  const stats = useMemo(() => {
    const critical = checkItems.filter(i => i.severity === 'critical');
    const important = checkItems.filter(i => i.severity === 'important');
    const recommended = checkItems.filter(i => i.severity === 'recommended');

    return {
      total: checkItems.length,
      completed: checkItems.filter(i => i.isMet).length,
      criticalCompleted: critical.filter(i => i.isMet).length,
      criticalTotal: critical.length,
      importantCompleted: important.filter(i => i.isMet).length,
      importantTotal: important.length,
      recommendedCompleted: recommended.filter(i => i.isMet).length,
      recommendedTotal: recommended.length,
    };
  }, [checkItems]);

  const isReadyForLaunch = stats.criticalCompleted === stats.criticalTotal;
  const overallProgress = (stats.completed / stats.total) * 100;

  return (
    <div className="space-y-6">
      {/* Launch Status */}
      <Card className={cn(
        "border-2",
        isReadyForLaunch ? "border-success bg-success/5" : "border-warning bg-warning/5"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              isReadyForLaunch ? "bg-success/20" : "bg-warning/20"
            )}>
              {isReadyForLaunch ? (
                <Rocket className="h-8 w-8 text-success" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                "text-xl font-bold",
                isReadyForLaunch ? "text-success" : "text-warning"
              )}>
                {isReadyForLaunch ? "Pronto per il Go-Live! 🚀" : "Prerequisiti da completare"}
              </h3>
              <p className="text-muted-foreground">
                {isReadyForLaunch 
                  ? "Tutti i requisiti critici sono soddisfatti. Puoi procedere con il lancio operativo."
                  : `${stats.criticalTotal - stats.criticalCompleted} requisiti critici mancanti`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{Math.round(overallProgress)}%</p>
              <p className="text-sm text-muted-foreground">completato</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Critici</span>
              </div>
              <span className="text-sm">{stats.criticalCompleted}/{stats.criticalTotal}</span>
            </div>
            <Progress value={(stats.criticalCompleted / stats.criticalTotal) * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Importanti</span>
              </div>
              <span className="text-sm">{stats.importantCompleted}/{stats.importantTotal}</span>
            </div>
            <Progress value={(stats.importantCompleted / stats.importantTotal) * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Consigliati</span>
              </div>
              <span className="text-sm">{stats.recommendedCompleted}/{stats.recommendedTotal}</span>
            </div>
            <Progress value={(stats.recommendedCompleted / stats.recommendedTotal) * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Checklist by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Checklist Pre-Launch
          </CardTitle>
          <CardDescription>
            Verifica tutti i requisiti prima del go-live operativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={Object.keys(itemsByCategory)} className="space-y-2">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig];
              const Icon = config.icon;
              const completedCount = items.filter(i => i.isMet).length;

              return (
                <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline" className="ml-2">
                        {completedCount}/{items.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {items.map((item) => {
                        const isManual = ['crm-configured', 'call-center', 'contracts-ready', 'pricing-defined', 'staff-trained'].includes(item.id);
                        
                        return (
                          <div 
                            key={item.id} 
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg transition-colors",
                              item.isMet ? "bg-success/5" : "bg-muted/50"
                            )}
                          >
                            {isManual ? (
                              <Checkbox 
                                id={item.id}
                                checked={item.isMet}
                                onCheckedChange={() => toggleManualCheck(item.id)}
                                className="mt-0.5"
                              />
                            ) : (
                              <div className="mt-0.5">
                                {item.isMet ? (
                                  <CheckCircle2 className="h-5 w-5 text-success" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="flex-1">
                              <Label 
                                htmlFor={isManual ? item.id : undefined}
                                className={cn(
                                  "text-sm font-medium cursor-pointer",
                                  item.isMet && "text-success"
                                )}
                              >
                                {item.label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            </div>
                            <Badge className={severityConfig[item.severity].color}>
                              {severityConfig[item.severity].label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contract Package Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Plico Contrattuale
          </CardTitle>
          <CardDescription>
            Genera il pacchetto documentale completo per il cliente finale: PDA, CTE, Condizioni Generali e Scheda Sintetica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            {project?.logo_url ? (
              <img
                src={project.logo_url}
                alt="Logo brand"
                className="h-14 w-14 object-contain rounded-md border border-border bg-background p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-muted">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">Logo del brand</p>
              <p className="text-xs text-muted-foreground">
                {project?.logo_url
                  ? 'Il logo verrà inserito in tutti i documenti del plico.'
                  : 'Carica il logo del fornitore per brandizzare i documenti contrattuali.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1.5">{project?.logo_url ? 'Cambia' : 'Carica'}</span>
              </Button>
              {project?.logo_url && (
                <Button variant="ghost" size="sm" onClick={removeLogo} disabled={logoUploading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              if (!project) return;
              generatePackage({
                projectName: project.name || 'Reseller',
                logoUrl: project.logo_url || null,
                commodityType: project.commodity_type || null,
                companyName: project.name,
                areaCode: project.arera_code || undefined,
                wholesalerName: project.wholesaler_name || undefined,
              });
            }}
            disabled={generating}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generazione in corso...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Genera Plico Contrattuale (ZIP)</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Include: PDA, CTE, Condizioni Generali di Fornitura, Scheda Sintetica di Confrontabilità
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
