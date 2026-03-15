import { useMemo } from 'react';
import { processSteps } from '@/data/processSteps';
import type { StepProgress } from '@/hooks/useStepProgress';

interface OverallProgressRingProps {
  stepProgress: Record<string, StepProgress>;
}

export function OverallProgressRing({ stepProgress }: OverallProgressRingProps) {
  const percentage = useMemo(() => {
    const total = processSteps.length;
    if (total === 0) return 0;
    const completed = processSteps.filter(s => stepProgress[s.id]?.completed).length;
    return Math.round((completed / total) * 100);
  }, [stepProgress]);

  const size = 48;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color = percentage >= 100
    ? 'hsl(var(--success, 142 76% 36%))'
    : percentage >= 50
      ? 'hsl(var(--primary))'
      : 'hsl(var(--warning, 38 92% 50%))';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">{percentage}%</span>
    </div>
  );
}
