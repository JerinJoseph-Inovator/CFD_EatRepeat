
export enum Command {
  SCAN_ITEM = 'SCAN_ITEM',
  SHOW_INVENTORY = 'SHOW_INVENTORY',
  SHOW_REMINDERS = 'SHOW_REMINDERS',
  SHOW_NUTRITION = 'SHOW_NUTRITION',
  SUGGEST_RECIPES = 'SUGGEST_RECIPES',
  HEALTH_ASSISTANT = 'HEALTH_ASSISTANT',
  CHEF_CHAT = 'CHEF_CHAT',
  ONBOARDING_REACTION = 'ONBOARDING_REACTION',
  VALIDATE_INPUT = 'VALIDATE_INPUT'
}

export type FreshnessLevel = 'Fresh' | 'Medium' | 'Near-Spoil';

export interface NutritionInfo {
  calories: string;
  protein: string;
  fats: string;
  carbs: string;
  fiber?: string;
  sugar?: string;
}

export interface UserProfile {
  name: string;
  cuisine: string;
  origin: string;
  memory: string[];
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
  imageUrl?: string;
  notes?: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface DietDay {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string[];
  totalCalories: number;
}

export interface AnalysisResponse {
  item?: FoodItem;
  reminders?: string[];
  nutritionSummary?: string;
  recipes?: Recipe[];
  dietPlan?: DietDay[];
  chefQuestion?: string;
  newMemoryFact?: string;
  chefReaction?: string;
  isValid?: boolean;
  reason?: string;
}
