export const globalSystemStats = {
   cacheHits: 0,
   tokensSaved: 0,
   geminiCalls: 0,
   vectorSearches: 0,
   tokensUsed: 0,
   costIncurred: 0,
   firestoreReads: 0,
   functionTokens: {} as Record<string, { calls: number, tokens: number }>
};

