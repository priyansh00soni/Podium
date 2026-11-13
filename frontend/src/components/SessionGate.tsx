"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, CurrentUser, getSignInUrl, ApiRequestError } from "@/lib/api";
import { Card } from "./Card";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

interface SessionContextType {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

interface SessionGateProps {
  slug: string;
  children: React.ReactNode;
}

export function SessionGate({ slug, children }: SessionGateProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [wasSignedIn, setWasSignedIn] = useState(false);
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const me = await getMe(slug);
      setUser(me);
      setWasSignedIn(true);
      setIsSignedOut(false);
      setSessionReplaced(false);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 401) {
        if (wasSignedIn) {
          setSessionReplaced(true);
        } else {
          setIsSignedOut(true);
        }
        setUser(null);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load participant session."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card>
          <div className="space-y-4">
            <Skeleton lines={2} />
          </div>
        </Card>
      </div>
    );
  }

  if (sessionReplaced) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="text-center space-y-4">
          <h2 className="text-base font-semibold text-[#ededf0]">
            Session Disconnected
          </h2>
          <p className="text-sm text-[#8b8b94] leading-relaxed">
            This contest is open in another window. If this wasn&apos;t you,
            contact the organizers.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setWasSignedIn(false);
                fetchSession();
              }}
            >
              Retry Connection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isSignedOut) {
    const signInUrl = getSignInUrl(slug);
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="text-center space-y-4">
          <h2 className="text-base font-semibold text-[#ededf0]">
            Sign in with Google to take part
          </h2>
          <p className="text-sm text-[#8b8b94] leading-relaxed">
            Use the Google account whose email is on this contest&apos;s registration list.
            First-time sign-in creates your participant account.
          </p>
          <div className="pt-2">
            <Button href={signInUrl} variant="primary" size="md">
              Continue with Google
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (errorMessage && !user) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="text-center space-y-4">
          <h2 className="text-base font-semibold text-rose-400">
            Authentication Error
          </h2>
          <p className="text-sm font-mono text-[#8b8b94] leading-relaxed">
            {errorMessage}
          </p>
          <Button variant="secondary" size="md" onClick={fetchSession}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <SessionContext.Provider
      value={{ user, loading, error: errorMessage, refresh: fetchSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}
