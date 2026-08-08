import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roda · Onchain Savings Circles Built on Arc",
  description:
    "Trustless rotating savings circles (ROSCA) built on Arc Network, powered by USDC featuring an autonomous AI Liquidity Guardian.",
  openGraph: {
    title: "Roda · Onchain Savings Circles Built on Arc",
    description: "Trustless rotating savings circles (ROSCA) built on Arc Network featuring dynamic collateral escrows and an autonomous AI Liquidity Guardian.",
    url: "https://roda-nine.vercel.app",
    siteName: "Roda Protocol",
    images: [
      {
        url: "https://roda-nine.vercel.app/logo_with_text.png",
        width: 1200,
        height: 630,
        alt: "Roda Onchain Credit Passport Card",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roda · Onchain Savings Circles Built on Arc",
    description: "Trustless rotating savings circles (ROSCA) built on Arc Network featuring dynamic collateral escrows and an autonomous AI Liquidity Guardian.",
    images: ["https://roda-nine.vercel.app/logo_with_text.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <head>
        <meta name="darkreader-lock" content="true" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="bg-aurora" aria-hidden="true" />
        <div className="roda-ring-container" aria-hidden="true">
          {/* Primary orbital ring — large, top-right */}
          <div className="roda-ring ring-1">
            <div className="orbital-dot dot-1a"></div>
            <div className="orbital-dot dot-1b"></div>
          </div>
          {/* Secondary ring — bottom-left */}
          <div className="roda-ring ring-2">
            <div className="orbital-dot dot-2a"></div>
          </div>
          {/* Tertiary ring — center-left, large */}
          <div className="roda-ring ring-3">
            <div className="orbital-dot dot-3a"></div>
            <div className="orbital-dot dot-3b"></div>
          </div>
          {/* Accent ring — small, mid-right */}
          <div className="roda-ring ring-4">
            <div className="orbital-dot dot-4a"></div>
          </div>
          {/* Outermost ring — hero halo */}
          <div className="roda-ring ring-5"></div>
          {/* Interlocking Liquidity Ring — center-right */}
          <div className="roda-ring ring-6">
            <div className="orbital-dot dot-6a"></div>
          </div>
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
