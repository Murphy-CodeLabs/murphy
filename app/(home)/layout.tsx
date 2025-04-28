import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { HomeLayout } from "@/components/layouts/home";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout className="container relative" {...baseOptions}>
      {children}
      <Footer />
    </HomeLayout>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="py-12 text-secondary-foreground">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-lg font-semibold">Murphy</p>
          <p className="text-muted-foreground">
            Built with love by{" "}
            <a
              href="https://github.com/SaitamaCoderVN"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium transition-colors hover:text-foreground"
            >
              SaitamaCoder ↗
            </a>
            <span className="text-muted-foreground mx-2">and</span>
            <a
              href="https://github.com/Lou1sVuong"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium transition-colors hover:text-foreground"
            >
              Lou1s [intern] ↗
            </a>
          </p>
        </div>
        <a
          href="https://github.com/Murphy-CodeLabs/murphy/blob/main/LICENSE"
          className="text-muted-foreground transition-colors hover:text-foreground"
          rel="noopener noreferrer"
          target="_blank"
        >
          License ↗
        </a>
      </div>
    </footer>
  );
}
