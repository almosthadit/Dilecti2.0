import { Buffer } from "node:buffer";

async function testFetch() {
  console.log("Testing universal search...");
  try {
    const res = await fetch("http://0.0.0.0:3000/api/universal-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Inception", category: "movie" })
    });
    console.log("Search status:", res.status);
    const json = await res.json();
    console.log("Search length:", json.length);
  } catch (e: any) {
    console.error("Search failed:", e?.message);
  }

  console.log("Testing universal search AI...");
  try {
    const aiRes = await fetch("http://0.0.0.0:3000/api/universal-search-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "movies about dreams in a dream", category: "movie" })
    });
    console.log("AI Search status:", aiRes.status);
    const text = await aiRes.text();
    console.log("AI Search body start:", text.substring(0, 100));
  } catch (e: any) {
    console.error("AI Search failed:", e?.message);
  }
}

testFetch();
