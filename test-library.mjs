import "dotenv/config";
import { searchExternalCatalog } from "./src/routes/library.js";

const run = async () => {
  try {
    const results = await searchExternalCatalog("the dink", "movies");
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  }
};
run();
