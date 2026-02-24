import { useEffect, useRef, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTaxFlows, TaxFlowsSummary } from './useTaxFlows';
import { addMonths, format, differenceInDays, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export interface TaxDeadline {
  id: string;
  type: 'f24_iva' | 'accise_adm' | 'oneri_dso';
  title: string;
  description: string;
  dueDate: Date;
  amount: number;
  daysRemaining: number;
  isOverdue: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface TaxAlertsConfig {
  enabled: boolean;
  reminderDaysBefore: number;
}

const DEFAULT_CONFIG: TaxAlertsConfig = {
  enabled: true,
  reminderDaysBefore: 7,
};

// F24 is due by the 16th of the following month
const F24_DUE_DAY = 16;

// Accise quarterly deadlines (month index 0-11)
// Q1: Jan-Mar -> April 16th
// Q2: Apr-Jun -> July 16th
// Q3: Jul-Sep -> October 16th
// Q4: Oct-Dec -> January 16th (next year)
const ACCISE_QUARTERS = [
  { quarter: 'Q1', dueMonth: 3, dueDay: 16 },   // April 16
  { quarter: 'Q2', dueMonth: 6, dueDay: 16 },   // July 16
  { quarter: 'Q3', dueMonth: 9, dueDay: 16 },   // October 16
  { quarter: 'Q4', dueMonth: 0, dueDay: 16 },   // January 16 (next year)
];

interface UseTaxAlertsOptions {
  sharedTaxFlows?: { taxFlows: TaxFlowsSummary; loading: boolean };
}

export const useTaxAlerts = (
  projectId: string | null,
  startDate: Date,
  ivaRegime: 'monthly' | 'quarterly' = 'monthly',
  config: TaxAlertsConfig = DEFAULT_CONFIG,
  options?: UseTaxAlertsOptions
) => {
  const ownTaxHook = useTaxFlows(options?.sharedTaxFlows ? null : projectId);
  const taxFlows = options?.sharedTaxFlows?.taxFlows ?? ownTaxHook.taxFlows;
  const loading = options?.sharedTaxFlows?.loading ?? ownTaxHook.loading;
  const notifiedDeadlines = useRef<Set<string>>(new Set());
  const lastCheckTime = useRef<Date>(new Date(0));

  // Generate upcoming tax deadlines based on tax flows data
  const upcomingDeadlines = useMemo((): TaxDeadline[] => {
    if (!taxFlows.hasData || loading) return [];

    const now = new Date();
    const deadlines: TaxDeadline[] = [];

    taxFlows.monthlyData.forEach((month, index) => {
      // Calculate actual month/year
      const monthDate = addMonths(startDate, index);
      
      // F24 IVA deadline (16th of next month)
      if (month.ivaPayment > 0) {
        const f24DueDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          F24_DUE_DAY
        );
        
        // Adjust for quarterly regime
        if (ivaRegime === 'quarterly') {
          // Quarterly F24 is due on 16th of month after quarter end
          const quarterMonth = Math.floor(monthDate.getMonth() / 3) * 3 + 2; // Last month of quarter
          if (monthDate.getMonth() === quarterMonth) {
            const daysRemaining = differenceInDays(f24DueDate, now);
            
            deadlines.push({
              id: `f24-${format(monthDate, 'yyyy-MM')}`,
              type: 'f24_iva',
              title: `F24 IVA ${format(monthDate, 'MMMM yyyy', { locale: it })}`,
              description: `Versamento IVA trimestrale periodo ${format(monthDate, 'MMMM yyyy', { locale: it })}`,
              dueDate: f24DueDate,
              amount: month.ivaPayment,
              daysRemaining,
              isOverdue: daysRemaining < 0,
              priority: daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
            });
          }
        } else {
          // Monthly F24
          const daysRemaining = differenceInDays(f24DueDate, now);
          
          deadlines.push({
            id: `f24-${format(monthDate, 'yyyy-MM')}`,
            type: 'f24_iva',
            title: `F24 IVA ${format(monthDate, 'MMMM yyyy', { locale: it })}`,
            description: `Versamento IVA mensile periodo ${format(monthDate, 'MMMM yyyy', { locale: it })}`,
            dueDate: f24DueDate,
            amount: month.ivaPayment,
            daysRemaining,
            isOverdue: daysRemaining < 0,
            priority: daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
          });
        }
      }

      // Accise ADM deadline (quarterly)
      if (month.acciseVersamento > 0) {
        const quarterEndMonth = monthDate.getMonth();
        const quarterInfo = ACCISE_QUARTERS.find(q => {
          // Match quarter end month
          const qEndMonth = q.dueMonth === 0 ? 11 : q.dueMonth - 4; // Map due month to quarter end
          return (q.quarter === 'Q1' && [0, 1, 2].includes(quarterEndMonth)) ||
                 (q.quarter === 'Q2' && [3, 4, 5].includes(quarterEndMonth)) ||
                 (q.quarter === 'Q3' && [6, 7, 8].includes(quarterEndMonth)) ||
                 (q.quarter === 'Q4' && [9, 10, 11].includes(quarterEndMonth));
        });

        if (quarterInfo) {
          let dueYear = monthDate.getFullYear();
          if (quarterInfo.dueMonth === 0 && monthDate.getMonth() >= 9) {
            dueYear++; // Q4 payment is in January next year
          }
          
          const acciseDueDate = new Date(dueYear, quarterInfo.dueMonth, quarterInfo.dueDay);
          const daysRemaining = differenceInDays(acciseDueDate, now);

          deadlines.push({
            id: `accise-${quarterInfo.quarter}-${dueYear}`,
            type: 'accise_adm',
            title: `Accise ADM ${quarterInfo.quarter} ${monthDate.getFullYear()}`,
            description: `Versamento accise trimestrale ${quarterInfo.quarter} ${monthDate.getFullYear()}`,
            dueDate: acciseDueDate,
            amount: month.acciseVersamento,
            daysRemaining,
            isOverdue: daysRemaining < 0,
            priority: daysRemaining < 0 ? 'high' : daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
          });
        }
      }
    });

    // Sort by due date and filter to upcoming/overdue only
    return deadlines
      .filter(d => d.daysRemaining >= -30 && d.daysRemaining <= 60) // Show 30 days past due to 60 days ahead
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [taxFlows, loading, startDate, ivaRegime]);

  // Show toast notifications for upcoming deadlines
  useEffect(() => {
    if (!config.enabled || upcomingDeadlines.length === 0) return;

    const now = new Date();
    const hoursSinceLastCheck = (now.getTime() - lastCheckTime.current.getTime()) / (1000 * 60 * 60);
    
    // Only check once per hour
    if (hoursSinceLastCheck < 1 && notifiedDeadlines.current.size > 0) return;
    lastCheckTime.current = now;

    upcomingDeadlines.forEach(deadline => {
      const notificationKey = `${deadline.id}-${deadline.dueDate.toISOString()}`;
      if (notifiedDeadlines.current.has(notificationKey)) return;

      // Show notification based on priority
      if (deadline.isOverdue) {
        toast({
          title: `🚨 Scadenza Superata!`,
          description: `${deadline.title} - Importo: €${deadline.amount.toLocaleString('it-IT')}`,
          variant: 'destructive',
        });
        notifiedDeadlines.current.add(notificationKey);
      } else if (deadline.daysRemaining <= config.reminderDaysBefore) {
        toast({
          title: deadline.daysRemaining === 0 
            ? `⚠️ Scadenza Oggi!` 
            : `📅 Scadenza tra ${deadline.daysRemaining} giorni`,
          description: `${deadline.title} - Importo: €${deadline.amount.toLocaleString('it-IT')}`,
          variant: deadline.daysRemaining <= 3 ? 'destructive' : 'default',
        });
        notifiedDeadlines.current.add(notificationKey);
      }
    });
  }, [upcomingDeadlines, config]);

  // Get deadlines by type
  const getDeadlinesByType = (type: TaxDeadline['type']) => {
    return upcomingDeadlines.filter(d => d.type === type);
  };

  // Get overdue deadlines
  const overdueDeadlines = useMemo(() => {
    return upcomingDeadlines.filter(d => d.isOverdue);
  }, [upcomingDeadlines]);

  // Get urgent deadlines (within 7 days)
  const urgentDeadlines = useMemo(() => {
    return upcomingDeadlines.filter(d => !d.isOverdue && d.daysRemaining <= 7);
  }, [upcomingDeadlines]);

  // Manually trigger notification check
  const triggerAlertCheck = () => {
    lastCheckTime.current = new Date(0);
    notifiedDeadlines.current.clear();
  };

  return {
    upcomingDeadlines,
    overdueDeadlines,
    urgentDeadlines,
    getDeadlinesByType,
    triggerAlertCheck,
    loading,
  };
};
