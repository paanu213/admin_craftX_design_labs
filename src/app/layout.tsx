import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CraftX Design Labs — Admin",
  description: "Internal management portal for CraftX Design Labs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <SessionProvider>
          <Providers>{children}</Providers>
        </SessionProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
