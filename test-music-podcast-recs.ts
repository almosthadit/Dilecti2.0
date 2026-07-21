import "dotenv/config";
import { buildCandidateQueryPlans, fetchCandidatesForPlan, deduplicateAndNormalize } from "./src/services/recommendationCandidates";
import { rankCandidates } from "./src/services/recommendationEngine";
import { generateFingerprint, getCachedRecommendations, setCachedRecommendations } from "./src/services/recommendationCache";

async function testMusicPodcastRecommendations() {
  console.log("=== Testing Music & Podcast Recommendations Backend Pipeline ===");
  
  // Fake user library
  const userLibrary = [
    {
      id: "music1",
      category: "music",
      title: "Random Access Memories",
      subtitle: "Daft Punk",
      reaction: "heart",
      rating: 10,
      data: { tags: ["electronic", "dance", "pop"] }
    },
    {
      id: "music2",
      category: "music",
      title: "Discovery",
      subtitle: "Daft Punk",
      reaction: "thumbs-up",
      rating: 9,
      data: { tags: ["electronic", "dance", "french house"] }
    },
    {
      id: "podcast1",
      category: "podcast",
      title: "The Daily",
      subtitle: "The New York Times",
      reaction: "heart",
      rating: 10,
      data: { tags: ["news", "politics", "daily"] }
    }
  ];

  const dislikedItems = [
    {
      id: "music3",
      category: "music",
      title: "Some Bad Album",
      subtitle: "Bad Artist",
      reaction: "skull",
      data: { tags: ["country"] }
    }
  ];

  const tasteState = {
    userId: "test-user-1",
    topCategories: ["music", "podcast"],
    categorySignatures: { "music": {}, "podcast": {} },
    strongestMotifs: ["electronic", "dance", "news"]
  };

  // --- MUSIC TEST ---
  console.log("\n=== MUSIC ===");
  console.log("\n1. Building Query Plans...");
  const musicPlans = await buildCandidateQueryPlans(userLibrary, "music");
  console.log(JSON.stringify(musicPlans, null, 2));

  console.log("\n2. Fetching Candidates from iTunes...");
  let musicCandidates = [];
  for (const plan of musicPlans) {
    const fetched = await fetchCandidatesForPlan(plan);
    console.log(`- Fetched ${fetched.length} candidates for plan: ${plan.strategy}`);
    musicCandidates.push(...fetched);
  }

  console.log("\n3. Deduplicating...");
  const dedupedMusic = await deduplicateAndNormalize(musicCandidates, userLibrary);
  console.log(`- Reduced from ${musicCandidates.length} to ${dedupedMusic.length} unique candidates.`);

  console.log("\n4. Scoring...");
  const rankedMusic = rankCandidates(dedupedMusic, tasteState, null, undefined, dislikedItems, userLibrary);
  
  console.log("\n5. Testing Cache...");
  const musicFingerprint = generateFingerprint(userLibrary, tasteState, "music");
  // await setCachedRecommendations("test-user-1", "music", musicFingerprint, rankedMusic);
  // const cachedMusic = await getCachedRecommendations("test-user-1", "music", musicFingerprint);
  // console.log(`- Cached and retrieved ${cachedMusic?.length || 0} music recommendations.`);
  
  console.log("\n--- Top 3 Music Recommendations ---");
  for (const item of rankedMusic.slice(0, 3)) {
    console.log(`\nTitle: ${item.title}`);
    console.log(`Artist: ${item.subtitle}`);
    console.log(`Genres/Tags: ${item.genres?.join(", ")}`);
    console.log(`Score: ${item.context?.finalScore.toFixed(2)}`);
    console.log(`Reasons: ${item.context?.topReasons?.join(" | ")}`);
    console.log(`Used Signals: ${item.context?.usedSignals?.join(", ")}`);
  }

  // --- PODCAST TEST ---
  console.log("\n=== PODCAST ===");
  console.log("\n1. Building Query Plans...");
  const podcastPlans = await buildCandidateQueryPlans(userLibrary, "podcast");
  console.log(JSON.stringify(podcastPlans, null, 2));

  console.log("\n2. Fetching Candidates from iTunes...");
  let podcastCandidates = [];
  for (const plan of podcastPlans) {
    const fetched = await fetchCandidatesForPlan(plan);
    console.log(`- Fetched ${fetched.length} candidates for plan: ${plan.strategy}`);
    podcastCandidates.push(...fetched);
  }

  console.log("\n3. Deduplicating...");
  const dedupedPodcast = await deduplicateAndNormalize(podcastCandidates, userLibrary);
  console.log(`- Reduced from ${podcastCandidates.length} to ${dedupedPodcast.length} unique candidates.`);

  console.log("\n4. Scoring...");
  const rankedPodcast = rankCandidates(dedupedPodcast, tasteState, null, undefined, dislikedItems, userLibrary);

  console.log("\n5. Testing Cache...");
  const podcastFingerprint = generateFingerprint(userLibrary, tasteState, "podcast");
  // await setCachedRecommendations("test-user-1", "podcast", podcastFingerprint, rankedPodcast);
  // const cachedPodcast = await getCachedRecommendations("test-user-1", "podcast", podcastFingerprint);
  // console.log(`- Cached and retrieved ${cachedPodcast?.length || 0} podcast recommendations.`);

  console.log("\n--- Top 3 Podcast Recommendations ---");
  for (const item of rankedPodcast.slice(0, 3)) {
    console.log(`\nTitle: ${item.title}`);
    console.log(`Show/Creator: ${item.subtitle}`);
    console.log(`Genres/Tags: ${item.genres?.join(", ")}`);
    console.log(`Score: ${item.context?.finalScore.toFixed(2)}`);
    console.log(`Reasons: ${item.context?.topReasons?.join(" | ")}`);
    console.log(`Used Signals: ${item.context?.usedSignals?.join(", ")}`);
  }
}

testMusicPodcastRecommendations().catch(console.error);
