# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- **API Server** (`artifacts/api-server`) — shared Express API mounted at `/api`.
- **Canvas** (`artifacts/mockup-sandbox`) — design/mockup sandbox mounted at `/__mockup`.
- **OptMails** (`artifacts/optmails`) — React/Vite website mounted at `/` for the optometry research newsletter.

## OptMails Implementation

OptMails provides a public optometry research newsletter website plus an editorial portal. The public site features curated research articles, the current monthly issue, newsletter subscription, research/content submission, and contributor opportunities for photography, digital design, and writing. The `/portal` route supports submission review, subscriber visibility, dashboard summaries, and queued notification previews.

Database tables live in `lib/db/src/schema/optmails.ts`:

- `optmails_articles`
- `optmails_subscribers`
- `optmails_submissions`
- `optmails_notifications`
- `optmails_events`, `optmails_event_rsvps`
- `optmails_team_members`
- `optmails_donation_methods`, `optmails_donations`, `optmails_fundraising_campaign`

Donations & fundraising: editors configure external giving channels (PayPal, Google Pay, Stripe Payment Link, bank transfer, etc.) in the portal Fundraising tab. The public `/donate` page renders these as cards that link out, plus a live progress bar driven by manually-logged donations. Same data model can later be wired to a Stripe webhook for direct card processing.

API routes live in `artifacts/api-server/src/routes/optmails.ts` and are defined contract-first in `lib/api-spec/openapi.yaml`. Email delivery is represented by queued notification preview records; connecting a mail provider such as SendGrid, Resend, Gmail, or Outlook can turn queued records into live outgoing emails.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
