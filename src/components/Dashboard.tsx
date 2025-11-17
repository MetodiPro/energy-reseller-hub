import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, TrendingUp, FileText, Euro } from "lucide-react";
import { processSteps, phases } from "@/data/processSteps";
import { useState } from "react";

export const Dashboard = () => {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  const totalSteps = processSteps.length;
  const completedCount = completedSteps.length;
  const progressPercentage = (completedCount / totalSteps) * 100;
  
  const totalEstimatedDays = processSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
  const totalCosts = processSteps.reduce((sum, step) => {
    if (step.costs) {
      return sum + ((step.costs.min + step.costs.max) / 2);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-primary shadow-custom-lg hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progresso Totale</p>
              <h3 className="text-3xl font-bold mt-2 bg-gradient-primary bg-clip-text text-transparent">
                {completedCount}/{totalSteps}
              </h3>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <Progress value={progressPercentage} className="mt-4" />
        </Card>

        <Card className="p-6 border-l-4 border-l-accent shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fasi Completate</p>
              <h3 className="text-3xl font-bold mt-2 text-accent">
                0/{phases.length}
              </h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Stimato</p>
              <h3 className="text-3xl font-bold mt-2 text-warning">
                {totalEstimatedDays}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">giorni totali</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-success shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Investimento</p>
              <h3 className="text-3xl font-bold mt-2 text-success">
                €{Math.round(totalCosts).toLocaleString()}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">costi stimati</p>
            </div>
            <Euro className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Phase Overview */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Panoramica Fasi</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {phases.map((phase) => {
            const phaseSteps = processSteps.filter(s => s.phase === phase.id);
            const phaseCompleted = phaseSteps.filter(s => completedSteps.includes(s.id)).length;
            const phaseProgress = (phaseCompleted / phaseSteps.length) * 100;
            
            return (
              <Card key={phase.id} className="p-4 border-2 hover:border-primary transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Fase {phase.id}
                  </Badge>
                  {phaseProgress === 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : phaseProgress > 0 ? (
                    <Clock className="h-5 w-5 text-warning" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                  {phase.name}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{phaseCompleted}/{phaseSteps.length} step</span>
                    <span>{Math.round(phaseProgress)}%</span>
                  </div>
                  <Progress value={phaseProgress} className="h-2" />
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
