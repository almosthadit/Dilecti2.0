import { fetch } from "undici";
fetch("http://localhost:3000/api/image-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "Franklin Barbecue", category: "food" })
}).then(r=>r.json()).then(console.log).catch(console.error);
