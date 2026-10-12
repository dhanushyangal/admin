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

export type CreditClaimLink = {
  id: string;
  token: string;
  amount: number;
  reason: string | null;
  expires_at: string | null;
  max_claims: number;
  claims_used: number;
  status: "active" | "disabled";
  allowed_email: string | null;
  created_by_admin_id: string | null;
  created_by_admin_email: string | null;
  created_at: string;
  updated_at: string;
  claimUrl: string;
};

export async function fetchCreditClaimLinks(
  status: "all" | "active" | "disabled" = "all",
  getToken: () => Promise<string | null>
): Promise<CreditClaimLink[]> {
  const query = status === "all" ? "" : `?status=${status}`;
  const res = await fetch(`${backendBase()}/api/admin/credit-claims${query}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to fetch claim links");
  }
  return (body as { links: CreditClaimLink[] }).links || [];
}

export async function createCreditClaimLink(
  params: {
    amount: number;
    reason?: string;
    expiresAt?: string | null;
    maxClaims?: number;
    allowedEmail?: string | null;
  },
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; link: CreditClaimLink; claimUrl: string }> {
  const res = await fetch(`${backendBase()}/api/admin/credit-claims`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to create claim link");
  }
  return body as { success: boolean; link: CreditClaimLink; claimUrl: string };
}

export async function updateCreditClaimLink(
  id: string,
  params: {
    status?: "active" | "disabled";
    expiresAt?: string | null;
    maxClaims?: number;
  },
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; link: CreditClaimLink }> {
  const res = await fetch(`${backendBase()}/api/admin/credit-claims/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Failed to update claim link");
  }
  return body as { success: boolean; link: CreditClaimLink };
}
