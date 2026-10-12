function backendBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  paying: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  creditsUsed: number;
  creditsTotal: number;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  lastPaymentStatus: string | null;
  paymentCount: number;
};

export type AdminPayment = {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  plan: string | null;
  paymentId: string | null;
  subscriptionId: string | null;
};

export type AdminSubscription = {
  subscriptionId: string | null;
  plan: string | null;
  status: string;
  productId: string | null;
  periodEnd: string | null;
  cancelledAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

export type CreditLedgerEntry = {
  id: string;
  user_id: string;
  delta: number;
  balance_total_after: number;
  balance_used_after: number;
  source: "admin_grant" | "admin_remove" | "claim_link" | "system";
  reason: string | null;
  admin_user_id: string | null;
  admin_email: string | null;
  claim_link_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type UserJobUsage = {
  id: string;
  status: string;
  generateType: string;
  creditsUsed: number;
  createdAt: string;
  prompt: string | null;
  engine: string | null;
};

export async function fetchAdminUsers(
  filter: "all" | "paying",
  getToken: () => Promise<string | null>
): Promise<{ payingCount: number; users: AdminUserRow[] }> {
  const res = await fetch(`${backendBase()}/api/admin/users?filter=${filter}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to load users");
  }
  return body as { payingCount: number; users: AdminUserRow[] };
}

export async function fetchAdminUser(
  userId: string,
  getToken: () => Promise<string | null>
): Promise<{
  user: AdminUserRow;
  subscriptions: AdminSubscription[];
  payments: AdminPayment[];
  jobs?: UserJobUsage[];
  creditLedger?: CreditLedgerEntry[];
}> {
  const res = await fetch(`${backendBase()}/api/admin/users/${encodeURIComponent(userId)}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to load user");
  }
  return body as {
    user: AdminUserRow;
    subscriptions: AdminSubscription[];
    payments: AdminPayment[];
    jobs?: UserJobUsage[];
    creditLedger?: CreditLedgerEntry[];
  };
}

export async function adjustUserCredits(
  userId: string,
  params: {
    amount: number;
    reason?: string;
    action: "add" | "remove";
    sendEmail?: boolean;
  },
  getToken: () => Promise<string | null>
): Promise<{
  success: boolean;
  action: "add" | "remove";
  amount: number;
  remaining: number;
  total: number;
  used: number;
}> {
  const res = await fetch(`${backendBase()}/api/admin/users/${encodeURIComponent(userId)}/credits`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to adjust user credits");
  }
  return body;
}

export async function fetchUserCreditHistory(
  userId: string,
  getToken: () => Promise<string | null>
): Promise<CreditLedgerEntry[]> {
  const res = await fetch(`${backendBase()}/api/admin/users/${encodeURIComponent(userId)}/credits/history`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to load credit history");
  }
  return (body as { history: CreditLedgerEntry[] }).history || [];
}
