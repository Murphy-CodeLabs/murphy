"use client";

import React from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { formatUsd, shortAddress, cn } from "@/lib/utils";
import { SolAsset } from "@/types/assets";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { TokenIcon } from "@/components/ui/murphy/token-icon";
import { Sparkline } from "@/components/ui/murphy/sparkline";
import { PublicKey } from "@solana/web3.js";

type TokenCardProps = {
  asset: SolAsset | null;
  chartData?: { timestamp: number; price: number }[];
  size?: "sm" | "md";
};

const TokenCard = ({ asset, chartData = [], size = "md" }: TokenCardProps) => {
  if (!asset) {
    return (
      <Card className="w-full">
        <CardHeader className={cn("p-4", size === "md" && "p-6")}>
          <CardTitle className="flex items-center gap-3">
            <span className="sr-only">Loading...</span>
            <Skeleton className="h-[48px] w-[48px] shrink-0 rounded-full" />
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-[12px] w-4/5" />
              <Skeleton className="h-[12px] w-4/5" />
            </div>
          </CardTitle>
          <CardDescription className="sr-only">Loading...</CardDescription>
        </CardHeader>
        <CardContent className={cn("p-5", size === "md" && "p-6")}>
          <Skeleton className="h-[88px] w-full" />
        </CardContent>
      </Card>
    );
  }
const href= asset.mint instanceof PublicKey ?`https://solscan.io/token/${asset.mint.toBase58()}`:`https://solscan.io/token/${asset}`
  return (
    <Card className="w-full">
      <CardHeader className={cn("p-4 pb-2", size === "md" && "p-6")}>
        <CardTitle
          className={cn(
            "flex items-center gap-2 text-sm",
            size === "md" && "text-lg",
          )}
        >
          <TokenIcon asset={asset} size={size === "sm" ? 32 : 48} />
          <div className="flex flex-col">
            {asset.symbol}
            <a
              href={href}
              className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground no-underline"
            >
              <ExternalLinkIcon size={16} />
              {shortAddress(asset.mint)}
            </a>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-4 p-4 pb-0", size === "md" && "p-6")}>
        {asset.price && (
          <p className={cn("text-xl", size === "md" && "text-4xl")}>
            {formatUsd(asset.price)}
          </p>
        )}
        <Sparkline data={chartData} />
      </CardContent>
    </Card>
  );
};

export { TokenCard };
