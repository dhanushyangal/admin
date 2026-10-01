import { adminRequest, type TokenGetter } from "./admin-request";

export type UsageRange = "1d" | "7d" | "30d" | "90d" | "all";

export type UserUsage = {
  userId: string;
  email: string | null;
  name: string | null;
  generations: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  creditsCharged: number;
  lastUsedAt: string | null;
};

export type ModelUsage = {
  provider: string;
  model: string;
  generations: number;
  failed: number;
  totalTokens: number;
  costUsd: number;
};

export type RecentUsage = {
  id: string;
  userId: string;
  email: string | null;
  jobId: string | null;
  operation: string;
  provider: string;
  model: string | null;
  quality: string | null;
  status: string;
  errorCode: string | null;
  totalTokens: number;
  costUsd: number;
  createdAt: string;
};

export type UsageReport = {
  range: UsageRange;
  since: string | null;
  totals: {
    costUsd: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    generations: number;
    failed: number;
    creditsCharged: number;
    activeUsers: number;
  };
  users: UserUsage[];
  models: ModelUsage[];
  recent: RecentUsage[];
};

export function fetchUsage(range: UsageRange, userId: string | null, getToken: TokenGetter): Promise<UsageReport> {
  const params = new URLSearchParams({ range });
  if (userId) {
    params.set("userId", userId);
  }
  return adminRequest<UsageReport>(`/api/admin/usage?${params}`, { method: "GET" }, getToken, "Failed to load usage");
}
