import React from "react";
import { Button } from "./Button";

interface ErrorStateProps {
  heading?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  heading = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-[#26262b] rounded-lg bg-[#111113] ${className}`}
    >
      <h3 className="text-base font-semibold text-[#ededf0] mb-2">{heading}</h3>
      <p className="text-sm font-mono text-rose-400 max-w-md mb-5 break-words">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

