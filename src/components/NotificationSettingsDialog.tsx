import { useState } from "react";
import { Bell, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProcessStep } from "@/data/processSteps";
import { NotificationSetting } from "@/hooks/useNotificationSettings";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface NotificationSettingsDialogProps {
  step: ProcessStep;
  setting?: NotificationSetting;
  onUpdateSetting: (stepId: string, updates: Partial<Omit<NotificationSetting, 'id' | 'stepId'>>) => void;
  onDeleteSetting: (stepId: string) => void;
}

export const NotificationSettingsDialog = ({
  step,
  setting,
  onUpdateSetting,
  onDeleteSetting,
}: NotificationSettingsDialogProps) => {
  const [enabled, setEnabled] = useState(setting?.enabled ?? true);
  const [reminderDate, setReminderDate] = useState(
    setting?.reminderDate ? format(setting.reminderDate, "yyyy-MM-dd") : ""
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    setting?.reminderDaysBefore ?? 3
  );
  const [note, setNote] = useState(setting?.note ?? "");
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onUpdateSetting(step.id, {
      enabled,
      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
      reminderDaysBefore,
      note: note || undefined,
    });
    setOpen(false);
  };

  const handleDelete = () => {
    onDeleteSetting(step.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={setting?.enabled ? "default" : "outline"}
          size="sm"
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          {setting?.enabled ? "Promemoria attivo" : "Imposta promemoria"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configura Promemoria
          </DialogTitle>
          <DialogDescription>
            Imposta un promemoria personalizzato per: <strong>{step.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled" className="cursor-pointer">
              Abilita notifiche per questo step
            </Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data specifica promemoria (opzionale)
            </Label>
            <Input
              id="reminderDate"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
            <p className="text-xs text-muted-foreground">
              Riceverai una notifica in questa data
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daysBefore">
              Giorni di anticipo per notifiche di scadenza
            </Label>
            <Input
              id="daysBefore"
              type="number"
              min="0"
              max="30"
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground">
              Notifica quando mancano questi giorni alla scadenza stimata
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note personali (opzionale)</Label>
            <Textarea
              id="note"
              placeholder="Aggiungi una nota per questo promemoria..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-between gap-2">
          {setting && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Elimina
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave}>Salva</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
