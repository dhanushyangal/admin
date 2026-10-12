"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAdminSupportTickets,
  updateAdminSupportTicket,
  deleteAdminSupportTicket,
  type AdminSupportTicket,
  type AdminSupportStats,
  type SupportStatus,
} from "@/lib/support-api";

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function StatusBadge({ status }: { status: SupportStatus }) {
  if (status === "open") {
    return (
      <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        Open
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400">
        In Progress
      </Badge>
    );
  }
  if (status === "resolved") {
    return (
      <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        Resolved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-neutral-500/40 bg-neutral-500/10 text-neutral-500">
      Closed
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "issue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-3 w-3" />
        Issue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
      <Lightbulb className="h-3 w-3" />
      Feedback
    </span>
  );
}

export default function AdminSupportPage() {
  const { getToken } = useAuth();
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [stats, setStats] = useState<AdminSupportStats>({
    total: 0,
    issuesCount: 0,
    feedbackCount: 0,
    openCount: 0,
    resolvedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);
  const [deleteConfirmTicket, setDeleteConfirmTicket] = useState<AdminSupportTicket | null>(null);

  const tokenGetter = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminSupportTickets(
        {
          type: typeFilter,
          status: statusFilter,
          search: searchQuery,
        },
        tokenGetter
      );
      setTickets(res.items);
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery, tokenGetter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenDetail = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setEditingNotes(ticket.admin_notes || "");
  };

  const handleStatusChange = async (ticketId: string, newStatus: SupportStatus) => {
    try {
      setUpdating(true);
      const res = await updateAdminSupportTicket(ticketId, { status: newStatus }, tokenGetter);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.ticket : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(res.ticket);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) {
      return;
    }
    try {
      setUpdating(true);
      const res = await updateAdminSupportTicket(
        selectedTicket.id,
        { admin_notes: editingNotes },
        tokenGetter
      );
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? res.ticket : t)));
      setSelectedTicket(res.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteAdminSupportTicket(ticketId, tokenGetter);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setDeleteConfirmTicket(null);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete ticket");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">User Inquiries</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Support & Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review bug reports, user feedback, and help inquiries submitted from the application.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Metrics overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open / Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {stats.openCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issue Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {stats.issuesCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Feedback Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-purple-600 dark:text-purple-400">
              {stats.feedbackCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, request type, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2.5">
          <Select
            className="w-36"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="issue">Issues only</option>
            <option value="feedback">Feedback only</option>
          </Select>
          <Select
            className="w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[150px]">Category</TableHead>
              <TableHead className="w-[200px]">User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[60px] text-center">Att.</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[90px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted-foreground mb-2" />
                  Loading tickets...
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  No support tickets found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => handleOpenDetail(ticket)}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(ticket.created_at)}
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={ticket.type} />
                  </TableCell>
                  <TableCell className="text-xs font-medium truncate max-w-[150px]">
                    {ticket.request_type || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[200px]">
                      <p className="text-xs font-medium text-foreground truncate">
                        {ticket.user_name || ticket.user_email || "Anonymous User"}
                      </p>
                      {ticket.user_email && ticket.user_name ? (
                        <p className="text-[11px] text-muted-foreground truncate">{ticket.user_email}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-foreground/80 line-clamp-1 max-w-[320px]">
                      {ticket.message}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    {ticket.attachment_url ? (
                      <span title="Has attachment" className="inline-flex text-muted-foreground hover:text-foreground">
                        <Paperclip className="h-3.5 w-3.5 inline" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleOpenDetail(ticket)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmTicket(ticket)}
                        title="Delete ticket"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={Boolean(selectedTicket)} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={selectedTicket.type} />
                  <span className="text-xs text-muted-foreground">ID: {selectedTicket.id}</span>
                </div>
                <DialogTitle className="text-xl">
                  {selectedTicket.request_type || (selectedTicket.type === "issue" ? "Issue Report" : "User Feedback")}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {formatTimestamp(selectedTicket.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* User info card */}
                <div className="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Sender Information:</span>
                    {selectedTicket.user_email ? (
                      <a
                        href={`mailto:${selectedTicket.user_email}?subject=Regarding your Hydrilla ${selectedTicket.type === "issue" ? "issue report" : "feedback"}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        Reply via Email
                      </a>
                    ) : null}
                  </div>
                  <p><span className="text-muted-foreground">Name:</span> {selectedTicket.user_name || "Not provided"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedTicket.user_email || "Not provided"}</p>
                  {selectedTicket.user_id ? (
                    <p><span className="text-muted-foreground">User ID:</span> {selectedTicket.user_id}</p>
                  ) : null}
                  {selectedTicket.page_url ? (
                    <p className="truncate">
                      <span className="text-muted-foreground">Page URL:</span>{" "}
                      <a
                        href={selectedTicket.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {selectedTicket.page_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  ) : null}
                </div>

                {/* Message */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    User Message
                  </h4>
                  <div className="rounded-lg border bg-background p-3.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Attachment */}
                {selectedTicket.attachment_url ? (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Attachment
                    </h4>
                    <div className="rounded-lg border p-3 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium truncate max-w-sm">
                          {selectedTicket.attachment_name || "Attached file"}
                        </span>
                        <a
                          href={selectedTicket.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Open in new tab <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="max-h-72 overflow-hidden rounded border bg-black/5 flex items-center justify-center">
                        <img
                          src={selectedTicket.attachment_url}
                          alt="Attachment preview"
                          className="max-h-72 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Status Management */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Ticket Status
                    </label>
                    <Select
                      value={selectedTicket.status}
                      disabled={updating}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as SupportStatus)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                </div>

                {/* Admin Internal Notes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Admin Internal Notes
                  </label>
                  <Textarea
                    placeholder="Add notes for your team (e.g. Investigation findings, customer contacted)..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => void handleSaveNotes()}
                      disabled={updating}
                    >
                      {updating ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteConfirmTicket)} onOpenChange={(open) => !open && setDeleteConfirmTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Support Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmTicket(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmTicket && void handleDeleteTicket(deleteConfirmTicket.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
