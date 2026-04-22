import { asc, desc, eq, gte } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  articlesTable,
  db,
  eventRsvpsTable,
  eventsTable,
  notificationsTable,
  subscribersTable,
  submissionsTable,
  teamMembersTable,
} from "@workspace/db";
import {
  CreateEventBody,
  CreateEventRsvpBody,
  CreateNotificationPreviewBody,
  CreateSubmissionBody,
  CreateSubscriberBody,
  CreateTeamMemberBody,
  UpdateTeamMemberBody,
  UpdateTeamMemberParams,
  DeleteTeamMemberParams,
  ListTeamMembersResponse,
  UpdateTeamMemberResponse,
  GetDashboardResponse,
  GetNewsletterResponse,
  ListArticlesResponse,
  ListEventRsvpsResponse,
  ListEventsResponse,
  ListNewslettersResponse,
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

const eventResponse = (event: typeof eventsTable.$inferSelect) => ({
  ...event,
  eventDate: toIso(event.eventDate),
  endDate: event.endDate ? toIso(event.endDate) : "",
  createdAt: toIso(event.createdAt),
});

router.get("/newsletters", async (_req, res): Promise<void> => {
  const articles = await db
    .select()
    .from(articlesTable)
    .orderBy(desc(articlesTable.createdAt));

  const grouped = new Map<string, typeof articles>();
  for (const article of articles) {
    const existing = grouped.get(article.issueMonth) ?? [];
    existing.push(article);
    grouped.set(article.issueMonth, existing);
  }

  const issues = Array.from(grouped.entries()).map(([month, items], index) => ({
    id: index + 1,
    month,
    title: `OptMails Monthly Research Digest`,
    editorNote:
      "Featured optometry research, contributor highlights, and publishing opportunities curated for the global community.",
    status: "Archived",
    articles: items.map(articleResponse),
  }));

  if (issues[0]) {
    issues[0].status = "Open for contributions";
  }

  res.json(ListNewslettersResponse.parse(issues));
});

router.get("/events", async (_req, res): Promise<void> => {
  const now = new Date();
  const events = await db
    .select()
    .from(eventsTable)
    .where(gte(eventsTable.eventDate, now))
    .orderBy(asc(eventsTable.eventDate));

  res.json(ListEventsResponse.parse(events.map(eventResponse)));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid event body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const eventDate = new Date(parsed.data.eventDate);
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;

  if (Number.isNaN(eventDate.getTime())) {
    res.status(400).json({ error: "Invalid eventDate" });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      eventDate,
      endDate,
      location: parsed.data.location,
      format: parsed.data.format,
      registrationUrl: parsed.data.registrationUrl ?? "",
      host: parsed.data.host,
    })
    .returning();

  res.status(201).json(ListEventsResponse.element.parse(eventResponse(event)));
});

router.get("/events/:eventId/rsvps", async (req, res): Promise<void> => {
  const eventId = Number(req.params.eventId);
  if (!Number.isFinite(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const rows = await db
    .select()
    .from(eventRsvpsTable)
    .where(eq(eventRsvpsTable.eventId, eventId))
    .orderBy(desc(eventRsvpsTable.createdAt));

  const data = rows.map((row) => ({
    ...row,
    createdAt: toIso(row.createdAt),
  }));
  res.json(ListEventRsvpsResponse.parse(data));
});

router.post("/events/:eventId/rsvps", async (req, res): Promise<void> => {
  const eventId = Number(req.params.eventId);
  if (!Number.isFinite(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const parsed = CreateEventRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId))
    .limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const [rsvp] = await db
    .insert(eventRsvpsTable)
    .values({
      eventId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role ?? "",
    })
    .returning();
  res
    .status(201)
    .json(
      ListEventRsvpsResponse.element.parse({
        ...rsvp,
        createdAt: toIso(rsvp.createdAt),
      }),
    );
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

const teamMemberResponse = (member: typeof teamMembersTable.$inferSelect) => ({
  ...member,
  createdAt: toIso(member.createdAt),
});

const CATEGORY_ORDER: Record<string, number> = {
  editor_in_chief: 0,
  webmaster: 1,
  contributing_editor: 2,
  sponsor: 3,
};

router.get("/team-members", async (_req, res): Promise<void> => {
  const members = await db.select().from(teamMembersTable);
  const sorted = [...members].sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] ?? 99;
    const cb = CATEGORY_ORDER[b.category] ?? 99;
    if (ca !== cb) return ca - cb;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
  res.json(ListTeamMembersResponse.parse(sorted.map(teamMemberResponse)));
});

router.post("/team-members", async (req, res): Promise<void> => {
  const parsed = CreateTeamMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .insert(teamMembersTable)
    .values({
      category: parsed.data.category,
      name: parsed.data.name,
      role: parsed.data.role,
      location: parsed.data.location ?? "",
      bio: parsed.data.bio ?? "",
      email: parsed.data.email ?? "",
      linkedin: parsed.data.linkedin ?? "",
      websiteUrl: parsed.data.websiteUrl ?? "",
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();
  res.status(201).json(ListTeamMembersResponse.element.parse(teamMemberResponse(member)));
});

router.patch("/team-members/:id", async (req, res): Promise<void> => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  const body = UpdateTeamMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error.message });
    return;
  }
  const [member] = await db
    .update(teamMembersTable)
    .set({
      category: body.data.category,
      name: body.data.name,
      role: body.data.role,
      location: body.data.location ?? "",
      bio: body.data.bio ?? "",
      email: body.data.email ?? "",
      linkedin: body.data.linkedin ?? "",
      websiteUrl: body.data.websiteUrl ?? "",
      sortOrder: body.data.sortOrder ?? 0,
    })
    .where(eq(teamMembersTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  res.json(UpdateTeamMemberResponse.parse(teamMemberResponse(member)));
});

router.delete("/team-members/:id", async (req, res): Promise<void> => {
  const params = DeleteTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(teamMembersTable)
    .where(eq(teamMembersTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  res.status(204).send();
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