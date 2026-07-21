import { GoogleGenAI } from "@google/genai";
async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `Find top real purchasable shopping products matching: "shoes". Return a JSON array of up to 5 matching products. \n\nSchema per object: { "title": "Product Name", "subtitle": "Brand or Category", "description": "Short description with price", "coverUrl": "Valid URL to product image if found, else empty", "url": "Valid URL to buy the product" }`,
            config: {
                responseMimeType: "application/json"
            }
        });
        console.log("Success:", response.text);
    } catch(e: any) {
        console.error("Failed:", e.message || e);
    }
}
test();
