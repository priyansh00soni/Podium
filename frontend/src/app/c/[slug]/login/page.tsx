"use client";

import { use, useEffect } from "react";
import { getSignInUrl } from "@/lib/api";
import { Card } from "@/components/Card";

export default function ContestLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  useEffect(() => {
    window.location.assign(getSignInUrl(slug));
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center space-y-3">
        <h1 className="text-lg font-semibold">Redirecting to Google</h1>
        <p className="text-sm text-[#8b8b94]">
          Continue with your Google account to enter this contest.
        </p>
      </Card>
    </div>
  );
}
