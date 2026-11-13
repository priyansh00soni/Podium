import type { Metadata } from "next";
import "./globals.css";
import { MobileGate } from "@/components/MobileGate";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Podium",
  description: "Live coding contests for college clubs and collegiate teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0a0b] text-[#ededf0] font-sans min-h-screen antialiased selection:bg-[#6366f1]/30 selection:text-white">
        <ToastProvider>
          <MobileGate>{children}</MobileGate>
        </ToastProvider>
      </body>
    </html>
  );
}
