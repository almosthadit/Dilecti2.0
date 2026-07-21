export async function fetchGroqFallback(prompt: string, isJson: boolean = false, fallbackModel: boolean = false, retryCount: number = 0): Promise<string> {
    const groqApiKey = process.env.GROQ_API_KEY;
    const body: any = {
        model: fallbackModel ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
    };
    if (isJson) {
        body.response_format = { type: "json_object" };
    }
    
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            if (response.status === 429) {
                if (!fallbackModel) {
                    return fetchGroqFallback(prompt, isJson, true, retryCount);
                }
                if (retryCount < 2) {
                    await new Promise(r => setTimeout(r, 1500));
                    return fetchGroqFallback(prompt, isJson, true, retryCount + 1);
                }
            }
            throw new Error(`Groq API Error: ${response.status} ${await response.text()}`);
        }
        const data = await response.json().catch(() => ({}));
        return data.choices[0].message.content;
    } catch (e: any) {
        if (e.message && (e.message.includes('fetch failed') || e.message.includes('ECONNRESET')) && retryCount < 2) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchGroqFallback(prompt, isJson, fallbackModel, retryCount + 1);
        }
        
        // Graceful fallback to prevent app crashes or loud logs on persistent failures
        if (isJson) {
            return prompt.includes("array") || prompt.includes("[]") ? "[]" : "{}";
        }
        return "";
    }
}