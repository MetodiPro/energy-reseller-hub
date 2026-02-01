import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationPreferences {
  emailNotifications: boolean;
  deadlineReminders: boolean;
  reminderDaysBefore: number;
  stepCompletionAlerts: boolean;
  financialAlerts: boolean;
  teamUpdates: boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  deadlineReminders: true,
  reminderDaysBefore: 3,
  stepCompletionAlerts: true,
  financialAlerts: true,
  teamUpdates: true,
};

export const useNotificationPreferences = (userId: string | undefined) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            emailNotifications: data.email_notifications,
            deadlineReminders: data.deadline_reminders,
            reminderDaysBefore: data.reminder_days_before,
            stepCompletionAlerts: data.step_completion_alerts,
            financialAlerts: data.financial_alerts,
            teamUpdates: data.team_updates,
          });
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!userId) return;

    setSaving(true);
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          email_notifications: newPreferences.emailNotifications,
          deadline_reminders: newPreferences.deadlineReminders,
          reminder_days_before: newPreferences.reminderDaysBefore,
          step_completion_alerts: newPreferences.stepCompletionAlerts,
          financial_alerts: newPreferences.financialAlerts,
          team_updates: newPreferences.teamUpdates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Preferenze notifiche salvate");
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error("Errore nel salvataggio delle preferenze");
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }, [userId, preferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
  };
};
