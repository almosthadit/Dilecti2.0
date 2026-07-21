import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, real, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  handle: text('handle').unique(),
  photoUrl: text('photo_url'),
  accountType: text('account_type').default('person'),
  isDiscoverable: boolean('is_discoverable').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata'), // To store other unstructured fields like demographics
});

export const userItems = pgTable('user_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  itemCategory: text('category').notNull(), // 'book', 'movie', etc.
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  coverUrl: text('cover_url'),
  reaction: text('reaction'),
  rating: real('rating'),
  criticScore: real('critic_score'),
  review: text('review'),
  dateAdded: integer('date_added'), // timestamp
  status: text('status'),
  isPrivate: boolean('is_private').default(false),
  visibility: text('visibility').default('public'),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata'), // JSON for extra properties (runtime, pages, collections, allowedGroups)
});

export const following = pgTable('following', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').references(() => users.id).notNull(),
  targetId: integer('target_id').references(() => users.id).notNull(),
  relationshipGroup: text('relationship_group'),
  followedAt: timestamp('followed_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  items: many(userItems),
  followers: many(following, { relationName: 'target' }),
  following: many(following, { relationName: 'follower' }),
}));

export const userItemsRelations = relations(userItems, ({ one }) => ({
  user: one(users, {
    fields: [userItems.userId],
    references: [users.id],
  }),
}));

export const followingRelations = relations(following, ({ one }) => ({
  follower: one(users, {
    fields: [following.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  target: one(users, {
    fields: [following.targetId],
    references: [users.id],
    relationName: 'target',
  }),
}));

import { customType } from 'drizzle-orm/pg-core';
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(384)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // value is returned as string "[1.1,2.2]"
    return JSON.parse(value);
  },
});

export const globalItems = pgTable('global_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  category: text('category').notNull(),
  embedding: vector('embedding'),
  data: jsonb('data')
});
