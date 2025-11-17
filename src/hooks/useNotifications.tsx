import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { processSteps } from "@/data/processSteps";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, addDays } from "date-fns";

export interface Notification {
  id: string;
  stepId: string;
  type: 'deadline' | 'reminder' | 'priority';
  message: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: Date;
}

export const useNotifications = (userId: string | undefined, stepProgress: Record<string, any>) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId || !stepProgress) return;

    const checkNotifications = () => {
      const newNotifications: Notification[] = [];
      const today = new Date();

      processSteps.forEach((step) => {
        const progress = stepProgress[step.id];
        
        // Skip if step is already completed
        if (progress?.completed) return;

        // Check if step has started
        const hasStarted = progress?.startDate;
        
        // Priority High Reminder
        if (step.priority === 'high' && !hasStarted) {
          newNotifications.push({
            id: `priority-${step.id}`,
            stepId: step.id,
            type: 'priority',
            message: `⚠️ Step ad alta priorità: ${step.title}`,
            priority: 'high',
            read: false,
            createdAt: today,
          });
        }

        // Deadline approaching
        if (hasStarted && progress.startDate) {
          const startDate = parseISO(progress.startDate);
          const expectedEndDate = addDays(startDate, step.estimatedDays);
          const daysRemaining = differenceInDays(expectedEndDate, today);

          if (daysRemaining <= 3 && daysRemaining >= 0) {
            newNotifications.push({
              id: `deadline-${step.id}`,
              stepId: step.id,
              type: 'deadline',
              message: `⏰ Scadenza vicina (${daysRemaining} giorni): ${step.title}`,
              priority: step.priority,
              read: false,
              createdAt: today,
            });
          }

          // Overdue
          if (daysRemaining < 0) {
            newNotifications.push({
              id: `overdue-${step.id}`,
              stepId: step.id,
              type: 'deadline',
              message: `🚨 In ritardo di ${Math.abs(daysRemaining)} giorni: ${step.title}`,
              priority: 'high',
              read: false,
              createdAt: today,
            });
          }
        }

        // Dependencies check
        if (step.dependencies.length > 0) {
          const allDependenciesCompleted = step.dependencies.every(
            (depId) => stepProgress[depId]?.completed
          );
          
          if (allDependenciesCompleted && !hasStarted) {
            newNotifications.push({
              id: `ready-${step.id}`,
              stepId: step.id,
              type: 'reminder',
              message: `✅ Pronto per iniziare: ${step.title}`,
              priority: step.priority,
              read: false,
              createdAt: today,
            });
          }
        }
      });

      setNotifications(newNotifications);

      // Show toast for high priority notifications
      newNotifications
        .filter(n => n.priority === 'high')
        .slice(0, 3)
        .forEach(n => {
          toast({
            title: "Notifica Importante",
            description: n.message,
            variant: n.type === 'deadline' ? 'destructive' : 'default',
          });
        });
    };

    checkNotifications();

    // Check every hour
    const interval = setInterval(checkNotifications, 3600000);

    return () => clearInterval(interval);
  }, [userId, stepProgress]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
};
