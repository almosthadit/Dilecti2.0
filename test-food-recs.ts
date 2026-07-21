import { config } from "dotenv";
config();
import { db } from "./src/db";
import { userItems } from "./src/db/schema";
import { eq } from "drizzle-orm";
import { buildCandidateQueryPlans, fetchCandidatesForPlan, deduplicateAndNormalize } from "./src/services/recommendationCandidates";
import { rankCandidates } from "./src/services/recommendationEngine";

async function main() {
  const userId = "test-user-id";
  const userLibrary = [
    {
      id: "1",
      userId,
      category: "food",
      title: "Pizzana",
      reaction: "heart",
      rating: 9,
      data: { tags: ["Pizza", "Italian"], metadata: { address: "Los Angeles, CA" }, qualitySignals: { priceLevel: 2 } }
    },
    {
      id: "2",
      userId,
      category: "food",
      title: "Felix Trattoria",
      reaction: "heart",
      rating: 10,
      data: { tags: ["Italian"], metadata: { address: "Venice, CA" }, qualitySignals: { priceLevel: 3 } }
    }
  ];

  console.log("Building plans...");
  const plans = await buildCandidateQueryPlans(userLibrary, "food");
  console.log(JSON.stringify(plans, null, 2));

  console.log("Fetching candidates...");
  const rawCandidates = [];
  for (const plan of plans) {
     const cands = await fetchCandidatesForPlan(plan);
     rawCandidates.push(...cands);
  }
  console.log("Fetched " + rawCandidates.length + " raw candidates");

  console.log("Deduplicating...");
  const deduped = await deduplicateAndNormalize(rawCandidates, userLibrary);
  console.log("Deduped to " + deduped.length + " candidates");

  console.log("Scoring...");
  const scored = rankCandidates(deduped, { userId }, null, undefined, [], userLibrary);
  console.log("Top 3 candidates:");
  scored.slice(0, 3).forEach(c => {
     console.log("- " + c.title + " (Score: " + c.context.finalScore.toFixed(1) + ")");
     console.log("  Reasons: " + c.context.topReasons.join(" | "));
     console.log("  Signals: " + c.context.usedSignals.join(", "));
  });
  
  process.exit(0);
}

main().catch(console.error);
