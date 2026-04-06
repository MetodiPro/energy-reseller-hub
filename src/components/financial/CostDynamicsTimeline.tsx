import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock, Info } from 'lucide-react';
import { CalendarClock, Info } from 'lucide-react';
import { useStepCosts } from '@/hooks/useStepCosts';
import { ProjectCost } from '@/hooks/useProjectFinancials';
import { stepCostsData, costCategoryLabels, StepCostCategory } from '@/types/stepCosts';
import { stepTimingConfig, phaseDescriptions } from '@/lib/costTimingConfig';
import { processSteps } from '@/data/processSteps';

interface CostDynamicsTimelineProps {
  projectId: string;
  costs: ProjectCost[];
  commodityType?: string | null;
  plannedStartDate?: string | null;
}

const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const CATEGORY_COLORS: Record<string, string> = {
  licenze: 'hsl(217, 91%, 60%)',
  consulenza: 'hsl(271, 91%, 65%)',
  burocrazia: 'hsl(215, 14%, 34%)',
  software: 'hsl(187, 86%, 53%)',
  garanzie: 'hsl(25, 95%, 53%)',
  formazione: 'hsl(142, 71%, 45%)',
  personale: 'hsl(330, 80%, 60%)',
  infrastruttura: 'hsl(38, 92%, 50%)',
  altro: 'hsl(215, 14%, 60%)',
  // Operational cost types
  commercial: 'hsl(340, 82%, 52%)',
  structural: 'hsl(210, 79%, 46%)',
  direct: 'hsl(24, 95%, 53%)',
  indirect: 'hsl(162, 63%, 41%)',
};

