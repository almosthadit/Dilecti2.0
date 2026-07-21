export async function fetchOpenRouterFallback(prompt: string, isJson: boolean = false): Promise<string> {
    if (typeof window !== "undefined") return ""; // Ensure server only

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) throw new Error("No OpenRouter API Key");
    
    const body: any = {
        model: "google/gemini-2.5-flash", // Use Gemini via OpenRouter
        messages: [{ role: "user", content: prompt }]
    };
    if (isJson) {
        body.response_format = { type: "json_object" };
    }
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        throw new Error(`OpenRouter API Error: ${response.status} ${await response.text()}`);
    }
    const data = await response.json().catch(() => ({}));
    return data.choices[0].message.content;
}
