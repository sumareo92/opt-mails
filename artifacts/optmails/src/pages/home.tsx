import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Calendar, Clock, Globe2, Library, MapPin, Newspaper, Send, Sparkles, Users } from "lucide-react";

import { 
  useListArticles, 
  useGetNewsletter, 
  useListNewsletters,
  useListEvents,
  useCreateSubscriber, 
  useCreateSubmission,
  useCreateEventRsvp,
  useListEventRsvps,
  getListArticlesQueryKey,
  getGetNewsletterQueryKey,
  getListNewslettersQueryKey,
  getListEventsQueryKey,
  getListEventRsvpsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name is required"),
  audienceType: z.string().min(1, "Please select an audience type"),
  country: z.string().min(2, "Country is required"),
  interests: z.string().optional(),
});

const rsvpSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.string().optional(),
});

type EventLite = {
  id: number;
  title: string;
  eventDate: string;
  location: string;
  format: string;
};

function EventRsvpDialog({ event }: { event: EventLite }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rsvps } = useListEventRsvps(event.id, {
    query: { queryKey: getListEventRsvpsQueryKey(event.id) },
  });

  const createRsvp = useCreateEventRsvp();

  const form = useForm<z.infer<typeof rsvpSchema>>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { name: "", email: "", role: "" },
  });

  const onSubmit = (values: z.infer<typeof rsvpSchema>) => {
    createRsvp.mutate(
      { eventId: event.id, data: { ...values, role: values.role || "" } },
      {
        onSuccess: () => {
          toast({
            title: "RSVP confirmed",
            description: `You're registered for ${event.title}.`,
          });
          queryClient.invalidateQueries({
            queryKey: getListEventRsvpsQueryKey(event.id),
          });
          form.reset();
          setOpen(false);
        },
        onError: () => {
          toast({
            title: "RSVP failed",
            description: "Please check your details and try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between"
          data-testid={`button-rsvp-${event.id}`}
        >
          RSVP {rsvps && rsvps.length > 0 ? `· ${rsvps.length} attending` : ""}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">{event.title}</DialogTitle>
          <DialogDescription>
            Save your spot. We'll send confirmation details to your email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} data-testid={`input-rsvp-name-${event.id}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@example.com" {...field} data-testid={`input-rsvp-email-${event.id}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="clinician">Clinician</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRsvp.isPending} data-testid={`button-confirm-rsvp-${event.id}`}>
                {createRsvp.isPending ? "Saving..." : "Confirm RSVP"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const submissionSchema = z.object({
  submitterName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  institution: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  contributionType: z.string().min(1, "Please select a contribution type"),
  title: z.string().min(5, "Title is required"),
  abstract: z.string().min(20, "Please provide a brief abstract or summary"),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export function Home() {
  const { toast } = useToast();

  const { data: articles, isLoading: isLoadingArticles } = useListArticles({
    query: { queryKey: getListArticlesQueryKey() }
  });

  const { data: newsletter, isLoading: isLoadingNewsletter } = useGetNewsletter({
    query: { queryKey: getGetNewsletterQueryKey() }
  });

  const { data: archivedIssues, isLoading: isLoadingArchive } = useListNewsletters({
    query: { queryKey: getListNewslettersQueryKey() }
  });

  const { data: events, isLoading: isLoadingEvents } = useListEvents({
    query: { queryKey: getListEventsQueryKey() }
  });

  const formatEventDate = (iso: string) => {
    const date = new Date(iso);
    return {
      day: date.toLocaleString(undefined, { day: "2-digit" }),
      month: date.toLocaleString(undefined, { month: "short" }).toUpperCase(),
      year: date.toLocaleString(undefined, { year: "numeric" }),
      time: date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  };

  const createSubscriber = useCreateSubscriber();
  const createSubmission = useCreateSubmission();

  const subscribeForm = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: "",
      name: "",
      audienceType: "",
      country: "",
      interests: "",
    },
  });

  const submissionForm = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      submitterName: "",
      email: "",
      institution: "",
      country: "",
      contributionType: "",
      title: "",
      abstract: "",
      link: "",
    },
  });

  const onSubscribe = (values: z.infer<typeof subscribeSchema>) => {
    createSubscriber.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Subscribed successfully",
          description: "Welcome to the OptMails community.",
        });
        subscribeForm.reset();
      },
      onError: () => {
        toast({
          title: "Subscription failed",
          description: "There was an error subscribing. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const onSubmitResearch = (values: z.infer<typeof submissionSchema>) => {
    createSubmission.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Submission received",
          description: "Thank you for contributing to OptMails. Our editorial team will review your submission.",
        });
        submissionForm.reset();
      },
      onError: () => {
        toast({
          title: "Submission failed",
          description: "There was an error submitting your research. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">OptMails</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#newsletter" className="hover:text-foreground transition-colors">Newsletter</a>
            <a href="#articles" className="hover:text-foreground transition-colors">Featured Research</a>
            <a href="#events" className="hover:text-foreground transition-colors">Events</a>
            <a href="#archive" className="hover:text-foreground transition-colors">Archive</a>
            <a href="#submit" className="hover:text-foreground transition-colors">Submit</a>
            <Link href="/team" className="hover:text-foreground transition-colors">Team</Link>
            <Link href="/donate" className="hover:text-foreground transition-colors">Donate</Link>
            <Link href="/portal" className="text-primary hover:text-primary/80 transition-colors">Editorial Portal</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">
                <Sparkles className="w-3 h-3 mr-2" />
                Global Optometry Research
              </Badge>
              <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.1] tracking-tight mb-6">
                Connecting clinical insight with global research.
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
                A curated, internationally accessible editorial hub for optometry students, clinicians, and researchers. Read the latest breakthroughs or contribute your own.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base rounded-full px-8 h-14" asChild>
                  <a href="#newsletter">Subscribe to Newsletter</a>
                </Button>
                <Button size="lg" variant="outline" className="text-base rounded-full px-8 h-14" asChild>
                  <a href="#submit">Submit Research</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Current Newsletter Section */}
        <section id="newsletter" className="py-20 border-t border-border bg-card">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-px bg-primary"></span>
                  <span className="text-primary font-medium tracking-wide uppercase text-sm">Latest Issue</span>
                </div>
                {isLoadingNewsletter ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : newsletter ? (
                  <>
                    <h2 className="text-4xl font-serif mb-6">{newsletter.title}</h2>
                    <div className="prose prose-slate prose-lg text-muted-foreground mb-8">
                      <p>{newsletter.editorNote}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Issue: {newsletter.month}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{newsletter.articles?.length || 0} Featured Articles</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Newsletter content currently unavailable.</p>
                )}
              </div>

              {/* Subscribe Form */}
              <div className="bg-background rounded-2xl p-8 border border-border shadow-sm">
                <div className="mb-8">
                  <h3 className="text-2xl font-serif mb-2">Join the Community</h3>
                  <p className="text-muted-foreground">Get the monthly synthesis of global optometry research delivered to your inbox.</p>
                </div>
                
                <Form {...subscribeForm}>
                  <form onSubmit={subscribeForm.handleSubmit(onSubscribe)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={subscribeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={subscribeForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="jane@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={subscribeForm.control}
                        name="audienceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I am a...</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="clinician">Clinician</SelectItem>
                                <SelectItem value="researcher">Researcher</SelectItem>
                                <SelectItem value="academic">Academic</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={subscribeForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. United Kingdom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={subscribeForm.control}
                      name="interests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Interests (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Myopia control, Glaucoma" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full mt-4" disabled={createSubscriber.isPending}>
                      {createSubscriber.isPending ? "Subscribing..." : "Subscribe to OptMails"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Articles Section */}
        <section id="articles" className="py-20 bg-secondary/30 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="text-4xl font-serif mb-4">Featured Research</h2>
                <p className="text-muted-foreground max-w-2xl text-lg">
                  Curated highlights from international journals and clinical studies, selected by our editorial team.
                </p>
              </div>
              <Button variant="ghost" className="shrink-0 gap-2" asChild data-testid="link-view-archive">
                <a href="#archive">View Archive <ArrowRight className="w-4 h-4" /></a>
              </Button>
            </div>

            {isLoadingArticles ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-full">
                    <CardHeader>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Card key={article.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="font-medium">{article.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {article.readMinutes} min read
                        </span>
                      </div>
                      <CardTitle className="font-serif text-xl leading-snug">{article.title}</CardTitle>
                      <CardDescription className="text-primary mt-2 font-medium">
                        {article.authors}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {article.summary}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-border/50">
                      <Button variant="ghost" className="w-full justify-between" asChild>
                        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Read Full Article <ArrowRight className="w-4 h-4" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-background rounded-xl border border-border">
                <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No articles featured yet</h3>
                <p className="text-muted-foreground">Check back soon for the latest research highlights.</p>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Community Events Section */}
        <section id="events" className="py-20 border-y border-border bg-card">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-px bg-primary"></span>
                  <span className="text-primary font-medium tracking-wide uppercase text-sm">Community</span>
                </div>
                <h2 className="text-4xl font-serif mb-4">Upcoming Events</h2>
                <p className="text-muted-foreground max-w-2xl text-lg">
                  Workshops, roundtables, and open labs hosted with our international optometry community.
                </p>
              </div>
            </div>

            {isLoadingEvents ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-full">
                    <CardHeader>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events && events.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const date = formatEventDate(event.eventDate);
                  return (
                    <Card key={event.id} data-testid={`card-event-${event.id}`} className="flex flex-col h-full hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg w-16 h-16 shrink-0">
                            <span className="text-xs font-medium tracking-wide">{date.month}</span>
                            <span className="text-2xl font-serif leading-none">{date.day}</span>
                          </div>
                          <div className="min-w-0">
                            <Badge variant="secondary" className="mb-2 font-medium">{event.format}</Badge>
                            <CardTitle className="font-serif text-xl leading-snug">{event.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3">
                        <p className="text-muted-foreground text-sm line-clamp-3">{event.description}</p>
                        <div className="space-y-1.5 text-sm text-muted-foreground pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{date.month} {date.day}, {date.year} · {date.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Hosted by {event.host}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 border-t border-border/50 flex-col gap-1">
                        <EventRsvpDialog event={event} />
                        {event.registrationUrl ? (
                          <Button variant="link" className="w-full justify-center text-xs" asChild>
                            <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-register-${event.id}`}>
                              External details
                            </a>
                          </Button>
                        ) : null}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-background rounded-xl border border-border">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming events scheduled</h3>
                <p className="text-muted-foreground">Check back soon for community workshops and roundtables.</p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Archive Section */}
        <section id="archive" className="py-20 bg-secondary/30 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-primary"></span>
                <span className="text-primary font-medium tracking-wide uppercase text-sm">Archive</span>
              </div>
              <h2 className="text-4xl font-serif mb-4">Past Newsletters</h2>
              <p className="text-muted-foreground max-w-2xl text-lg">
                Browse previous monthly issues and revisit research featured in earlier editions.
              </p>
            </div>

            {isLoadingArchive ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : archivedIssues && archivedIssues.length > 0 ? (
              <div className="space-y-4">
                {archivedIssues.map((issue) => (
                  <Card key={`${issue.id}-${issue.month}`} data-testid={`card-issue-${issue.month.replace(/\s+/g, "-")}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Library className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-medium">{issue.month}</Badge>
                              <Badge variant="secondary" className="font-medium">{issue.status}</Badge>
                            </div>
                            <CardTitle className="font-serif text-xl">{issue.title}</CardTitle>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2 md:shrink-0">
                          <BookOpen className="w-4 h-4" />
                          {issue.articles?.length || 0} featured articles
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm mb-4">{issue.editorNote}</p>
                      {issue.articles && issue.articles.length > 0 ? (
                        <ul className="divide-y divide-border/60 border-t border-border/60">
                          {issue.articles.map((article) => (
                            <li key={article.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="min-w-0">
                                <a
                                  href={article.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary transition-colors line-clamp-1"
                                  data-testid={`link-archive-article-${article.id}`}
                                >
                                  {article.title}
                                </a>
                                <p className="text-xs text-muted-foreground mt-0.5">{article.authors}</p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                <Badge variant="outline">{article.category}</Badge>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {article.readMinutes} min
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-background rounded-xl border border-border">
                <Library className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Archive is being curated</h3>
                <p className="text-muted-foreground">Past issues will appear here as they are published.</p>
              </div>
            )}
          </div>
        </section>

        {/* Submit Research Section */}
        <section id="submit" className="py-24 bg-card">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-serif mb-4">Contribute to OptMails</h2>
              <p className="text-muted-foreground text-lg">
                Have an interesting case study, a recent publication, or clinical insight? Submit it for consideration in our next editorial issue.
              </p>
            </div>

            <Card className="border-border shadow-lg">
              <CardHeader className="bg-secondary/20 border-b border-border pb-8">
                <CardTitle className="text-2xl">Submission Portal</CardTitle>
                <CardDescription>
                  Your submission will be reviewed by our editorial board. We typically respond within 14 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <Form {...submissionForm}>
                  <form onSubmit={submissionForm.handleSubmit(onSubmitResearch)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={submissionForm.control}
                        name="submitterName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Dr. Sarah Chen" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submissionForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="sarah.chen@university.edu" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submissionForm.control}
                        name="institution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution / Clinic</FormLabel>
                            <FormControl>
                              <Input placeholder="University of Optometry" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submissionForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Australia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={submissionForm.control}
                      name="contributionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contribution Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type of contribution" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="original_research">Original Research</SelectItem>
                              <SelectItem value="case_study">Case Study</SelectItem>
                              <SelectItem value="clinical_review">Clinical Review</SelectItem>
                              <SelectItem value="opinion">Opinion / Editorial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={submissionForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title of Submission</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter the title of your work" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={submissionForm.control}
                      name="abstract"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abstract / Summary</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide a brief summary of your findings or insights..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={submissionForm.control}
                      name="link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link to Full Text (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://doi.org/..." {...field} />
                          </FormControl>
                          <FormDescription>
                            If published elsewhere, provide the DOI or direct link.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="w-full gap-2" disabled={createSubmission.isPending}>
                      {createSubmission.isPending ? "Submitting..." : (
                        <>Submit for Review <Send className="w-4 h-4" /></>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
                <Globe2 className="w-5 h-5" />
              </div>
              <span className="font-serif font-semibold text-xl tracking-tight">OptMails</span>
            </div>
            <div className="text-sm text-background/60">
              © {new Date().getFullYear()} OptMails Global Research. All rights reserved.
            </div>
            <div className="flex gap-4">
              <Link href="/portal" className="text-sm text-background/60 hover:text-background transition-colors">Editorial Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
