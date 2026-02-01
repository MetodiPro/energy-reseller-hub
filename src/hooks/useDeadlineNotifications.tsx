import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { differenceInDays, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RegulatoryDeadline {
  id: string;
  deadline_type: string;
  title: string;
  description: string | null;
  due_date: string;
  reminder_days: number;
  completed: boolean;
}

// Map deadline types to commodity - used for filtering
const deadlineTypeCommodity: Record<string, 'luce' | 'gas' | 'all'> = {
  eve_renewal: 'luce',
  evg_renewal: 'gas',
  arera_data: 'all',
  csea_payment: 'all',
  adm_excise: 'all',
  custom: 'all',
};

const deadlineTypeLabels: Record<string, { emoji: string; label: string }> = {
  eve_renewal: { emoji: '⚡', label: 'EVE' },
  evg_renewal: { emoji: '🔥', label: 'EVG' },
  arera_data: { emoji: '📊', label: 'ARERA' },
  csea_payment: { emoji: '💰', label: 'CSEA' },
  adm_excise: { emoji: '🏛️', label: 'Accise ADM' },
  custom: { emoji: '📅', label: 'Scadenza' },
};

// Helper to filter deadlines by commodity type
const isDeadlineRelevantForCommodity = (deadlineType: string, commodityType?: string | null): boolean => {
  if (!commodityType) return true; // Show all if no commodity type set
  
  const deadlineCommodity = deadlineTypeCommodity[deadlineType] || 'all';
  
  if (deadlineCommodity === 'all') return true;
  if (commodityType === 'dual-fuel') return true;
  if (commodityType === 'solo-luce' && deadlineCommodity === 'luce') return true;
  if (commodityType === 'solo-gas' && deadlineCommodity === 'gas') return true;
  
  return false;
};

export const useDeadlineNotifications = (
  deadlines: RegulatoryDeadline[],
  enabled: boolean = true,
  commodityType?: string | null
) => {
  const notifiedDeadlines = useRef<Set<string>>(new Set());
  const lastCheckTime = useRef<Date>(new Date());

  useEffect(() => {
    if (!enabled || deadlines.length === 0) return;

    const checkDeadlines = () => {
      const now = new Date();
      
      // Only check once per hour to avoid spam
      const hoursSinceLastCheck = (now.getTime() - lastCheckTime.current.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCheck < 1 && notifiedDeadlines.current.size > 0) return;
      
      lastCheckTime.current = now;

      deadlines.forEach((deadline) => {
        if (deadline.completed) return;
        
        // Filter by commodity type - skip notifications for irrelevant deadlines
        if (!isDeadlineRelevantForCommodity(deadline.deadline_type, commodityType)) return;
        const notificationKey = `${deadline.id}-${deadline.due_date}`;
        if (notifiedDeadlines.current.has(notificationKey)) return;

        const dueDate = parseISO(deadline.due_date);
        const daysUntilDue = differenceInDays(dueDate, now);
        const config = deadlineTypeLabels[deadline.deadline_type] || deadlineTypeLabels.custom;

        // Overdue - Critical alert
        if (daysUntilDue < 0) {
          toast({
            title: `${config.emoji} Scadenza Superata!`,
            description: `${deadline.title} è scaduta ${Math.abs(daysUntilDue)} giorni fa (${format(dueDate, 'dd MMM', { locale: it })})`,
            variant: 'destructive',
          });
          notifiedDeadlines.current.add(notificationKey);
          return;
        }

        // Due today
        if (daysUntilDue === 0) {
          toast({
            title: `${config.emoji} Scadenza Oggi!`,
            description: `${deadline.title} scade OGGI`,
            variant: 'destructive',
          });
          notifiedDeadlines.current.add(notificationKey);
          return;
        }

        // Within reminder period
        if (daysUntilDue <= deadline.reminder_days) {
          const variant = daysUntilDue <= 7 ? 'destructive' : 'default';
          toast({
            title: `${config.emoji} Scadenza in arrivo`,
            description: `${deadline.title} - ${daysUntilDue} giorni rimanenti (${format(dueDate, 'dd MMM', { locale: it })})`,
            variant,
          });
          notifiedDeadlines.current.add(notificationKey);
        }
      });
    };

    // Initial check
    checkDeadlines();

    // Check periodically (every hour)
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [deadlines, enabled, commodityType]);

  // Function to manually trigger notification check
  const triggerNotificationCheck = () => {
    lastCheckTime.current = new Date(0); // Reset to force check
    notifiedDeadlines.current.clear(); // Clear to re-show notifications
  };

  // Get upcoming deadlines for display
  const getUpcomingDeadlines = (daysAhead: number = 30) => {
    const now = new Date();
    return deadlines
      .filter(d => !d.completed)
      .map(d => ({
        ...d,
        daysRemaining: differenceInDays(parseISO(d.due_date), now),
      }))
      .filter(d => d.daysRemaining >= 0 && d.daysRemaining <= daysAhead)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  // Get overdue deadlines
  const getOverdueDeadlines = () => {
    const now = new Date();
    return deadlines
      .filter(d => !d.completed)
      .map(d => ({
        ...d,
        daysOverdue: Math.abs(differenceInDays(parseISO(d.due_date), now)),
      }))
      .filter(d => differenceInDays(parseISO(d.due_date), now) < 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  };

  return {
    triggerNotificationCheck,
    getUpcomingDeadlines,
    getOverdueDeadlines,
  };
};
