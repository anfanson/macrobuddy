
import React, { useState, useEffect, useRef } from 'react';
import { Food, MealEntry, MealType, Recipe, CalculatedNutrients } from '../types';
import { PlusIcon, TrashIcon, XMarkIcon, BookmarkIcon, CheckIcon, CalculatorIcon, ScaleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface MealCardProps {
  type: MealType;
  title: string;
  icon: string;
  entries: MealEntry[];
  foods: Food[];
  recipes: Recipe[];
  residuals?: CalculatedNutrients;
  onAdd: (type: MealType, foodId: string, weight: number) => void;
  onUpdate: (type: MealType, entryId: string, weight: number) => void;
  onAddRecipe: (type: MealType, recipeId: string) => void;
  onDelete: (type: MealType, entryId: string) => void;
  onSaveAsRecipe: (type: MealType, name: string) => void;
}

const MealCard: React.FC<MealCardProps> = ({ 
  type, title, icon, entries, foods, recipes, residuals, onAdd, onUpdate, onAddRecipe, onDelete, onSaveAsRecipe 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'food' | 'recipe'>('food');
  const [selectedId, setSelectedId] = useState('');
  const [weight, setWeight] = useState<string | number>(''); 
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<string | number>(0);

  // Optimizer State
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizedValues, setOptimizedValues] = useState<{id: string, weight: number}[]>([]);
  const [optimizationPreview, setOptimizationPreview] = useState<{percent: number, msg: string, isError?: boolean} | null>(null);

  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      if (addMode === 'food' && foods.length > 0) {
        if (!selectedId) setSelectedId(foods[0].id);
      } else if (addMode === 'recipe' && recipes.length > 0) {
        if (!selectedId) setSelectedId(recipes[0].id);
      }
      setTimeout(() => weightInputRef.current?.focus(), 100);
    }
  }, [isAdding, addMode, foods, recipes, selectedId]);

  const mealTotals = entries.reduce((acc, entry) => {
    const food = foods.find(f => f.id === entry.foodId);
    if (food) {
      const factor = entry.weightGrams / 100;
      acc.kcal += food.kcal * factor;
      acc.carbs += food.carbs * factor;
      acc.protein += food.protein * factor;
      acc.fat += food.fat * factor;
    }
    return acc;
  }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });

  // --- ADVANCED GRAM OPTIMIZER LOGIC ---
  const calculateOptimalGrams = () => {
    if (!residuals || entries.length === 0) return;

    // 1. Setup Iniziale
    // Mappiamo gli alimenti attuali. 
    // WorkingWeights parte dai grammi attuali (VINCOLO: Non scendere sotto).
    const workingSet = entries.map(e => {
        const food = foods.find(f => f.id === e.foodId);
        return { 
            id: e.id, 
            food, 
            weight: e.weightGrams || 0, // Base di partenza
            locked: false // Futuro: se l'utente bloccasse un cibo
        };
    }).filter(item => item.food !== undefined) as { id: string, food: Food, weight: number, locked: boolean }[];

    // Limiti e Tolleranze
    const MAX_WEIGHT_PER_FOOD = 400; // g
    const TOLERANCE_MACRO = 5; // g
    const TOLERANCE_KCAL = 50; // kcal
    const MAX_ITERATIONS = 200; // Evita loop infiniti

    let currentIter = 0;
    
    // Funzione helper per calcolare i totali attuali della simulazione
    const getCurrentSimulatedTotals = () => {
        return workingSet.reduce((acc, item) => {
            const f = item.food;
            const ratio = item.weight / 100;
            acc.kcal += f.kcal * ratio;
            acc.p += f.protein * ratio;
            acc.c += f.carbs * ratio;
            acc.f += f.fat * ratio;
            return acc;
        }, { kcal: 0, p: 0, c: 0, f: 0 });
    };

    // --- ALGORITMO ITERATIVO ---
    while (currentIter < MAX_ITERATIONS) {
        const sim = getCurrentSimulatedTotals();
        
        // Calcola Gap (Residui TOTALI Giornalieri - Totale Pasto Attuale Simulato)
        // Nota: residuals passato come prop è (TargetTotale - ConsumatoAltriPasti - ConsumatoQuestoPastoOriginale).
        // Quindi dobbiamo confrontare i gap rispetto a quanto stiamo AGGIUNGENDO rispetto all'originale.
        // Semplificazione: L'obiettivo è colmare 'residuals' + mealTotals (perché residuals è calcolato SOTTRAENDO il mealTotals corrente in App.tsx).
        // Ricalcoliamo il "Target Assoluto Mancante" da coprire con QUESTO pasto.
        const targetForThisMeal = {
            kcal: residuals.kcal + mealTotals.kcal,
            p: residuals.protein + mealTotals.protein,
            c: residuals.carbs + mealTotals.carbs,
            f: residuals.fat + mealTotals.fat
        };

        const gapP = targetForThisMeal.p - sim.p;
        const gapC = targetForThisMeal.c - sim.c;
        const gapF = targetForThisMeal.f - sim.f;
        const gapKcal = targetForThisMeal.kcal - sim.kcal;

        // Condizioni di Stop (Target raggiunti o sforati troppo)
        if (gapP <= TOLERANCE_MACRO && gapC <= TOLERANCE_MACRO && gapF <= TOLERANCE_MACRO && gapKcal <= TOLERANCE_KCAL) {
            break; // Ottimo!
        }
        if (gapKcal < -TOLERANCE_KCAL) {
            break; // Stiamo sforando le calorie, fermati.
        }

        let actionTaken = false;

        // Strategia di Incremento
        // 1. Priorità PROTEINE
        if (gapP > TOLERANCE_MACRO) {
            // Trova cibo con miglior rapporto Proteine/Kcal (o pure proteine) che non sia al limite
            const bestP = workingSet
                .filter(w => w.weight < MAX_WEIGHT_PER_FOOD)
                .sort((a, b) => (b.food.protein / (b.food.kcal || 1)) - (a.food.protein / (a.food.kcal || 1)))[0];
            
            if (bestP) {
                bestP.weight += 5; // Step 5g
                actionTaken = true;
            }
        } 
        // 2. Priorità GRASSI (sono densi, occhio)
        else if (gapF > TOLERANCE_MACRO) {
            const bestF = workingSet
                .filter(w => w.weight < MAX_WEIGHT_PER_FOOD)
                .sort((a, b) => b.food.fat - a.food.fat)[0];
            
            if (bestF) {
                bestF.weight += 2; // Step 2g (più cauto)
                actionTaken = true;
            }
        }
        // 3. Priorità CARBOIDRATI
        else if (gapC > TOLERANCE_MACRO) {
            const bestC = workingSet
                .filter(w => w.weight < MAX_WEIGHT_PER_FOOD)
                .sort((a, b) => b.food.carbs - a.food.carbs)[0];
            
            if (bestC) {
                bestC.weight += 5; // Step 5g
                actionTaken = true;
            }
        }
        // 4. Riempimento CALORIE (Se macro ok ma mancano kcal)
        else if (gapKcal > TOLERANCE_KCAL) {
             // Aumenta cibo con meno impatto sui macro già pieni o bilanciato
             const filler = workingSet
                .filter(w => w.weight < MAX_WEIGHT_PER_FOOD)
                .sort((a, b) => a.food.kcal - b.food.kcal)[0]; // Quello meno calorico per volume? No, meglio quello che piace. 
                // Usiamo quello con più calorie per chiudere prima
             if (filler) {
                 filler.weight += 5;
                 actionTaken = true;
             }
        }

        if (!actionTaken) break; // Non possiamo aggiungere altro
        currentIter++;
    }

    // --- ANALISI RISULTATO E MESSAGGI ---
    const finalSim = getCurrentSimulatedTotals();
    const finalTarget = {
        kcal: residuals.kcal + mealTotals.kcal,
        p: residuals.protein + mealTotals.protein,
        c: residuals.carbs + mealTotals.carbs,
        f: residuals.fat + mealTotals.fat
    };
    
    const missingP = finalTarget.p - finalSim.p;
    const missingC = finalTarget.c - finalSim.c;
    const missingF = finalTarget.f - finalSim.f;

    let msg = "Grammature ottimizzate con successo.";
    let isError = false;

    if (missingP > 10) {
        msg = "Impossibile bilanciare le Proteine con questi cibi. Aggiungi una fonte proteica.";
        isError = true;
    } else if (missingC > 20) {
        msg = "Mancano Carboidrati. Aggiungi riso, pasta o patate.";
        isError = true;
    } else if (missingF > 15) {
        msg = "Grassi bassi. Aggiungi olio o frutta secca.";
        isError = true;
    } else if (finalSim.kcal > finalTarget.kcal + 100) {
        msg = "Attenzione: per raggiungere i macro sforerai le calorie.";
        isError = true;
    }

    // Output
    setOptimizedValues(workingSet.map(w => ({ id: w.id, weight: w.weight })));
    
    // Calcolo Percentuale copertura calorie
    const percentCovered = Math.min(100, (finalSim.kcal / (finalTarget.kcal || 1)) * 100);

    setOptimizationPreview({ percent: percentCovered, msg, isError });
    setShowOptimizer(true);
  };

  const applyOptimization = () => {
    optimizedValues.forEach(v => {
        onUpdate(type, v.id, v.weight);
    });
    setShowOptimizer(false);
  };

  const handleAddAction = () => {
    if (!selectedId) return;
    if (addMode === 'food') {
      onAdd(type, selectedId, Number(weight) || 0);
    } else {
      onAddRecipe(type, selectedId);
    }
    setIsAdding(false);
    setSelectedId('');
    setWeight(''); 
  };

  const handleSaveRecipe = () => {
    if (!newRecipeName) return;
    onSaveAsRecipe(type, newRecipeName);
    setIsSavingRecipe(false);
    setNewRecipeName('');
  };

  const handleStartEdit = (entry: MealEntry) => {
    setEditingEntryId(entry.id);
    setEditWeight(entry.weightGrams);
  };

  const handleSaveEdit = () => {
    if (editingEntryId) {
      onUpdate(type, editingEntryId, Number(editWeight) || 0);
      setEditingEntryId(null);
    }
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedId(e.target.value);
    weightInputRef.current?.focus();
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
      {/* Header with improved contrast */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl filter grayscale-[0.2]">{icon}</span>
          <h2 className="text-xl font-black text-black uppercase tracking-tight leading-none">
            {title}
          </h2>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button 
              onClick={() => setIsSavingRecipe(!isSavingRecipe)} 
              className="p-2.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-all border border-amber-200 shadow-sm active:scale-95"
              title="Salva come Ricetta"
            >
              <BookmarkIcon className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => { setIsAdding(!isAdding); setIsSavingRecipe(false); setShowOptimizer(false); }} 
            className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            {isAdding ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* GRAM OPTIMIZER UI */}
      {type === 'cena' && residuals && entries.length > 0 && !isAdding && (
        <div className="mb-6">
            {!showOptimizer ? (
               <button 
                 onClick={calculateOptimalGrams}
                 className="w-full py-3 bg-slate-800 text-white rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-slate-900 transition-all border border-slate-600 active:scale-[0.98]"
               >
                 <ScaleIcon className="w-5 h-5 text-emerald-400" />
                 <span className="font-bold text-xs uppercase tracking-widest">Calcola Grammi Ottimali</span>
               </button>
            ) : (
               <div className={`border rounded-2xl p-4 animate-in zoom-in duration-200 ${optimizationPreview?.isError ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                   <div className="flex justify-between items-start mb-3">
                       <div className={`flex items-center gap-2 ${optimizationPreview?.isError ? 'text-rose-900' : 'text-indigo-900'}`}>
                           {optimizationPreview?.isError ? <ExclamationTriangleIcon className="w-5 h-5"/> : <CalculatorIcon className="w-5 h-5" />}
                           <h4 className="font-black text-xs uppercase tracking-widest">Anteprima Calcolo</h4>
                       </div>
                       <button onClick={() => setShowOptimizer(false)} className="text-slate-400 hover:text-slate-600"><XMarkIcon className="w-5 h-5"/></button>
                   </div>

                   <p className={`text-[11px] font-bold mb-3 leading-tight ${optimizationPreview?.isError ? 'text-rose-700' : 'text-slate-600'}`}>
                       {optimizationPreview?.msg}
                   </p>

                   {/* Preview Grid */}
                   <div className="space-y-2 mb-4">
                       {optimizedValues.map(opt => {
                           const f = foods.find(food => food.id === entries.find(e => e.id === opt.id)?.foodId);
                           if (!f) return null;
                           const originalWeight = entries.find(e => e.id === opt.id)?.weightGrams || 0;
                           const diff = opt.weight - originalWeight;

                           return (
                               <div key={opt.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                   <span className="font-bold text-slate-700 truncate mr-2">{f.name}</span>
                                   <div className="flex items-center gap-2">
                                       <span className="text-slate-400 text-[10px]">{originalWeight}g</span>
                                       {diff > 0 && <span className="text-[9px] text-emerald-500 font-black">+{diff}</span>}
                                       <span className="text-emerald-700 font-black bg-emerald-100 px-1.5 py-0.5 rounded">{opt.weight}g</span>
                                   </div>
                               </div>
                           )
                       })}
                   </div>
                   
                   <button onClick={applyOptimization} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2">
                       <CheckIcon className="w-4 h-4" /> Applica Valori
                   </button>
               </div>
            )}
        </div>
      )}

      {/* ... Existing Recipe/Add Logic ... */}

      {isSavingRecipe && (
        <div className="mb-6 p-5 bg-amber-50 rounded-2xl border border-amber-200 animate-in slide-in-from-top-2 duration-200 shadow-inner">
           <label className="block text-[10px] font-black text-amber-800 uppercase mb-2 tracking-widest">Nome della Ricetta</label>
           <input 
              type="text" 
              value={newRecipeName} 
              onChange={(e) => setNewRecipeName(e.target.value)}
              className="w-full p-4 bg-white border border-amber-200 rounded-xl text-sm mb-4 outline-none text-black font-bold focus:ring-2 focus:ring-amber-500/20" 
              placeholder="es. Colazione Proteica" 
            />
           <button onClick={handleSaveRecipe} className="w-full py-3.5 bg-amber-600 text-white rounded-xl text-[11px] font-black shadow-md hover:bg-amber-700 transition-colors uppercase tracking-widest">Salva Ricetta</button>
        </div>
      )}

      {isAdding && (
        <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2 duration-300 shadow-inner">
          <div className="flex bg-slate-200 p-1 rounded-xl mb-5 border border-slate-200">
            <button onClick={() => { setAddMode('food'); setSelectedId(''); }}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${addMode === 'food' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>ALIMENTO</button>
            <button onClick={() => { setAddMode('recipe'); setSelectedId(''); }}
              className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${addMode === 'recipe' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>RICETTA</button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Selezione</label>
              <select value={selectedId} onChange={handleSelectionChange} className="w-full p-4 bg-white border border-slate-300 rounded-xl text-sm text-black font-bold focus:border-indigo-500 outline-none transition-all">
                {/* Removed default option, auto-select handles logic */}
                {addMode === 'food' ? foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>) : recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {addMode === 'food' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Peso (g)</label>
                <input 
                  ref={weightInputRef}
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-4 bg-white border border-slate-300 rounded-xl text-sm text-black font-bold focus:border-indigo-500 outline-none" 
                  placeholder="Inserisci grammi..." 
                />
              </div>
            )}
            <button onClick={handleAddAction} disabled={!selectedId} className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-all uppercase tracking-widest">Aggiungi</button>
          </div>
        </div>
      )}

      {/* Food Entries List */}
      <div className="space-y-1 mb-8">
        {entries.map(entry => {
          const food = foods.find(f => f.id === entry.foodId);
          if (!food) return null;
          const factor = entry.weightGrams / 100;
          const isEditing = editingEntryId === entry.id;

          return (
            <div 
              key={entry.id} 
              className={`py-3 px-1 transition-all border-b border-slate-50 last:border-0 ${isEditing ? 'bg-indigo-50/50 rounded-2xl px-3 border-none' : 'hover:bg-slate-50 cursor-pointer'}`}
              onClick={() => !isEditing && handleStartEdit(entry)}
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-bold text-slate-800 uppercase truncate">
                      {food.name}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {entry.weightGrams}g
                    </span>
                  </div>
                  
                  {!isEditing && (
                    <div className="flex items-center gap-4 mt-1.5 overflow-x-auto no-scrollbar">
                       <span className="text-[11px] text-slate-900 font-black tabular-nums shrink-0">
                         {(food.kcal * factor).toFixed(0)} <span className="text-[9px] font-medium text-slate-400">kcal</span>
                       </span>
                       
                       <div className="flex items-center gap-3 shrink-0">
                          {/* Stylized P/C/G Labels */}
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-sm bg-blue-100 text-blue-600 text-[8px] font-black flex items-center justify-center">P</span>
                            <span className="text-[11px] font-bold text-slate-600 tabular-nums">{(food.protein * factor).toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-sm bg-amber-100 text-amber-600 text-[8px] font-black flex items-center justify-center">C</span>
                            <span className="text-[11px] font-bold text-slate-600 tabular-nums">{(food.carbs * factor).toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-sm bg-rose-100 text-rose-600 text-[8px] font-black flex items-center justify-center">G</span>
                            <span className="text-[11px] font-bold text-slate-600 tabular-nums">{(food.fat * factor).toFixed(1)}</span>
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="number" 
                      value={editWeight} 
                      onChange={(e) => setEditWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 p-2 bg-white border border-indigo-300 rounded-xl text-xs font-black text-black outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="g"
                    />
                    <button onClick={handleSaveEdit} className="p-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600 transition-colors">
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => { onDelete(type, entry.id); setEditingEntryId(null); }} className="p-2 bg-rose-500 text-white rounded-lg shadow-sm hover:bg-rose-600 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingEntryId(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-[10px] font-black uppercase italic tracking-widest">
              Pasto Vuoto
            </p>
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="pt-6 border-t border-slate-100">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Riepilogo Pasto</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter">
            {mealTotals.kcal.toFixed(0)} <span className="text-xs font-bold uppercase tracking-normal text-slate-400">kcal</span>
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Protein Card */}
          <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 flex flex-col items-center justify-center transition-all hover:bg-blue-50">
            <p className="text-[9px] font-black text-blue-700/60 uppercase tracking-widest mb-1">Proteine</p>
            <p className="text-lg font-black text-blue-900 leading-none">
              {mealTotals.protein.toFixed(1)}<span className="text-[10px] ml-0.5">g</span>
            </p>
          </div>
          
          {/* Carbs Card */}
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 flex flex-col items-center justify-center transition-all hover:bg-amber-50">
            <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-1">Carbo</p>
            <p className="text-lg font-black text-amber-900 leading-none">
              {mealTotals.carbs.toFixed(1)}<span className="text-[10px] ml-0.5">g</span>
            </p>
          </div>
          
          {/* Fat Card */}
          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100 flex flex-col items-center justify-center transition-all hover:bg-rose-50">
            <p className="text-[9px] font-black text-rose-700/60 uppercase tracking-widest mb-1">Grassi</p>
            <p className="text-lg font-black text-rose-900 leading-none">
              {mealTotals.fat.toFixed(1)}<span className="text-[10px] ml-0.5">g</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealCard;
