import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sun, Wind, Leaf, FileSpreadsheet, Check, Plus } from 'lucide-react';
import { projectTemplates, ProjectTemplate, CostTemplateItem, RevenueTemplateItem } from '@/data/costTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostTemplateSelectorProps {
  projectId: string;
  onTemplateApplied: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sun,
  Wind,
  Leaf,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CostTemplateSelector = ({ projectId, onTemplateApplied }: CostTemplateSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedCosts, setSelectedCosts] = useState<Set<number>>(new Set());
  const [selectedRevenues, setSelectedRevenues] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    // Select all items by default
    setSelectedCosts(new Set(template.costs.map((_, i) => i)));
    setSelectedRevenues(new Set(template.revenues.map((_, i) => i)));
  };

  const toggleCost = (index: number) => {
    const newSet = new Set(selectedCosts);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedCosts(newSet);
  };

  const toggleRevenue = (index: number) => {
    const newSet = new Set(selectedRevenues);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRevenues(newSet);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Errore',
        description: 'Devi essere autenticato',
        variant: 'destructive',
      });
      return;
    }

    setIsApplying(true);
    
    try {
      // Insert selected costs
      const costsToInsert = selectedTemplate.costs
        .filter((_, i) => selectedCosts.has(i))
        .map(cost => ({
          project_id: projectId,
          name: cost.name,
          description: cost.description,
          amount: cost.amount,
          quantity: cost.quantity,
          unit: cost.unit,
          cost_type: cost.cost_type,
          is_recurring: cost.is_recurring,
          recurrence_period: cost.recurrence_period || null,
          created_by: user.id,
        }));

      if (costsToInsert.length > 0) {
        const { error: costsError } = await supabase
          .from('project_costs')
          .insert(costsToInsert);
        
        if (costsError) throw costsError;
      }

      // Insert selected revenues
      const revenuesToInsert = selectedTemplate.revenues
        .filter((_, i) => selectedRevenues.has(i))
        .map(revenue => ({
          project_id: projectId,
          name: revenue.name,
          description: revenue.description,
          amount: revenue.amount,
          quantity: revenue.quantity,
          unit: revenue.unit,
          revenue_type: revenue.revenue_type,
          status: revenue.status,
          created_by: user.id,
        }));

      if (revenuesToInsert.length > 0) {
        const { error: revenuesError } = await supabase
          .from('project_revenues')
          .insert(revenuesToInsert);
        
        if (revenuesError) throw revenuesError;
      }

      toast({
        title: 'Template applicato',
        description: `Aggiunti ${costsToInsert.length} costi e ${revenuesToInsert.length} ricavi`,
      });

      setIsOpen(false);
      setSelectedTemplate(null);
      onTemplateApplied();
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile applicare il template',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const calculateTotal = (items: (CostTemplateItem | RevenueTemplateItem)[], selected: Set<number>) => {
    return items
      .filter((_, i) => selected.has(i))
      .reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Applica Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Template Costi Predefiniti</DialogTitle>
          <DialogDescription>
            Seleziona un template di progetto per importare costi e ricavi tipici
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="grid gap-4 py-4">
            {projectTemplates.map((template) => {
              const IconComponent = ICON_MAP[template.icon] || Sun;
              const totalCosts = template.costs.reduce((sum, c) => sum + (c.amount * c.quantity), 0);
              const totalRevenues = template.revenues.reduce((sum, r) => sum + (r.amount * r.quantity), 0);
              
              return (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${template.color}20` }}
                      >
                        <IconComponent className="h-6 w-6" style={{ color: template.color }} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{template.costs.length} voci costo</Badge>
                      <Badge variant="secondary">{template.revenues.length} voci ricavo</Badge>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-destructive">{formatCurrency(totalCosts)}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-green-600">{formatCurrency(totalRevenues)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4"
              onClick={() => setSelectedTemplate(null)}
            >
              ← Torna alla selezione
            </Button>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Costs Column */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-destructive">Costi ({selectedCosts.size}/{selectedTemplate.costs.length})</h4>
                  <span className="text-sm font-medium">
                    {formatCurrency(calculateTotal(selectedTemplate.costs, selectedCosts))}
                  </span>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-2">
                  {selectedTemplate.costs.map((cost, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={selectedCosts.has(index)}
                        onCheckedChange={() => toggleCost(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cost.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{cost.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {cost.cost_type}
                          </Badge>
                          <span className="text-xs">
                            {formatCurrency(cost.amount * cost.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Revenues Column */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-600">Ricavi ({selectedRevenues.size}/{selectedTemplate.revenues.length})</h4>
                  <span className="text-sm font-medium">
                    {formatCurrency(calculateTotal(selectedTemplate.revenues, selectedRevenues))}
                  </span>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-2">
                  {selectedTemplate.revenues.map((revenue, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={selectedRevenues.has(index)}
                        onCheckedChange={() => toggleRevenue(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{revenue.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{revenue.description}</p>
                        <span className="text-xs">
                          {formatCurrency(revenue.amount * revenue.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Margine previsto dal template</p>
                <p className={`text-lg font-bold ${
                  calculateTotal(selectedTemplate.revenues, selectedRevenues) - calculateTotal(selectedTemplate.costs, selectedCosts) >= 0 
                    ? 'text-green-600' 
                    : 'text-destructive'
                }`}>
                  {formatCurrency(
                    calculateTotal(selectedTemplate.revenues, selectedRevenues) - 
                    calculateTotal(selectedTemplate.costs, selectedCosts)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Annulla
          </Button>
          {selectedTemplate && (
            <Button 
              onClick={handleApplyTemplate} 
              disabled={isApplying || (selectedCosts.size === 0 && selectedRevenues.size === 0)}
            >
              {isApplying ? 'Applicando...' : 'Applica Template'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
