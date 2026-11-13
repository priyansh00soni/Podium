"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { getSignInUrl } from "@/lib/api";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const slug = searchParams.get("slug");

  const displayMessage =
    message ||
    "Google sign-in failed. Use the registered email for this contest.";

  const targetUrl = slug ? getSignInUrl(slug) : "/";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex items-center justify-center p-6">
      <Card accentTop="thick" className="max-w-[420px] w-full text-center space-y-4 py-8">
        <h1 className="text-xl font-semibold text-[#ededf0]">Sign-in failed</h1>
        <p className="text-sm text-[#8b8b94] leading-relaxed break-words">
          {displayMessage}
        </p>
        <div className="pt-2">
          <Button href={targetUrl} variant="primary" size="md">
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function LoginErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex items-center justify-center">
          <div className="animate-pulse text-sm text-[#8b8b94]">Loading...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}

