"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchAdminUser,
  adjustUserCredits,
  type AdminPayment,
  type AdminSubscription,
  type AdminUserRow,
  type CreditLedgerEntry,
  type UserJobUsage,
} from "@/lib/users-api";

function formatWhen(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  if (plan === "starter") {
    return "Starter";
  }
  if (plan === "pro") {
    return "Pro";
  }
  if (plan === "creator") {
    return "Creator";
  }
  if (plan === "studio") {
    return "Studio";
  }
  return plan || "—";
}

function sourceBadge(source: string) {
  if (source === "admin_grant") {
    return <Badge className="bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20">Admin Grant</Badge>;
  }
  if (source === "admin_remove") {
    return <Badge variant="destructive">Admin Deduct</Badge>;
  }
  if (source === "claim_link") {
    return <Badge variant="outline" className="border-indigo-500/40 text-indigo-400">Claim Link</Badge>;
  }
  return <Badge variant="secondary">{source}</Badge>;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [jobs, setJobs] = useState<UserJobUsage[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Credit adjustment form state
  const [creditAction, setCreditAction] = useState<"add" | "remove">("add");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);
  const [isSubmittingCredit, setIsSubmittingCredit] = useState<boolean>(false);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const userId = decodeURIComponent(params.id);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminUser(userId, token);
      setUser(data.user);
      setSubscriptions(data.subscriptions);
      setPayments(data.payments);
      setJobs(data.jobs || []);
      setCreditLedger(data.creditLedger || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    }
  }, [token, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(creditAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive number for credits.");
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const res = await adjustUserCredits(
        userId,
        {
          amount: parsedAmount,
          reason: creditReason.trim() || undefined,
          action: creditAction,
          sendEmail: creditAction === "add" ? notifyEmail : false,
        },
        token
      );

      toast.success(
        creditAction === "add"
          ? `Successfully added ${res.amount} credits. Remaining: ${res.remaining}`
          : `Successfully deducted ${res.amount} credits. Remaining: ${res.remaining}`
      );

      setCreditAmount("");
      setCreditReason("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust credits");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/users" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to Users
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.max(0, user.creditsTotal - user.creditsUsed)}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.creditsUsed} used / {user.creditsTotal} total
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
        </div>
      ) : null}

      {/* Credit Control Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Adjust Credits</CardTitle>
          <CardDescription>
            Grant bonus credits or deduct credits manually. All changes are tracked in the credit ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreditSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={creditAction === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setCreditAction("add")}
              >
                + Add Credits
              </Button>
              <Button
                type="button"
                variant={creditAction === "remove" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setCreditAction("remove")}
              >
                - Deduct Credits
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="creditAmount">Amount</Label>
                <Input
                  id="creditAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creditReason">Reason (Optional)</Label>
                <Input
                  id="creditReason"
                  placeholder="e.g. Compensation for failed generation, promo grant"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                />
              </div>
            </div>

            {creditAction === "add" ? (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="notifyEmail"
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="notifyEmail" className="text-xs text-muted-foreground cursor-pointer font-normal">
                  Notify user by email about these credits via ZeptoMail
                </Label>
              </div>
            ) : null}

            <div className="pt-2">
              <Button type="submit" disabled={isSubmittingCredit} size="sm">
                {isSubmittingCredit
                  ? "Processing..."
                  : creditAction === "add"
                  ? "Grant Credits"
                  : "Deduct Credits"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Credit Ledger History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Credit Ledger History</h2>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Admin / Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditLedger.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatWhen(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold tabular-nums ${
                        row.delta > 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </span>
                  </TableCell>
                  <TableCell>{sourceBadge(row.source)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {row.reason || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {row.balance_total_after} total ({row.balance_total_after - row.balance_used_after} rem)
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {row.admin_email || row.admin_user_id || "System"}
                  </TableCell>
                </TableRow>
              ))}
              {creditLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground text-center py-4">
                    No credit ledger entries found for this user.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recent Generation Usage */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Recent Generation Usage</h2>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prompt / Engine</TableHead>
                <TableHead>Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatWhen(job.createdAt)}
                  </TableCell>
                  <TableCell className="capitalize text-sm font-medium">{job.generateType || "3D"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        job.status === "completed"
                          ? "outline"
                          : job.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {job.prompt ? `"${job.prompt}"` : job.engine || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold text-sm">
                    {job.creditsUsed}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground text-center py-4">
                    No recent job generations found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Subscriptions */}
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
                  <TableCell colSpan={3} className="text-sm text-muted-foreground text-center py-4">
                    No subscription on this login.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Billing history */}
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
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatWhen(payment.createdAt)}
                  </TableCell>
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
                  <TableCell colSpan={4} className="text-sm text-muted-foreground text-center py-4">
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
