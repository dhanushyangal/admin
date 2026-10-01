"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Droplets, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOverview, type ConnectorPublic, type WaterKeyMeta } from "@/lib/api";
import type { ImageKeyMeta } from "@/lib/image-keys-api";

export default function HomePage() {
  const { getToken } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [waterKeys, setWaterKeys] = useState<WaterKeyMeta[]>([]);
  const [connectors, setConnectors] = useState<ConnectorPublic[]>([]);
  const [imageKeys, setImageKeys] = useState<ImageKeyMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    try {
      const data = await fetchOverview(token);
      setUserCount(data.userCount);
      setWaterKeys(data.keys);
      setConnectors(data.connectors);
      setImageKeys(data.imageKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const waterReady = waterKeys.filter((k) => k.configured && k.status === "valid").length;
  const imageReady = imageKeys.filter((k) => k.configured && k.status === "valid").length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Admin dashboard</h1>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {userCount === null ? "—" : userCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Image generation keys</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold tabular-nums">
              {imageKeys.length === 0 ? "—" : `${imageReady} / ${imageKeys.length}`}
            </p>
            <Link
              href="/image-keys"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Configure image keys <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Water model keys</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold tabular-nums">
              {connectors.length === 0 ? "—" : `${waterReady} / ${connectors.length}`}
            </p>
            <Link
              href="/water"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Configure Water keys <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Image Generation Keys */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Image generation API keys</h2>
            </div>
            <Link href="/image-keys" className="text-xs text-muted-foreground hover:text-foreground">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-border rounded-xl border bg-card">
            {imageKeys.map((k) => (
              <div key={k.provider} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{k.name}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {k.provider === "openai" ? "flare / sunburst" : "flash-image / pro-image"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {k.source === "env" ? (
                    <Badge variant="outline" className="text-[11px]">
                      .env
                    </Badge>
                  ) : null}
                  <Badge
                    variant={
                      k.configured && k.status === "valid"
                        ? "default"
                        : k.status === "invalid"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {!k.configured
                      ? "Not set"
                      : k.status === "valid"
                        ? "Valid"
                        : k.status === "invalid"
                          ? "Invalid"
                          : "Unchecked"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Water Model Keys */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold">Water LLM model keys</h2>
            </div>
            <Link href="/water" className="text-xs text-muted-foreground hover:text-foreground">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-border rounded-xl border bg-card">
            {connectors.map((c) => {
              const k = waterKeys.find(
                (row) => (row.provider === "gemini" ? "google" : row.provider) === c.id
              );
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.product ? (
                      <p className="text-[11px] text-muted-foreground">{c.product}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {k?.source === "env" ? (
                      <Badge variant="outline" className="text-[11px]">
                        .env
                      </Badge>
                    ) : null}
                    <Badge
                      variant={
                        k?.configured && k.status === "valid"
                          ? "default"
                          : k?.status === "invalid"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {!k?.configured
                        ? "Not set"
                        : k.status === "valid"
                          ? "Valid"
                          : k.status === "invalid"
                            ? "Invalid"
                            : "Unchecked"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
