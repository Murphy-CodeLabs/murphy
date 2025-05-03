import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { HomeLayout } from "@/components/layouts/home";
import { IBM_Plex_Mono } from "next/font/google";
import { linkIcons } from "@/components/community-links";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ibmPlexMonoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      className={`${ibmPlexMonoFont.className} ${ibmPlexMonoFont.variable} container relative `}
      {...baseOptions}
    >
      {children}
      <Footer />
    </HomeLayout>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="py-12 text-secondary-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-lg font-semibold">Murphy</p>
          <p className="text-muted-foreground">
            Built with love by{" "}
            <a
              href="https://github.com/Murphy-CodeLabs"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium transition-colors hover:text-foreground"
            >
              Murphy CodeLabs ↗
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex">
            {linkIcons.map((link) => (
              <Button key={link.href} size="icon" variant="ghost" asChild>
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {link.icon}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
