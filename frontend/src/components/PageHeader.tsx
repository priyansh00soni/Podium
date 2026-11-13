import React from "react";

interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
  glow = true,
}: PageHeaderProps) {
  return (
    <div
      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#26262b] ${className}`}
    >
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -left-6 w-72 h-28 bg-[#6D4AFF]/10 blur-3xl rounded-full"
        />
      )}
      <div className="relative z-10 flex flex-col gap-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#ededf0]">
          {title}
        </h1>
        {subtitle && (
          <div className="text-sm text-[#8b8b94] font-normal leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="relative z-10 flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

