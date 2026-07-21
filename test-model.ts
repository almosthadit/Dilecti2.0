import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "hello",
    });
    console.log(response.text);
  } catch (e) {
    console.error("ERROR:");
    console.error(e);
  }
}
test();
