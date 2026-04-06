import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, Calculator, Download, FileText } from "lucide-react";
import { processSteps } from "@/data/processSteps";
import { stepCostsData, costCategoryLabels, StepCostCategory } from "@/types/stepCosts";
import { useStepCosts } from "@/hooks/useStepCosts";
import { useExportProcessCostsPDF } from "@/hooks/useExportProcessCostsPDF";
import { useExportProcessCostsDocx } from "@/hooks/useExportProcessCostsDocx";
import { cn } from "@/lib/utils";

interface StartupCostsSummaryProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const StartupCostsSummary = ({ projectId, projectName, commodityType }: StartupCostsSummaryProps) => {
  const { getCostAmount } = useStepCosts(projectId);
  const { exportToPDF } = useExportProcessCostsPDF();
  const { exportToDocx } = useExportProcessCostsDocx();

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

    visibleStepIds.forEach(stepId => {
      const stepData = stepCostsData[stepId];
      if (stepData) {
        stepData.items.forEach(item => {
          const amount = getCostAmount(stepId, item.id);
          grandTotal += amount;
          byCategory[item.category] += amount;
        });
      }
    });

    const topCategories = Object.entries(byCategory)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const stepsWithCosts = visibleStepIds.filter(id => stepCostsData[id]).length;

    return { grandTotal, byCategory, topCategories, stepsWithCosts };
  }, [commodityType, getCostAmount]);

  const handleExportPDF = () => {
    const allCosts: Record<string, Record<string, number>> = {};
    processSteps.forEach(step => {
      const stepData = stepCostsData[step.id];
      if (stepData) {
        allCosts[step.id] = {};
        stepData.items.forEach(item => {
          allCosts[step.id][item.id] = getCostAmount(step.id, item.id);
        });
      }
    });
    exportToPDF(projectName, allCosts);
  };

  const handleExportDocx = () => {
    const allCosts: Record<string, Record<string, number>> = {};
    processSteps.forEach(step => {
      const stepData = stepCostsData[step.id];
      if (stepData) {
        allCosts[step.id] = {};
        stepData.items.forEach(item => {
          allCosts[step.id][item.id] = getCostAmount(step.id, item.id);
        });
      }
    });
    exportToDocx(projectName, allCosts);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20 shadow-custom-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Riepilogo Costi di Avvio
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-2">
              <FileText className="h-4 w-4" />
              Word
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Investimento Totale Stimato</p>
            <p className="text-3xl font-bold text-primary">
              €{costSummary.grandTotal.toLocaleString('it-IT')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Step con costi</p>
            <p className="text-xl font-semibold">{costSummary.stepsWithCosts}</p>
          </div>
        </div>

        {costSummary.topCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Principali Categorie di Spesa
            </p>
            <div className="space-y-2">
              {costSummary.topCategories.map(([category, amount]) => {
                const config = costCategoryLabels[category as StepCostCategory];
                const percentage = (amount / costSummary.grandTotal) * 100;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn("font-medium", config.color)}>
                        {config.label}
                      </span>
                      <span className="font-mono">
                        €{amount.toLocaleString('it-IT')}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t">
          <Calculator className="h-3 w-3 inline mr-1" />
          I costi sono stime indicative e possono variare in base alle specifiche esigenze del progetto.
        </p>
      </CardContent>
    </Card>
  );
};
