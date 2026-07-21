const run = async () => {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/universal-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "the dink", category: "movies" })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
};
run();
