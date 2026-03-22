import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ArrowRightLeft, 
  Zap, 
  Flame,
  Truck,
  Info,
  AlertCircle
} from 'lucide-react';
import { ProjectCost } from '@/hooks/useProjectFinancials';

interface PassthroughCostsCardProps {
  costs: ProjectCost[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const getRecipientIcon = (recipient: string | null) => {
  if (!recipient) return ArrowRightLeft;
  const lower = recipient.toLowerCase();
  if (lower.includes('grossista')) return Zap;
  if (lower.includes('distributore')) return Truck;
  return ArrowRightLeft;
};

export const PassthroughCostsCard = ({ costs }: PassthroughCostsCardProps) => {
  // Filter only passthrough costs — use ONLY the is_passthrough flag, no name matching
  const passthroughCosts = costs.filter(c => (c as any).is_passthrough === true);

  if (passthroughCosts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <ArrowRightLeft className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Nessun costo passante registrato manualmente.</p>
          <p className="text-xs mt-1">
            I costi passanti simulati (energia, trasporto, oneri) sono visibili
            nella tab Passanti del simulatore.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by recipient
  const byRecipient = passthroughCosts.reduce((acc, cost) => {
    const recipient = (cost as any).passthrough_recipient || 
      (cost.name.toLowerCase().includes('grossista') ? 'Grossista' : 
       cost.name.toLowerCase().includes('distribu') ? 'Distributore' : 'Altro');
    
    if (!acc[recipient]) acc[recipient] = { total: 0, items: [] };
    acc[recipient].total += cost.amount * cost.quantity;
    acc[recipient].items.push(cost);
    return acc;
  }, {} as Record<string, { total: number; items: ProjectCost[] }>);

  const totalPassthrough = passthroughCosts.reduce((sum, c) => sum + (c.amount * c.quantity), 0);

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <ArrowRightLeft className="h-5 w-5" />
          Costi Passanti (Verso Grossista/Distributore)
        </CardTitle>
        <CardDescription>
          Questi costi vengono rifatturati ai clienti e non impattano il margine operativo del reseller
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(byRecipient).map(([recipient, data]) => {
              const Icon = getRecipientIcon(recipient);
              return (
                <div key={recipient} className="bg-muted/30 p-3 rounded-lg border border-dashed">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{recipient}</span>
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">{formatCurrency(data.total)}</p>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-dashed">
            <span className="text-sm text-muted-foreground">Totale Costi Passanti (mensile)</span>
            <span className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(totalPassthrough)}
            </span>
          </div>

          {/* Details */}
          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                Visualizza dettaglio voci
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voce</TableHead>
                      <TableHead>Destinatario</TableHead>
                      <TableHead>Formula</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passthroughCosts.map(cost => (
                      <TableRow key={cost.id} className="text-muted-foreground">
                        <TableCell>
                          <div>
                            <p className="font-medium">{cost.name}</p>
                            {(cost as any).calculation_basis && (
                              <p className="text-xs mt-1 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                {(cost as any).calculation_basis}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-muted-foreground">
                            {(cost as any).passthrough_recipient || 'N/D'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {cost.quantity.toLocaleString('it-IT')} {cost.unit} × €{cost.amount.toFixed(4)}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cost.amount * cost.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Info box */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
            <div className="text-slate-600 dark:text-slate-400">
              <p className="font-medium">Perché sono separati?</p>
              <p>
                I costi passanti (commodity, trasporto, distribuzione) vengono addebitati al cliente finale 
                e poi corrisposti al grossista/distributore. Il reseller non guadagna né perde su queste voci: 
                il suo margine deriva solo dalla differenza tra prezzo di vendita e costo all'ingrosso 
                (già contabilizzata nei Ricavi come "Margine").
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
