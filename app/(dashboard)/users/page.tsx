"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/users-api";

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCharge(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${code}`;
  }
}

function planLabel(plan: string | null): string {
  if (plan === "starter") return "Starter";
  if (plan === "pro") return "Pro";
  if (plan === "slot") return "Slot";
  if (plan === "slot_pro") return "Slot Pro";
  if (plan === "creator") return "Creator";
  if (plan === "studio") return "Studio";
  return plan || "Free";
}

export default function UsersPage() {
  const { getToken } = useAuth();
  const [filter, setFilter] = useState<"all" | "paying">("all");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [payingCount, setPayingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminUsers(filter, token);
      setUsers(data.users);
      setPayingCount(data.payingCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }, [filter, token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Accounts</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Users</h1>
        </div>
        <Select
          className="w-44"
          value={filter}
          onChange={(event) => setFilter(event.target.value === "paying" ? "paying" : "all")}
        >
          <option value="all">All users</option>
          <option value="paying">Paying</option>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Showing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paying</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{payingCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last payment</TableHead>
              <TableHead>Credits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`/users/${encodeURIComponent(user.id)}`} className="font-medium hover:underline">
                    {user.name || user.email || user.id}
                  </Link>
                  <p className="text-xs text-muted-foreground">{user.email || user.id}</p>
                </TableCell>
                <TableCell>
                  {planLabel(user.plan)}
                  {user.slot ? (
                    <p className="text-xs text-muted-foreground">
                      {user.slot.label ? `${user.slot.label} · ${user.slot.open ? "open" : "closed"}` : "No hour yet"}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {user.paying ? <Badge>Paying</Badge> : <Badge variant="secondary">Free</Badge>}
                  {user.subscriptionStatus ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.subscriptionStatus}
                      {user.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <p>{formatCharge(user.lastPaymentAmount, user.lastPaymentCurrency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(user.lastPaymentAt)}
                    {user.lastPaymentStatus ? ` · ${user.lastPaymentStatus}` : ""}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">
                  {user.creditsUsed} / {user.creditsTotal}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No users in this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
