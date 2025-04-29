import { Body } from "@/app/layout.client";
import "@/styles/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { Metadata } from "next";
import { Inter } from "next/font/google";

const interFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Murphy SDK",
    template: "%s | Murphy SDK",
  },
  description: "Murphy SDK is a set of tools for building on Solana.",
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
    </html>
  );
}
