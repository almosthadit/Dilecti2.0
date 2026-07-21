import { buildCandidateQueryPlans, fetchCandidatesForPlan, deduplicateAndNormalize } from './src/services/recommendationCandidates';
import { rankCandidates } from './src/services/recommendationEngine';
import { generateFingerprint, buildUserTasteSummary } from './src/services/recommendationCache';

async function testProfile(name: string, libraryItems: any[], profile: any) {
  console.log(`\n--- Testing ${name} ---`);
  
  const category = 'places';
  
  // 1. Build Query Plans
  const plans = await buildCandidateQueryPlans(libraryItems, category as any);
  console.log(`Query Plans for ${name}:`);
  plans.forEach(p => console.log(`  - [${p.strategy}] ${p.reason} (seeds: ${p.seedTitles?.length || 0})`));

  // 2. Fetch Candidates
  const allCandidates = [];
  for (const plan of plans) {
    const candidates = await fetchCandidatesForPlan(plan);
    allCandidates.push(...candidates);
  }
  console.log(`Fetched ${allCandidates.length} raw candidates`);

  // 3. Deduplicate
  const deduped = await deduplicateAndNormalize(allCandidates, libraryItems);
  console.log(`Deduped to ${deduped.length} candidates`);

  // 4. Score
  const tasteState = profile.tasteState || {};
  const ranked = rankCandidates(deduped, tasteState, null, undefined, [], libraryItems);
  
  console.log(`Top Recommendations for ${name}:`);
  ranked.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.title} (${r.subtitle}) - Score: ${Math.round(r.context.finalScore)}`);
    console.log(`   Reasons: ${r.context.topReasons.join(' | ')}`);
    console.log(`   Location: ${r.address || r.city}`);
  });

  // 5. Cache test
  const fingerprint = generateFingerprint(libraryItems, profile, category);
  const summary = buildUserTasteSummary("test_user", libraryItems, profile, category);
  console.log(`Fingerprint for ${name}: ${fingerprint}`);
  console.log(`Summary top genres: ${summary.likedGenres.slice(0, 3).join(', ')}`);
}

async function runTests() {
  // Test 1: Parks/Nature
  await testProfile("Parks/Nature Profile", [
    {
      id: "1",
      category: "places",
      title: "Yosemite National Park",
      metadata: { type: "national_park", address: "California" },
      data: { tags: ["nature", "hiking", "mountains"] },
      reaction: "heart"
    },
    {
      id: "2",
      category: "places",
      title: "Zion National Park",
      metadata: { type: "national_park", address: "Utah" },
      data: { tags: ["nature", "hiking", "canyons"] },
      reaction: "heart"
    }
  ], {
    tasteState: {
      categorySignatures: { places: "nature_lover" },
      topCategories: ["places"]
    }
  });

  // Test 2: Museums/Culture
  await testProfile("Museums/Culture Profile", [
    {
      id: "3",
      category: "places",
      title: "The Louvre",
      metadata: { type: "museum", city: "Paris" },
      data: { tags: ["art", "history", "culture"] },
      reaction: "heart"
    },
    {
      id: "4",
      category: "places",
      title: "British Museum",
      metadata: { type: "museum", city: "London" },
      data: { tags: ["history", "culture", "artifacts"] },
      reaction: "heart"
    }
  ], {
    tasteState: {
      categorySignatures: { places: "culture_buff" },
      topCategories: ["places"]
    }
  });

  // Test 3: Global City/Travel
  await testProfile("Global City/Travel Profile", [
    {
      id: "5",
      category: "places",
      title: "Tokyo",
      metadata: { type: "city", city: "Tokyo" },
      data: { tags: ["urban", "food", "nightlife"] },
      reaction: "heart"
    },
    {
      id: "6",
      category: "places",
      title: "New York City",
      metadata: { type: "city", city: "New York" },
      data: { tags: ["urban", "culture", "architecture"] },
      reaction: "heart"
    }
  ], {
    tasteState: {
      categorySignatures: { places: "city_explorer" },
      topCategories: ["places"]
    }
  });
}

runTests().catch(console.error);
