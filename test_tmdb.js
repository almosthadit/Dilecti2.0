import 'dotenv/config';

const tmdbKey = process.env.TMDB_API_KEY;
console.log("TMDB Key exists:", !!tmdbKey);

const query = 'the dink';
const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${tmdbKey}&language=en-US&page=1&include_adult=false`;

console.log("Fetching URL:", url.replace(tmdbKey, "HIDDEN"));

fetch(url, {
  method: "GET",
  headers: {
    "accept": "application/json",
    "User-Agent": "Dilecti/1.0"
  },
  signal: AbortSignal.timeout(5000)
})
.then(r => r.json())
.then(data => {
  console.log("Response:", JSON.stringify(data, null, 2));
})
.catch(e => console.error(e));
