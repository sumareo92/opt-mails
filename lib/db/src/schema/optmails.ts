import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const articlesTable = pgTable("optmails_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  sourceUrl: text("source_url").notNull(),
  issueMonth: text("issue_month").notNull(),
  readMinutes: integer("read_minutes").notNull().default(4),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscribersTable = pgTable("optmails_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  audienceType: text("audience_type").notNull(),
  country: text("country").notNull(),
  interests: text("interests").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const submissionsTable = pgTable("optmails_submissions", {
  id: serial("id").primaryKey(),
  submitterName: text("submitter_name").notNull(),
  email: text("email").notNull(),
  institution: text("institution").notNull().default(""),
  country: text("country").notNull(),
  contributionType: text("contribution_type").notNull(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  link: text("link").notNull().default(""),
  status: text("status").notNull().default("Pending review"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("optmails_notifications", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audienceCount: integer("audience_count").notNull().default(0),
  status: text("status").notNull().default("Queued preview"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});