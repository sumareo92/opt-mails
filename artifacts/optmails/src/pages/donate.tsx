import { Link } from "wouter";
import { ExternalLink, Globe2, HeartHandshake, Sparkles } from "lucide-react";
import {
  useGetFundraisingCampaign,
  useListDonationMethods,
  getGetFundraisingCampaignQueryKey,
  getListDonationMethodsQueryKey,
} from "@workspace/api-client-react";
import type { DonationMethod } from "@workspace/api-zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PROVIDER_LABELS: Record<string, string> = {
  paypal: "PayPal",
  google_pay: "Google Pay",
  stripe_link: "Stripe Payment Link",
  venmo: "Venmo",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function Donate() {
  const { data: campaign, isLoading: isLoadingCampaign } = useGetFundraisingCampaign({
    query: { queryKey: getGetFundraisingCampaignQueryKey() },
  });
  const { data: methods, isLoading: isLoadingMethods } = useListDonationMethods({
    query: { queryKey: getListDonationMethodsQueryKey() },
  });

  const visibleMethods = (methods ?? []).filter((m: DonationMethod) => m.active);
  const progressPct = campaign && campaign.goalCents > 0
    ? Math.min(100, Math.round((campaign.raisedCents / campaign.goalCents) * 100))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">OptMails</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/team" className="hover:text-foreground transition-colors">Team</Link>
            <Link href="/donate" className="text-foreground transition-colors">Donate</Link>
            <Link href="/portal" className="text-primary hover:text-primary/80 transition-colors">Editorial Portal</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 relative z-10 max-w-4xl">
            <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="w-3 h-3 mr-2" />
              Reader-supported
            </Badge>
            {isLoadingCampaign || !campaign ? (
              <Skeleton className="h-16 w-full max-w-2xl" />
            ) : (
              <>
                <h1 className="text-4xl md:text-6xl font-serif font-medium leading-[1.1] tracking-tight mb-6" data-testid="text-campaign-title">
                  {campaign.title}
                </h1>
                {campaign.description && (
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl" data-testid="text-campaign-description">
                    {campaign.description}
                  </p>
                )}

                {campaign.active && campaign.goalCents > 0 && (
                  <Card className="mb-10">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Raised so far</p>
                          <p className="text-3xl font-serif" data-testid="text-raised">{formatMoney(campaign.raisedCents, campaign.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Goal</p>
                          <p className="text-xl font-serif text-muted-foreground" data-testid="text-goal">{formatMoney(campaign.goalCents, campaign.currency)}</p>
                        </div>
                      </div>
                      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} data-testid="progress-bar" />
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{progressPct}% of goal</span>
                        <span data-testid="text-donor-count">{campaign.donorCount} {campaign.donorCount === 1 ? "donor" : "donors"}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <HeartHandshake className="w-5 h-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-serif">Ways to give</h2>
            </div>

            {isLoadingMethods ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : visibleMethods.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Donation methods are being set up. Please check back shortly or contact the editorial team.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleMethods.map((m) => (
                  <Card key={m.id} className="flex flex-col" data-testid={`donate-method-${m.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="font-serif text-xl">{m.label}</CardTitle>
                          <Badge variant="outline" className="mt-2 text-xs">{PROVIDER_LABELS[m.provider] ?? m.provider}</Badge>
                        </div>
                      </div>
                      {m.description && <CardDescription className="mt-3">{m.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="mt-auto space-y-3">
                      {m.instructions && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap" data-testid={`instructions-${m.id}`}>
                          {m.instructions}
                        </div>
                      )}
                      {m.url && (
                        <Button asChild className="w-full" data-testid={`button-donate-${m.id}`}>
                          <a href={m.url} target="_blank" rel="noopener noreferrer">
                            Give via {PROVIDER_LABELS[m.provider] ?? m.label}
                            <ExternalLink className="ml-2 w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-10 max-w-2xl">
              OptMails is run by a small editorial board. Contributions go directly toward peer review honoraria, archive hosting, and keeping every issue free to read. After you give, please email us so we can record your donation and send a thank-you.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} OptMails. Independent optometry research, free for everyone.</p>
        </div>
      </footer>
    </div>
  );
}
