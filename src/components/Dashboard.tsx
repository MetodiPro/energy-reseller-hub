import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, TrendingUp, FileText, Euro, Calendar, Target } from "lucide-react";
import { processSteps, phases } from "@/data/processSteps";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StepProgress } from "@/hooks/useStepProgress";

interface DashboardProps {
  stepProgress: Record<string, StepProgress>;
}

export const Dashboard = ({ stepProgress }: DashboardProps) => {
  const totalSteps = processSteps.length;
  const completedSteps = Object.values(stepProgress).filter(p => p.completed);
  const completedCount = completedSteps.length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  
  const totalEstimatedDays = processSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
  const totalCosts = processSteps.reduce((sum, step) => {
    if (step.costs) {
      return sum + ((step.costs.min + step.costs.max) / 2);
    }
    return sum;
  }, 0);

  // Calculate days remaining based on completed steps
  const completedStepIds = Object.entries(stepProgress)
    .filter(([_, progress]) => progress.completed)
    .map(([stepId]) => stepId);
  
  const remainingDays = processSteps
    .filter(step => !completedStepIds.includes(step.id))
    .reduce((sum, step) => sum + step.estimatedDays, 0);

  // Calculate completed phases
  const completedPhases = phases.filter(phase => {
    const phaseSteps = processSteps.filter(s => s.phase === phase.id);
    return phaseSteps.every(step => completedStepIds.includes(step.id));
  }).length;

  // Prepare data for phase progress chart
  const phaseProgressData = phases.map(phase => {
    const phaseSteps = processSteps.filter(s => s.phase === phase.id);
    const phaseCompletedCount = phaseSteps.filter(s => completedStepIds.includes(s.id)).length;
    const phaseTotal = phaseSteps.length;
    const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
    const phaseCosts = phaseSteps.reduce((sum, step) => {
      if (step.costs) return sum + ((step.costs.min + step.costs.max) / 2);
      return sum;
    }, 0);

    return {
      name: `Fase ${phase.id}`,
      completati: phaseCompletedCount,
      totali: phaseTotal,
      percentuale: Math.round((phaseCompletedCount / phaseTotal) * 100),
      giorni: phaseDays,
      costi: Math.round(phaseCosts)
    };
  });

  // Prepare data for cost breakdown by phase (only phases with started/completed steps)
  const costByPhaseData = phases.map(phase => {
    const phaseSteps = processSteps.filter(s => s.phase === phase.id);
    const startedPhaseSteps = phaseSteps.filter(step => 
      stepProgress[step.id] && (stepProgress[step.id].startDate || stepProgress[step.id].completed)
    );
    
    if (startedPhaseSteps.length === 0) return null;
    
    const phaseCosts = startedPhaseSteps.reduce((sum, step) => {
      if (step.costs) return sum + ((step.costs.min + step.costs.max) / 2);
      return sum;
    }, 0);

    return {
      name: phase.name,
      valore: Math.round(phaseCosts)
    };
  }).filter(Boolean) as { name: string; valore: number }[];

  // Prepare data for priority distribution (only started steps)
  const startedSteps = processSteps.filter(step => 
    stepProgress[step.id] && (stepProgress[step.id].startDate || stepProgress[step.id].completed)
  );
  const priorityData = [
    { name: 'Alta', value: startedSteps.filter(s => s.priority === 'high').length, color: '#ef4444' },
    { name: 'Media', value: startedSteps.filter(s => s.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Bassa', value: startedSteps.filter(s => s.priority === 'low').length, color: '#10b981' }
  ].filter(item => item.value > 0);

  // Prepare timeline data (only phases with activity)
  const timelineData = phases.map((phase, index) => {
    const phaseSteps = processSteps.filter(s => s.phase === phase.id);
    const startedPhaseSteps = phaseSteps.filter(step => 
      stepProgress[step.id] && (stepProgress[step.id].startDate || stepProgress[step.id].completed)
    );
    
    if (startedPhaseSteps.length === 0) return null;
    
    const phaseDays = startedPhaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
    const prevPhaseDays = phases.slice(0, index).reduce((sum, p) => {
      const steps = processSteps.filter(s => s.phase === p.id && 
        stepProgress[s.id] && (stepProgress[s.id].startDate || stepProgress[s.id].completed)
      );
      return sum + steps.reduce((s, step) => s + step.estimatedDays, 0);
    }, 0);

    return {
      fase: phase.name,
      inizio: prevPhaseDays,
      fine: prevPhaseDays + phaseDays,
      durata: phaseDays
    };
  }).filter(Boolean) as { fase: string; inizio: number; fine: number; durata: number }[];

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
                {completedPhases}/{phases.length}
              </h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Rimanente</p>
              <h3 className="text-3xl font-bold mt-2 text-warning">
                {remainingDays}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">di {totalEstimatedDays} giorni totali</p>
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

      {/* Phase Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-custom-lg">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Progresso per Fase</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={phaseProgressData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="completati" fill="hsl(var(--primary))" name="Completati" />
              <Bar dataKey="totali" fill="hsl(var(--muted))" name="Totali" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 shadow-custom-lg">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Distribuzione Priorità</h2>
          </div>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nessuno step iniziato
            </div>
          )}
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <Euro className="h-5 w-5 text-success" />
          <h2 className="text-xl font-bold">Analisi Costi per Fase</h2>
        </div>
        {costByPhaseData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByPhaseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => `€${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="valore" fill="hsl(var(--success))" name="Costi Stimati (€)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nessuno step iniziato
          </div>
        )}
      </Card>

      {/* Timeline Chart */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Timeline Progetto</h2>
        </div>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="fase" className="text-xs" />
              <YAxis label={{ value: 'Giorni', angle: -90, position: 'insideLeft' }} className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="fine" stroke="hsl(var(--primary))" strokeWidth={2} name="Giorno Fine" />
              <Line type="monotone" dataKey="durata" stroke="hsl(var(--accent))" strokeWidth={2} name="Durata (giorni)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nessuno step iniziato
          </div>
        )}
      </Card>

      {/* Phase Overview */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Panoramica Dettagliata Fasi</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {phases.map((phase) => {
            const phaseSteps = processSteps.filter(s => s.phase === phase.id);
            const phaseCompleted = phaseSteps.filter(s => completedStepIds.includes(s.id)).length;
            const phaseProgress = phaseSteps.length > 0 ? (phaseCompleted / phaseSteps.length) * 100 : 0;
            const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
            const phaseCosts = phaseSteps.reduce((sum, step) => {
              if (step.costs) return sum + ((step.costs.min + step.costs.max) / 2);
              return sum;
            }, 0);
            
            return (
              <Card key={phase.id} className="p-4 border-2 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-semibold"
                    style={{ borderColor: phase.color }}
                  >
                    Fase {phase.id}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-lg mb-3">{phase.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Step completati</span>
                    <span className="font-medium">{phaseCompleted}/{phaseSteps.length}</span>
                  </div>
                  
                  <Progress value={phaseProgress} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Durata</span>
                    </div>
                    <span className="font-medium">{phaseDays} giorni</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      <span>Costi</span>
                    </div>
                    <span className="font-medium">€{Math.round(phaseCosts).toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    {phaseProgress === 100 ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Completata</span>
                      </div>
                    ) : phaseProgress > 0 ? (
                      <div className="flex items-center gap-2 text-warning">
                        <Circle className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">In corso</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Circle className="h-4 w-4" />
                        <span className="text-sm font-medium">Non iniziata</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