export const CostDynamicsTimeline = ({ projectId, costs, commodityType, plannedStartDate }: CostDynamicsTimelineProps) => {
  const { getCostAmount } = useStepCosts(projectId);

  const timelineData = useMemo(() => {
    const MONTHS = 14;

    // Compute base date from planned_start_date
    let baseMonth = new Date().getMonth();
    let baseYear = new Date().getFullYear();
    if (plannedStartDate) {
      const parts = plannedStartDate.split('-');
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    }

    const getMonthLabel = (offset: number) => {
      const totalMonth = baseMonth + offset;
      const m = ((totalMonth % 12) + 12) % 12;
      const y = baseYear + Math.floor(totalMonth / 12);
      return `${MONTHS_IT[m]} ${y}`;
    };

    const monthlyItems: Array<{
      month: number;
      label: string;
      startupCosts: number;
      operationalCosts: number;
      total: number;
      details: Array<{ name: string; amount: number; type: 'startup' | 'operational'; category: string }>;
    }> = [];

    // Build startup costs per month
    const startupByMonth: Record<number, Array<{ name: string; amount: number; category: string }>> = {};
    const visibleStepIds = processSteps
      .filter(step => {
        if (!step.commodityType || step.commodityType === 'all') return true;
        if (!commodityType) return true;
        if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
        return true;
      })
      .map(s => s.id);

    visibleStepIds.forEach(stepId => {
      const stepData = stepCostsData[stepId];
      if (!stepData) return;
      const month = stepTimingConfig[stepId] ?? 0;
      stepData.items.forEach(item => {
        const amount = getCostAmount(stepId, item.id);
        if (amount > 0) {
          if (!startupByMonth[month]) startupByMonth[month] = [];
          startupByMonth[month].push({ name: item.name, amount, category: item.category });
        }
      });
    });

    // Operational costs: recurring = spread monthly, one-time = by date or month 0
    const recurringCosts = costs.filter(c => c.is_recurring);
    const oneTimeCosts = costs.filter(c => !c.is_recurring);
    const recurringMonthly = recurringCosts.reduce((sum, c) => sum + (c.amount * (c.quantity || 1)) / 12, 0);

    for (let m = 0; m < MONTHS; m++) {
      const details: Array<{ name: string; amount: number; type: 'startup' | 'operational'; category: string }> = [];
      let startupTotal = 0;
      let opTotal = 0;

      // Startup items for this month
      (startupByMonth[m] || []).forEach(item => {
        details.push({ ...item, type: 'startup' });
        startupTotal += item.amount;
      });

      // Recurring operational (monthly portion)
      if (recurringMonthly > 0) {
        recurringCosts.forEach(c => {
          const monthlyPortion = (c.amount * (c.quantity || 1)) / 12;
          if (monthlyPortion > 0) {
            details.push({ name: c.name, amount: monthlyPortion, type: 'operational', category: c.cost_type });
          }
        });
        opTotal += recurringMonthly;
      }

      // One-time operational costs: place at month 0 if no date
      oneTimeCosts.forEach(c => {
        const costMonth = c.date ? (() => {
          const d = new Date(c.date!);
          // Simple: if within first 14 months, compute offset; otherwise skip
          return Math.max(0, Math.min(13, d.getMonth())); // simplified
        })() : 0;
        if (costMonth === m) {
          const amount = c.amount * (c.quantity || 1);
          details.push({ name: c.name, amount, type: 'operational', category: c.cost_type });
          opTotal += amount;
        }
      });

      monthlyItems.push({
        month: m,
        label: getMonthLabel(m),
        startupCosts: startupTotal,
        operationalCosts: opTotal,
        total: startupTotal + opTotal,
        details,
      });
    }

    // Compute cumulative
    let cumulative = 0;
    const withCumulative = monthlyItems.map(item => {
      cumulative += item.total;
      return { ...item, cumulative };
    });

    // Chart data by category
    const categoryTotals: Record<string, number> = {};
    withCumulative.forEach(m => {
      m.details.forEach(d => {
        const cat = d.category;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + d.amount;
      });
    });

    const chartData = Object.entries(categoryTotals)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({
        category,
        label: costCategoryLabels[category as StepCostCategory]?.label || 
               (category === 'commercial' ? 'Commerciali' : 
                category === 'structural' ? 'Strutturali' : 
                category === 'direct' ? 'Diretti' : 
                category === 'indirect' ? 'Indiretti' : category),
        total,
        color: CATEGORY_COLORS[category] || 'hsl(215, 14%, 60%)',
      }));

    const grandTotal = cumulative;

    return { monthly: withCumulative, chartData, grandTotal };
  }, [costs, commodityType, getCostAmount, plannedStartDate]);

  if (timelineData.grandTotal === 0) return null;

  return (
    <div className="space-y-6">
      {/* Timeline Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            Dinamica Finanziaria dei Costi
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribuzione temporale mese per mese di tutti i costi di avvio e operativi
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Mese</TableHead>
                  <TableHead className="text-right min-w-[120px]">Costi Avvio</TableHead>
                  <TableHead className="text-right min-w-[120px]">Costi Operativi</TableHead>
                  <TableHead className="text-right min-w-[120px] font-bold">Totale Mese</TableHead>
                  <TableHead className="text-right min-w-[120px]">Cumulativo</TableHead>
                  <TableHead className="min-w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timelineData.monthly.map(row => {
                  if (row.total === 0 && row.month > 5) return null; // skip empty late months
                  return (
                    <TableRow key={row.month} className={row.total > 0 ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">
                        <div>
                          <span className="text-foreground">{row.label}</span>
                          {phaseDescriptions[row.month] && (
                            <p className="text-xs text-muted-foreground">{phaseDescriptions[row.month]}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.startupCosts > 0 ? formatCurrency(row.startupCosts) : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.operationalCosts > 0 ? formatCurrency(row.operationalCosts) : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-foreground">
                        {row.total > 0 ? formatCurrency(row.total) : '–'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-primary font-semibold">
                        {formatCurrency(row.cumulative)}
                      </TableCell>
                      <TableCell>
                        {row.details.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <div className="space-y-1">
                                  {row.details.map((d, i) => (
                                    <div key={i} className="flex justify-between gap-4 text-xs">
                                      <span className={d.type === 'startup' ? 'text-primary' : 'text-muted-foreground'}>
                                        {d.name}
                                      </span>
                                      <span className="font-mono font-medium whitespace-nowrap">
                                        {formatCurrency(d.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                  <TableCell className="text-foreground">TOTALE</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(timelineData.monthly.reduce((s, r) => s + r.startupCosts, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(timelineData.monthly.reduce((s, r) => s + r.operationalCosts, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-foreground">
                    {formatCurrency(timelineData.grandTotal)}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Chart by category */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ripartizione per Categoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribuzione complessiva dei costi per tipologia di spesa
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData.chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="total" name="Importo" radius={[0, 4, 4, 0]}>
                  {timelineData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
