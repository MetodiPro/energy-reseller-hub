import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileCheck, 
  Users, 
  FileText, 
  Monitor, 
  Shield, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  MoreHorizontal,
  ChevronDown,
  Pencil,
  RotateCcw,
  Check,
  X,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stepCostsData, costCategoryLabels, StepCostCategory, StepCostItem } from "@/types/stepCosts";
import { useStepCosts } from "@/hooks/useStepCosts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StepCostDetailsProps {
  stepId: string;
  projectId: string | null;
}

const categoryIcons: Record<StepCostCategory, React.ComponentType<{ className?: string }>> = {
  licenze: FileCheck,
  consulenza: Users,
  burocrazia: FileText,
  software: Monitor,
  garanzie: Shield,
  formazione: GraduationCap,
  personale: UserCheck,
  infrastruttura: Building2,
  altro: MoreHorizontal,
};

export const StepCostDetails = ({ stepId, projectId }: StepCostDetailsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  
  const {
    getCostAmount,
    getCostNote,
    isCustomized,
    saveCost,
    resetCost,
    getStepTotal,
  } = useStepCosts(projectId);

  const stepData = stepCostsData[stepId];
  
  if (!stepData) {
    return null;
  }

  const total = getStepTotal(stepId);

  const handleEdit = (item: StepCostItem) => {
    setEditingItem(item.id);
    setEditValue(getCostAmount(stepId, item.id));
  };

  const handleSave = async (itemId: string) => {
    await saveCost(stepId, itemId, editValue);
    setEditingItem(null);
  };

  const handleCancel = () => {
    setEditingItem(null);
  };

  const handleReset = async (itemId: string) => {
    await resetCost(stepId, itemId);
  };

  // Group items by category
  const itemsByCategory = stepData.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<StepCostCategory, StepCostItem[]>);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between p-2 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm font-medium">Costi Stimati</span>
            <Badge variant="outline" className="font-mono">
              €{total.toLocaleString('it-IT')}
            </Badge>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-2">
        <Card className="border-dashed">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stepData.description}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {Object.entries(itemsByCategory).map(([category, items]) => {
              const categoryConfig = costCategoryLabels[category as StepCostCategory];
              const Icon = categoryIcons[category as StepCostCategory];
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", categoryConfig.color)} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {categoryConfig.label}
                    </span>
                  </div>
                  
                  <div className="space-y-1 pl-6">
                    {items.map(item => {
                      const amount = getCostAmount(stepId, item.id);
                      const customized = isCustomized(stepId, item.id);
                      const note = getCostNote(stepId, item.id);
                      const isEditing = editingItem === item.id;
                      
                      return (
                        <div 
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-2 rounded-md -ml-2",
                            customized && "bg-primary/5 border border-primary/20",
                            !customized && "hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm truncate">{item.name}</span>
                                {item.isOptional && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    Opz.
                                  </Badge>
                                )}
                                {(item.notes || note) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <p className="text-xs">{note || item.notes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm">€</span>
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(Number(e.target.value))}
                                  className="w-24 h-7 text-sm"
                                  autoFocus
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleSave(item.id)}
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={handleCancel}
                                >
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className={cn(
                                  "text-sm font-mono",
                                  customized && "font-semibold text-primary"
                                )}>
                                  €{amount.toLocaleString('it-IT')}
                                </span>
                                
                                {projectId && (
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    {customized && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => handleReset(item.id)}
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-sm font-medium">Totale Step</span>
              <Badge className="font-mono text-base px-3">
                €{total.toLocaleString('it-IT')}
              </Badge>
            </div>
            
            <p className="text-[11px] text-muted-foreground">
              Range indicativo: €{stepData.min.toLocaleString('it-IT')} - €{stepData.max.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
