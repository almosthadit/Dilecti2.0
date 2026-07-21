import "dotenv/config";
import fetch from "node-fetch";

const run = async () => {
  const tmdbKey = process.env.VITE_TMDB_API_KEY;
  const q = encodeURIComponent("the dink");
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${q}`;
  console.log("Fetching", url);
  const res = await fetch(url);
  const json = await res.json();
  console.log(JSON.stringify(json.results.slice(0, 2), null, 2));
};
run();
