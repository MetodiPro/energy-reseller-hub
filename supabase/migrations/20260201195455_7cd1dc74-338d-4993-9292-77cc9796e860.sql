-- Create table for user notification preferences
CREATE TABLE public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean NOT NULL DEFAULT true,
  deadline_reminders boolean NOT NULL DEFAULT true,
  reminder_days_before integer NOT NULL DEFAULT 3,
  step_completion_alerts boolean NOT NULL DEFAULT true,
  financial_alerts boolean NOT NULL DEFAULT true,
  team_updates boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
ON public.user_notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
ON public.user_notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
ON public.user_notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
ON public.user_notification_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();