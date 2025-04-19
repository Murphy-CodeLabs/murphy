"use client";

import { WalletProvider } from "@/components/providers/wallet-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { type ReactNode } from "react";

export function Body({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const mode = useMode();

  return (
    <body className={cn(mode, "relative flex min-h-screen flex-col")}>
      <WalletProvider autoConnect>
        {children}
        <Toaster />
      </WalletProvider>
    </body>
  );
}

export function useMode(): string | undefined {
  const { slug } = useParams();
  return Array.isArray(slug) && slug.length > 0 ? slug[0] : undefined;
}
