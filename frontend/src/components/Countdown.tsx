"use client";

import { useEffect, useState, useMemo } from "react";

interface CountdownProps {
  targetTime: string | Date;
  serverNow?: string | Date;
  onExpire?: () => void;
  className?: string;
  purpleColons?: boolean;
}

export function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "00:00:00";

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (d > 0) {
    return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function Countdown({
  targetTime,
  serverNow,
  onExpire,
  className = "",
  purpleColons = false,
}: CountdownProps) {
  // Clock skew: serverTime - clientLocalTime
  const offsetMs = useMemo(() => {
    if (!serverNow) return 0;
    const serverMs = new Date(serverNow).getTime();
    return serverMs - Date.now();
  }, [serverNow]);

  const calculateRemaining = () => {
    const targetMs = new Date(targetTime).getTime();
    const currentAdjusted = Date.now() + offsetMs;
    const diff = Math.max(0, Math.floor((targetMs - currentAdjusted) / 1000));
    return diff;
  };

  const [remaining, setRemaining] = useState<number>(calculateRemaining);

  useEffect(() => {
    setRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, offsetMs]);

  if (purpleColons) {
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    const pad = (n: number) => String(n).padStart(2, "0");

    return (
      <span className={`font-mono text-white inline-flex items-center ${className}`}>
        {d > 0 && <span className="mr-1.5">{d}d</span>}
        <span>{pad(h)}</span>
        <span className="text-[#a78bfa] mx-1 select-none font-sans font-bold">:</span>
        <span>{pad(m)}</span>
        <span className="text-[#a78bfa] mx-1 select-none font-sans font-bold">:</span>
        <span>{pad(s)}</span>
      </span>
    );
  }

  return (
    <span className={`font-mono ${className}`}>
      {formatTimeLeft(remaining)}
    </span>
  );
}

