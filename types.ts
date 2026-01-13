
export enum Command {
  SCAN_ITEM = 'SCAN_ITEM',
  SHOW_INVENTORY = 'SHOW_INVENTORY',
  SHOW_REMINDERS = 'SHOW_REMINDERS',
  SHOW_NUTRITION = 'SHOW_NUTRITION',
  SUGGEST_RECIPES = 'SUGGEST_RECIPES'
}

export type FreshnessLevel = 'Fresh' | 'Medium' | 'Near-Spoil';

export interface NutritionInfo {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
}

export interface FoodItem {
  id: string;
  name: string;
  type: 'packaged' | 'fresh';
  brand?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  addedDate: string;
  freshness?: FreshnessLevel;
  shelfLifeDays?: number;
  storageAdvice?: string;
  nutrition?: NutritionInfo;
  notes?: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface AnalysisResponse {
  item?: FoodItem;
  reminders?: string[];
  nutritionSummary?: string;
  recipes?: Recipe[];
}
