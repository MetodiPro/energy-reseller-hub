import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Scale, 
  Landmark, 
  Server, 
  Headphones, 
  Users, 
  Building2,
  Zap,
  ShoppingCart,
  Briefcase,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CostItem {
  id: string;
  name: string;
  description?: string;
  amount: number;
  quantity?: number;
  cost_type: string;
  is_recurring?: boolean;
  recurrence_period?: string;
}

interface CostCategorySummaryProps {
  costs: CostItem[];
}

interface CategoryConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  patterns: string[];
}

const categoryConfigs: Record<string, CategoryConfig> = {
  regulatory: {
    name: "Regolatori e Compliance",
    icon: Scale,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    patterns: ["ARERA", "Audit", "Sanzioni", "Normativo", "Compliance", "EVE"]
  },
  financial: {
    name: "Finanziari",
    icon: Landmark,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    patterns: ["Interessi", "Fideiussioni", "Garanzie", "Crediti", "Recupero", "Svalutazione", "Capitale Circolante"]
  },
  it_security: {
    name: "IT e Sicurezza",
    icon: Server,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    patterns: ["Hosting", "Cybersecurity", "Backup", "Disaster", "Software", "CRM", "Billing", "SII", "Switching", "Firma Elettronica", "Hardware", "IT"]
  },
  operations: {
    name: "Operativi",
    icon: Headphones,
    color: "text-green-600",
    bgColor: "bg-green-100",
    patterns: ["Contact Center", "Numero Verde", "Reclami", "Conciliazioni", "Postali", "Corriere", "Assistenza"]
  },
  hr: {
    name: "Risorse Umane",
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    patterns: ["Personale", "Back-Office", "Operatore", "TFR", "Sicurezza", "Lavoro", "Team", "Staff", "Formazione Obbligatoria"]
  },
  infrastructure: {
    name: "Infrastruttura",
    icon: Building2,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    patterns: ["Ufficio", "Affitto", "Arredamento", "Deposito Cauzionale", "Utenze", "Sede"]
  },
  energy: {
    name: "Energia e Commodity",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    patterns: ["Energia Acquistata", "Gas Acquistato", "Oneri di Sistema", "Corrispettivi Distributori", "Commodity"]
  },
  commercial: {
    name: "Commerciali",
    icon: ShoppingCart,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    patterns: ["Agenti", "Provvigioni", "Marketing", "Promozionale", "Account Manager", "Rete Vendita"]
  },
  legal: {
    name: "Legali e Societari",
    icon: Briefcase,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    patterns: ["Costituzione", "Notaio", "Legale", "Commercialista", "Consulenza Legale", "GDPR", "Privacy"]
  },
  other: {
    name: "Altri Costi",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    patterns: []
  }
};

const categorizeByName = (costName: string): string => {
  const upperName = costName.toUpperCase();
  
  for (const [categoryKey, config] of Object.entries(categoryConfigs)) {
    if (categoryKey === 'other') continue;
    
    for (const pattern of config.patterns) {
      if (upperName.includes(pattern.toUpperCase())) {
        return categoryKey;
      }
    }
  }
  
  return 'other';
};

const calculateAnnualizedCost = (cost: CostItem): number => {
  const baseAmount = cost.amount * (cost.quantity || 1);
  
  if (!cost.is_recurring) {
    return baseAmount;
  }
  
  switch (cost.recurrence_period) {
    case 'monthly':
      return baseAmount; // Already includes quantity as months
    case 'yearly':
      return baseAmount;
    case 'quarterly':
      return baseAmount;
    default:
      return baseAmount;
  }
};

export const CostCategorySummary = ({ costs }: CostCategorySummaryProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const groupedCosts = useMemo(() => {
    const groups: Record<string, { costs: CostItem[]; total: number }> = {};
    
    // Initialize all categories
    Object.keys(categoryConfigs).forEach(key => {
      groups[key] = { costs: [], total: 0 };
    });
    
    // Categorize each cost
    costs.forEach(cost => {
      const category = categorizeByName(cost.name);
      const annualizedCost = calculateAnnualizedCost(cost);
      
      groups[category].costs.push(cost);
      groups[category].total += annualizedCost;
    });
    
    return groups;
  }, [costs]);

  const totalCosts = useMemo(() => {
    return Object.values(groupedCosts).reduce((sum, group) => sum + group.total, 0);
  }, [groupedCosts]);

  const sortedCategories = useMemo(() => {
    return Object.entries(groupedCosts)
      .filter(([_, group]) => group.costs.length > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [groupedCosts]);

  if (costs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riepilogo Costi per Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessun costo registrato. Aggiungi dei costi per vedere il riepilogo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-custom-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Riepilogo Costi per Categoria</span>
          <Badge variant="secondary" className="text-base font-bold">
            Totale: €{totalCosts.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.map(([categoryKey, group]) => {
          const config = categoryConfigs[categoryKey];
          const Icon = config.icon;
          const percentage = totalCosts > 0 ? (group.total / totalCosts) * 100 : 0;
          const isExpanded = expandedCategories.has(categoryKey);
          
          return (
            <Collapsible
              key={categoryKey}
              open={isExpanded}
              onOpenChange={() => toggleCategory(categoryKey)}
            >
              <div className="space-y-2">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{config.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.costs.length} {group.costs.length === 1 ? 'voce' : 'voci'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">
                          €{group.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                
                <CollapsibleContent className="animate-accordion-down">
                  <div className="pl-10 space-y-1 pt-2 border-l-2 border-muted ml-4">
                    {group.costs.map((cost, idx) => (
                      <div 
                        key={cost.id || idx} 
                        className="flex justify-between text-xs text-muted-foreground py-1 hover:bg-muted/30 rounded px-2 -mx-2"
                      >
                        <span className="truncate max-w-[250px]" title={cost.name}>
                          {cost.name}
                        </span>
                        <span className="font-medium">
                          €{calculateAnnualizedCost(cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
