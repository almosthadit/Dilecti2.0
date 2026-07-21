fetch("http://localhost:3000/api/universal-search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ category: "product", query: "shoes" })
}).then(res => {
  console.log("Status:", res.status);
  return res.text();
}).then(text => {
  console.log("Body:", text);
}).catch(err => {
  console.error("Fetch failed:", err);
});
