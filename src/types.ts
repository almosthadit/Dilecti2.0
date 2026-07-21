export type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  coverUrl?: string;
  pageCount?: number;
  first_publish_year?: number;
  isbn?: string[];
  subject?: string[];
  number_of_pages_median?: number;
};

export type Category = 'book' | 'movie' | 'tv' | 'music' | 'game' | 'place' | 'food' | 'product';

export type UserItem = {
  id: string;
  category: Category;
  subCategory?: string;
  title: string;
  subtitle?: string; // author, director, artist, etc.
  author?: string; // legacy specifically for books
  description?: string; // plot summary, short review, etc
  coverUrl: string;
  reaction?: 'love' | 'like' | 'dislike' | 'hate';
  rating: number; // Keep for fallback, but we can use criticScore as main
  criticScore?: number; // Rich critic rating from 0.0 to 10.0
  review: string;
  dateAdded: number;
  runtime?: number; // runtime in minutes
  pages?: number; // page count
  status: 'completed' | 'up-next' | 'in-progress' | 'read' | 'currently-reading' | 'not-for-me' | 'abandoned' | 'planning'; // combined older statuses for compatibility
  collections?: string[];
  favoriteQuote?: string; // or specific notes
  bestFood?: string; // specifically for foods/restaurants
  isPrivate?: boolean; // privacy toggle
  visibility?: 'public' | 'private' | 'groups' | 'custom'; // finer privacy control
  allowedGroups?: string[]; // groups allowed to see if visibility is 'groups' or custom include
  excludedGroups?: string[]; // groups excluded if custom exclude
  allowedUsers?: string[]; // specific user IDs allowed
  excludedUsers?: string[]; // specific user IDs excluded
  customBase?: 'public' | 'private'; // for custom: public = share with all except, private = share with none except
  inLibrary?: boolean; // whether it's shown in the library or just saved for ratings
  negativeFeedback?: string; // why they didn't like it
  metadata?: any; // any extra category-specific data
  sourceAttribution?: string; // Where this data came from
  url?: string; // URL to purchase or view
  affiliateUrl?: string; // Built-in affiliate URL
  releaseYear?: string | number; // For books / movies release year separated from description
  price?: string; // Product pricing
  reviewCount?: number; // Product / Item number of reviews
  enrichmentAttempted?: boolean | number;
};

export type UserBook = UserItem & { 
  category: 'book';
  author: string;
  isbn?: string;
  pageCount?: number;
};


export type UserProfile = {
  displayName?: string;
  displayNameLower?: string;
  photoURL?: string;
  location?: string;
  createdAt?: any;
  customGroups?: { id: string; name: string; members: string[] }[]; // User's custom groups
  favoriteAuthors?: string[];
  preferences?: string;
  interests?: string[];
  hiddenBooks?: string[];
  tutorialCompleted?: boolean;
  onboardingCompleted?: boolean;
  cachedRecommendations?: any[];
  cachedRecommendationsContext?: string;
  cachedRecommendationsAt?: number;
  cachedDiscoveries?: Record<string, any[]>;
  cachedDiscoveriesContext?: string;
  cachedDiscoveriesAt?: number;
  cachedDiscoveriesArray?: any[];
  userConsentedToDemographicProfiling?: boolean;
  tasteState?: any;
  tasteStateComputedAt?: number;
  demographics?: {
    gender?: string;
    age?: string;
    birthday?: string;
    location?: string;
    relationshipStatus?: string;
    employment?: string;
    lifestyle?: string;
    pets?: string;
    environment?: string;
    hasKids?: boolean;
    isStudent?: boolean;
    worksFromHome?: boolean;
    isIntrovert?: boolean;
    livesInCity?: boolean;
    ownsCar?: boolean;
  };
  rejectedRecommendations?: any[];
  miniProfiles?: Record<string, { hash: string; content: string; generatedAt: number }>;
  cachedTasteGraphData?: any;
  searchHistory?: { query: string; timestamp: number; extractedInterests?: string[] }[];
  
  // Custom Social Profile Additions
  handle?: string;
  handleLower?: string;
  bio?: string;
  accountType?: 'person' | 'creator' | 'brand';
  isDiscoverable?: boolean;
  creatorCategoryTags?: Category[];
  socialStats?: {
    followersCount?: number;
    followingCount?: number;
    publicItemsCount?: number;
  };
  cardSize?: 'small' | 'medium' | 'large';
  showSocialIndicators?: boolean;
  affiliateTags?: {
    amazon?: string;
    rakuten?: string;
  };
};

export type FollowingDoc = {
  targetUserId: string;
  followedAt: any;
  targetDisplayName?: string;
  targetPhotoURL?: string;
  targetHandle?: string;
  targetAccountType?: 'person' | 'creator' | 'brand';
  relationshipGroup?: 'friend' | 'family' | 'partner' | null;
};

