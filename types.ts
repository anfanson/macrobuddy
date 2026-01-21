
export interface Food {
  id: string;
  name: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  tags?: string; // Es: "colazione", "pranzo, cena", "snack"
}

export interface RecipeIngredient {
  foodId: string;
  weightGrams: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
}

export interface MealEntry {
  id: string;
  foodId: string;
  weightGrams: number;
}

export type MealType = 'colazione' | 'pranzo' | 'spuntino' | 'cena';

export interface DayMeals {
  colazione: MealEntry[];
  pranzo: MealEntry[];
  spuntino: MealEntry[];
  cena: MealEntry[];
}

export interface MacroTargets {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

export interface TargetProfiles {
  training: MacroTargets;
  rest: MacroTargets;
}

export interface CalculatedNutrients {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

export interface HistoryEntry extends CalculatedNutrients {
  date: string;
  isTrainingDay?: boolean;
}

export type TabType = 'dashboard' | 'database' | 'history' | 'settings';
