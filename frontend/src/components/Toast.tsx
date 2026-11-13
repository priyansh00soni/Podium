"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface ToastMessage {
  id: string;
  type: "error" | "info" | "success";
  text: string;
}

interface ToastContextValue {
  showToast: (text: string, type?: "error" | "info" | "success") => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (text: string, type: "error" | "info" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, text }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto cursor-pointer p-3.5 rounded-lg border text-xs shadow-lg flex items-start justify-between gap-3 transition-all ${
              t.type === "error"
                ? "bg-[#17171a] border-rose-500/40 text-rose-300"
                : t.type === "success"
                  ? "bg-[#17171a] border-emerald-500/40 text-emerald-300"
                  : "bg-[#17171a] border-[#26262b] text-[#ededf0]"
            }`}
          >
            <span className="leading-relaxed font-sans">{t.text}</span>
            <button
              type="button"
              className="text-[#8b8b94] hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

