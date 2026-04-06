import { Info } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationProducts } from '@/hooks/useSimulationProducts';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { ResellerRevenueSimulator } from '@/components/financial/ResellerRevenueSimulator';
import { ProductPerformanceTable } from '@/components/financial/ProductPerformanceTable';
import { Card, CardContent } from '@/components/ui/card';

interface RevenuesPageProps {
  projectId: string;
  projectName: string;
}

export const RevenuesPage = ({ projectId, projectName }: RevenuesPageProps) => {
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { multiProductResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { products } = useSimulationProducts(projectId);
  const { channels: salesChannels } = useSalesChannels(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ricavi</h2>
        <p className="text-sm text-muted-foreground">{projectName}</p>
      </div>

      <ResellerRevenueSimulator projectId={projectId} simulationHook={revenueSimulation} />

      {multiProductResult && multiProductResult.products.length > 0 && (
        <ProductPerformanceTable
          multiProductResult={multiProductResult}
          salesChannels={salesChannels}
          products={products}
        />
      )}

      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <h4 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Modello Ricavi Reseller Energia
          </h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Il <strong className="text-foreground">fatturato</strong> di un reseller è dato dalla somma delle bollette emesse ai clienti finali. Solo 3 componenti della fattura sono controllabili dal reseller:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li><strong className="text-foreground">CCV</strong> — Componente Commercializzazione e Vendita (€/mese fisso)</li>
              <li><strong className="text-foreground">Spread</strong> — Ricarico variabile su PUN/PSV (€/kWh o €/Smc)</li>
              <li><strong className="text-foreground">Altro</strong> — Servizi aggiuntivi opzionali</li>
            </ul>
            <p className="text-[11px] mt-2">Tutte le altre componenti (energia, trasporto, distribuzione, oneri) sono passanti verso il grossista/distributore.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
