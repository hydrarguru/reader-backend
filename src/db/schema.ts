// Drizzle's view of the database, for typed queries. The SQL files in migrations/ own the
// actual schema: when a migration changes a table, update it here to match.
import { sql } from "drizzle-orm";
import { check, int, mysqlTable, primaryKey, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

const createdAt = () => timestamp("created_at").defaultNow();
const modifiedAt = () => timestamp("modified_at").defaultNow().onUpdateNow();

export const users = mysqlTable("Users", {
  user_id: varchar("user_id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: createdAt(),
  modified_at: modifiedAt(),
});

export const communities = mysqlTable("Communities", {
  community_id: varchar("community_id", { length: 36 }).primaryKey(),
  community_name: varchar("community_name", { length: 50 }).notNull().unique(),
  community_image_url: varchar("community_image_url", { length: 255 }),
  community_desc: varchar("community_desc", { length: 255 }).notNull(),
  created_at: createdAt(),
  modified_at: modifiedAt(),
});

export const posts = mysqlTable("Posts", {
  post_id: varchar("post_id", { length: 36 }).primaryKey(),
  community_id: varchar("community_id", { length: 36 })
    .notNull()
    .references(() => communities.community_id, { onDelete: "cascade" }),
  post_author: varchar("post_author", { length: 50 })
    .notNull()
    .references(() => users.username, { onUpdate: "cascade" }),
  post_title: varchar("post_title", { length: 50 }).notNull(),
  post_image_url: varchar("post_image_url", { length: 255 }),
  post_content: text("post_content").notNull(),
  post_score: int("post_score").default(0),
  created_at: createdAt(),
  modified_at: modifiedAt(),
});

export const comments = mysqlTable("Comments", {
  comment_id: varchar("comment_id", { length: 36 }).primaryKey(),
  post_id: varchar("post_id", { length: 36 })
    .notNull()
    .references(() => posts.post_id, { onDelete: "cascade" }),
  comment_author: varchar("comment_author", { length: 50 })
    .notNull()
    .references(() => users.username, { onUpdate: "cascade" }),
  comment_content: varchar("comment_content", { length: 255 }).notNull(),
  comment_score: int("comment_score").default(0),
  created_at: createdAt(),
  modified_at: modifiedAt(),
});

// One row per user per post, so a user can only count once towards a post's score.
export const postVotes = mysqlTable(
  "PostVotes",
  {
    post_id: varchar("post_id", { length: 36 })
      .notNull()
      .references(() => posts.post_id, { onDelete: "cascade" }),
    user_id: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.user_id, { onDelete: "cascade" }),
    vote: tinyint("vote").notNull(),
    created_at: createdAt(),
    modified_at: modifiedAt(),
  },
  (table) => [primaryKey({ columns: [table.post_id, table.user_id] }), check("vote_check", sql`${table.vote} IN (-1, 1)`)],
);

// Users listed here may create, edit and delete communities.
export const admins = mysqlTable("Admins", {
  user_id: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.user_id, { onDelete: "cascade" }),
  created_at: createdAt(),
});

// A community's rules, shown in the order of rule_order.
export const communityRules = mysqlTable(
  "CommunityRules",
  {
    community_id: varchar("community_id", { length: 36 })
      .notNull()
      .references(() => communities.community_id, { onDelete: "cascade" }),
    rule_order: tinyint("rule_order", { unsigned: true }).notNull(),
    rule_title: varchar("rule_title", { length: 100 }).notNull(),
    rule_desc: varchar("rule_desc", { length: 500 }).notNull().default(""),
  },
  (table) => [primaryKey({ columns: [table.community_id, table.rule_order] })],
);
