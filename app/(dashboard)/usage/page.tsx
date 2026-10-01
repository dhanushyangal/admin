"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchUsage, type UsageRange, type UsageReport, type UserUsage } from "@/lib/usage-api";

const RANGES: { value: UsageRange; label: string }[] = [
  { value: "1d", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function formatUsd(v: number): string {
  if (v === 0) {
    return "$0.00";
  }
  return v < 1 ? `$${v.toFixed(4)}` : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTokens(v: number): string {
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(2)}M`;
  }
  if (v >= 10_000) {
    return `${(v / 1_000).toFixed(1)}K`;
  }
  return v.toLocaleString();
}

function userLabel(u: { email: string | null; name?: string | null; userId: string }): string {
  return u.email ?? u.name ?? u.userId;
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const { getToken } = useAuth();
  const [range, setRange] = useState<UsageRange>("30d");
  const [selectedUser, setSelectedUser] = useState<UserUsage | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchUsage(range, selectedUser?.userId ?? null, token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [range, selectedUser, token]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  const totals = report?.totals;
  const requestCount = totals ? totals.generations + totals.failed : 0;
  const avgPerImage = totals && requestCount > 0 ? totals.costUsd / requestCount : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Image generation usage</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Provider tokens and USD cost (OpenAI / Gemini, including the prompt optimizer) per user.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-40"
            value={range}
            onChange={(e) => setRange(e.target.value as UsageRange)}
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total provider cost"
          value={totals ? formatUsd(totals.costUsd) : "—"}
          hint={totals ? `avg ${formatUsd(avgPerImage)} per request` : undefined}
        />
        <SummaryCard
          label="Images generated"
          value={totals ? totals.generations.toLocaleString() : "—"}
          hint={totals ? `${totals.failed.toLocaleString()} failed · ${totals.creditsCharged.toLocaleString()} credits` : undefined}
        />
        <SummaryCard
          label="Tokens"
          value={totals ? formatTokens(totals.totalTokens) : "—"}
          hint={totals ? `${formatTokens(totals.inputTokens)} in · ${formatTokens(totals.outputTokens)} out` : undefined}
        />
        <SummaryCard label="Active users" value={totals ? totals.activeUsers.toLocaleString() : "—"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Spend by user</CardTitle>
        </CardHeader>
        <CardContent>
          {report && report.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No image generations in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Images</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                  <TableHead className="text-right">Last used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.users ?? []).map((u) => (
                  <TableRow
                    key={u.userId}
                    className={`cursor-pointer ${selectedUser?.userId === u.userId ? "bg-muted" : ""}`}
                    onClick={() => setSelectedUser(selectedUser?.userId === u.userId ? null : u)}
                  >
                    <TableCell>
                      <div className="font-medium">{userLabel(u)}</div>
                      {u.email && u.name ? <div className="text-xs text-muted-foreground">{u.name}</div> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.generations.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.failed.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTokens(u.totalTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.creditsCharged.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatUsd(u.costUsd)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By model</CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.models.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Images</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report?.models ?? []).map((m) => (
                    <TableRow key={`${m.provider}:${m.model}`}>
                      <TableCell>
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-muted-foreground">{m.provider}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.generations.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUsd(m.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold">
              Recent generations{selectedUser ? ` · ${userLabel(selectedUser)}` : ""}
            </CardTitle>
            {selectedUser ? (
              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                <X />
                All users
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {report && report.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No generations yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report?.recent ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.email ?? r.userId}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.model ?? r.provider}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.operation === "edit" ? "Edit" : "Text to image"} · {r.quality ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "succeeded" ? "default" : "destructive"}>
                          {r.status === "succeeded" ? "OK" : r.errorCode ?? "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatTokens(r.totalTokens)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUsd(r.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
