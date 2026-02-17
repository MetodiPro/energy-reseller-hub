import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Building2, ListTodo, Users, DollarSign, FileText, Rocket,
  X, ChevronRight, Sparkles, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  targetTab: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: 'center' | 'sidebar';
}

const tutorialSteps: TutorialStep[] = [
  {
    targetTab: 'overview',
    title: 'Scheda Progetto',
    description: 'Qui configuri i dati del tuo reseller: società, commodity, grossista e date chiave.',
    icon: Building2,
    position: 'center',
  },
  {
    targetTab: 'process',
    title: 'Processo Burocratico',
    description: 'Segui passo-passo tutti gli step necessari per avviare l\'attività. Ogni step ha checklist e documenti.',
    icon: ListTodo,
    position: 'center',
  },
  {
    targetTab: 'team',
    title: 'Gestione Team',
    description: 'Invita collaboratori, assegna ruoli e gestisci consulenti esterni con attività predefinite.',
    icon: Users,
    position: 'center',
  },
  {
    targetTab: 'financials',
    title: 'Pianificazione Finanziaria',
    description: 'Gestisci costi, simula ricavi, analizza break-even e cash flow. Il motore analitico dell\'app.',
    icon: DollarSign,
    position: 'center',
  },
  {
    targetTab: 'business-plan',
    title: 'Documenti Strategici',
    description: 'Genera automaticamente Business Plan e Piano Marketing basati sui dati reali del progetto.',
    icon: FileText,
    position: 'center',
  },
  {
    targetTab: 'prelaunch',
    title: 'Pre-Launch',
    description: 'La checklist finale prima del go-live: verifica che tutto sia pronto per operare sul mercato.',
    icon: Rocket,
    position: 'center',
  },
];

const TUTORIAL_STORAGE_KEY = 'power-reseller-tutorial-completed';

interface OnboardingTutorialProps {
  onNavigate: (tab: string) => void;
}

export const OnboardingTutorial = ({ onNavigate }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onNavigate(tutorialSteps[nextStep].targetTab);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onNavigate(tutorialSteps[prevStep].targetTab);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50 animate-in fade-in-0 duration-300" onClick={handleSkip} />

      {/* Tutorial Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] animate-in zoom-in-95 fade-in-0 duration-300">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Zap className="h-5 w-5 text-white" fill="white" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tutorial Guidato</p>
                <p className="font-bold text-sm">Scopri Power Reseller</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{currentStep + 1} di {tutorialSteps.length}</p>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex gap-1.5 mb-5">
              {tutorialSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentStep(i);
                    onNavigate(tutorialSteps[i].targetTab);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all flex-1",
                    i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Salta tutorial
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    ← Indietro
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="gap-1.5">
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Inizia!
                    </>
                  ) : (
                    <>
                      Avanti
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Utility to reset tutorial (for settings/testing)
export const resetOnboardingTutorial = () => {
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
};
