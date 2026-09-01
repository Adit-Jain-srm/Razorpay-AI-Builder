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
    "MediaOS is an AI media buyer you can hire in a browser tab. The Operator agent plans, executes, monitors, and improves campaigns end to end, powered by a live audience research intelligence engine.",
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
