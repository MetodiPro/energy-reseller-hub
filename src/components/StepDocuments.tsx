import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Upload, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronRight,
  Check,
  AlertCircle,
  Eye,
  Download,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { processSteps, type ProcessStep } from '@/data/processSteps';
import { DocumentPreview } from './DocumentPreview';

interface StepDocument {
  id: string;
  project_id: string;
  step_id: string;
  document_id: string;
  document: {
    id: string;
    title: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
  };
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
}

interface StepDocumentsProps {
  projectId: string | null;
}

export const StepDocuments = ({ projectId }: StepDocumentsProps) => {
  const [stepDocuments, setStepDocuments] = useState<StepDocument[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Fetch linked documents
      const { data: linkedDocs, error: linkedError } = await supabase
        .from('step_documents')
        .select(`
          id,
          project_id,
          step_id,
          document_id,
          document:documents(id, title, file_name, file_type, file_size, file_path)
        `)
        .eq('project_id', projectId);

      if (linkedError) throw linkedError;

      // Fetch all project documents for linking
      const { data: allDocs, error: docsError } = await supabase
        .from('documents')
        .select('id, title, file_name, file_type, file_size, file_path')
        .eq('project_id', projectId);

      if (docsError) throw docsError;

      setStepDocuments((linkedDocs || []).map(d => ({
        ...d,
        document: Array.isArray(d.document) ? d.document[0] : d.document
      })));
      setAvailableDocuments(allDocs || []);
    } catch (error) {
      console.error('Error fetching step documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const linkDocument = async () => {
    if (!projectId || !selectedStep || !selectedDocumentId) return;

    try {
      const { error } = await supabase
        .from('step_documents')
        .insert({
          project_id: projectId,
          step_id: selectedStep,
          document_id: selectedDocumentId,
        });

      if (error) throw error;

      toast({
        title: 'Documento collegato',
        description: 'Il documento è stato associato allo step',
      });
      setLinkDialogOpen(false);
      setSelectedDocumentId('');
      fetchData();
    } catch (error: any) {
      console.error('Error linking document:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile collegare il documento',
        variant: 'destructive',
      });
    }
  };

  const unlinkDocument = async (stepDocumentId: string) => {
    try {
      const { error } = await supabase
        .from('step_documents')
        .delete()
        .eq('id', stepDocumentId);

      if (error) throw error;

      setStepDocuments(stepDocuments.filter(d => d.id !== stepDocumentId));
      toast({ title: 'Documento scollegato' });
    } catch (error) {
      console.error('Error unlinking document:', error);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStepDocuments = (stepId: string) => {
    return stepDocuments.filter(d => d.step_id === stepId);
  };

  const getStepProgress = (step: ProcessStep) => {
    const linkedDocs = getStepDocuments(step.id);
    const requiredCount = step.documents.length;
    const uploadedCount = linkedDocs.length;
    return requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;
  };

  const openLinkDialog = (stepId: string) => {
    setSelectedStep(stepId);
    setLinkDialogOpen(true);
  };

  // Group steps by phase
  const phases = [...new Set(processSteps.map(s => s.phase))].sort();

  if (!projectId) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun progetto selezionato</h3>
        <p className="text-muted-foreground">Seleziona un progetto per gestire i documenti per step</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  // Calculate overall progress
  const totalRequired = processSteps.reduce((sum, step) => sum + step.documents.length, 0);
  const totalUploaded = stepDocuments.length;
  const overallProgress = totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documenti per Step</h2>
          <p className="text-muted-foreground">Collega i documenti ai relativi step del processo</p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Progresso Documentale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={overallProgress} className="flex-1" />
            <span className="text-lg font-semibold">{overallProgress}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {totalUploaded} di {totalRequired} documenti richiesti collegati
          </p>
        </CardContent>
      </Card>

      {/* Steps by Phase */}
      {phases.map(phase => (
        <Card key={phase}>
          <CardHeader>
            <CardTitle>Fase {phase}</CardTitle>
            <CardDescription>
              {processSteps.filter(s => s.phase === phase).length} step in questa fase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {processSteps
              .filter(step => step.phase === phase)
              .map(step => {
                const linkedDocs = getStepDocuments(step.id);
                const progress = getStepProgress(step);
                const isExpanded = expandedSteps.has(step.id);
                const isComplete = linkedDocs.length >= step.documents.length;

                return (
                  <Collapsible key={step.id} open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
                    <CollapsibleTrigger asChild>
                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors",
                        isComplete ? "bg-success/5 hover:bg-success/10" : "bg-muted/30 hover:bg-muted/50"
                      )}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            isComplete ? "bg-success/10" : "bg-muted"
                          )}>
                            {isComplete ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{step.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {linkedDocs.length}/{step.documents.length} documenti
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={progress} className="w-24" />
                          <Badge variant={isComplete ? 'default' : 'secondary'}>
                            {progress}%
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-12 pr-4 py-4 space-y-4">
                        {/* Required Documents */}
                        <div>
                          <p className="text-sm font-medium mb-2">Documenti Richiesti:</p>
                          <ul className="space-y-1">
                            {step.documents.map((doc, idx) => {
                              const isLinked = linkedDocs.some(ld => 
                                ld.document?.title?.toLowerCase().includes(doc.toLowerCase()) ||
                                doc.toLowerCase().includes(ld.document?.title?.toLowerCase() || '')
                              );
                              return (
                                <li key={idx} className="flex items-center gap-2 text-sm">
                                  {isLinked ? (
                                    <Check className="h-4 w-4 text-success" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className={cn(isLinked && "text-success")}>{doc}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Linked Documents */}
                        {linkedDocs.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Documenti Collegati:</p>
                            <div className="space-y-2">
                              {linkedDocs.map((ld) => (
                                <div key={ld.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{ld.document?.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {ld.document?.file_type}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewDocument(ld.document);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (ld.document) downloadDocument(ld.document);
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unlinkDocument(ld.id);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Link Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLinkDialog(step.id);
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Collega Documento
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
          </CardContent>
        </Card>
      ))}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collega Documento allo Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableDocuments.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Nessun documento disponibile. Carica prima dei documenti nella sezione Documenti.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={linkDocument} 
                  className="w-full"
                  disabled={!selectedDocumentId}
                >
                  Collega Documento
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview */}
      <DocumentPreview
        document={previewDocument}
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={() => {
          if (previewDocument) downloadDocument(previewDocument);
        }}
      />
    </div>
  );
};
