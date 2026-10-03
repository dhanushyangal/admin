"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Box, Code2, Globe, Image as ImageIcon, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchUsage,
  type UsageRange,
  type UsageReport,
  type UsageSource,
  type UsageType,
  type UserUsage,
} from "@/lib/usage-api";

const RANGES: { value: UsageRange; label: string }[] = [
  { value: "1d", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const SOURCES: { value: UsageSource; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "web", label: "Normal (Web Studio)" },
  { value: "api", label: "Developer API" },
];

const TYPES: { value: UsageType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "3d", label: "3D Models Only" },
  { value: "image", label: "2D Images Only" },
];

function formatUsd(v: number): string {
  if (v === 0) {
    return "$0.00";
  }
  return v < 1
    ? `$${v.toFixed(4)}`
    : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function ChannelBadge({ webCount, apiCount }: { webCount: number; apiCount: number }) {
  if (webCount > 0 && apiCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
        Web + API
      </span>
    );
  }
  if (apiCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Code2 className="h-3 w-3" />
        API
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <Globe className="h-3 w-3" />
      Web
    </span>
  );
}

export default function UsagePage() {
  const { getToken } = useAuth();
  const [range, setRange] = useState<UsageRange>("30d");
  const [source, setSource] = useState<UsageSource>("all");
  const [type, setType] = useState<UsageType>("all");
  const [selectedUser, setSelectedUser] = useState<UserUsage | null>(null);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchUsage(range, source, type, selectedUser?.userId ?? null, token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [range, source, type, selectedUser, token]);

  useEffect(() => {
    const first = setTimeout(() => {
      void load();
    }, 0);
    return () => {
      clearTimeout(first);
    };
  }, [load]);

  const totals = report?.totals;
  const imageRequestCount = totals ? totals.generationsImage + totals.failedImage : 0;
  const avgPerImage = totals && imageRequestCount > 0 ? totals.costUsd / imageRequestCount : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Analytics & Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Usage and Cost Tracking</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Unified analytics across 3D model reconstructions and 2D concept images, separated by Web Studio vs Developer API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <Select
            className="w-44 text-xs font-medium"
            value={source}
            onChange={(e) => {
              setSource(e.target.value as UsageSource);
            }}
            aria-label="Source filter"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>

          {/* Type Filter */}
          <Select
            className="w-40 text-xs font-medium"
            value={type}
            onChange={(e) => {
              setType(e.target.value as UsageType);
            }}
            aria-label="Type filter"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          {/* Time Range Selector */}
          <Select
            className="w-36 text-xs font-medium"
            value={range}
            onChange={(e) => {
              setRange(e.target.value as UsageRange);
            }}
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void load();
            }}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total provider cost"
          value={totals ? formatUsd(totals.costUsd) : "—"}
          hint={totals && totals.generationsImage > 0 ? `avg ${formatUsd(avgPerImage)} / 2D image` : "2D APIs only"}
        />
        <SummaryCard
          label="3D models generated"
          value={totals ? totals.generations3d.toLocaleString() : "—"}
          hint={totals ? `${totals.failed3d.toLocaleString()} failed · ${totals.credits3d.toLocaleString()} credits` : undefined}
        />
        <SummaryCard
          label="2D images generated"
          value={totals ? totals.generationsImage.toLocaleString() : "—"}
          hint={totals ? `${totals.failedImage.toLocaleString()} failed · ${totals.creditsImage.toLocaleString()} credits` : undefined}
        />
        <SummaryCard
          label="Credits charged"
          value={totals ? totals.creditsCharged.toLocaleString() : "—"}
          hint={totals ? `${totals.webCount.toLocaleString()} web · ${totals.apiCount.toLocaleString()} API` : undefined}
        />
        <SummaryCard
          label="Active users"
          value={totals ? totals.activeUsers.toLocaleString() : "—"}
          hint={totals ? `${formatTokens(totals.totalTokens)} total tokens` : undefined}
        />
      </div>

      {/* Spend & Usage by User Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Spend & usage by user</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any user to filter the activity feed below.
            </p>
          </div>
          {selectedUser ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedUser(null);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filter ({userLabel(selectedUser)})
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {report && report.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No generation activity found for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">3D Models</TableHead>
                  <TableHead className="text-right">2D Images</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                  <TableHead className="text-right">Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.users ?? []).map((u) => (
                  <TableRow
                    key={u.userId}
                    className={`cursor-pointer ${selectedUser?.userId === u.userId ? "bg-muted font-medium" : ""}`}
                    onClick={() => {
                      setSelectedUser(selectedUser?.userId === u.userId ? null : u);
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{userLabel(u)}</div>
                      {u.email && u.name ? <div className="text-xs text-muted-foreground">{u.name}</div> : null}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge webCount={u.webCount} apiCount={u.apiCount} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {u.generations3d.toLocaleString()}
                      </span>
                      {u.failed3d > 0 ? (
                        <span className="ml-1 text-[11px] text-destructive">({u.failed3d} fail)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span>{u.generationsImage.toLocaleString()}</span>
                      {u.failedImage > 0 ? (
                        <span className="ml-1 text-[11px] text-destructive">({u.failedImage} fail)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatTokens(u.totalTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{u.creditsCharged.toLocaleString()}</TableCell>
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

      {/* Model Breakdown and Recent Activity Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Model Breakdown Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">By model / engine</CardTitle>
          </CardHeader>
          <CardContent>
            {report && report.models.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Gen</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report?.models ?? []).map((m) => (
                    <TableRow key={`${m.category}:${m.provider}:${m.model}`}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          {m.category === "3d" ? (
                            <Box className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          )}
                          <span className="truncate">{m.model}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{m.provider}</span>
                          <span>·</span>
                          <span className="uppercase text-[10px] tracking-wider font-semibold">
                            {m.source === "both" ? "Web+API" : m.source}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.generations.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{m.creditsCharged.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">{formatUsd(m.costUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold">
              Recent activity feed{selectedUser ? ` · ${userLabel(selectedUser)}` : ""}
            </CardTitle>
            {selectedUser ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedUser(null);
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                All users
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {report && report.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No generation activity yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Operation / Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report?.recent ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <div className="text-[10px] text-muted-foreground/80">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs font-medium">
                        {r.email ?? r.userId}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {r.category === "3d" ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                              <Box className="h-3 w-3" /> 3D
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                              <ImageIcon className="h-3 w-3" /> Image
                            </span>
                          )}
                          <span
                            className={`inline-flex w-fit items-center rounded px-1 py-0.2 text-[10px] font-semibold uppercase ${
                              r.source === "api"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {r.source}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{r.operation}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.model ?? r.provider}
                          {r.quality ? ` · ${r.quality}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "succeeded" || r.status === "done"
                              ? "default"
                              : "destructive"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {r.status === "succeeded" || r.status === "done"
                            ? "OK"
                            : r.errorCode ?? "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-semibold">
                        {r.creditsCharged}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-mono">
                        {formatUsd(r.costUsd)}
                      </TableCell>
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
