import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  CalendarPlus,
  CheckCircle2, 
  Clock,
  Download,
  Pencil,
  Plus,
  Trash2,
  Globe2, 
  Inbox, 
  LayoutDashboard, 
  Mail,
  MapPin,
  Send, 
  Users, 
  XCircle,
  Search
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useGetDashboard,
  useListSubmissions,
  useListSubscribers,
  useListNotifications,
  useListEvents,
  useListEventRsvps,
  useListTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useUpdateSubmission,
  useCreateNotificationPreview,
  useCreateEvent,
  getGetDashboardQueryKey,
  getListSubmissionsQueryKey,
  getListSubscribersQueryKey,
  getListNotificationsQueryKey,
  getListEventsQueryKey,
  getListEventRsvpsQueryKey,
  getListTeamMembersQueryKey,
} from "@workspace/api-client-react";
import type { TeamMember } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { InputGroup } from "@/components/ui/input-group";

const notificationSchema = z.object({
  subject: z.string().min(5, "Subject is required"),
  body: z.string().min(10, "Message body is required"),
});

const reviewSchema = z.object({
  status: z.string(),
  reviewerNote: z.string().optional(),
});

const eventSchema = z.object({
  title: z.string().min(5, "Title is required"),
  description: z.string().min(10, "Description is required"),
  eventDate: z.string().min(1, "Event date is required"),
  endDate: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  format: z.string().min(1, "Please select a format"),
  registrationUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  host: z.string().min(2, "Host is required"),
});

