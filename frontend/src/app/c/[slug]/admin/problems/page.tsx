"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export default function DeprecatedAdminProblemsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/c/${encodeURIComponent(slug)}/moderator/problems`);
  }, [slug, router]);

  return (
    <AppShell
      breadcrumbs={[
        { label: slug, href: `/c/${encodeURIComponent(slug)}` },
        { label: "Redirecting..." },
      ]}
      slug={slug}
    >
      <div className="max-w-md mx-auto py-12">
        <Card className="text-center space-y-4">
          <p className="text-sm text-[#8b8b94]">
            Contest staff portal has moved to the Moderator route.
          </p>
          <Link
            href={`/c/${encodeURIComponent(slug)}/moderator/problems`}
            className="inline-block px-4 py-2 bg-[#6D4AFF] text-white text-xs font-medium rounded-md hover:bg-[#5b3ce6] transition-colors"
          >
            Continue to Moderator Portal →
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
