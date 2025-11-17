import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface NotificationSetting {
  id: string;
  stepId: string;
  reminderDate?: Date;
  reminderDaysBefore: number;
  enabled: boolean;
  note?: string;
}

export const useNotificationSettings = (userId: string | undefined) => {
  const [settings, setSettings] = useState<Record<string, NotificationSetting>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        const settingsMap: Record<string, NotificationSetting> = {};
        data?.forEach((setting) => {
          settingsMap[setting.step_id] = {
            id: setting.id,
            stepId: setting.step_id,
            reminderDate: setting.reminder_date ? new Date(setting.reminder_date) : undefined,
            reminderDaysBefore: setting.reminder_days_before || 3,
            enabled: setting.enabled,
            note: setting.note || undefined,
          };
        });

        setSettings(settingsMap);
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare le impostazioni notifiche",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userId]);

  const updateSetting = async (
    stepId: string,
    updates: Partial<Omit<NotificationSetting, 'id' | 'stepId'>>
  ) => {
    if (!userId) return;

    try {
      const existingSetting = settings[stepId];

      if (existingSetting) {
        const { error } = await supabase
          .from('notification_settings')
          .update({
            reminder_date: updates.reminderDate?.toISOString(),
            reminder_days_before: updates.reminderDaysBefore,
            enabled: updates.enabled,
            note: updates.note,
          })
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: userId,
            step_id: stepId,
            reminder_date: updates.reminderDate?.toISOString(),
            reminder_days_before: updates.reminderDaysBefore ?? 3,
            enabled: updates.enabled ?? true,
            note: updates.note,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setSettings(prev => ({
            ...prev,
            [stepId]: {
              id: data.id,
              stepId: data.step_id,
              reminderDate: data.reminder_date ? new Date(data.reminder_date) : undefined,
              reminderDaysBefore: data.reminder_days_before || 3,
              enabled: data.enabled,
              note: data.note || undefined,
            }
          }));
        }
      }

      setSettings(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          id: existingSetting?.id || prev[stepId]?.id || '',
          stepId,
          ...updates,
        }
      }));

      toast({
        title: "Successo",
        description: "Impostazioni notifica aggiornate",
      });
    } catch (error) {
      console.error('Error updating notification setting:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le impostazioni",
        variant: "destructive",
      });
    }
  };

  const deleteSetting = async (stepId: string) => {
    if (!userId) return;

    const setting = settings[stepId];
    if (!setting) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .delete()
        .eq('id', setting.id);

      if (error) throw error;

      setSettings(prev => {
        const newSettings = { ...prev };
        delete newSettings[stepId];
        return newSettings;
      });

      toast({
        title: "Successo",
        description: "Promemoria eliminato",
      });
    } catch (error) {
      console.error('Error deleting notification setting:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il promemoria",
        variant: "destructive",
      });
    }
  };

  return {
    settings,
    loading,
    updateSetting,
    deleteSetting,
  };
};
