
import React, { useState, useMemo, useEffect } from 'react';
import { HistoryEntry, MacroTargets, Food, Recipe, DayMeals, MealEntry } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

interface HistoricalProgressProps {
  history: HistoryEntry[];
  targets: MacroTargets;
  foods: Food[];
  recipes: Recipe[];
}

const HistoricalProgress: React.FC<HistoricalProgressProps> = ({ history, targets, foods, recipes }) => {
  const [activeMacro, setActiveMacro] = useState<keyof HistoryEntry>('kcal');
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [selectedDayMeals, setSelectedDayMeals] = useState<DayMeals | null>(null);
  
  // Gestione Navigazione Settimanale
  // 0 = Settimana Corrente, -1 = Settimana Scorsa, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // Calcolo Settimana Dinamica basata su weekOffset
  const { weekDays, headerString, isCurrentWeek } = useMemo(() => {
    // 1. Determina la data "Ancora" in base all'offset
    const anchorDate = new Date();
    anchorDate.setDate(anchorDate.getDate() + (weekOffset * 7));

    // 2. Calcola il Lunedì della settimana relativa all'ancora
    const currentDay = anchorDate.getDay(); // 0 (Dom) - 6 (Sab)
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(anchorDate);
    monday.setDate(anchorDate.getDate() - distanceToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // 3. Genera le stringhe ISO per i 7 giorni
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }

    // 4. Formattazione Stringa Header
    const fmt = (d: Date) => d.getDate();
    const monthStart = monday.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
    const monthEnd = sunday.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
    
    // Se il mese cambia durante la settimana, mostriamoli entrambi (es. 29 GIU - 05 LUG)
    const monthString = monthStart === monthEnd ? monthStart : `${monthStart}/${monthEnd}`;

    return {
      weekDays: days,
      headerString: `LUN ${fmt(monday)} - DOM ${fmt(sunday)} ${monthString}`,
      isCurrentWeek: weekOffset === 0
    };
  }, [weekOffset]);

  // Preparazione Dati Settimanali (Mapping tra giorni calcolati e Storia salvata)
  const weeklyData = useMemo(() => {
    return weekDays.map(dateStr => {
      // Cerca se esiste un'entry nella storia per questa data specifica
      const entry = history.find(h => h.date === dateStr);
      const dateObj = new Date(dateStr);
      
      return {
        date: dateStr,
        dayLabel: dateObj.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase().replace('.', ''),
        // Se non c'è entry (es. è lunedì mattina e non ho loggato nulla), il valore è 0 (Reset Visivo)
        val: entry ? (entry[activeMacro] as number) : 0,
        hasData: !!entry
      };
    });
  }, [history, weekDays, activeMacro]);

  // Caricamento Dettagli Pasti per il Giorno Selezionato
  useEffect(() => {
    if (selectedDate) {
      const savedMeals = localStorage.getItem('diet_day_meals');
      if (savedMeals) {
        const parsed = JSON.parse(savedMeals);
        setSelectedDayMeals(parsed[selectedDate] || null);
      } else {
        setSelectedDayMeals(null);
      }
    }
  }, [selectedDate]);

  // Calcolo Totali Giornalieri
  const dailyTotals = useMemo(() => {
    if (!selectedDayMeals) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    
    const allEntries = (Object.values(selectedDayMeals).flat() as MealEntry[]);
    return allEntries.reduce((acc, entry) => {
      const food = foods.find(f => f.id === entry.foodId);
      if (food) {
        const factor = entry.weightGrams / 100;
        acc.kcal += food.kcal * factor;
        acc.protein += food.protein * factor;
        acc.carbs += food.carbs * factor;
        acc.fat += food.fat * factor;
      }
      return acc;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [selectedDayMeals, foods]);

  // Configurazione Macro Estetica (Gradienti)
  const macroConfigs = {
    kcal: { 
      label: 'Kcal', 
      from: 'from-emerald-500', to: 'to-emerald-400', 
      text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
      target: targets.kcal, unit: 'kcal' 
    },
    carbs: { 
      label: 'Carbo', 
      from: 'from-amber-400', to: 'to-amber-300', 
      text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
      target: targets.carbs, unit: 'g' 
    },
    protein: { 
      label: 'Prot', 
      from: 'from-blue-500', to: 'to-blue-400', 
      text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
      target: targets.protein, unit: 'g' 
    },
    fat: { 
      label: 'Grassi', 
      from: 'from-rose-500', to: 'to-rose-400', 
      text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200',
      target: targets.fat, unit: 'g' 
    },
    fiber: { 
      label: 'Fibre', 
      from: 'from-indigo-500', to: 'to-indigo-400', 
      text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
      target: targets.fiber, unit: 'g' 
    },
  };

  const config = macroConfigs[activeMacro as keyof typeof macroConfigs];
  const maxVal = Math.max(...weeklyData.map(d => d.val), config.target * 1.3); // Più headroom

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Settimanale con Navigazione */}
      <div className="flex justify-between items-center px-2 pt-2">
        <button 
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{headerString}</h2>
          {!isCurrentWeek && (
            <button 
              onClick={() => setWeekOffset(0)}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 hover:text-indigo-700"
            >
              <CalendarDaysIcon className="w-3 h-3" /> Torna a oggi
            </button>
          )}
        </div>

        <button 
          onClick={() => setWeekOffset(prev => prev + 1)}
          className={`p-2 rounded-full transition-all ${isCurrentWeek ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
          disabled={isCurrentWeek}
        >
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Selettore Macro (Segmented Control Style) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl mx-1 shadow-inner border border-slate-200/60">
        <div className="flex justify-between items-center relative z-10">
          {(Object.keys(macroConfigs) as Array<keyof typeof macroConfigs>).map((key) => {
             const isActive = activeMacro === key;
             const conf = macroConfigs[key];
             return (
              <button
                key={key}
                onClick={() => setActiveMacro(key)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? `bg-white text-slate-800 shadow-sm scale-[1.02] ring-1 ring-black/5` 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                {conf.label}
                {isActive && (
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${conf.text.replace('text-', 'bg-')} opacity-50 mb-1`}></div>
                )}
              </button>
             );
          })}
        </div>
      </div>

      {/* Grafico Principale */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 mx-1 relative overflow-hidden">
        
        {/* Griglia di sfondo sottile (opzionale) */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 pointer-events-none opacity-20">
            <div className="border-t border-dashed border-slate-200 w-full h-full"></div>
            <div className="border-t border-dashed border-slate-200 w-full h-full"></div>
            <div className="border-t border-dashed border-slate-200 w-full h-full"></div>
        </div>

        <div className="h-48 flex items-end justify-between gap-2 sm:gap-3 relative z-10 pt-8">
           
           {/* Linea Target Elegante */}
           <div 
             className="absolute w-full flex items-center z-0 pointer-events-none transition-all duration-500"
             style={{ bottom: `${(config.target / maxVal) * 100}%` }}
           >
             <div className="flex-1 border-t-2 border-dashed border-indigo-200/60"></div>
             <div className="bg-indigo-50/90 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm mx-2 backdrop-blur-sm">
                TGT {config.target}
             </div>
             <div className="flex-1 border-t-2 border-dashed border-indigo-200/60"></div>
           </div>

           {weeklyData.map((day) => {
             const heightPct = (day.val / maxVal) * 100;
             const isOver = day.val > config.target;
             const isSelected = selectedDate === day.date;
             const isFuture = new Date(day.date) > new Date() && day.val === 0;
             
             return (
               <div 
                 key={day.date} 
                 onClick={() => !isFuture && setSelectedDate(day.date)}
                 className={`flex-1 h-full flex flex-col justify-end items-center group ${isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
               >
                  {/* Etichetta Valore (Float) */}
                  <div className={`mb-1.5 text-[9px] font-black tracking-tight transition-all duration-300 transform ${
                      day.val > 0 
                        ? (isSelected ? 'text-slate-800 scale-110 -translate-y-1' : 'text-slate-400 group-hover:text-slate-600 group-hover:-translate-y-1') 
                        : 'opacity-0'
                    }`}>
                    {day.val > 0 ? day.val.toFixed(0) : ''}
                  </div>
                  
                  {/* La Capsula (Track) */}
                  <div className={`w-full max-w-[40px] h-full relative flex items-end rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-100' : 'group-hover:bg-slate-100'}`}>
                     
                     {/* La Barra (Fill) */}
                     <div 
                       className={`w-full rounded-2xl relative transition-all duration-700 ease-out bg-gradient-to-t ${config.from} ${config.to} 
                       ${day.val === 0 ? 'opacity-0' : 'opacity-100'}
                       ${isOver ? 'shadow-[0_0_15px_rgba(0,0,0,0.15)] saturate-[1.2]' : ''}
                       `}
                       style={{ height: `${heightPct}%` }}
                     >
                        {/* Shine Effect Top */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40"></div>
                     </div>
                  </div>
                  
                  {/* Etichetta Giorno */}
                  <div className={`mt-3 text-[9px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-indigo-600 scale-105' : 'text-slate-300 group-hover:text-slate-400'}`}>
                    {day.dayLabel.charAt(0)}
                  </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Dettaglio Giorno Selezionato - Card */}
      {selectedDate && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 mx-1">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-lg shadow-slate-100">
             
             <div className="mb-4 flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Riepilogo</p>
                        <h3 className="text-sm font-black text-slate-900 uppercase leading-none">
                        {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                    </div>
                </div>
             </div>

             {selectedDayMeals && (Object.values(selectedDayMeals).flat() as MealEntry[]).length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                    {/* Kcal - Main Stat */}
                    <div className="col-span-3 bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-md text-white flex justify-between items-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full blur-2xl -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-700"></div>
                        
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Calorie Totali</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black tracking-tighter">{dailyTotals.kcal.toFixed(0)}</span>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                             <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">KCAL</span>
                        </div>
                    </div>

                    {/* Macro Cards */}
                    {[
                        { label: 'Prot', val: dailyTotals.protein, unit: 'g', color: 'blue', conf: macroConfigs.protein },
                        { label: 'Carbo', val: dailyTotals.carbs, unit: 'g', color: 'amber', conf: macroConfigs.carbs },
                        { label: 'Grassi', val: dailyTotals.fat, unit: 'g', color: 'rose', conf: macroConfigs.fat }
                    ].map((m) => (
                        <div key={m.label} className={`${m.conf.bg} ${m.conf.border} border p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm transition-transform hover:scale-[1.02]`}>
                            <span className={`text-[9px] font-black ${m.conf.text} uppercase tracking-widest mb-1 opacity-70`}>{m.label}</span>
                            <span className={`text-xl font-black ${m.conf.text} leading-none tracking-tight`}>
                                {m.val.toFixed(0)}<span className="text-[10px] ml-0.5 opacity-80">{m.unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
             ) : (
                <div className="bg-slate-50/50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">Nessun dato registrato</p>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalProgress;
