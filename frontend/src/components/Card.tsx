import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  accentTop?: "thin" | "thick" | "none";
}

export function Card({
  children,
  className = "",
  accentTop = "thin",
  ...props
}: CardProps) {
  const topBorderClass =
    accentTop === "thick"
      ? "border-t-2 border-t-[#6D4AFF]"
      : accentTop === "none"
      ? ""
      : "border-t border-t-[#6D4AFF]/30";

  return (
    <div
      className={`bg-[#111113] border border-[#26262b] ${topBorderClass} rounded-lg p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

