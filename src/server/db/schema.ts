import { date, index, jsonb, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("users_email_unique").on(table.email)],
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 80 }).notNull(),
    normalizedTopic: varchar("normalized_topic", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("preferences_user_topic_unique").on(table.userId, table.normalizedTopic),
    index("preferences_user_id_idx").on(table.userId),
  ],
);

export const feedCache = pgTable(
  "feed_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cacheDate: date("cache_date").notNull(),
    preferencesHash: varchar("preferences_hash", { length: 64 }).notNull(),
    contentJson: jsonb("content_json").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("feed_cache_user_date_unique").on(table.userId, table.cacheDate),
    index("feed_cache_user_generated_idx").on(table.userId, table.generatedAt.desc()),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;
export type FeedCache = typeof feedCache.$inferSelect;
export type NewFeedCache = typeof feedCache.$inferInsert;
