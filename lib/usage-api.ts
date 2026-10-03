import { adminRequest, type TokenGetter } from "./admin-request";

export type UsageRange = "1d" | "7d" | "30d" | "90d" | "all";
export type UsageSource = "all" | "web" | "api";
export type UsageType = "all" | "3d" | "image";

export type UserUsage = {
  userId: string;
  email: string | null;
  name: string | null;
  generations: number;
  failed: number;
  generations3d: number;
  failed3d: number;
  credits3d: number;
  generationsImage: number;
  failedImage: number;
  creditsImage: number;
  webCount: number;
  apiCount: number;
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
  category: "3d" | "image";
  source: "web" | "api" | "both";
  generations: number;
  failed: number;
  totalTokens: number;
  creditsCharged: number;
  costUsd: number;
};

export type RecentUsage = {
  id: string;
  userId: string;
  email: string | null;
  jobId: string | null;
  category: "3d" | "image";
  source: "web" | "api";
  operation: string;
  provider: string;
  model: string | null;
  quality: string | null;
  status: string;
  errorCode: string | null;
  creditsCharged: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number | null;
  createdAt: string;
};

export type UsageReport = {
  range: UsageRange;
  source: UsageSource;
  type: UsageType;
  since: string | null;
  totals: {
    costUsd: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    generations: number;
    failed: number;
    generations3d: number;
    failed3d: number;
    credits3d: number;
    generationsImage: number;
    failedImage: number;
    creditsImage: number;
    webCount: number;
    apiCount: number;
    creditsCharged: number;
    activeUsers: number;
  };
  users: UserUsage[];
  models: ModelUsage[];
  recent: RecentUsage[];
};

export function fetchUsage(
  range: UsageRange,
  source: UsageSource,
  type: UsageType,
  userId: string | null,
  getToken: TokenGetter
): Promise<UsageReport> {
  const params = new URLSearchParams({ range, source, type });
  if (userId) {
    params.set("userId", userId);
  }
  return adminRequest<UsageReport>(`/api/admin/usage?${params}`, { method: "GET" }, getToken, "Failed to load usage");
}
