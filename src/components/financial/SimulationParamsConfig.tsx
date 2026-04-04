import { useRef, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Users, Settings2, Loader2 } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

interface SimulationParamsConfigProps {
  projectId: string;
  simulationHook: ReturnType<typeof useRevenueSimulation>;
  commodityType?: string | null;
}

export const SimulationParamsConfig = ({ projectId, simulationHook, commodityType }: SimulationParamsConfigProps) => {
  const { data, loading, updateMonthlyContract, updateStartDate, saveSimulation } = simulationHook;
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [yearInput, setYearInput] = useState('');

  const debouncedSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveSimulation(), 800);
  }, [saveSimulation]);

  const handleMonthlyContractChange = useCallback((index: number, value: number) => {
    updateMonthlyContract(index, value);
    debouncedSave();
  }, [updateMonthlyContract, debouncedSave]);

  const handleStartDateChange = useCallback((date: Date) => {
    updateStartDate(date);
    debouncedSave();
  }, [updateStartDate, debouncedSave]);

  const commitYearInput = useCallback(() => {
    const year = parseInt(yearInput, 10);

    if (!isNaN(year) && year >= 2024 && year <= 2035) {
      handleStartDateChange(new Date(data.startDate.getFullYear() === year ? year : year, data.startDate.getMonth(), 1));
      setYearInput(String(year));
      return;
    }

    setYearInput(String(data.startDate.getFullYear()));
  }, [data.startDate, handleStartDateChange, yearInput]);

  useEffect(() => {
    setYearInput(String(data.startDate.getFullYear()));
  }, [data.startDate]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Caricamento parametri...</span>
        </CardContent>
      </Card>
    );
  }

  const { startDate, monthlyContracts, params } = data;
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const totalContracts = monthlyContracts.reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Parametri Generali
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start date */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Inizio Attività Commerciali
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mese</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={startDate.getMonth()}
                  onChange={(e) => handleStartDateChange(new Date(startDate.getFullYear(), parseInt(e.target.value), 1))}
                >
                  {MONTHS_IT.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Anno</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={yearInput}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setYearInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onBlur={commitYearInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitYearInput();
                    }
                  }}
                />
              </div>
            </div>

            {/* Perdite di rete */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Perdite di rete (%)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={params.perditeRetePct ?? 10.2}
                onChange={(e) => {
                  simulationHook.updateParams('perditeRetePct', parseFloat(e.target.value) || 0);
                  debouncedSave();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Fattore ARERA standard: BT ~10.2%, MT ~3.8%, AT ~0.6%. Aumenta proporzionalmente i kWh sia in bolletta cliente (Materia Energia) sia negli acquisti dal grossista, garantendo simmetria nel recupero del costo.
              </p>
            </div>
          </div>

          {/* Monthly contracts */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contratti Target per Mese
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {monthlyContracts.map((value, index) => {
                const monthIndex = (startMonth + index) % 12;
                const year = startYear + Math.floor((startMonth + index) / 12);
                return (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs">{MONTHS_IT[monthIndex]} {year}</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={value}
                      onChange={(e) => handleMonthlyContractChange(index, parseInt(e.target.value) || 0)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="p-2 bg-muted rounded-lg text-sm">
              <span className="font-medium">Totale: </span>
              {totalContracts} contratti
            </div>
            <p className="text-xs text-muted-foreground">
              I contratti vengono distribuiti tra i prodotti in base alla quota % di ciascuno.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
