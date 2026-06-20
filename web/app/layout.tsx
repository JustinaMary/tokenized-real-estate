import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { GasOnboard } from "@/components/GasOnboard";
import { Toaster } from "@/components/Toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Terra — Tokenized Real Estate on Monad",
  description:
    "Own a fraction of real estate. Buy shares of vetted properties, earn rental income, and trade — settled on Monad.",
  generator: "monskills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <NetworkBanner />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border mt-24">
            <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-fg-faint flex flex-wrap items-center justify-between gap-3">
              <span>Terra · Fractional real estate, settled on Monad testnet</span>
              <span className="tabular">Demo — not investment advice</span>
            </div>
          </footer>
          <GasOnboard />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
