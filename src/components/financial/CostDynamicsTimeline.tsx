import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock, Info } from 'lucide-react';
import { useStepCosts } from '@/hooks/useStepCosts';
import { ProjectCost } from '@/hooks/useProjectFinancials';
import { stepCostsData } from '@/types/stepCosts';
import { stepTimingConfig, phaseDescriptions } from '@/lib/costTimingConfig';
import { processSteps } from '@/data/processSteps';
import { supabase } from '@/integrations/supabase/client';

interface CostDynamicsTimelineProps {
  projectId: string;
  costs: ProjectCost[];
  commodityType?: string | null;
  plannedStartDate?: string | null;
}

const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);


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

    // Helper: compute month offset from base date for a given date string
    const getMonthOffset = (dateStr: string | null | undefined): number => {
      if (!dateStr) return 0;
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      return (y - baseYear) * 12 + (m - baseMonth);
    };

    // Filter out passthrough costs (energy, transport etc.) - they don't belong here
    const operationalCosts = costs.filter(c => !(c as any).is_passthrough);
    const recurringCosts = operationalCosts.filter(c => c.is_recurring);
    const oneTimeCosts = operationalCosts.filter(c => !c.is_recurring);

    for (let m = 0; m < MONTHS; m++) {
      const details: Array<{ name: string; amount: number; type: 'startup' | 'operational'; category: string }> = [];
      let startupTotal = 0;
      let opTotal = 0;

      // Startup items for this month
      (startupByMonth[m] || []).forEach(item => {
        details.push({ ...item, type: 'startup' });
        startupTotal += item.amount;
      });

      // Recurring operational: only from the month the cost starts
      recurringCosts.forEach(c => {
        const startMonth = Math.max(0, getMonthOffset(c.date));
        if (m >= startMonth) {
          const monthlyPortion = (c.amount * (c.quantity || 1)) / 12;
          if (monthlyPortion > 0) {
            details.push({ name: c.name, amount: monthlyPortion, type: 'operational', category: c.cost_type });
            opTotal += monthlyPortion;
          }
        }
      });

      // One-time operational costs: place at their date month or month 0
      oneTimeCosts.forEach(c => {
        const costMonth = Math.max(0, Math.min(13, getMonthOffset(c.date)));
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

    const grandTotal = cumulative;

    return { monthly: withCumulative, grandTotal };
  }, [costs, commodityType, getCostAmount, plannedStartDate]);

  if (timelineData.grandTotal === 0) return null;

  return (
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
                if (row.total === 0 && row.month > 5) return null;
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
  );
};
