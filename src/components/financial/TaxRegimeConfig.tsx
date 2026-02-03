import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Settings, Calendar, Info, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxRegimeConfigProps {
  ivaRegime: 'monthly' | 'quarterly';
  onIvaRegimeChange: (regime: 'monthly' | 'quarterly') => void;
}

export const TaxRegimeConfig = ({ ivaRegime, onIvaRegimeChange }: TaxRegimeConfigProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurazione Regime Fiscale
        </CardTitle>
        <CardDescription>
          Imposta il regime di versamento IVA in base alla tipologia di contribuente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IVA Regime Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Periodicità Versamento IVA</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Il regime mensile è obbligatorio per soggetti con volume d'affari {'>'} €400.000 (servizi) 
                    o {'>'} €700.000 (altre attività). Sotto queste soglie è possibile optare per il regime trimestrale.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <RadioGroup
            value={ivaRegime}
            onValueChange={(value) => onIvaRegimeChange(value as 'monthly' | 'quarterly')}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Monthly Option */}
            <div className="relative">
              <RadioGroupItem
                value="monthly"
                id="monthly"
                className="peer sr-only"
              />
              <Label
                htmlFor="monthly"
                className="flex flex-col items-start gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Mensile</span>
                  <Badge variant="secondary" className="ml-auto">Standard</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Versamento F24 entro il 16 del mese successivo
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Obbligatorio per:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>Volume affari {'>'} €400.000 (servizi)</li>
                    <li>Volume affari {'>'} €700.000 (altre attività)</li>
                  </ul>
                </div>
              </Label>
            </div>

            {/* Quarterly Option */}
            <div className="relative">
              <RadioGroupItem
                value="quarterly"
                id="quarterly"
                className="peer sr-only"
              />
              <Label
                htmlFor="quarterly"
                className="flex flex-col items-start gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Trimestrale</span>
                  <Badge variant="outline" className="ml-auto">Opzionale</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Versamento F24 entro il 16 del secondo mese successivo al trimestre
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Scadenze:</strong>
                  <ul className="list-disc list-inside mt-1">
                    <li>Q1 (Gen-Mar): 16 Maggio</li>
                    <li>Q2 (Apr-Giu): 20 Agosto</li>
                    <li>Q3 (Lug-Set): 16 Novembre</li>
                    <li>Q4 (Ott-Dic): 16 Marzo</li>
                  </ul>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Nota:</strong> Il regime trimestrale comporta l'applicazione degli interessi dell'1% sui versamenti. 
            Il modello calcola automaticamente le scadenze F24 in base al regime selezionato.
          </AlertDescription>
        </Alert>

        {/* Summary of Selected Regime */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="font-medium">Regime Attivo</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Periodicità IVA:</span>
              <span className="ml-2 font-medium">
                {ivaRegime === 'monthly' ? 'Mensile' : 'Trimestrale'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Accise ADM:</span>
              <span className="ml-2 font-medium">Trimestrale</span>
              <Badge variant="outline" className="ml-2 text-xs">Fisso</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
