"use client";

import { useEffect, useState } from "react";

export function UnsupportedView() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex items-center justify-center p-6">
      <div className="bg-[#111113] border border-[#26262b] rounded-lg p-6 max-w-sm text-center flex flex-col items-center">
        <div className="w-8 h-8 rounded-md bg-[#6D4AFF] text-white flex items-center justify-center font-bold text-sm mb-4 select-none">
          P
        </div>
        <h2 className="text-base font-semibold text-[#ededf0] mb-2">
          Podium needs a desktop or laptop
        </h2>
        <p className="text-sm text-[#8b8b94] leading-relaxed">
          Open this page on a computer to take part in contests.
        </p>
      </div>
    </div>
  );
}

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) {
    // Render nothing until mounted to avoid a flash
    return null;
  }

  if (isMobile) {
    return <UnsupportedView />;
  }

  return <>{children}</>;
}

