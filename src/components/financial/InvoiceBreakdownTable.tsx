import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { FileText, TrendingUp } from 'lucide-react';
import type { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';

interface MonthData {
  month: number;
  label: string;
  invoicedCustomers: number;
  
  // Componenti fattura per mese
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  commercialeReseller: number;
  imponibileTotale: number;
  iva: number;
  fatturaTotale: number;
  
  // Di cui margine reseller
  margineCCV: number;
  margineSpread: number;
  margineAltro: number;
  margineTotale: number;
}

interface InvoiceBreakdownTableProps {
  projection: MonthData[];
  params: RevenueSimulationParams;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyDecimal = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const InvoiceBreakdownTable = ({ projection, params }: InvoiceBreakdownTableProps) => {
  // Calcola totali
  const totals = projection.reduce((acc, m) => ({
    materiaEnergia: acc.materiaEnergia + m.materiaEnergia,
    trasporto: acc.trasporto + m.trasporto,
    oneriSistema: acc.oneriSistema + m.oneriSistema,
    accise: acc.accise + m.accise,
    commercialeReseller: acc.commercialeReseller + m.commercialeReseller,
    imponibileTotale: acc.imponibileTotale + m.imponibileTotale,
    iva: acc.iva + m.iva,
    fatturaTotale: acc.fatturaTotale + m.fatturaTotale,
    margineTotale: acc.margineTotale + m.margineTotale,
  }), {
    materiaEnergia: 0,
    trasporto: 0,
    oneriSistema: 0,
    accise: 0,
    commercialeReseller: 0,
    imponibileTotale: 0,
    iva: 0,
    fatturaTotale: 0,
    margineTotale: 0,
  });

  const imponibileTotale = totals.fatturaTotale / (1 + (params.ivaPercent / 100));
  const marginePercentuale = imponibileTotale > 0 
    ? (totals.margineTotale / imponibileTotale) * 100 
    : 0;

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Dettaglio Fatturazione Completa
        </CardTitle>
        <CardDescription>
          Tutte le componenti della fattura cliente mese per mese
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riepilogo componenti */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Fatturato Totale</p>
            <p className="text-xl font-bold">{formatCurrency(totals.fatturaTotale)}</p>
            <p className="text-xs text-muted-foreground">IVA inclusa</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Componenti Passanti</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(totals.materiaEnergia + totals.trasporto + totals.oneriSistema + totals.accise)}
            </p>
            <p className="text-xs text-muted-foreground">Da girare a grossista/DSO</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Margine Reseller</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.margineTotale)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {marginePercentuale.toFixed(1)}% del fatturato
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IVA da versare</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totals.iva)}</p>
            <p className="text-xs text-muted-foreground">Al netto IVA acquisti</p>
          </div>
        </div>

        {/* Formula spiegata */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm space-y-2">
          <p className="font-medium text-blue-800 dark:text-blue-300">Composizione Fattura Cliente:</p>
          <div className="font-mono text-xs bg-white dark:bg-gray-900 p-2 rounded space-y-1">
            <p>📦 Materia Energia = (PUN + Dispacciamento + <span className="text-green-600">Spread</span>) × kWh</p>
            <p>🚚 Trasporto = Quota Fissa + Quota Potenza + Quota Energia × kWh</p>
            <p>📋 Oneri Sistema = (ASOS + ARIM) × kWh</p>
            <p>🏛️ Accise = Aliquota × kWh</p>
            <p>💼 <span className="text-green-600">Commerciale = CCV + Spread×kWh + Altro</span></p>
            <p>➡️ Imponibile = Σ componenti</p>
            <p>💰 IVA = Imponibile × {params.ivaPercent}%</p>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <span className="text-green-600 font-medium">In verde</span>: le componenti che generano margine per il reseller
          </p>
        </div>

        {/* Tabella dettagliata */}
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 bg-muted/50">Mese</TableHead>
                <TableHead className="text-right">Clienti</TableHead>
                <TableHead className="text-right">Materia En.</TableHead>
                <TableHead className="text-right">Trasporto</TableHead>
                <TableHead className="text-right">Oneri</TableHead>
                <TableHead className="text-right">Accise</TableHead>
                <TableHead className="text-right text-green-600">Commerciale</TableHead>
                <TableHead className="text-right">Imponibile</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right font-bold">Fattura Tot.</TableHead>
                <TableHead className="text-right font-bold text-green-600">Margine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.map((month, idx) => {
                const cumulativeFattura = projection
                  .slice(0, idx + 1)
                  .reduce((sum, m) => sum + m.fatturaTotale, 0);
                
                return (
                  <TableRow 
                    key={month.month}
                    className={month.invoicedCustomers > 0 ? '' : 'text-muted-foreground'}
                  >
                    <TableCell className="font-medium sticky left-0 bg-background">{month.label}</TableCell>
                    <TableCell className="text-right">
                      {month.invoicedCustomers > 0 ? month.invoicedCustomers : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.materiaEnergia > 0 ? formatCurrency(month.materiaEnergia) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.trasporto > 0 ? formatCurrency(month.trasporto) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.oneriSistema > 0 ? formatCurrency(month.oneriSistema) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.accise > 0 ? formatCurrency(month.accise) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {month.commercialeReseller > 0 ? formatCurrency(month.commercialeReseller) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.imponibileTotale > 0 ? formatCurrency(month.imponibileTotale) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {month.iva > 0 ? formatCurrency(month.iva) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {month.fatturaTotale > 0 ? (
                        <Badge variant="outline" className="font-mono">
                          {formatCurrency(month.fatturaTotale)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {month.margineTotale > 0 ? formatCurrency(month.margineTotale) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Riga totale */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell className="sticky left-0 bg-primary/10">TOTALE</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.materiaEnergia)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.trasporto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.oneriSistema)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.accise)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(totals.commercialeReseller)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.imponibileTotale)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.iva)}</TableCell>
                <TableCell className="text-right text-lg">{formatCurrency(totals.fatturaTotale)}</TableCell>
                <TableCell className="text-right text-lg text-green-600">{formatCurrency(totals.margineTotale)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200"></div>
            <span>Passanti (grossista/DSO)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-200"></div>
            <span>Margine Reseller</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-200"></div>
            <span>IVA (da versare)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
