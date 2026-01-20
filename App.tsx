
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cog6ToothIcon, 
  ChartBarIcon, 
  BookOpenIcon, 
  ClockIcon, 
  BoltIcon, 
  MoonIcon 
} from '@heroicons/react/24/outline';
import { Food, MealEntry, MealType, DayMeals, TargetProfiles, CalculatedNutrients, HistoryEntry, TabType, Recipe } from './types';
import ProgressBar from './components/ProgressBar';
import FoodManager from './components/FoodManager';
import TargetForm from './components/TargetForm';
import MealCard from './components/MealCard';
import HistoricalProgress from './components/HistoricalProgress';

const DEFAULT_TARGETS: TargetProfiles = {
  training: { kcal: 2500, carbs: 300, protein: 180, fat: 60, fiber: 30 },
  rest: { kcal: 2000, carbs: 150, protein: 180, fat: 80, fiber: 35 }
};

const INITIAL_DAY_MEALS: DayMeals = {
  colazione: [],
  pranzo: [],
  spuntino: [],
  cena: []
};

const App: React.FC = () => {
  // Genera la chiave univoca per oggi (YYYY-MM-DD). 
  // Se cambia il giorno, questa chiave cambia, causando il reset visivo nei pasti.
  const todayKey = new Date().toISOString().split('T')[0];
  
  // Formattazione data in Italiano per l'Header (es: "20 Gennaio")
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  const [foods, setFoods] = useState<Food[]>(() => {
    const saved = localStorage.getItem('diet_foods');
    return saved ? JSON.parse(saved) : [];
  });

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('diet_recipes');
    return saved ? JSON.parse(saved) : [];
  });

  const [targetProfiles, setTargetProfiles] = useState<TargetProfiles>(() => {
    const saved = localStorage.getItem('diet_targets_profiles');
    return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
  });

  const [isTrainingDay, setIsTrainingDay] = useState<boolean>(() => {
    const saved = localStorage.getItem(`diet_mode_${todayKey}`);
    return saved ? JSON.parse(saved) : true;
  });

  // LOGICA DI RESET GIORNALIERO:
  // Se 'todayKey' non esiste in 'diet_day_meals' (nuovo giorno), 
  // restituisce INITIAL_DAY_MEALS (vuoto), resettando la vista.
  const [dayMeals, setDayMeals] = useState<DayMeals>(() => {
    const saved = localStorage.getItem('diet_day_meals');
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed[todayKey] || INITIAL_DAY_MEALS;
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('diet_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const currentTargets = isTrainingDay ? targetProfiles.training : targetProfiles.rest;

  useEffect(() => {
    localStorage.setItem('diet_foods', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    localStorage.setItem('diet_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('diet_targets_profiles', JSON.stringify(targetProfiles));
  }, [targetProfiles]);

  useEffect(() => {
    localStorage.setItem(`diet_mode_${todayKey}`, JSON.stringify(isTrainingDay));
  }, [isTrainingDay, todayKey]);

  const totalNutrients = useMemo(() => {
    const totals: CalculatedNutrients = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
    (Object.values(dayMeals).flat() as MealEntry[]).forEach((entry) => {
      const food = foods.find(f => f.id === entry.foodId);
      if (food) {
        const factor = entry.weightGrams / 100;
        totals.kcal += food.kcal * factor;
        totals.carbs += food.carbs * factor;
        totals.protein += food.protein * factor;
        totals.fat += food.fat * factor;
        totals.fiber += food.fiber * factor;
      }
    });
    return totals;
  }, [dayMeals, foods]);

  // Salvataggio persistente e aggiornamento Storia
  useEffect(() => {
    // 1. Salva lo stato esatto dei pasti di oggi
    const savedMeals = localStorage.getItem('diet_day_meals');
    const parsedMeals = savedMeals ? JSON.parse(savedMeals) : {};
    parsedMeals[todayKey] = dayMeals;
    localStorage.setItem('diet_day_meals', JSON.stringify(parsedMeals));

    // 2. Aggiorna l'entry della storia per oggi, mantenendo i giorni passati intatti
    setHistory(prev => {
      const filtered = prev.filter(h => h.date !== todayKey);
      const updated = [...filtered, { date: todayKey, isTrainingDay, ...totalNutrients }];
      localStorage.setItem('diet_history', JSON.stringify(updated));
      return updated;
    });
  }, [dayMeals, totalNutrients, todayKey, isTrainingDay]);

  const addFood = (newFood: Food) => {
    setFoods(prev => [...prev, newFood]);
  };

  const deleteFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
    const updatedMeals = { ...dayMeals };
    (Object.keys(updatedMeals) as MealType[]).forEach(type => {
      updatedMeals[type] = updatedMeals[type].filter(entry => entry.foodId !== id);
    });
    setDayMeals(updatedMeals);
  };

  const addRecipe = (newRecipe: Recipe) => {
    setRecipes(prev => [...prev, newRecipe]);
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const addMealEntry = (type: MealType, foodId: string, weight: number) => {
    const newEntry: MealEntry = { id: crypto.randomUUID(), foodId, weightGrams: weight };
    setDayMeals(prev => ({ ...prev, [type]: [...prev[type], newEntry] }));
  };

  const updateMealEntry = (type: MealType, entryId: string, weight: number) => {
    setDayMeals(prev => ({
      ...prev,
      [type]: prev[type].map(e => e.id === entryId ? { ...e, weightGrams: weight } : e)
    }));
  };

  const addRecipeToMeal = (type: MealType, recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    const newEntries: MealEntry[] = recipe.ingredients.map(ing => ({
      id: crypto.randomUUID(),
      foodId: ing.foodId,
      weightGrams: ing.weightGrams
    }));
    setDayMeals(prev => ({ ...prev, [type]: [...prev[type], ...newEntries] }));
  };

  const saveMealAsRecipe = (type: MealType, name: string) => {
    const currentEntries = dayMeals[type];
    if (currentEntries.length === 0) return;
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name,
      ingredients: currentEntries.map(e => ({
        foodId: e.foodId,
        weightGrams: e.weightGrams
      }))
    };
    setRecipes(prev => [...prev, recipe]);
  };

  const deleteMealEntry = (type: MealType, entryId: string) => {
    setDayMeals(prev => ({ ...prev, [type]: prev[type].filter(e => e.id !== entryId) }));
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col shadow-2xl overflow-hidden relative border-x border-slate-200">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-300 p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-black text-black tracking-tight uppercase">MacroTrack</h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 ml-8 first-letter:capitalize">
              {formattedDate}
            </p>
          </div>
          <button 
            onClick={() => setIsTrainingDay(!isTrainingDay)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-black text-[11px] uppercase tracking-widest shadow-md ${
              isTrainingDay 
                ? 'bg-amber-100 text-amber-900 border border-amber-400' 
                : 'bg-indigo-100 text-indigo-900 border border-indigo-400'
            }`}
          >
            {isTrainingDay ? <BoltIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            {isTrainingDay ? 'Allenamento' : 'Riposo'}
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Dashboard Progress Bars - Visible only in dashboard tab */}
            <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <ProgressBar label="Calorie" current={totalNutrients.kcal} target={currentTargets.kcal} unit="kcal" type="kcal" isTraining={isTrainingDay} />
              <div className="grid grid-cols-2 gap-4">
                <ProgressBar label="Carbo" current={totalNutrients.carbs} target={currentTargets.carbs} unit="g" type="carbs" isTraining={isTrainingDay} compact />
                <ProgressBar label="Proteine" current={totalNutrients.protein} target={currentTargets.protein} unit="g" type="protein" isTraining={isTrainingDay} compact />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ProgressBar label="Grassi" current={totalNutrients.fat} target={currentTargets.fat} unit="g" type="fat" isTraining={isTrainingDay} compact />
                <ProgressBar label="Fibre" current={totalNutrients.fiber} target={currentTargets.fiber} unit="g" type="fiber" isTraining={isTrainingDay} compact />
              </div>
            </div>

            {(['colazione', 'pranzo', 'spuntino', 'cena'] as MealType[]).map(m => (
              <MealCard 
                key={m}
                type={m} 
                title={m.charAt(0).toUpperCase() + m.slice(1)} 
                icon={m === 'colazione' ? '🍳' : m === 'pranzo' ? '🍲' : m === 'spuntino' ? '🍎' : '🥗'} 
                entries={dayMeals[m]} 
                foods={foods} 
                recipes={recipes}
                onAdd={addMealEntry}
                onUpdate={updateMealEntry}
                onAddRecipe={addRecipeToMeal}
                onDelete={deleteMealEntry} 
                onSaveAsRecipe={saveMealAsRecipe}
              />
            ))}
          </div>
        )}
        {activeTab === 'database' && (
          <div className="animate-in fade-in duration-300">
            <FoodManager 
              foods={foods} 
              recipes={recipes}
              onAdd={addFood} 
              onDelete={deleteFood} 
              onAddRecipe={addRecipe}
              onUpdateRecipe={updateRecipe}
              onDeleteRecipe={deleteRecipe}
            />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-300">
            <HistoricalProgress history={history} targets={currentTargets} foods={foods} recipes={recipes} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300">
            <TargetForm targets={targetProfiles} onSave={setTargetProfiles} />
          </div>
        )}
      </main>
      
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-300 flex justify-around p-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-500'}`}>
          <ChartBarIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Pasti</span>
        </button>
        <button onClick={() => setActiveTab('database')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'database' ? 'text-indigo-600 scale-110' : 'text-slate-500'}`}>
          <BookOpenIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Database</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110' : 'text-slate-500'}`}>
          <ClockIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Storia</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-indigo-600 scale-110' : 'text-slate-500'}`}>
          <Cog6ToothIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Target</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
