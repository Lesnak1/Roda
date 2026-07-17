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
    "Trustless rotating savings circles (ROSCA) built on Arc Network, powered by USDC.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <head>
        <meta name="darkreader-lock" content="true" />
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
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
