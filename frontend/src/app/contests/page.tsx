"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import {
  getHealth,
  loadRecentContests,
  ApiContest,
  titleFromSlug,
} from "@/lib/api";

export default function ContestsListPage() {
  const router = useRouter();
  const [contests, setContests] = useState<ApiContest[]>([]);
  const [slugInput, setSlugInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [healthMessage, setHealthMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const health = await getHealth();
      setBackendOk(health.ok);
      setHealthMessage(health.message);
      setContests(loadRecentContests());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openContest = (event: FormEvent) => {
    event.preventDefault();
    const slug = slugInput.trim().toLowerCase();
    if (!slug) return;
    router.push(`/c/${encodeURIComponent(slug)}`);
  };

  return (
    <AppShell breadcrumbs={[{ label: "Contests" }]}>
      <div className="space-y-8">
        <PageHeader
          title="Contests"
          subtitle="Open a contest by its slug, then sign in with the Google account on the registration list."
          actions={
            backendOk === null ? null : (
              <span
                className={`font-mono text-xs ${
                  backendOk ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {backendOk ? "API online" : `API offline · ${healthMessage}`}
              </span>
            )
          }
        />

        <Card>
          <form onSubmit={openContest} className="space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#8b8b94]">
              Contest slug
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="spring-collegiate-invitational-2026"
                className="flex-1 bg-[#111113] border border-[#26262b] text-sm text-[#ededf0] px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/40 focus:border-[#6D4AFF]"
              />
              <Button type="submit" variant="primary" size="md">
                Open contest
              </Button>
            </div>
            <p className="text-xs text-[#5a5a63]">
              Google sign-in is per contest. You must already be on that contest&apos;s allowed email list.
            </p>
          </form>
        </Card>

        {loading ? (
          <Card>
            <Skeleton lines={4} />
          </Card>
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : contests.length === 0 ? (
          <Card>
            <EmptyState
              heading="No contests opened yet on this device."
              description="Enter a contest slug above. Recently opened contests will appear here."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6D4AFF]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b8b94] font-medium">
                Recently opened
              </span>
            </div>
            <Card className="p-0 overflow-hidden divide-y divide-[#26262b]/60">
              {contests.map((c) => (
                <Link
                  key={c.slug}
                  href={`/c/${encodeURIComponent(c.slug)}`}
                  className="group block p-4 hover:bg-[#17171a] transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[#ededf0] group-hover:text-white transition-colors truncate">
                        {c.title || titleFromSlug(c.slug)}
                      </h3>
                      <span className="font-mono text-xs text-[#8b8b94] truncate">
                        {c.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[#a78bfa] group-hover:text-white font-medium text-xs transition-colors">
                        Continue →
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#5a5a63] group-hover:text-[#ededf0] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
