function backendBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/+$/, "");
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
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
  /** Present only for Slot and Slot Pro. Null hour means they have not chosen one yet. */
  slot: AdminSlot | null;
};

export type AdminSlot = {
  plan: string | null;
  timezone: string | null;
  startHour: number | null;
  durationHours: number;
  label: string | null;
  open: boolean;
  changedOn: string | null;
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

export async function fetchAdminUsers(
  filter: "all" | "paying",
  getToken: () => Promise<string | null>
): Promise<{ payingCount: number; users: AdminUserRow[] }> {
  const res = await fetch(`${backendBase()}/api/admin/users?filter=${filter}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Failed to load users");
  return body as { payingCount: number; users: AdminUserRow[] };
}

export async function fetchAdminUser(
  userId: string,
  getToken: () => Promise<string | null>
): Promise<{ user: AdminUserRow; subscriptions: AdminSubscription[]; payments: AdminPayment[] }> {
  const res = await fetch(`${backendBase()}/api/admin/users/${encodeURIComponent(userId)}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Failed to load user");
  return body as { user: AdminUserRow; subscriptions: AdminSubscription[]; payments: AdminPayment[] };
}
