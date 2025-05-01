import { Body } from "@/app/layout.client";
import "@/styles/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { metadataMurphy } from "@/lib/metadata";
import { env } from "process";

const interFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Murphy",
    template: "%s | Murphy",
  },
  description: metadataMurphy.description,
  metadataBase: new URL(
    (env.NEXT_PUBLIC_BASE_URL as string) || "https://www.murphyai.dev"
  ),
  keywords: [...metadataMurphy.keywords],
  referrer: "origin-when-cross-origin",
  authors: [
    {
      name: "murphy open source",
      url: "https://github.com/murphy-codelabs/murphy",
    },
  ],
  publisher: "murphy open source",
  alternates: {
    canonical: "./",
  },
  openGraph: metadataMurphy.openGraph,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interFont.className} ${interFont.variable} custom-selection antialiased`}
      suppressHydrationWarning
    >
      <Body>
        <RootProvider>{children}</RootProvider>
      </Body>
      <GoogleAnalytics gaId="G-CWD3ZWRVBT" />
    </html>
  );
}
