import { Zap } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { ResellerRevenueSimulator } from '@/components/financial/ResellerRevenueSimulator';

interface RevenuesPageProps {
  projectId: string;
  projectName: string;
}

export const RevenuesPage = ({ projectId, projectName }: RevenuesPageProps) => {
  const revenueSimulation = useRevenueSimulation(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ricavi</h2>
        <p className="text-muted-foreground">{projectName}</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4" />Modello Ricavi Reseller Energia
        </h3>
        <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
          <p>Il <strong>fatturato</strong> di un reseller è dato dalla somma delle bollette emesse ai clienti finali. Solo 3 componenti della fattura sono controllabili dal reseller:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>CCV</strong> - Componente Commercializzazione e Vendita (€/mese fisso)</li>
            <li><strong>Spread</strong> - Ricarico variabile su PUN/PSV (€/kWh o €/Smc)</li>
            <li><strong>Altro</strong> - Servizi aggiuntivi opzionali</li>
          </ul>
          <p className="text-xs mt-2 text-blue-600 dark:text-blue-500">Tutte le altre componenti (energia, trasporto, distribuzione, oneri) sono passanti verso il grossista/distributore.</p>
        </div>
      </div>

      <ResellerRevenueSimulator projectId={projectId} simulationHook={revenueSimulation} />
    </div>
  );
};
