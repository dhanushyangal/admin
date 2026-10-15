"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAdminUser, type AdminPayment, type AdminSubscription, type AdminUserRow } from "@/lib/users-api";

function formatWhen(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCharge(amount: number, currency: string): string {
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
  return plan || "—";
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const userId = decodeURIComponent(params.id);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminUser(userId, token);
      setUser(data.user);
      setSubscriptions(data.subscriptions);
      setPayments(data.payments);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    }
  }, [token, userId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/users" className="text-xs text-muted-foreground hover:text-foreground">
          Users
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{user?.name || user?.email || "User"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {user ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{planLabel(user.plan)}</p>
              <p className="text-xs text-muted-foreground">
                {user.subscriptionStatus || "No subscription"}
                {user.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {user.creditsUsed} / {user.creditsTotal}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account</CardTitle>
            </CardHeader>
            <CardContent>
              {user.paying ? <Badge>Paying</Badge> : <Badge variant="secondary">Free</Badge>}
              <p className="mt-2 text-xs text-muted-foreground">Joined {formatWhen(user.createdAt)}</p>
            </CardContent>
          </Card>
          {user.slot ? (
            <Card className="sm:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{user.slot.label || "No hour yet"}</p>
                <p className="text-xs text-muted-foreground">
                  {user.slot.label
                    ? `${user.slot.open ? "Open now" : "Closed now"} · ${user.slot.timezone?.replaceAll("_", " ")} · ${user.slot.durationHours} hour${user.slot.durationHours === 1 ? "" : "s"}`
                    : "This account has not chosen an hour."}
                  {user.slot.changedOn ? ` · last change ${formatWhen(user.slot.changedOn)}` : ""}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Subscriptions</h2>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period end</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.subscriptionId || sub.createdAt}>
                  <TableCell>{planLabel(sub.plan)}</TableCell>
                  <TableCell>
                    {sub.status}
                    {sub.cancelAtPeriodEnd ? " · cancels at period end" : ""}
                  </TableCell>
                  <TableCell>{formatWhen(sub.periodEnd)}</TableCell>
                </TableRow>
              ))}
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No subscription on this login.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Billing history</h2>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatWhen(payment.createdAt)}</TableCell>
                  <TableCell>{planLabel(payment.plan)}</TableCell>
                  <TableCell className="tabular-nums">{formatCharge(payment.amount, payment.currency)}</TableCell>
                  <TableCell>
                    {payment.status}
                    <p className="text-xs text-muted-foreground">{payment.paymentId}</p>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No payments for this email.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
