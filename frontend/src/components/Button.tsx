"use client";

import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  title?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  href,
  onClick,
  type = "button",
  className = "",
  title,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none select-none disabled:opacity-50 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5 h-7",
    md: "px-3.5 py-1.5 text-xs gap-2 h-8",
    lg: "px-4 py-2 text-sm gap-2 h-9",
  }[size];

  const variantStyles = {
    primary:
      "bg-[#6D4AFF] text-white hover:bg-[#5b36ed] active:bg-[#4e2cc7] border border-[#6D4AFF]",
    secondary:
      "bg-[#17171a] border border-[#26262b] text-[#ededf0] hover:bg-[#202026] hover:border-[#383842] active:bg-[#1a1a20]",
    outline:
      "bg-transparent border border-[#6D4AFF]/50 text-[#ededf0] hover:bg-[#6D4AFF]/10 hover:border-[#6D4AFF] active:bg-[#6D4AFF]/20",
    ghost:
      "text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a] active:bg-[#26262b]",
  }[variant];

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    if (
      href.startsWith("http") ||
      href.startsWith("/api/") ||
      href.includes("/auth/")
    ) {
      return (
        <a
          href={href}
          className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
          onClick={onClick}
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={href}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {content}
    </button>
  );
}
