
import React, { useState, useEffect, useRef } from 'react';
import { Food, MealEntry, MealType, Recipe } from '../types';
import { PlusIcon, TrashIcon, XMarkIcon, BookmarkIcon, CheckIcon } from '@heroicons/react/24/solid';

interface MealCardProps {
  type: MealType;
  title: string;
  icon: string;
  entries: MealEntry[];
  foods: Food[];
  recipes: Recipe[];
  onAdd: (type: MealType, foodId: string, weight: number) => void;
  onUpdate: (type: MealType, entryId: string, weight: number) => void;
  onAddRecipe: (type: MealType, recipeId: string) => void;
  onDelete: (type: MealType, entryId: string) => void;
  onSaveAsRecipe: (type: MealType, name: string) => void;
}

const MealCard: React.FC<MealCardProps> = ({ 
  type, title, icon, entries, foods, recipes, onAdd, onUpdate, onAddRecipe, onDelete, onSaveAsRecipe 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'food' | 'recipe'>('food');
  const [selectedId, setSelectedId] = useState('');
  const [weight, setWeight] = useState<string | number>(''); // Empty by default
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<string | number>(0);

  const weightInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first item and focus weight input when adding
  useEffect(() => {
    if (isAdding) {
      if (addMode === 'food' && foods.length > 0) {
        if (!selectedId) setSelectedId(foods[0].id);
      } else if (addMode === 'recipe' && recipes.length > 0) {
        if (!selectedId) setSelectedId(recipes[0].id);
      }
      // Delay focus slightly to ensure render complete
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

  const handleAddAction = () => {
    if (!selectedId) return;
    if (addMode === 'food') {
      onAdd(type, selectedId, Number(weight) || 0);
    } else {
      onAddRecipe(type, selectedId);
    }
    setIsAdding(false);
    setSelectedId('');
    setWeight(''); // Reset to empty
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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
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
            onClick={() => { setIsAdding(!isAdding); setIsSavingRecipe(false); }} 
            className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            {isAdding ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

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
