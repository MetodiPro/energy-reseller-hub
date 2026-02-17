import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { BusinessPlanIssue } from '@/lib/businessPlanValidator';
import { getIssueSummary } from '@/lib/businessPlanValidator';

interface BusinessPlanVerificationProps {
  issues: BusinessPlanIssue[];
  onNavigateToSection?: (sectionId: string) => void;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    label: 'Critico',
    color: 'text-destructive',
    bg: 'bg-destructive/10 border-destructive/30',
    badge: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    label: 'Attenzione',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    badge: 'secondary' as const,
  },
  info: {
    icon: Info,
    label: 'Suggerimento',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/30',
    badge: 'outline' as const,
  },
};

export function BusinessPlanVerification({ issues, onNavigateToSection }: BusinessPlanVerificationProps) {
  const [expanded, setExpanded] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const summary = getIssueSummary(issues);
  const filteredIssues = filterSeverity === 'all' ? issues : issues.filter(i => i.severity === filterSeverity);

  if (issues.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">Business Plan completo</p>
              <p className="text-sm text-muted-foreground">Tutti i dati del progetto sono configurati correttamente. Nessuna criticità rilevata.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Verifica Business Plan
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {summary.critical > 0 && (
                <Badge variant="destructive" className="text-xs">{summary.critical} critici</Badge>
              )}
              {summary.warning > 0 && (
                <Badge variant="secondary" className="text-xs">{summary.warning} avvisi</Badge>
              )}
              {summary.info > 0 && (
                <Badge variant="outline" className="text-xs">{summary.info} suggerimenti</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Completezza</span>
              <Progress value={summary.score} className="w-20 h-2" />
              <span className="text-sm font-medium">{summary.score}%</span>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
              <Button
                key={sev}
                variant={filterSeverity === sev ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setFilterSeverity(sev)}
              >
                {sev === 'all' ? `Tutti (${issues.length})` :
                 sev === 'critical' ? `Critici (${summary.critical})` :
                 sev === 'warning' ? `Avvisi (${summary.warning})` :
                 `Suggerimenti (${summary.info})`}
              </Button>
            ))}
          </div>

          {/* Issues list */}
          <div className="space-y-2">
            {filteredIssues.map(issue => {
              const config = severityConfig[issue.severity];
              const Icon = config.icon;
              return (
                <div key={issue.id} className={`rounded-lg border p-3 ${config.bg}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{issue.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground/80">→ {issue.action}</span>
                        {onNavigateToSection && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-xs px-1.5 text-primary"
                            onClick={() => onNavigateToSection(issue.section)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Vai alla sezione
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
