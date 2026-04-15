import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  articlesTable,
  db,
  notificationsTable,
  subscribersTable,
  submissionsTable,
} from "@workspace/db";
import {
  CreateNotificationPreviewBody,
  CreateSubmissionBody,
  CreateSubscriberBody,
  GetDashboardResponse,
  GetNewsletterResponse,
  ListArticlesResponse,
  ListNotificationsResponse,
  ListSubscribersResponse,
  ListSubmissionsResponse,
  UpdateSubmissionBody,
  UpdateSubmissionParams,
  UpdateSubmissionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const toIso = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const articleResponse = (article: typeof articlesTable.$inferSelect) => ({
  ...article,
  createdAt: toIso(article.createdAt),
});

const subscriberResponse = (subscriber: typeof subscribersTable.$inferSelect) => ({
  ...subscriber,
  createdAt: toIso(subscriber.createdAt),
});

const submissionResponse = (submission: typeof submissionsTable.$inferSelect) => ({
  ...submission,
  createdAt: toIso(submission.createdAt),
});

const notificationResponse = (notification: typeof notificationsTable.$inferSelect) => ({
  ...notification,
  createdAt: toIso(notification.createdAt),
});

router.get("/articles", async (_req, res): Promise<void> => {
  const articles = await db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.featured), desc(articlesTable.createdAt));

  res.json(ListArticlesResponse.parse(articles.map(articleResponse)));
});

router.get("/newsletter", async (_req, res): Promise<void> => {
  const articles = await db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.featured), desc(articlesTable.createdAt));

  const data = {
    id: 1,
    month: "April 2026",
    title: "OptMails Monthly Research Digest",
    editorNote:
      "A curated issue connecting optometry students, clinicians, and researchers with practical research, publishing opportunities, and creative ways to contribute.",
    status: "Open for contributions",
    articles: articles.map(articleResponse),
  };

  res.json(GetNewsletterResponse.parse(data));
});

router.get("/subscribers", async (_req, res): Promise<void> => {
  const subscribers = await db
    .select()
    .from(subscribersTable)
    .orderBy(desc(subscribersTable.createdAt));

  res.json(ListSubscribersResponse.parse(subscribers.map(subscriberResponse)));
});

router.post("/subscribers", async (req, res): Promise<void> => {
  const parsed = CreateSubscriberBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid subscriber body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subscriber] = await db
    .insert(subscribersTable)
    .values({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      interests: parsed.data.interests ?? "",
    })
    .onConflictDoUpdate({
      target: subscribersTable.email,
      set: {
        name: parsed.data.name,
        audienceType: parsed.data.audienceType,
        country: parsed.data.country,
        interests: parsed.data.interests ?? "",
      },
    })
    .returning();

  res.status(201).json(ListSubscribersResponse.element.parse(subscriberResponse(subscriber)));
});

router.get("/submissions", async (_req, res): Promise<void> => {
  const submissions = await db
    .select()
    .from(submissionsTable)
    .orderBy(desc(submissionsTable.createdAt));

  res.json(ListSubmissionsResponse.parse(submissions.map(submissionResponse)));
});

router.post("/submissions", async (req, res): Promise<void> => {
  const parsed = CreateSubmissionBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid submission body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      ...parsed.data,
      institution: parsed.data.institution ?? "",
      link: parsed.data.link ?? "",
    })
    .returning();

  res.status(201).json(ListSubmissionsResponse.element.parse(submissionResponse(submission)));
});

router.patch("/submissions/:id", async (req, res): Promise<void> => {
  const params = UpdateSubmissionParams.safeParse(req.params);
  const body = UpdateSubmissionBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : body.error.message,
    });
    return;
  }

  const [submission] = await db
    .update(submissionsTable)
    .set({
      status: body.data.status,
      reviewerNote: body.data.reviewerNote ?? "",
    })
    .where(eq(submissionsTable.id, params.data.id))
    .returning();

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  res.json(UpdateSubmissionResponse.parse(submissionResponse(submission)));
});

router.get("/notifications", async (_req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt));

  res.json(ListNotificationsResponse.parse(notifications.map(notificationResponse)));
});

router.post("/notifications/preview-send", async (req, res): Promise<void> => {
  const parsed = CreateNotificationPreviewBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid notification body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const subscribers = await db.select().from(subscribersTable);
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      subject: parsed.data.subject,
      body: parsed.data.body,
      audienceCount: subscribers.length,
      status: "Queued preview",
    })
    .returning();

  res.status(201).json(ListNotificationsResponse.element.parse(notificationResponse(notification)));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [subscribers, submissions, articles] = await Promise.all([
    db.select().from(subscribersTable),
    db.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt)),
    db.select().from(articlesTable),
  ]);

  const statusCounts = submissions.reduce<Record<string, number>>((acc, submission) => {
    acc[submission.status] = (acc[submission.status] ?? 0) + 1;
    return acc;
  }, {});

  const data = {
    subscriberCount: subscribers.length,
    submissionCount: submissions.length,
    pendingReviewCount: submissions.filter((submission) => submission.status === "Pending review").length,
    acceptedCount: submissions.filter((submission) => submission.status === "Accepted").length,
    countriesReached: new Set(subscribers.map((subscriber) => subscriber.country)).size,
    articleCount: articles.length,
    recentSubmissions: submissions.slice(0, 5).map(submissionResponse),
    statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    })),
  };

  res.json(GetDashboardResponse.parse(data));
});

export default router;