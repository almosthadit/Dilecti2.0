import "dotenv/config";
import { buildCandidateQueryPlans, fetchCandidatesForPlan, deduplicateAndNormalize } from "./src/services/recommendationCandidates";
import { rankCandidates } from "./src/services/recommendationEngine";

async function testGamesRecommendations() {
  console.log("=== Testing Game Recommendations Backend Pipeline ===");
  
  // Fake user library
  const userLibrary = [
    {
      id: "game1",
      category: "game",
      title: "The Witcher 3: Wild Hunt",
      subtitle: "CD PROJEKT RED",
      reaction: "heart",
      rating: 10,
      data: { tags: ["rpg", "open-world", "fantasy"] }
    },
    {
      id: "game2",
      category: "game",
      title: "Hades",
      subtitle: "Supergiant Games",
      reaction: "thumbs-up",
      rating: 9,
      data: { tags: ["roguelike", "indie", "action"] }
    }
  ];

  const dislikedItems = [
    {
      id: "game3",
      category: "game",
      title: "Some Bad Game",
      subtitle: "Bad Developer",
      reaction: "skull",
      data: { tags: ["boring", "pay2win"] }
    }
  ];

  // 1. Build Query Plans
  console.log("\n1. Building Query Plans...");
  const plans = await buildCandidateQueryPlans(userLibrary, "game");
  console.log(JSON.stringify(plans, null, 2));

  // 2. Fetch Candidates
  console.log("\n2. Fetching Candidates from RAWG...");
  let allCandidates = [];
  for (const plan of plans) {
    const fetched = await fetchCandidatesForPlan(plan);
    console.log(`- Fetched ${fetched.length} candidates for plan: ${plan.strategy}`);
    allCandidates.push(...fetched);
  }

  // 3. Deduplicate
  console.log("\n3. Deduplicating...");
  const deduped = await deduplicateAndNormalize(allCandidates, userLibrary);
  console.log(`- Reduced from ${allCandidates.length} to ${deduped.length} unique candidates.`);

  // 4. Score
  console.log("\n4. Scoring with recommendationEngine...");
  const tasteState = {
    topCategories: ["game"],
    categorySignatures: { "game": {} },
    strongestMotifs: ["rpg", "roguelike", "fantasy"]
  };
  
  const ranked = rankCandidates(deduped, tasteState, null, undefined, dislikedItems, userLibrary);
  
  console.log("\n--- Top 3 Game Recommendations ---");
  for (const item of ranked.slice(0, 3)) {
    console.log(`\nTitle: ${item.title}`);
    console.log(`Genres/Tags: ${item.description}`);
    console.log(`Score: ${item.context?.finalScore.toFixed(2)}`);
    console.log(`Reasons: ${item.context?.topReasons?.join(" | ")}`);
    console.log(`Used Signals: ${item.context?.usedSignals?.join(", ")}`);
  }
}

testGamesRecommendations().catch(console.error);
