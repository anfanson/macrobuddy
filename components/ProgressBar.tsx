import React from 'react';

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  type: 'kcal' | 'carbs' | 'protein' | 'fat' | 'fiber';
  isTraining: boolean;
  compact?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, target, unit, type, isTraining, compact }) => {
  const percentage = Math.min((current / target) * 100, 110);
  
  const getToleranceRange = () => {
    if (isTraining) {
      switch (type) {
        case 'kcal': return { min: -2.5, max: 2.5 };
        case 'fat': return { min: -10, max: 10 };
        case 'carbs': return { min: -7, max: 7 };
        case 'protein': return { min: -5, max: 8 };
        case 'fiber': return { min: -10, max: 10 };
      }
    } else {
      switch (type) {
        case 'kcal': return { min: -3, max: 3 };
        case 'fat': return { min: -10, max: 10 };
        case 'carbs': return { min: -5, max: 8 };
        case 'protein': return { min: -5, max: 8 };
        case 'fiber': return { min: -10, max: 10 };
      }
    }
    return { min: 0, max: 0 };
  };

  const getStatus = () => {
    const dev = ((current - target) / target) * 100;
    const { min, max } = getToleranceRange();
    
    if (dev < min) {
      const needed = target - current;
      return { 
        text: `Mancano: ${needed.toFixed(0)}${unit}`, 
        bgColor: "bg-amber-400", 
        textColor: "text-amber-600",
        state: 'low'
      };
    } else if (dev >= min && dev <= max) {
      return { 
        text: `OTTIMO! ✅`, 
        bgColor: "bg-green-500", 
        textColor: "text-green-600",
        state: 'ok'
      };
    } else {
      const excess = current - target;
      return { 
        text: `Sopra: ${excess.toFixed(0)}${unit}`, 
        bgColor: "bg-rose-500", 
        textColor: "text-rose-600",
        state: 'high'
      };
    }
  };

  const status = getStatus();

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'}`}>
      <div className="flex justify-between items-center px-0.5">
        <span className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-black text-slate-800 uppercase tracking-widest`}>
          {label}
        </span>
        <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-tight transition-colors duration-300 ${status.textColor}`}>
          {status.text}
        </span>
      </div>

      <div className={`${compact ? 'h-3.5' : 'h-5'} w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-inner relative`}>
        <div 
          className={`h-full ${status.bgColor} transition-all duration-700 ease-out rounded-full shadow-sm`}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute top-0 bottom-0 left-[91%] w-[1px] bg-slate-300/30" />
      </div>

      <div className="flex justify-between px-0.5 leading-none">
        <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold text-slate-400 tabular-nums`}>
          {current.toFixed(0)} <span className="font-medium">{unit}</span>
        </span>
        <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold text-slate-300 tabular-nums uppercase`}>
          Target: {target}
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;