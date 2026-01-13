
import { GoogleGenAI, Type } from "@google/genai";
import { Command, FoodItem } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are 'FreshTrack AI', a high-precision smart food inventory assistant.
Your primary mission is accurate identification and extraction of data from food images.

STRICT EXPIRY DATE RULES:
1. DO NOT GUESS OR INVENT AN EXPIRY DATE. If you cannot see a date clearly in the provided images, you MUST return an empty string "" for the 'expiryDate' field.
2. TEMPORAL CONTEXT: The current date is ${new Date().toLocaleDateString()}. Expiry dates are typically in the FUTURE.
3. If you see a date like '26', it almost certainly refers to 2026.
4. If 'expiryDate' is empty, you MUST provide a helpful explanation in the 'notes' field.

STRICT NUTRITION RULES:
1. FOR PACKAGED PRODUCTS: Do NOT guess or assume nutrition facts if the nutrition label/table is NOT visible in the images. If the label is missing, set all nutrition values (calories, protein, fats, carbs) to 0. 
2. FOR FRESH PRODUCE (e.g., a single apple, a banana): You MAY provide standard nutritional estimates based on the identified item.
3. If you set nutrition values to 0 because the label was missing, mention this in the 'notes' field (e.g., "Nutrition label not found in scans; values set to zero.").
4. Format detected dates as YYYY-MM-DD.

COMMANDS:
- SCAN_ITEM: Analyze up to 3 images of the SAME item. Synthesize info.
- SHOW_REMINDERS: Summarize items that need urgent attention based on inventory.
- SHOW_NUTRITION: Provide a health-focused summary of the current inventory.
- SUGGEST_RECIPES: Creative recipes using the current inventory.

Rules:
1. ALWAYS respond with valid JSON matching the requested schema.
2. For fresh produce, estimate 'shelfLifeDays' based on visual state.
3. DO NOT include conversational filler.
`;

export const analyzeFood = async (
  command: Command,
  images?: string[],
  inventory?: FoodItem[]
): Promise<any> => {
  // Using gemini-3-pro-preview for complex visual reasoning tasks like reading small, distorted text
  const model = command === Command.SCAN_ITEM ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
  
  let prompt = `COMMAND: ${command}\n`;
  prompt += `CURRENT_DATE_CONTEXT: ${new Date().toISOString()}\n`;
  
  if (inventory && inventory.length > 0) {
    const condensedInventory = inventory.slice(0, 20).map(i => ({
      name: i.name,
      expiry: i.expiryDate,
      freshness: i.freshness
    }));
    prompt += `CURRENT_INVENTORY_PREVIEW: ${JSON.stringify(condensedInventory)}\n`;
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      item: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          brand: { type: Type.STRING },
          expiryDate: { type: Type.STRING, description: "Format: YYYY-MM-DD. Leave empty string if not clearly found." },
          freshness: { type: Type.STRING },
          shelfLifeDays: { type: Type.NUMBER },
          storageAdvice: { type: Type.STRING },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fats: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER }
            }
          },
          notes: { type: Type.STRING }
        }
      },
      recipes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            prepTime: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          }
        }
      },
      reminders: { type: Type.ARRAY, items: { type: Type.STRING } },
      nutritionSummary: { type: Type.STRING }
    }
  };

  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseSchema: schema,
    // Maximize thinking budget for Pro model to ensure high-quality text extraction
    thinkingConfig: { thinkingBudget: model === "gemini-3-pro-preview" ? 16000 : 4000 }
  };

  const parts: any[] = [];

  if (images && images.length > 0) {
    images.forEach(imageData => {
      const commaIndex = imageData.indexOf(',');
      const base64DataRaw = commaIndex !== -1 ? imageData.substring(commaIndex + 1) : imageData;
      const base64Data = base64DataRaw.replace(/\s/g, '');
      const header = commaIndex !== -1 ? imageData.substring(0, commaIndex) : '';
      const mimeTypeMatch = header.match(/:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      
      parts.push({ inlineData: { mimeType, data: base64Data } });
    });
  }

  parts.push({ text: prompt });

  try {
    const result = await ai.models.generateContent({
      model,
      contents: { parts },
      config
    });

    if (!result || !result.text) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(result.text.trim());
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    throw error;
  }
};
