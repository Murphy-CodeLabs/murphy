import { Body } from "@/app/layout.client";
import "@/styles/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMonoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Murphis SDK",
    template: "%s | Murphis SDK",
  },
  description: "Murphis SDK is a set of tools for building on Solana.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexMonoFont.className} ${ibmPlexMonoFont.variable} custom-selection antialiased`}
      suppressHydrationWarning
    >
      <Body>
        <RootProvider>{children}</RootProvider>
      </Body>
    </html>
  );
}
