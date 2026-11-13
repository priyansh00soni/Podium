import React from "react";

interface EmptyStateProps {
  heading: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  heading,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 ${className}`}
    >
      <h3 className="text-base font-medium text-[#ededf0] mb-1">{heading}</h3>
      {description && (
        <p className="text-sm text-[#8b8b94] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

