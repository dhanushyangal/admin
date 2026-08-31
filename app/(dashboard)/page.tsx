"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOverview, type ConnectorPublic, type WaterKeyMeta } from "@/lib/api";

export default function HomePage() {
  const { getToken } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [keys, setKeys] = useState<WaterKeyMeta[]>([]);
  const [connectors, setConnectors] = useState<ConnectorPublic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchOverview(async () => (await getToken()) ?? null);
        setUserCount(data.userCount);
        setKeys(data.keys);
        setConnectors(data.connectors);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [getToken]);

  const ready = keys.filter((k) => k.configured && k.status === "valid").length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Home</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {userCount === null ? "—" : userCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform keys ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {userCount === null ? "—" : `${ready} / ${connectors.length || keys.length}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Providers</h2>
        <div className="divide-y divide-border rounded-xl border bg-card">
          {connectors.map((c) => {
            const k = keys.find((row) => (row.provider === "gemini" ? "google" : row.provider) === c.id);
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{c.name}</span>
                <Badge variant={k?.configured && k.status === "valid" ? "default" : "secondary"}>
                  {!k?.configured ? "Not set" : k.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
