export const CATEGORY_SUB_FILTERS: Record<string, string[]> = {
  'music': ['Artists', 'Songs', 'Albums', 'Playlists', 'Podcasts', 'Live Performances', 'Music Videos'],
  'food': ['Restaurants', 'Snacks', 'Meals', 'Beverages', 'Desserts', 'Coffee Shops', 'Bars', 'Groceries', 'Recipes'],
  'watch': ['Movies', 'TV Shows', 'Actors', 'Directors', 'Anime', 'Documentaries', 'Short Films', 'Web Series'],
  'games': ['Video Games', 'Board & Card Games', 'Sports', 'Tabletop RPGs', 'Mobile Games', 'VR Games', 'Esports'],
  'books': ['Fiction', 'Non-Fiction', 'Audiobooks', 'Comics & Graphic Novels', 'Manga', 'Poetry', 'Magazines', 'Textbooks'],
  'events': ['Concerts', 'Theater', 'Sports', 'Festivals', 'Conventions', 'Exhibitions', 'Comedy Shows', 'Workshops'],
  'places': ['Cities', 'Nature', 'Venues', 'Museums', 'Parks', 'Historical Sites', 'Hotels', 'Amusement Parks'],
  'products': ['Tech & Electronics', 'Home & Furniture', 'Fashion & Apparel', 'Beauty & Personal Care', 'Health & Wellness', 'Pet Supplies', 'Automotive', 'Kitchen & Dining', 'Toys & Hobbies', 'Office Supplies', 'Outdoor & Garden', 'Art & Craft', 'Tools & Home Improvement', 'Sports Equipment'],
};

export const CATEGORY_SUB_FILTERS_DISPLAY_NAMES: Record<string, string[]> = {
  'Music': CATEGORY_SUB_FILTERS['music'],
  'Food': CATEGORY_SUB_FILTERS['food'],
  'TV & Movies': CATEGORY_SUB_FILTERS['watch'],
  'Games/Sports': CATEGORY_SUB_FILTERS['games'],
  'Books': CATEGORY_SUB_FILTERS['books'],
  'Events': CATEGORY_SUB_FILTERS['events'],
  'Places': CATEGORY_SUB_FILTERS['places'],
  'Products': CATEGORY_SUB_FILTERS['products'],
};

export const GLOBAL_DYNAMIC_FILTERS = (cat: string) => {
   switch (cat) {
      case 'food': return ['Italian', 'Mexican', 'Asian', 'Cheap', 'Expensive', 'Vegan', 'Dessert', 'Healthy', 'Fast Food', 'Fine Dining'];
      case 'watch': return ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Documentary', 'Horror', 'Romance', 'Thriller', 'Animation', 'Fantasy'];
      case 'music': return ['Pop', 'Rock', 'Hip Hop', 'Jazz', 'Electronic', 'Classical', 'Country', 'R&B', 'Indie', 'Metal'];
      case 'books': return ['Fiction', 'Non-Fiction', 'Fantasy', 'Sci-Fi', 'Biography', 'Mystery', 'Romance', 'Self-Help', 'History', 'Thriller'];
      case 'games': return ['RPG', 'Action', 'Strategy', 'Multiplayer', 'Puzzle', 'Shooter', 'Simulation', 'Sports', 'Indie', 'Platformer'];
      case 'places': return ['Outdoor', 'Indoor', 'Free', 'Cultural', 'Nature', 'Family Friendly', 'Romantic', 'Adventure', 'Relaxing', 'Historical'];
      case 'products': return ['Under $50', 'Premium', 'Eco-Friendly', 'Smart', 'Handmade', 'Best Seller', 'New Arrival', 'Gift Idea', 'Essential', 'Top Rated'];
      case 'events': return ['Live', 'Virtual', 'Free', 'Weekend', 'Family', '18+', 'VIP', 'Outdoor', 'Workshop', 'Festival'];
      default: return [];
   }
};
