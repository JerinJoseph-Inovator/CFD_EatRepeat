
import { GoogleGenAI, Type } from "@google/genai";
import { Command, FoodItem, UserProfile } from "./types";

export const analyzeFood = async (
  command: Command,
  images?: string[],
  inventory?: FoodItem[],
  context?: string,
  profile?: UserProfile
): Promise<any> => {
  // Use a fresh instance for every call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Rule: Use specific model names based on task complexity
  const modelName = (command === Command.SCAN_ITEM) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const systemInstruction = `You are 'Chef Gusto', a world-class culinary AI with 45+ years of experience.
Your personality: Sophisticated, witty, and exceptionally knowledgeable about food preservation and nutrition.
Context: You are managing a digital food vault.
User Profile: ${profile ? JSON.stringify(profile) : 'New User'}.

TASKS:
- SCAN_ITEM: Analyze food images. Extract product name, brand, expiry dates, freshness, and detailed nutrition (calories, protein, fats, carbs, fiber).
- VALIDATE_INPUT: Determine if the user's input is appropriate for the current onboarding question.
- CHEF_CHAT: Respond conversationally while managing the inventory.

IMPORTANT: Return ONLY valid JSON matching the requested schema. No conversational filler outside JSON.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      item: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          brand: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['packaged', 'fresh'] },
          expiryDate: { type: Type.STRING },
          freshness: { type: Type.STRING },
          storageAdvice: { type: Type.STRING },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.STRING },
              protein: { type: Type.STRING },
              fats: { type: Type.STRING },
              carbs: { type: Type.STRING },
              fiber: { type: Type.STRING },
              sugar: { type: Type.STRING }
            }
          }
        }
      },
      chefReaction: { type: Type.STRING, description: "A witty, professional reaction from Chef Gusto" },
      isValid: { type: Type.BOOLEAN, description: "True if user input is valid/useful for the current step" },
      analysis: { type: Type.STRING, description: "General textual insights" }
    },
    required: ["chefReaction"]
  };

  const parts: any[] = [];
  if (images && images.length > 0) {
    images.forEach(img => {
      // Clean base64 data
      const base64Data = img.split(',')[1] || img;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    });
  }
  
  const prompt = `COMMAND: ${command}
CONTEXT: ${context || 'General interaction'}
INVENTORY_SIZE: ${inventory?.length || 0}`;
  
  parts.push({ text: prompt });

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    // Directly access .text property as per guidelines
    const responseText = result.text;
    if (!responseText) throw new Error("Empty response from AI");
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gusto AI Error:", error);
    return { 
      chefReaction: "My apologies, the digital kitchen is currently undergoing maintenance. Let's try again in a moment.",
      isValid: true // Allow continuation on error to prevent blocking user
    };
  }
};
