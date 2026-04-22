import { Link } from "wouter";
import { Globe2, Mail, Linkedin, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";

import {
  useListTeamMembers,
  getListTeamMembersQueryKey,
} from "@workspace/api-client-react";
import type { TeamMember } from "@workspace/api-zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const SECTIONS: { key: string; title: string; description: string; columns: string }[] = [
  {
    key: "editor_in_chief",
    title: "Editor-in-Chief",
    description: "Sets the editorial direction, leads peer review, and signs off on every monthly issue.",
    columns: "md:grid-cols-2",
  },
  {
    key: "webmaster",
    title: "Webmaster",
    description: "Maintains the OptMails platform, archive, and editorial portal so that every issue stays online and accessible.",
    columns: "md:grid-cols-2",
  },
  {
    key: "contributing_editor",
    title: "Contributing Editors",
    description: "Subspecialty leads who curate submissions, write commentary, and translate research for the wider OptMails community.",
    columns: "md:grid-cols-2 lg:grid-cols-3",
  },
  {
    key: "sponsor",
    title: "Sponsors & Partners",
    description: "Organizations whose ongoing support keeps OptMails free to read and globally accessible.",
    columns: "md:grid-cols-2 lg:grid-cols-3",
  },
];

function initials(name: string) {
  return name
    .replace(/,.*/, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function testId(prefix: string, name: string) {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`;
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <Card className="h-full" data-testid={testId("team-member", member.name)}>
      <CardContent className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-serif text-xl leading-tight">{member.name}</h3>
            <p className="text-sm text-primary mt-1">{member.role}</p>
            {member.location && (
              <p className="text-xs text-muted-foreground mt-1">{member.location}</p>
            )}
          </div>
        </div>
        {member.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{member.bio}</p>
        )}
        {(member.email || member.linkedin) && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/60">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SponsorCard({ member }: { member: TeamMember }) {
  return (
    <Card className="h-full" data-testid={testId("sponsor", member.name)}>
      <CardContent className="p-6 flex flex-col gap-3 h-full">
        <Badge variant="secondary" className="self-start">{member.role}</Badge>
        <h3 className="font-serif text-xl leading-tight">{member.name}</h3>
        {member.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{member.bio}</p>
        )}
        {member.websiteUrl && (
          <a
            href={member.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
          >
            Visit website <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function Team() {
  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">OptMails</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/team" className="text-foreground transition-colors">Team</Link>
            <Link href="/donate" className="hover:text-foreground transition-colors">Donate</Link>
            <Link href="/portal" className="text-primary hover:text-primary/80 transition-colors">Editorial Portal</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 relative z-10 max-w-3xl">
            <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">
              <Sparkles className="w-3 h-3 mr-2" />
              Meet Our Team
            </Badge>
            <h1 className="text-4xl md:text-6xl font-serif font-medium leading-[1.1] tracking-tight mb-6">
              The clinicians, researchers, and partners behind OptMails.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              OptMails is curated by a small editorial board working across continents and time zones. Every issue is shaped by volunteer contributing editors and supported by partners committed to open optometry research.
            </p>
            <Button asChild variant="ghost" className="mt-8 -ml-3" data-testid="button-back-home">
              <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to home</Link>
            </Button>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-6xl space-y-16">
            {SECTIONS.map((section, index) => {
              const sectionMembers = (members ?? []).filter((m) => m.category === section.key);
              return (
                <div key={section.key}>
                  {index > 0 && <Separator className="mb-16" />}
                  <h2 className="text-3xl font-serif mb-2">{section.title}</h2>
                  <p className="text-muted-foreground mb-8 max-w-2xl">{section.description}</p>
                  {isLoading ? (
                    <div className={`grid ${section.columns} gap-6`}>
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                      ))}
                    </div>
                  ) : sectionMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No one listed in this group yet.</p>
                  ) : (
                    <div className={`grid ${section.columns} gap-6`}>
                      {sectionMembers.map((member) =>
                        section.key === "sponsor" ? (
                          <SponsorCard key={member.id} member={member} />
                        ) : (
                          <MemberCard key={member.id} member={member} />
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8 md:p-12 text-center">
                <h3 className="text-2xl md:text-3xl font-serif mb-3">Want to join the editorial board?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                  We welcome optometry students, clinicians, and researchers who want to contribute commentary, peer review, or partner with OptMails.
                </p>
                <Button asChild data-testid="button-submit-research">
                  <Link href="/#submit">Submit your work</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          OptMails · A global editorial hub for optometry research
        </div>
      </footer>
    </div>
  );
}
