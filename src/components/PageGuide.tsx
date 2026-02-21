import { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageGuideProps {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  className?: string;
}

export const PageGuide = ({ title, description, steps, tips, className }: PageGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("mb-6", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
      >
        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">{title}</p>
          {!isOpen && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 p-4 rounded-lg border border-border bg-card space-y-3 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-foreground">{description}</p>

          {steps && steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Come si usa</p>
              <ol className="space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tips && tips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggerimenti</p>
              <ul className="space-y-1">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-amber-500 shrink-0">💡</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
