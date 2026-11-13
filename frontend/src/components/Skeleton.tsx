import React from "react";

interface SkeletonProps {
  lines?: number;
  className?: string;
  lineHeight?: string;
}

export function Skeleton({
  lines = 3,
  className = "",
  lineHeight = "h-4",
}: SkeletonProps) {
  return (
    <div className={`space-y-2.5 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`${lineHeight} bg-[#17171a] rounded border border-[#26262b]/40`}
          style={{
            width: idx === lines - 1 && lines > 1 ? "65%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

