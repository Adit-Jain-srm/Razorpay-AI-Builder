import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "MediaOS",
    template: "%s · MediaOS",
  },
  description:
    "MediaOS is an autonomous AI growth agent for Indian merchants. It researches buyers, deploys campaigns, collects Razorpay revenue, and optimizes toward a bounded ₹ objective with an audit trail on every money action.",
  applicationName: "MediaOS",
  openGraph: {
    images: ["/og.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