export type FollowerDoc = {
  followerUserId: string;
  followedAt: any;
  followerDisplayName?: string;
  followerPhotoURL?: string;
  followerHandle?: string;
};

export type TasteComparison = {
  score: number;
  sharedItems: UserItem[];
  sharedLoves: UserItem[];
  discoveryItems: UserItem[];
  strongestOverlapCategories: string[];
  differentTasteZones: string[];
};

export type ViewState = 'home' | 'library' | 'discover' | 'feed' | 'stats' | 'profile' | 'zing';

// --- Zing Types ---

export type RelationshipType = 'partner' | 'close_friend' | 'family' | 'casual_friend' | 'creator';

export type PermissionTemplate = {
  canSee: string[];
  aiCanUseSilently: string[];
  aiCanReveal: string[];
  requiresConfirmation: string[];
  neverShareable: string[];
};

export type ZingConnection = {
  id: string;
  name: string;
  avatarUrl?: string;
  relationshipType: RelationshipType;
  status: 'pending' | 'active' | 'blocked';
  sharedCategories: string[];
  permissionTemplate: PermissionTemplate;
  aiUsageSettings: {
    silentFilteringEnabled: boolean;
    explicitRevealEnabled: boolean;
  };
};

export type CoupleWidgetSettings = {
  showKids: boolean;
  showPets: boolean;
  showFinance: boolean;
  showChores: boolean;
  showFood: boolean;
  showIntimacy: boolean;
  showMood: boolean;
  showCalendar: boolean;
};

// --- Taste Intelligence Types ---

export type NarrativeEvidence = {
  id: string;
  userId: string;
  claim: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceItemIds: string[];
  metricIds: string[];
  generatedAt: number;
  invalidationKeys: string[];
};

export type CategoryProfile = {
  category: Category | string;
  itemCount: number;
  favoriteCount: number;
  wantToTryCount: number;
  topGenres: string[];
  topThemes: string[];
  topCreators: string[];
  representativeItems: string[];
  avoidedPatterns: string[];
  strongestSignals: string[];
  confidence: 'high' | 'medium' | 'low';
};

export type QuantitativeProfile = {
  userId: string;
  totalItems: number;
  categoryCounts: Record<string, number>;
  favoriteCategoryCounts: Record<string, number>;
  wantToTryCategoryCounts: Record<string, number>;
  ratingDistribution: Record<string, number>;
  symbolicRatingDistribution: Record<string, number>;
  topGenres: string[];
  topThemes: string[];
  topCreators: string[];
  topActors: string[];
  topAuthors: string[];
  topArtists: string[];
  topPlaces: string[];
  eraDistribution: Record<string, number>;
  mainstreamPrestigeBalance: number;
  noveltyScore: number;
  comfortScore: number;
  intensityScore: number;
  socialScore: number;
  craftScore: number;
  escapismScore: number;
};

export type TasteContradiction = {
  id: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceItemIds: string[];
  metricIds: string[];
  categoryScope: string[];
  createdAt: number;
  invalidationKeys: string[];
};

export type LatentPersona = {
  id: string;
  name: string;
  summary: string;
  categories: string[];
  motifs: string[];
  representativeItems: string[];
  confidence: 'high' | 'medium' | 'low';
  evidenceItemIds: string[];
  generatedAt: number;
  invalidationKeys: string[];
};

export type CrossCategoryMotif = {
  id: string;
  name: string;
  description: string;
  categories: string[];
  representativeItems: string[];
  strength: number;
  confidence: 'high' | 'medium' | 'low';
};

export type TemporalTasteChange = {
  id: string;
  title: string;
  description: string;
  before: string;
  after: string;
  timeWindow: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceItemIds: string[];
};

export type FriendAffinityScore = {
  friendUserId: string;
  category: string;
  agreementScore: number;
  discoveryScore: number;
  trustWeight: number;
  overlapCount: number;
  disagreementPatterns: string[];
};

export type RecommendationContext = {
  userId: string;
  candidateId: string;
  personalTasteSimilarity: number;
  themeCompatibility: number;
  behavioralEvidenceScore: number;
  friendAffinityScore: number;
  crossCategoryMotifScore: number;
  noveltyScore: number;
  qualitySignalScore: number;
  negativePreferencePenalty: number;
  finalScore: number;
  explanationEvidence: string;
};

export type UserTasteState = {
  userId: string;
  lastUpdated: number;
  version: string;
  coreTraits: string[];
  strongestMotifs: string[];
  categorySignatures: Record<string, string>;
  contradictions: TasteContradiction[];
  recentChanges: TemporalTasteChange[];
  personas?: LatentPersona[];
  confidence: 'high' | 'medium' | 'low';
  evidenceIds: string[];
};