function AttendeesDialog({ event }: { event: { id: number; title: string } }) {
  const [open, setOpen] = useState(false);
  const { data: rsvps, isLoading } = useListEventRsvps(event.id, {
    query: { queryKey: getListEventRsvpsQueryKey(event.id), enabled: open },
  });

  const exportCsv = () => {
    if (!rsvps || rsvps.length === 0) return;
    const header = ["Name", "Email", "Role", "Registered"];
    const rows = rsvps.map((r) => [
      r.name,
      r.email,
      r.role || "",
      new Date(r.createdAt).toISOString(),
    ]);
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(String(cell))).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optmails-event-${event.id}-attendees.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-attendees-${event.id}`}>
          <Users className="mr-2 w-4 h-4" /> Attendees
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Attendees · {event.title}</DialogTitle>
          <DialogDescription>
            {rsvps ? `${rsvps.length} ${rsvps.length === 1 ? "person has" : "people have"} RSVPed.` : "Loading RSVPs..."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Skeleton className="h-6 w-32 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rsvps && rsvps.length > 0 ? (
                rsvps.map((rsvp) => (
                  <TableRow key={rsvp.id} data-testid={`attendee-row-${rsvp.id}`}>
                    <TableCell className="font-medium">{rsvp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{rsvp.email}</TableCell>
                    <TableCell>
                      {rsvp.role ? <Badge variant="secondary">{rsvp.role}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(rsvp.createdAt), "MMM d, yyyy · h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No RSVPs yet for this event.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={exportCsv} disabled={!rsvps || rsvps.length === 0} data-testid={`button-export-attendees-${event.id}`}>
            <Download className="mr-2 w-4 h-4" /> Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TEAM_CATEGORIES: { value: string; label: string; description: string }[] = [
  { value: "editor_in_chief", label: "Editor-in-Chief", description: "Editorial leadership" },
  { value: "webmaster", label: "Webmaster", description: "Platform and site maintenance" },
  { value: "contributing_editor", label: "Contributing Editor", description: "Subspecialty editorial leads" },
  { value: "sponsor", label: "Sponsor / Partner", description: "Organizations supporting OptMails" },
];

const teamMemberSchema = z.object({
  category: z.string().min(1, "Category required"),
  name: z.string().min(2, "Name is required"),
  role: z.string().min(2, "Role or title is required"),
  location: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

function TeamMemberFormDialog({
  trigger,
  initial,
  onSubmit,
  isSubmitting,
  title,
}: {
  trigger: React.ReactNode;
  initial?: Partial<z.infer<typeof teamMemberSchema>> & { category?: string };
  onSubmit: (values: z.infer<typeof teamMemberSchema>, close: () => void) => void;
  isSubmitting: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      category: initial?.category ?? "contributing_editor",
      name: initial?.name ?? "",
      role: initial?.role ?? "",
      location: initial?.location ?? "",
      bio: initial?.bio ?? "",
      email: initial?.email ?? "",
      linkedin: initial?.linkedin ?? "",
      websiteUrl: initial?.websiteUrl ?? "",
      sortOrder: initial?.sortOrder ?? 0,
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) form.reset({
      category: initial?.category ?? "contributing_editor",
      name: initial?.name ?? "",
      role: initial?.role ?? "",
      location: initial?.location ?? "",
      bio: initial?.bio ?? "",
      email: initial?.email ?? "",
      linkedin: initial?.linkedin ?? "",
      websiteUrl: initial?.websiteUrl ?? "",
      sortOrder: initial?.sortOrder ?? 0,
    }); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Updates show on the public Team page immediately after saving.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v, () => setOpen(false)))} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-team-category"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEAM_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Dr. Jane Doe, OD" {...field} data-testid="input-team-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role / Title</FormLabel>
                <FormControl><Input placeholder="Contributing Editor · Pediatric Optometry" {...field} data-testid="input-team-role" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input placeholder="City, Country" {...field} data-testid="input-team-location" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio / Description</FormLabel>
                <FormControl><Textarea className="min-h-[110px]" placeholder="Short biography or sponsor description" {...field} data-testid="input-team-bio" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl><Input type="email" placeholder="name@optmails.com" {...field} data-testid="input-team-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="linkedin" render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL (optional)</FormLabel>
                  <FormControl><Input placeholder="https://linkedin.com/in/..." {...field} data-testid="input-team-linkedin" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL (optional, sponsors)</FormLabel>
                  <FormControl><Input placeholder="https://" {...field} data-testid="input-team-website" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sortOrder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} data-testid="input-team-sort" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-save-team-member">
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TeamTab() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListTeamMembers({
    query: { queryKey: getListTeamMembersQueryKey() },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey() });

  const createTeamMember = useCreateTeamMember({ mutation: { onSuccess: invalidate } });
  const updateTeamMember = useUpdateTeamMember({ mutation: { onSuccess: invalidate } });
  const deleteTeamMember = useDeleteTeamMember({ mutation: { onSuccess: invalidate } });

  const handleDelete = (member: TeamMember) => {
    if (confirm(`Remove ${member.name} from the team page?`)) {
      deleteTeamMember.mutate({ id: member.id });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif mb-2">Team & Sponsors</h1>
          <p className="text-muted-foreground">Manage who appears on the public Meet Our Team page.</p>
        </div>
        <TeamMemberFormDialog
          title="Add Team Member or Sponsor"
          isSubmitting={createTeamMember.isPending}
          onSubmit={(values, close) =>
            createTeamMember.mutate(
              { data: values },
              { onSuccess: () => { invalidate(); close(); } }
            )
          }
          trigger={
            <Button data-testid="button-add-team-member">
              <Plus className="mr-2 w-4 h-4" /> Add Member
            </Button>
          }
        />
      </div>

      {TEAM_CATEGORIES.map((category) => {
        const categoryMembers = (members ?? []).filter((m) => m.category === category.value);
        return (
          <Card key={category.value}>
            <CardHeader>
              <CardTitle>{category.label}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : categoryMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No one in this group yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {categoryMembers.map((member) => (
                    <div key={member.id} className="py-4 flex flex-col md:flex-row md:items-start gap-4 first:pt-0 last:pb-0" data-testid={`team-row-${member.id}`}>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{member.name}</h3>
                          {member.location && (
                            <Badge variant="outline" className="font-normal">{member.location}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-primary">{member.role}</p>
                        {member.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{member.bio}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          {member.email && <span>{member.email}</span>}
                          {member.linkedin && <span className="truncate">LinkedIn</span>}
                          {member.websiteUrl && <span className="truncate">Website</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <TeamMemberFormDialog
                          title={`Edit ${member.name}`}
                          initial={member}
                          isSubmitting={updateTeamMember.isPending}
                          onSubmit={(values, close) =>
                            updateTeamMember.mutate(
                              { id: member.id, data: values },
                              { onSuccess: () => { invalidate(); close(); } }
                            )
                          }
                          trigger={
                            <Button variant="outline" size="sm" data-testid={`button-edit-team-${member.id}`}>
                              <Pencil className="mr-2 w-3.5 h-3.5" /> Edit
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(member)}
                          disabled={deleteTeamMember.isPending}
                          data-testid={`button-delete-team-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function Portal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // Queries
  const { data: dashboard, isLoading: isLoadingDashboard } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });
  
  const { data: submissions, isLoading: isLoadingSubmissions } = useListSubmissions({
    query: { queryKey: getListSubmissionsQueryKey() }
  });

  const { data: subscribers, isLoading: isLoadingSubscribers } = useListSubscribers({
    query: { queryKey: getListSubscribersQueryKey() }
  });

  const { data: notifications, isLoading: isLoadingNotifications } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() }
  });

  const { data: events, isLoading: isLoadingEvents } = useListEvents({
    query: { queryKey: getListEventsQueryKey() }
  });

  // Mutations
  const updateSubmission = useUpdateSubmission();
  const createNotification = useCreateNotificationPreview();
  const createEvent = useCreateEvent();

  // Forms
  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      status: "",
      reviewerNote: "",
    },
  });

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      endDate: "",
      location: "",
      format: "Virtual",
      registrationUrl: "",
      host: "OptMails Editorial Team",
    },
  });

  const onCreateEvent = (values: z.infer<typeof eventSchema>) => {
    const data = {
      ...values,
      eventDate: new Date(values.eventDate).toISOString(),
      endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
      registrationUrl: values.registrationUrl || undefined,
    };
    createEvent.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Event announced",
          description: "The community event is now live on the public site.",
        });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        eventForm.reset();
        setIsEventDialogOpen(false);
      },
      onError: () => {
        toast({
          title: "Could not announce event",
          description: "Please review the details and try again.",
          variant: "destructive",
        });
      }
    });
  };

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      subject: "",
      body: "",
    },
  });

  const onReviewSubmit = (values: z.infer<typeof reviewSchema>) => {
    if (!selectedSubmissionId) return;
    
    updateSubmission.mutate({ 
      id: selectedSubmissionId, 
      data: values 
    }, {
      onSuccess: () => {
        toast({ title: "Review saved", description: "The submission status has been updated." });
        setIsReviewDialogOpen(false);
        reviewForm.reset();
        // Optimistic update could go here, for now invalidate
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
      onError: () => {
        toast({ title: "Update failed", description: "Could not save review.", variant: "destructive" });
      }
    });
  };

  const onNotificationSubmit = (values: z.infer<typeof notificationSchema>) => {
    createNotification.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Notification queued", description: "The preview has been generated." });
        setIsNotificationDialogOpen(false);
        notificationForm.reset();
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
      onError: () => {
        toast({ title: "Action failed", description: "Could not create notification.", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      case 'accepted': return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1"/> Accepted</Badge>;
      case 'rejected': return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>;
      case 'sent': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100"><CheckCircle2 className="w-3 h-3 mr-1"/> Sent</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-sidebar shrink-0 md:sticky md:top-0 md:h-[100dvh] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-sidebar-foreground">
            <div className="w-8 h-8 bg-sidebar-primary rounded-md flex items-center justify-center text-sidebar-primary-foreground">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">OptMails</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Button 
            variant={activeTab === "dashboard" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard className="mr-2 w-4 h-4" /> Dashboard
          </Button>
          <Button 
            variant={activeTab === "submissions" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("submissions")}
          >
            <Inbox className="mr-2 w-4 h-4" /> Submissions
          </Button>
          <Button 
            variant={activeTab === "subscribers" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("subscribers")}
          >
            <Users className="mr-2 w-4 h-4" /> Subscribers
          </Button>
          <Button 
            variant={activeTab === "notifications" ? "secondary" : "ghost"} 
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("notifications")}
          >
            <Mail className="mr-2 w-4 h-4" /> Notifications
          </Button>
          <Button
            variant={activeTab === "events" ? "secondary" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("events")}
            data-testid="tab-events"
          >
            <CalendarPlus className="mr-2 w-4 h-4" /> Events
          </Button>
          <Button
            variant={activeTab === "team" ? "secondary" : "ghost"}
            className="w-full justify-start font-medium"
            onClick={() => setActiveTab("team")}
            data-testid="tab-team"
          >
            <Users className="mr-2 w-4 h-4" /> Team
          </Button>
        </nav>
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
              ED
            </div>
            <div className="text-sm">
              <p className="font-medium">Editorial Board</p>
              <p className="text-muted-foreground text-xs">admin@optmails.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-card min-h-[100dvh]">
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
          
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h1 className="text-3xl font-serif mb-2">Editorial Dashboard</h1>
                <p className="text-muted-foreground">Overview of portal activity and content pipeline.</p>
              </div>

              {isLoadingDashboard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
              ) : dashboard ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-serif font-medium">{dashboard.subscriberCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Subscribers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-4">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-serif font-medium">{dashboard.submissionCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Submissions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-600 mb-4">
                          <Clock className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-serif font-medium">{dashboard.pendingReviewCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Pending Review</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-600 mb-4">
                          <Globe2 className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-serif font-medium">{dashboard.countriesReached}</p>
                        <p className="text-sm text-muted-foreground mt-1">Countries Reached</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>Latest research sent in for review.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title & Author</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboard.recentSubmissions?.slice(0, 5).map(sub => (
                              <TableRow key={sub.id}>
                                <TableCell>
                                  <p className="font-medium truncate max-w-[300px]">{sub.title}</p>
                                  <p className="text-xs text-muted-foreground">{sub.submitterName}</p>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {sub.contributionType.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {getStatusBadge(sub.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {(!dashboard.recentSubmissions || dashboard.recentSubmissions.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                  No recent submissions
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Pipeline Status</CardTitle>
                        <CardDescription>Current state of reviews</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {dashboard.statusBreakdown?.map(item => (
                            <div key={item.status} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  item.status === 'pending' ? 'bg-yellow-500' :
                                  item.status === 'accepted' ? 'bg-green-500' :
                                  'bg-red-500'
                                }`} />
                                <span className="capitalize">{item.status}</span>
                              </div>
                              <span className="font-medium">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">Failed to load dashboard data.</div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === "submissions" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-serif mb-2">Submissions</h1>
                  <p className="text-muted-foreground">Review and manage incoming research content.</p>
                </div>
                <div className="flex items-center gap-2">
                  <InputGroup>
                    <Search className="w-4 h-4 text-muted-foreground ml-3" />
                    <Input placeholder="Search submissions..." className="pl-10 w-full sm:w-[250px]" />
                  </InputGroup>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Submission</TableHead>
                        <TableHead>Submitter</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingSubmissions ? (
                        Array.from({length: 5}).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-3/4 mb-2"/><Skeleton className="h-3 w-1/2"/></TableCell>
                            <TableCell><Skeleton className="h-4 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                            <TableCell><Skeleton className="h-6 w-20 rounded-full"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto"/></TableCell>
                          </TableRow>
                        ))
                      ) : submissions && submissions.length > 0 ? (
                        submissions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <p className="font-medium truncate max-w-[280px]">{sub.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{sub.contributionType.replace('_', ' ')}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{sub.submitterName}</p>
                              <p className="text-xs text-muted-foreground">{sub.institution || sub.country}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(sub.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog open={isReviewDialogOpen && selectedSubmissionId === sub.id} onOpenChange={(open) => {
                                setIsReviewDialogOpen(open);
                                if (open) {
                                  setSelectedSubmissionId(sub.id);
                                  reviewForm.reset({
                                    status: sub.status,
                                    reviewerNote: sub.reviewerNote || ""
                                  });
                                } else {
                                  setSelectedSubmissionId(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">Review</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                  <DialogHeader>
                                    <DialogTitle>Review Submission</DialogTitle>
                                    <DialogDescription>
                                      Update the status and add editorial notes.
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="my-4 space-y-4">
                                    <div className="p-4 bg-muted rounded-md space-y-2">
                                      <p className="font-medium">{sub.title}</p>
                                      <p className="text-sm text-muted-foreground line-clamp-3">{sub.abstract}</p>
                                      {sub.link && (
                                        <a href={sub.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                          View Full Resource
                                        </a>
                                      )}
                                    </div>

                                    <Form {...reviewForm}>
                                      <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4" id={`review-form-${sub.id}`}>
                                        <FormField
                                          control={reviewForm.control}
                                          name="status"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Status</FormLabel>
                                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select decision" />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  <SelectItem value="pending">Pending</SelectItem>
                                                  <SelectItem value="accepted">Accepted</SelectItem>
                                                  <SelectItem value="rejected">Rejected</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={reviewForm.control}
                                          name="reviewerNote"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Editorial Note (Optional)</FormLabel>
                                              <FormControl>
                                                <Textarea 
                                                  placeholder="Notes for the author or internal team..."
                                                  className="resize-none"
                                                  {...field}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </form>
                                    </Form>
                                  </div>

                                  <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" form={`review-form-${sub.id}`} disabled={updateSubmission.isPending}>
                                      {updateSubmission.isPending ? "Saving..." : "Save Review"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            No submissions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscribers Tab */}
          {activeTab === "subscribers" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-3xl font-serif mb-2">Subscribers</h1>
                <p className="text-muted-foreground">Manage your newsletter audience.</p>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name & Email</TableHead>
                        <TableHead>Audience Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingSubscribers ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center"><Skeleton className="h-6 w-32 mx-auto"/></TableCell></TableRow>
                      ) : subscribers && subscribers.length > 0 ? (
                        subscribers.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <p className="font-medium">{sub.name}</p>
                              <p className="text-sm text-muted-foreground">{sub.email}</p>
                            </TableCell>
                            <TableCell className="capitalize">{sub.audienceType}</TableCell>
                            <TableCell>{sub.country}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {format(new Date(sub.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                            No subscribers yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-serif mb-2">Notifications</h1>
                  <p className="text-muted-foreground">Queue and track newsletter broadcasts.</p>
                </div>
                
                <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Send className="w-4 h-4"/> New Broadcast</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Create Broadcast</DialogTitle>
                      <DialogDescription>
                        Draft a new email notification to send to all subscribers.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4 my-4" id="notification-form">
                        <FormField
                          control={notificationForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject Line</FormLabel>
                              <FormControl>
                                <Input placeholder="OptMails: Monthly Research Highlight" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationForm.control}
                          name="body"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message Body</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Write the email content here..."
                                  className="min-h-[200px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" form="notification-form" disabled={createNotification.isPending}>
                        {createNotification.isPending ? "Queuing..." : "Queue Broadcast"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingNotifications ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center"><Skeleton className="h-6 w-32 mx-auto"/></TableCell></TableRow>
                      ) : notifications && notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <TableRow key={notif.id}>
                            <TableCell>
                              <p className="font-medium">{notif.subject}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">{notif.body}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(notif.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{notif.audienceCount} recipients</TableCell>
                            <TableCell className="text-right">
                              {getStatusBadge(notif.status)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                            No notifications sent yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-serif mb-2">Community Events</h1>
                  <p className="text-muted-foreground">Announce upcoming workshops, roundtables, and lab sessions for the community.</p>
                </div>
                <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-announce-event">
                      <CalendarPlus className="mr-2 w-4 h-4" /> Announce Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Announce a Community Event</DialogTitle>
                      <DialogDescription>
                        Published events appear immediately on the public OptMails homepage.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...eventForm}>
                      <form onSubmit={eventForm.handleSubmit(onCreateEvent)} className="space-y-4">
                        <FormField control={eventForm.control} name="title" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Title</FormLabel>
                            <FormControl><Input placeholder="Global Optometry Research Roundtable" {...field} data-testid="input-event-title" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={eventForm.control} name="description" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea className="min-h-[100px]" placeholder="What will attendees experience?" {...field} data-testid="input-event-description" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField control={eventForm.control} name="eventDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start (Date & Time)</FormLabel>
                              <FormControl><Input type="datetime-local" {...field} data-testid="input-event-date" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={eventForm.control} name="endDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>End (Optional)</FormLabel>
                              <FormControl><Input type="datetime-local" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={eventForm.control} name="format" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Format</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Virtual">Virtual</SelectItem>
                                  <SelectItem value="In-person">In-person</SelectItem>
                                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={eventForm.control} name="location" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl><Input placeholder="Online (Zoom) or city" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={eventForm.control} name="host" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Host</FormLabel>
                              <FormControl><Input placeholder="OptMails Editorial Team" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={eventForm.control} name="registrationUrl" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration URL (Optional)</FormLabel>
                              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                          <Button type="submit" disabled={createEvent.isPending} data-testid="button-submit-event">
                            {createEvent.isPending ? "Publishing..." : "Publish Event"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Visible to subscribers and visitors on the homepage.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingEvents ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  ) : events && events.length > 0 ? (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-lg border border-border" data-testid={`portal-event-${event.id}`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">{event.format}</Badge>
                              <span className="text-xs text-muted-foreground">Hosted by {event.host}</span>
                            </div>
                            <h3 className="font-medium truncate">{event.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                          </div>
                          <div className="flex flex-col md:items-end gap-2 shrink-0">
                            <div className="text-sm text-muted-foreground space-y-1 md:text-right">
                              <div className="flex items-center gap-2 md:justify-end">
                                <Clock className="w-3.5 h-3.5" />
                                {format(new Date(event.eventDate), "MMM d, yyyy · h:mm a")}
                              </div>
                              <div className="flex items-center gap-2 md:justify-end">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.location}
                              </div>
                            </div>
                            <AttendeesDialog event={event} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarPlus className="w-10 h-10 mx-auto mb-3" />
                      <p>No upcoming events. Use Announce Event to publish your first one.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "team" && (
            <TeamTab />
          )}

        </div>
      </main>
    </div>
  );
}
