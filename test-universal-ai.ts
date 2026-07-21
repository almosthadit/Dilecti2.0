import { fetch } from "undici";
fetch("http://localhost:3000/api/universal-search-ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "where the red frne grows", category: "book" })
}).then(r=>r.json()).then(console.log).catch(console.error);
