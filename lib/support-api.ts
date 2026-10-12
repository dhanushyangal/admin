import { adminRequest, TokenGetter } from "./admin-request";

export type SupportType = "issue" | "feedback";
export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";

export type AdminSupportTicket = {
  id: string;
  type: SupportType;
  request_type: string | null;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  page_url: string | null;
  metadata: Record<string, unknown> | null;
  status: SupportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSupportStats = {
  total: number;
  issuesCount: number;
  feedbackCount: number;
  openCount: number;
  resolvedCount: number;
};

export type ListSupportTicketsResponse = {
  ok: boolean;
  stats: AdminSupportStats;
  items: AdminSupportTicket[];
  total: number;
};

export async function fetchAdminSupportTickets(
  options: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
  getToken: TokenGetter
): Promise<ListSupportTicketsResponse> {
  const queryParams = new URLSearchParams();
  if (options.type && options.type !== "all") {
    queryParams.set("type", options.type);
  }
  if (options.status && options.status !== "all") {
    queryParams.set("status", options.status);
  }
  if (options.search && options.search.trim()) {
    queryParams.set("search", options.search.trim());
  }
  if (typeof options.limit === "number") {
    queryParams.set("limit", String(options.limit));
  }
  if (typeof options.offset === "number") {
    queryParams.set("offset", String(options.offset));
  }

  const queryString = queryParams.toString();
  const path = `/api/admin/support${queryString ? `?${queryString}` : ""}`;

  return adminRequest<ListSupportTicketsResponse>(
    path,
    { method: "GET" },
    getToken,
    "Failed to load support tickets"
  );
}

export async function fetchAdminSupportTicket(
  id: string,
  getToken: TokenGetter
): Promise<{ ok: boolean; ticket: AdminSupportTicket }> {
  return adminRequest<{ ok: boolean; ticket: AdminSupportTicket }>(
    `/api/admin/support/${encodeURIComponent(id)}`,
    { method: "GET" },
    getToken,
    "Failed to load support ticket details"
  );
}

export async function updateAdminSupportTicket(
  id: string,
  updates: { status?: SupportStatus; admin_notes?: string },
  getToken: TokenGetter
): Promise<{ ok: boolean; ticket: AdminSupportTicket }> {
  return adminRequest<{ ok: boolean; ticket: AdminSupportTicket }>(
    `/api/admin/support/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
    getToken,
    "Failed to update support ticket"
  );
}

export async function deleteAdminSupportTicket(
  id: string,
  getToken: TokenGetter
): Promise<{ ok: boolean }> {
  return adminRequest<{ ok: boolean }>(
    `/api/admin/support/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    getToken,
    "Failed to delete support ticket"
  );
}
