import "dotenv/config";
import fetch from "node-fetch"; // or built in

(async () => {
  const req = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "the dink", category: "movie" })
  };
  
  try {
    const res = await fetch("http://localhost:3000/api/universal-search", req);
    const data = await res.text();
    console.log("RESPONSE:", data);
  } catch (e) {
    console.error(e);
  }
})();
