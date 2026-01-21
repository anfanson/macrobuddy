
import React, { useState, useEffect, useRef } from 'react';
import { Food, Recipe, RecipeIngredient } from '../types';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, QrCodeIcon, FireIcon, BeakerIcon, ChevronDownIcon, ChevronUpIcon, PencilSquareIcon, CheckIcon, XMarkIcon, ExclamationCircleIcon, ArrowPathIcon, ArrowUpTrayIcon, TagIcon } from '@heroicons/react/24/solid';
import BarcodeScanner from './BarcodeScanner';
import Papa from 'papaparse';

interface FoodManagerProps {
  foods: Food[];
  recipes: Recipe[];
  onAdd: (food: Food) => void;
  onDelete: (id: string) => void;
  onAddRecipe: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
}

const FoodManager: React.FC<FoodManagerProps> = ({ 
  foods, recipes, onAdd, onDelete, onAddRecipe, onUpdateRecipe, onDeleteRecipe 
}) => {
  const [managerMode, setManagerMode] = useState<'foods' | 'recipes'>('foods');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Scanner & API States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing States
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Manual Form State
  const [formData, setFormData] = useState({
    name: '', 
    kcal: '' as string | number, 
    carbs: '' as string | number, 
    protein: '' as string | number, 
    fat: '' as string | number, 
    fiber: '' as string | number,
    tags: '' // Campo per i tag (es. "colazione, cena")
  });

  const [recipeName, setRecipeName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [tempFoodId, setTempFoodId] = useState('');
  const [tempWeight, setTempWeight] = useState<string | number>(''); 

  const [editingIngredientIdx, setEditingIngredientIdx] = useState<number | null>(null);
  const [editIngWeight, setEditIngWeight] = useState<string | number>('');

  // Auto-select first food when creating recipe
  useEffect(() => {
    if (managerMode === 'recipes' && isFormOpen && foods.length > 0 && !tempFoodId) {
      setTempFoodId(foods[0].id);
    }
  }, [managerMode, isFormOpen, foods, tempFoodId]);

  const getPredominantColor = (food: Food) => {
    const { protein, carbs, fat } = food;
    if (protein >= carbs && protein >= fat && protein > 0) return 'bg-blue-500';
    if (carbs >= protein && carbs >= fat && carbs > 0) return 'bg-amber-400';
    if (fat >= protein && fat >= carbs && fat > 0) return 'bg-orange-500';
    return 'bg-slate-300';
  };

  const handleSubmitFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onAdd({ 
      id: crypto.randomUUID(),
      name: formData.name,
      kcal: Number(formData.kcal) || 0,
      carbs: Number(formData.carbs) || 0,
      protein: Number(formData.protein) || 0,
      fat: Number(formData.fat) || 0,
      fiber: Number(formData.fiber) || 0,
      tags: formData.tags
    });
    setFormData({ name: '', kcal: '', carbs: '', protein: '', fat: '', fiber: '', tags: '' });
    setIsFormOpen(false);
    setScanError(null);
  };

  const handleCreateOrUpdateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName || recipeIngredients.length === 0) return;
    
    if (editingRecipeId) {
      onUpdateRecipe({
        id: editingRecipeId,
        name: recipeName,
        ingredients: [...recipeIngredients]
      });
    } else {
      onAddRecipe({
        id: crypto.randomUUID(),
        name: recipeName,
        ingredients: [...recipeIngredients]
      });
    }
    
    resetRecipeForm();
  };

  const resetRecipeForm = () => {
    setRecipeName('');
    setRecipeIngredients([]);
    setEditingRecipeId(null);
    setEditingIngredientIdx(null);
    setIsFormOpen(false);
    setScanError(null);
  };

  const startEditRecipe = (recipe: Recipe) => {
    setManagerMode('recipes');
    setRecipeName(recipe.name);
    setRecipeIngredients([...recipe.ingredients]);
    setEditingRecipeId(recipe.id);
    setIsFormOpen(true);
  };

  const addIngredientToRecipe = () => {
    if (!tempFoodId) return;
    setRecipeIngredients([...recipeIngredients, { foodId: tempFoodId, weightGrams: Number(tempWeight) || 100 }]);
    setTempWeight(''); 
  };

  const removeIngredientFromRecipe = (idx: number) => {
    if (editingIngredientIdx === idx) setEditingIngredientIdx(null);
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
  };

  const startEditingIngredientWeight = (idx: number, currentWeight: number) => {
    setEditingIngredientIdx(idx);
    setEditIngWeight(currentWeight);
  };

  const saveIngredientWeight = (idx: number) => {
    const updated = [...recipeIngredients];
    updated[idx] = { ...updated[idx], weightGrams: Number(editIngWeight) || 0 };
    setRecipeIngredients(updated);
    setEditingIngredientIdx(null);
  };

  // --- LOGICA CSV IMPORT ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseNumberItalian = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    // Sostituisce la virgola con il punto e rimuove caratteri non numerici (eccetto punto)
    const normalized = str.replace(',', '.').replace(/[^0-9.]/g, '');
    return parseFloat(normalized) || 0;
  };

  const findKey = (row: any, candidates: string[]) => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const match = keys.find(k => k.toLowerCase().includes(cand.toLowerCase()));
      if (match) return row[match];
    }
    return null;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        let addedCount = 0;
        
        results.data.forEach((row: any) => {
          // Mappatura flessibile delle colonne
          const name = findKey(row, ['nome', 'name', 'alimento', 'prodotto']);
          
          if (name) {
            const food: Food = {
              id: crypto.randomUUID(),
              name: String(name).trim(),
              kcal: parseNumberItalian(findKey(row, ['kcal', 'calorie', 'energy', 'energia'])),
              protein: parseNumberItalian(findKey(row, ['prot', 'protein'])),
              carbs: parseNumberItalian(findKey(row, ['carb', 'carbo'])),
              fat: parseNumberItalian(findKey(row, ['fat', 'grassi', 'lipidi'])),
              fiber: parseNumberItalian(findKey(row, ['fib', 'fiber'])),
              // Mappa colonne tags
              tags: String(findKey(row, ['pasto', 'tags', 'categoria', 'momento', 'category']) || '')
            };

            onAdd(food);
            addedCount++;
          }
        });

        if (addedCount > 0) {
            alert(`Importati con successo ${addedCount} alimenti!`);
        } else {
            alert("Nessun alimento valido trovato nel CSV. Controlla le intestazioni (Nome, Kcal, ecc).");
        }
      },
      error: (err: any) => {
        console.error("Errore CSV:", err);
        alert("Errore durante la lettura del file CSV.");
      }
    });

    // Reset input
    e.target.value = '';
  };

  // LOGICA DI SCANSIONE E FETCH
  const handleBarcodeScan = async (barcode: string) => {
    console.log("Inizio gestione codice:", barcode);
    setIsScannerOpen(false);
    setIsSearchingApi(true);
    setScanError(null);
    setIsFormOpen(true);
    setManagerMode('foods');

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();
      
      console.log("Risposta API:", data);

      if (data.status === 1) {
        const product = data.product;
        const nuts = product.nutriments;
        
        setFormData({
          name: product.product_name || `Prodotto ${barcode}`,
          kcal: Number(nuts['energy-kcal_100g']) || 0,
          carbs: Number(nuts.carbohydrates_100g) || 0,
          protein: Number(nuts.proteins_100g) || 0,
          fat: Number(nuts.fat_100g) || 0,
          fiber: Number(nuts.fiber_100g) || 0,
          tags: ''
        });
      } else {
        setScanError("Prodotto non trovato nel database globale.");
        setFormData({ name: '', kcal: '', carbs: '', protein: '', fat: '', fiber: '', tags: '' });
      }
    } catch (error) {
      console.error("Errore Fetch:", error);
      setScanError("Errore di connessione. Controlla internet.");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const calculateRecipeMacros = (recipe: { ingredients: RecipeIngredient[] }) => {
    return recipe.ingredients.reduce((acc, ing) => {
      const f = foods.find(food => food.id === ing.foodId);
      if (f) {
        const factor = ing.weightGrams / 100;
        acc.kcal += f.kcal * factor;
        acc.carbs += f.carbs * factor;
        acc.protein += f.protein * factor;
        acc.fat += f.fat * factor;
      }
      return acc;
    }, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
  };

  const filteredFoods = foods.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.tags && f.tags.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const inputStyle = "w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm text-black font-bold placeholder-slate-400 transition-all";
  const labelStyle = "block text-xs font-black text-black uppercase mb-1 tracking-tight";

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner border border-slate-300">
        <button 
          onClick={() => { setManagerMode('foods'); setIsFormOpen(false); }}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${managerMode === 'foods' ? 'bg-white text-indigo-700 shadow-md border border-indigo-200' : 'text-slate-600 hover:text-indigo-600'}`}
        >
          <FireIcon className="w-4 h-4 inline mr-1" /> Alimenti
        </button>
        <button 
          onClick={() => { setManagerMode('recipes'); setIsFormOpen(false); }}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${managerMode === 'recipes' ? 'bg-white text-indigo-700 shadow-md border border-indigo-200' : 'text-slate-600 hover:text-indigo-600'}`}
        >
          <BeakerIcon className="w-4 h-4 inline mr-1" /> Ricette
        </button>
      </div>

      <div className="flex justify-between items-center gap-2">
        <h2 className="text-2xl font-black text-black tracking-tight flex-1">
          {managerMode === 'foods' ? 'Database' : 'Ricette'}
        </h2>
        <div className="flex gap-2">
          {managerMode === 'foods' && (
            <>
              {/* Input CSV nascosto */}
              <input 
                 type="file" 
                 accept=".csv" 
                 ref={fileInputRef} 
                 onChange={handleImportCSV} 
                 className="hidden" 
              />
              
              <button 
                onClick={handleImportClick}
                className="p-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors border border-slate-300 active:scale-95 shadow-sm"
                title="Importa da CSV"
              >
                <ArrowUpTrayIcon className="w-6 h-6" />
              </button>

              <button 
                onClick={() => setIsScannerOpen(true)} 
                className="p-3 bg-white text-indigo-700 rounded-2xl hover:bg-indigo-50 transition-colors border-2 border-slate-200 active:border-indigo-500 shadow-sm relative overflow-hidden active:scale-95"
              >
                <QrCodeIcon className="w-6 h-6" />
                {isSearchingApi && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
                     <ArrowPathIcon className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                )}
              </button>
            </>
          )}
          <button onClick={() => { setIsFormOpen(!isFormOpen); setEditingRecipeId(null); setRecipeName(''); setRecipeIngredients([]); setScanError(null); setFormData({ name: '', kcal: '', carbs: '', protein: '', fat: '', fiber: '', tags: '' }); }} className="px-4 py-3 bg-green-600 text-white text-sm font-black rounded-2xl shadow-lg flex items-center gap-2 hover:bg-green-700 transition-colors border border-green-800 uppercase tracking-widest active:scale-95">
            <PlusIcon className="w-5 h-5" /> Nuovo
          </button>
        </div>
      </div>

      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}

      {isFormOpen && managerMode === 'foods' && (
        <form onSubmit={handleSubmitFood} className={`bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-200 space-y-5 animate-in fade-in zoom-in duration-300 relative`}>
          
          {/* Loading Overlay sul Form */}
          {isSearchingApi && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-3xl animate-in fade-in">
                <ArrowPathIcon className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                <p className="text-indigo-900 font-black uppercase text-xs tracking-widest">Ricerca Prodotto...</p>
            </div>
          )}

          {scanError && (
            <div className="flex flex-col gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                <span>{scanError}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsScannerOpen(true)}
                className="self-end px-3 py-1.5 bg-rose-200 text-rose-800 rounded-lg text-[10px] uppercase font-black hover:bg-rose-300"
              >
                Riprova Scanner
              </button>
            </div>
          )}

          <div>
            <label className={labelStyle}>Nome Alimento</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className={inputStyle} placeholder="es. Riso Basmati" />
          </div>
          <div>
            <label className={labelStyle}>Tag / Pasto <span className="text-slate-400 font-normal normal-case">(opzionale)</span></label>
            <div className="relative">
                <TagIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    value={formData.tags} 
                    onChange={e => setFormData({...formData, tags: e.target.value})}
                    className={`${inputStyle} pl-9`} 
                    placeholder="es. pranzo, cena" 
                />
            </div>
          </div>

          <p className="text-[10px] text-black font-bold uppercase italic border-b border-slate-100 pb-1">Valori (per 100g)</p>
          <div className="grid grid-cols-2 gap-4">
            {['kcal', 'carbs', 'protein', 'fat', 'fiber'].map(field => (
              <div key={field}>
                <label className={labelStyle}>{field}</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={(formData as any)[field]} 
                  onChange={e => setFormData({...formData, [field]: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputStyle} 
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 bg-slate-100 text-black border border-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest shadow hover:bg-slate-200">Annulla</button>
            <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl border border-green-800 uppercase tracking-widest hover:bg-green-700">Salva</button>
          </div>
        </form>
      )}

      {/* ... Recipe Form remains unchanged but is included in the output for context if needed, but I'll skip re-rendering identical code blocks to keep it clean unless requested. Since I'm in update mode, I'll assume the Recipe Form block is preserved. Wait, I must output the FULL file content in XML. */}
      {isFormOpen && managerMode === 'recipes' && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-slate-200 space-y-5 animate-in fade-in zoom-in duration-300">
           <h3 className="text-lg font-black text-black uppercase tracking-tight">{editingRecipeId ? 'Modifica Ricetta' : 'Crea Ricetta'}</h3>
           <div>
              <label className={labelStyle}>Nome Ricetta</label>
              <input required type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)}
                className={inputStyle} placeholder="es. Pollo con Riso" />
           </div>
           
           {recipeIngredients.length > 0 && (
             <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
               <p className="text-[9px] font-black text-black uppercase tracking-widest mb-2 text-center">Totali Ricetta</p>
               {(() => {
                 const t = calculateRecipeMacros({ ingredients: recipeIngredients });
                 return (
                  <div className="grid grid-cols-4 gap-2 text-[9px] font-black uppercase text-center text-black">
                    <div className="bg-white border border-slate-200 p-2 rounded-xl shadow-sm">KCAL {t.kcal.toFixed(0)}</div>
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl shadow-sm text-blue-700">P {t.protein.toFixed(1)}G</div>
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl shadow-sm text-amber-700">C {t.carbs.toFixed(1)}G</div>
                    <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl shadow-sm text-orange-700">G {t.fat.toFixed(1)}G</div>
                  </div>
                 );
               })()}
             </div>
           )}

           <div className="space-y-3 border-t border-slate-200 pt-4">
              <label className={labelStyle}>Aggiungi Ingredienti</label>
              <div className="flex flex-col gap-3">
                 <select value={tempFoodId} onChange={(e) => setTempFoodId(e.target.value)} className={inputStyle}>
                    {foods.map(f => <option key={f.id} value={f.id} className="text-black font-bold">{f.name}</option>)}
                 </select>
                 <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={tempWeight} 
                      onChange={(e) => setTempWeight(e.target.value === '' ? '' : Number(e.target.value))} 
                      className={`${inputStyle} flex-1`} 
                      placeholder="Grammi" 
                    />
                    <button onClick={addIngredientToRecipe} className="px-5 bg-indigo-600 text-white rounded-xl border border-indigo-800 shadow hover:bg-indigo-700 transition-colors">
                      <PlusIcon className="w-5 h-5" />
                    </button>
                 </div>
              </div>
           </div>
           
           <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar border-y border-slate-200 py-3">
              {recipeIngredients.length === 0 ? (
                <p className="text-center text-black text-[10px] font-black uppercase italic">Nessun ingrediente</p>
              ) : (
                recipeIngredients.map((ing, idx) => {
                  const f = foods.find(food => food.id === ing.foodId);
                  const isEditingIng = editingIngredientIdx === idx;
                  
                  return (
                    <div key={idx} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${isEditingIng ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                      <div className="flex-1 min-w-0" onClick={() => !isEditingIng && startEditingIngredientWeight(idx, ing.weightGrams)}>
                        <div className="flex items-center gap-2">
                           {f && <div className={`w-2 h-2 rounded-full ${getPredominantColor(f)}`} />}
                           <span className="text-black font-black uppercase text-[10px] block truncate cursor-pointer hover:text-indigo-600 transition-colors">
                            {f?.name || 'Sconosciuto'} 
                           </span>
                        </div>
                        {!isEditingIng && (
                          <span className="text-black font-bold lowercase text-[9px] ml-4">
                            {ing.weightGrams}g - clicca per modificare
                          </span>
                        )}
                      </div>
                      
                      {isEditingIng ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={editIngWeight} 
                            onChange={(e) => setEditIngWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-16 p-1 text-[10px] font-bold border border-indigo-400 rounded-lg outline-none text-black"
                            autoFocus
                            placeholder="g"
                          />
                          <button onClick={() => saveIngredientWeight(idx)} className="p-1.5 bg-green-500 text-white rounded-lg"><CheckIcon className="w-3.5 h-3.5"/></button>
                          <button onClick={() => setEditingIngredientIdx(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg"><XMarkIcon className="w-3.5 h-3.5"/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditingIngredientWeight(idx, ing.weightGrams)} className="p-1.5 text-black hover:bg-indigo-100 rounded-lg transition-all">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeIngredientFromRecipe(idx)} className="p-1.5 text-black hover:bg-rose-100 rounded-lg transition-all">
                            <TrashIcon className="w-4 h-4"/>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
           </div>
           
           <div className="flex gap-3 pt-2">
              <button onClick={resetRecipeForm} className="flex-1 py-3 bg-slate-100 text-black border border-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest shadow hover:bg-slate-200">Annulla</button>
              <button onClick={handleCreateOrUpdateRecipe} disabled={!recipeName || recipeIngredients.length === 0} className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl border border-green-800 disabled:bg-slate-300 uppercase tracking-widest hover:bg-green-700">Salva</button>
           </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder={managerMode === 'foods' ? "Cerca alimenti..." : "Cerca ricette..."}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 shadow-sm text-black font-black uppercase tracking-tight text-sm" />
        </div>

        <div className="space-y-3">
          {managerMode === 'foods' ? (
            filteredFoods.map(food => (
              <div key={food.id} className="bg-white p-5 rounded-3xl border border-slate-200 flex justify-between items-center group shadow-sm hover:border-indigo-300 transition-all">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-black text-black uppercase tracking-tight truncate">{food.name}</h3>
                  {/* Display tags if present */}
                  {food.tags && (
                      <div className="flex mt-1">
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                            {food.tags}
                        </span>
                      </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] text-black font-black bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{food.kcal} KCAL</span>
                    <div className="flex items-center gap-1.5">
                       <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[9px] font-black text-blue-700">
                         <span className="opacity-60">P</span> {food.protein}
                       </span>
                       <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[9px] font-black text-amber-700">
                         <span className="opacity-60">C</span> {food.carbs}
                       </span>
                       <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded-md text-[9px] font-black text-orange-700">
                         <span className="opacity-60">G</span> {food.fat}
                       </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => onDelete(food.id)} className="p-2.5 text-slate-300 hover:text-rose-600 transition-all hover:bg-rose-50 rounded-xl"><TrashIcon className="w-5 h-5" /></button>
              </div>
            ))
          ) : (
            filteredRecipes.map(recipe => {
              const totals = calculateRecipeMacros(recipe);
              const isExpanded = expandedRecipeId === recipe.id;
              
              return (
                <div key={recipe.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-300 transition-all mb-3">
                  <div className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-black text-black flex items-center gap-2 uppercase tracking-tight">
                        <BeakerIcon className="w-5 h-5 text-black opacity-80"/> {recipe.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-black font-black bg-slate-100 px-2 py-0.5 rounded-full">{totals.kcal.toFixed(0)} kcal</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[9px] font-bold text-black"><span className="w-2 h-2 rounded-full bg-blue-500"></span>P:{totals.protein.toFixed(1)}</span>
                          <span className="flex items-center gap-1 text-[9px] font-bold text-black"><span className="w-2 h-2 rounded-full bg-amber-400"></span>C:{totals.carbs.toFixed(1)}</span>
                          <span className="flex items-center gap-1 text-[9px] font-bold text-black"><span className="w-2 h-2 rounded-full bg-orange-500"></span>G:{totals.fat.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                       <button onClick={(e) => { e.stopPropagation(); startEditRecipe(recipe); }} className="p-2 text-black hover:bg-indigo-50 rounded-xl transition-all"><PencilSquareIcon className="w-5 h-5"/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDeleteRecipe(recipe.id); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><TrashIcon className="w-5 h-5"/></button>
                       <div className="ml-1 p-1">
                        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-black" /> : <ChevronDownIcon className="w-5 h-5 text-black" />}
                       </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                       <div className="space-y-1.5 mb-4">
                          <p className="text-[10px] font-black text-black uppercase tracking-[0.15em] mb-2 opacity-40">Ingredienti</p>
                          {recipe.ingredients.map((ing, i) => {
                             const f = foods.find(food => food.id === ing.foodId);
                             return (
                               <div key={i} className="flex justify-between items-baseline text-[11px] text-black py-1.5 border-b border-slate-100 last:border-0">
                                  <div className="flex items-center gap-2 mr-4 min-w-0">
                                    {f && <div className={`w-2 h-2 rounded-full shrink-0 ${getPredominantColor(f)}`} />}
                                    <span className="font-bold uppercase opacity-80 truncate">{f?.name || 'Sconosciuto'}</span>
                                  </div>
                                  <span className="font-black shrink-0">{ing.weightGrams}g</span>
                               </div>
                             );
                          })}
                       </div>
                       <div className="grid grid-cols-4 gap-2 text-[9px] font-black uppercase text-center text-black">
                          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm flex flex-col items-center">
                            <span className="opacity-40 text-[7px] mb-0.5">KCAL</span>
                            {totals.kcal.toFixed(0)}
                          </div>
                          <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-2xl shadow-sm flex flex-col items-center text-blue-700">
                            <span className="text-blue-700/60 text-[7px] mb-0.5">PROT</span>
                            {totals.protein.toFixed(1)}g
                          </div>
                          <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-2xl shadow-sm flex flex-col items-center text-amber-700">
                            <span className="text-amber-700/60 text-[7px] mb-0.5">CARB</span>
                            {totals.carbs.toFixed(1)}g
                          </div>
                          <div className="bg-orange-50/70 border border-orange-100 p-2.5 rounded-2xl shadow-sm flex flex-col items-center text-orange-700">
                            <span className="text-orange-700/60 text-[7px] mb-0.5">FAT</span>
                            {totals.fat.toFixed(1)}g
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {(managerMode === 'foods' ? filteredFoods : filteredRecipes).length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
               <p className="text-black font-black text-xs uppercase tracking-widest italic">Nessun risultato</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodManager;
