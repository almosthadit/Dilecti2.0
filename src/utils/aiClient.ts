import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export function getAIClient(apiKey: string | undefined, provider: string | string[] | undefined): any {
    const aiProvider = (typeof provider === 'string' ? provider : 'gemini').toLowerCase();
    
    if (aiProvider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "dummy" });
        return {
            provider: 'anthropic',
            apiKey,
            models: {
                generateContent: async (request: GenerateContentParameters): Promise<any> => {
                    let promptStr = "";
                    if (typeof request.contents === 'string') {
                        promptStr = request.contents;
                    } else if (Array.isArray(request.contents)) {
                        promptStr = request.contents.map((c: any) => c.parts ? c.parts.map((p:any)=>p.text).join(" ") : (c.role ? `${c.role}: ${c.parts?.map((p:any)=>p.text).join(" ")}` : JSON.stringify(c))).join("\n");
                    } else if (request.contents && typeof request.contents === 'object' && 'parts' in request.contents) {
                        promptStr = (request.contents as any).parts.map((p:any)=>p.text).join(" ");
                    }
                    
                    let systemInstruction = "";
                    if (request.config?.systemInstruction) {
                        systemInstruction = request.config.systemInstruction as string;
                    }

                    let model = request.model;
                    if (model?.includes("gemini")) {
                       model = "claude-3-5-sonnet-latest";
                    } else if (!model) {
                       model = "claude-3-5-sonnet-latest";
                    }
                    
                    try {
                        const msg = await anthropic.messages.create({
                            model,
                            max_tokens: 4096,
                            temperature: request.config?.temperature ?? 0.7,
                            system: systemInstruction || undefined,
                            messages: [{ role: 'user', content: promptStr }],
                        });

                        const text = (msg.content[0] as any)?.text || "";
                        const totalTokenCount = msg.usage.input_tokens + msg.usage.output_tokens;

                        return {
                            text: text,
                            usageMetadata: { totalTokenCount }
                        };
                    } catch (error: any) {
                        console.error("Anthropic API Error:", error.message || error);
                        throw new Error(`Anthropic API Error: ${error.message || "Unknown error"}`);
                    }
                }
            }
        };
    }

    if (aiProvider === 'openai' || aiProvider === 'openrouter') {
        const isOpenRouter = aiProvider === 'openrouter';
        const openai = new OpenAI({ 
            apiKey: apiKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "dummy",
            ...(isOpenRouter ? { baseURL: "https://openrouter.ai/api/v1" } : {})
        });
        return {
            provider: isOpenRouter ? 'openrouter' : 'openai',
            apiKey,
            models: {
                generateContent: async (request: GenerateContentParameters): Promise<any> => {
                    let promptStr = "";
                    if (typeof request.contents === 'string') {
                        promptStr = request.contents;
                    } else if (Array.isArray(request.contents)) {
                        promptStr = request.contents.map((c: any) => c.parts ? c.parts.map((p:any)=>p.text).join(" ") : (c.role ? `${c.role}: ${c.parts?.map((p:any)=>p.text).join(" ")}` : JSON.stringify(c))).join("\n");
                    } else if (request.contents && typeof request.contents === 'object' && 'parts' in request.contents) {
                        promptStr = (request.contents as any).parts.map((p:any)=>p.text).join(" ");
                    }
                    
                    const messages: any[] = [];
                    if (request.config?.systemInstruction) {
                        messages.push({ role: 'system', content: request.config.systemInstruction });
                    }
                    messages.push({ role: 'user', content: promptStr });

                    const responseFormat = request.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined;

                    let model = request.model;
                    if (aiProvider === 'openrouter') {
                        model = "google/gemini-2.5-flash"; // default openrouter model
                    } else if (model?.includes("gemini") || !model) {
                       model = "gpt-4o";
                    }
                    
                    try {
                        const completion = await openai.chat.completions.create({
                            model,
                            messages,
                            temperature: request.config?.temperature ?? 0.7,
                            response_format: responseFormat as any,
                        });

                        const text = completion.choices[0]?.message?.content || "";
                        const totalTokenCount = completion.usage?.total_tokens || 0;

                        return {
                            text: text,
                            usageMetadata: { totalTokenCount }
                        };
                    } catch (error: any) {
                        console.error("OpenAI API Error:", error.message || error);
                        throw new Error(`OpenAI API Error: ${error.message || "Unknown error"}`);
                    }
                }
            }
        };
    }

    return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
}
