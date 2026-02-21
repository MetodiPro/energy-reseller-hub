import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, User, MapPin, Zap } from 'lucide-react';
import { type SampleClientData, defaultSampleClient } from '@/hooks/useContractPackage';

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (clientData: SampleClientData) => void;
  generating: boolean;
  commodityType: string | null;
  simAvgConsumption?: number;
  simAvgConsumptionGas?: number;
}

export const ContractPreviewDialog = ({
  open,
  onOpenChange,
  onGenerate,
  generating,
  simAvgConsumption,
}: ContractPreviewDialogProps) => {
  const [client, setClient] = useState<SampleClientData>({
    ...defaultSampleClient,
    consumoMensile: simAvgConsumption || defaultSampleClient.consumoMensile,
  });

  const update = (field: keyof SampleClientData, value: string | number) => {
    setClient(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Anteprima Plico Contrattuale
          </DialogTitle>
          <DialogDescription>
            Personalizza i dati del cliente tipo prima di generare i documenti.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue="anagrafica" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="anagrafica" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Anagrafica
              </TabsTrigger>
              <TabsTrigger value="fornitura" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Fornitura
              </TabsTrigger>
              <TabsTrigger value="consumi" className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Consumi e Pagamento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="anagrafica" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-nome">Nome</Label>
                  <Input id="cl-nome" value={client.nome} onChange={e => update('nome', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-cognome">Cognome / Ragione Sociale</Label>
                  <Input id="cl-cognome" value={client.cognome} onChange={e => update('cognome', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-cf">Codice Fiscale</Label>
                  <Input id="cl-cf" value={client.codiceFiscale} onChange={e => update('codiceFiscale', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-piva">Partita IVA</Label>
                  <Input id="cl-piva" value={client.partitaIva} onChange={e => update('partitaIva', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-tel">Telefono</Label>
                  <Input id="cl-tel" value={client.telefono} onChange={e => update('telefono', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-email">Email</Label>
                  <Input id="cl-email" value={client.email} onChange={e => update('email', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-pec">PEC</Label>
                <Input id="cl-pec" value={client.pec} onChange={e => update('pec', e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="fornitura" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cl-indirizzo">Indirizzo residenza / sede</Label>
                <Input id="cl-indirizzo" value={client.indirizzo} onChange={e => update('indirizzo', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-cap">CAP</Label>
                  <Input id="cl-cap" value={client.cap} onChange={e => update('cap', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-citta">Città</Label>
                  <Input id="cl-citta" value={client.citta} onChange={e => update('citta', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-prov">Provincia</Label>
                  <Input id="cl-prov" value={client.provincia} onChange={e => update('provincia', e.target.value)} maxLength={2} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-indforn">Indirizzo di fornitura</Label>
                <Input id="cl-indforn" value={client.indirizzoFornitura} onChange={e => update('indirizzoFornitura', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-pod">Codice POD</Label>
                <Input id="cl-pod" value={client.pod} onChange={e => update('pod', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-uso">Tipologia uso</Label>
                  <Input id="cl-uso" value={client.tipologiaUso} onChange={e => update('tipologiaUso', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-distr">Distributore locale</Label>
                  <Input id="cl-distr" value={client.distributoreLocale} onChange={e => update('distributoreLocale', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-tensione">Tensione</Label>
                  <Input id="cl-tensione" value={client.tensione} onChange={e => update('tensione', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-misuratore">Tipo misuratore</Label>
                  <Input id="cl-misuratore" value={client.tipoMisuratore} onChange={e => update('tipoMisuratore', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="consumi" className="space-y-4 mt-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Questi valori determinano gli importi nella Fattura Tipo (Bolletta 2.0) e nei documenti contrattuali.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-consumo-annuo">Consumo annuo (kWh)</Label>
                      <Input id="cl-consumo-annuo" type="number" value={client.consumoAnnuo} onChange={e => update('consumoAnnuo', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-consumo">Consumo mensile (kWh)</Label>
                      <Input id="cl-consumo" type="number" value={client.consumoMensile} onChange={e => update('consumoMensile', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cl-potenza">Potenza impegnata (kW)</Label>
                      <Input id="cl-potenza" value={client.potenzaKw} onChange={e => update('potenzaKw', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cl-exforn">Ex fornitore</Label>
                      <Input id="cl-exforn" value={client.exFornitore} onChange={e => update('exFornitore', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cl-periodo">Periodo fatturazione</Label>
                  <Input id="cl-periodo" value={client.periodo} onChange={e => update('periodo', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cl-iban">IBAN</Label>
                  <Input id="cl-iban" value={client.ibanCliente} onChange={e => update('ibanCliente', e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setClient({
            ...defaultSampleClient,
            consumoMensile: simAvgConsumption || defaultSampleClient.consumoMensile,
          })}>
            Ripristina valori default
          </Button>
          <Button onClick={() => onGenerate(client)} disabled={generating}>
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generazione...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Genera Plico (ZIP)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
