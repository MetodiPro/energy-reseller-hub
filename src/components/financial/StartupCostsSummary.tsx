import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Wallet, TrendingUp, Calculator,
  ChevronDown, FileCheck, Users, Monitor, Shield,
  GraduationCap, UserCheck, Building2, MoreHorizontal,
} from "lucide-react";
import { processSteps } from "@/data/processSteps";
import { stepCostsData, costCategoryLabels, StepCostCategory, StepCostItem } from "@/types/stepCosts";
import { useStepCosts } from "@/hooks/useStepCosts";
import { useExportProcessCostsPDF } from "@/hooks/useExportProcessCostsPDF";
import { useExportProcessCostsDocx } from "@/hooks/useExportProcessCostsDocx";
import { cn } from "@/lib/utils";

interface StartupCostsSummaryProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const StartupCostsSummary = ({ projectId, projectName, commodityType }: StartupCostsSummaryProps) => {
  const { getCostAmount } = useStepCosts(projectId);
  const { exportToPDF } = useExportProcessCostsPDF();
  const { exportToDocx } = useExportProcessCostsDocx();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const costSummary = useMemo(() => {
    const visibleStepIds = processSteps
      .filter(step => {
        if (!step.commodityType || step.commodityType === 'all') return true;
        if (!commodityType) return true;
        if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
        return true;
      })
      .map(s => s.id);

    let grandTotal = 0;
    const byCategory: Record<StepCostCategory, number> = {
      licenze: 0, consulenza: 0, burocrazia: 0, software: 0,
      garanzie: 0, formazione: 0, personale: 0, infrastruttura: 0, altro: 0,
    };

    // Collect items per category for drill-down
    const itemsByCategory: Record<StepCostCategory, { item: StepCostItem; stepId: string; stepName: string; amount: number }[]> = {
      licenze: [], consulenza: [], burocrazia: [], software: [],
      garanzie: [], formazione: [], personale: [], infrastruttura: [], altro: [],
    };

    visibleStepIds.forEach(stepId => {
      const stepData = stepCostsData[stepId];
      if (stepData) {
        const step = processSteps.find(s => s.id === stepId);
        stepData.items.forEach(item => {
          const amount = getCostAmount(stepId, item.id);
          grandTotal += amount;
          byCategory[item.category] += amount;
          if (amount > 0) {
            itemsByCategory[item.category].push({
              item,
              stepId,
              stepName: step?.title || stepId,
              amount,
            });
          }
        });
      }
    });

    const topCategories = Object.entries(byCategory)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    const stepsWithCosts = visibleStepIds.filter(id => stepCostsData[id]).length;

    return { grandTotal, byCategory, topCategories, stepsWithCosts, itemsByCategory };
  }, [commodityType, getCostAmount]);

  const handleExportPDF = () => exportToPDF(projectName, commodityType || null, getCostAmount);
  const handleExportDocx = () => exportToDocx(projectName, commodityType || null, getCostAmount);

  const toggleCategory = (category: string) => {
    setExpandedCategory(prev => prev === category ? null : category);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            Riepilogo Costi di Avvio
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary stat */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Investimento Totale Stimato</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {formatCurrency(costSummary.grandTotal)}
          </p>
        </div>

        {/* Categories - clickable */}
        {costSummary.topCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Categorie di Spesa
            </p>
            <div className="space-y-1">
              {costSummary.topCategories.map(([category, amount]) => {
                const config = costCategoryLabels[category as StepCostCategory];
                const Icon = categoryIcons[category as StepCostCategory];
                const percentage = costSummary.grandTotal > 0 ? (amount / costSummary.grandTotal) * 100 : 0;
                const isExpanded = expandedCategory === category;
                const items = costSummary.itemsByCategory[category as StepCostCategory];

                return (
                  <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full rounded-lg border border-border hover:bg-muted/50 transition-colors p-3 text-left">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <span className="text-sm font-medium text-foreground">{config.label}</span>
                            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold font-mono text-foreground">
                              {formatCurrency(amount)}
                            </span>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </div>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 ml-2 mr-2 mb-2 rounded-lg border border-border bg-muted/20 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs">Voce</TableHead>
                              <TableHead className="text-xs">Step di Riferimento</TableHead>
                              <TableHead className="text-xs text-right">Importo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((entry, idx) => (
                              <TableRow key={`${entry.stepId}-${entry.item.id}-${idx}`} className="hover:bg-muted/30">
                                <TableCell className="py-2">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{entry.item.name}</p>
                                    <p className="text-xs text-muted-foreground">{entry.item.description}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="text-xs text-muted-foreground">{entry.stepName}</span>
                                </TableCell>
                                <TableCell className="py-2 text-right font-mono text-sm font-medium">
                                  {formatCurrency(entry.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-3 border-t border-border">
          <Calculator className="h-3 w-3 inline mr-1" />
          I costi sono stime indicative e possono variare in base alle specifiche esigenze del progetto. Clicca su una categoria per vederne il dettaglio.
        </p>
      </CardContent>
    </Card>
  );
};
