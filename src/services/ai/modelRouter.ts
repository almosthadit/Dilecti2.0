import { getAIClient } from "../../utils/aiClient";
import { generateContentWithRetry } from "../../utils/ai";

export type TaskType = 'cheap_classifier' | 'cheap_reranker' | 'premium_writer' | 'batch_job';

export interface ModelRouteOptions {
  taskType: TaskType;
  inputPayload: any;
  maxCostTier?: 'low' | 'medium' | 'high';
  cacheKey?: string;
  requiresFreshness?: boolean;
  outputSchema?: any; // E.g., Zod schema or JSON schema string
}

export async function routeModelTask(options: ModelRouteOptions): Promise<any> {
  if (options.taskType === 'cheap_classifier') {
    return { tags: ['stub_tag_1', 'stub_tag_2'] };
  }
  
  if (options.taskType === 'cheap_reranker') {
    if (Array.isArray(options.inputPayload)) {
      return options.inputPayload.map((item: any, idx: number) => ({
        ...item,
        finalScore: 100 - idx
      }));
    }
    return [];
  }
  
  if (options.taskType === 'premium_writer') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "This is a premium AI-generated narrative stub based on your deeply held preferences.";
    
    const ai = getAIClient(apiKey, undefined);
    
    // We expect inputPayload to contain the prompt and packet
    const prompt = options.inputPayload.prompt || `You are a personalized taste AI. Write a taste narrative based on this evidence packet: ${JSON.stringify(options.inputPayload)}`;
    
    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash", 
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }, { scope: 'user', uid: options.cacheKey || 'global', ttlDays: 7 });

      return response.text?.trim() || "";
    } catch (e: any) {
      console.warn("premium_writer failed:", e);
      return "There was an error generating your taste narrative.";
    }
  }
  
  return null;
}
