import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StepDatePickerProps {
  label: string;
  date?: string;
  onDateChange: (date: string | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const StepDatePicker = ({
  label,
  date,
  onDateChange,
  minDate,
  maxDate,
}: StepDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const parsedDate = date ? parseISO(date) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(selectedDate.toISOString().split("T")[0]);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 text-xs px-2 font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          {parsedDate ? format(parsedDate, "d MMM", { locale: it }) : label}
          {date && (
            <X
              className="h-3 w-3 ml-1 hover:text-destructive"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
