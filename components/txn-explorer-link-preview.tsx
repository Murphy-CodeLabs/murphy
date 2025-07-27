"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { TxnExplorerLink } from "@/components/ui/murphy";

export default function TxnExplorerLinkPreview() {
  const sampleSignatures = {
    mainnet:
      "5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n",
    testnet:
      "2B5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
    devnet:
      "3C6VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl bg-background text-foreground">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Transaction Explorer Link</h1>
        <p className="text-muted-foreground">
          Direct links to Solana Explorer for transaction details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Different Clusters */}
        <Card className="bg-background text-foreground">
          <CardHeader>
            <CardTitle>Different Clusters</CardTitle>
            <CardDescription className="text-muted-foreground">
              Links to different Solana network clusters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["mainnet", "testnet", "devnet"] as const).map((cluster) => (
              <div key={cluster} className="space-y-2">
                <h4 className="font-medium capitalize">{cluster}</h4>
                <TxnExplorerLink
                  signature={sampleSignatures[cluster]}
                  cluster={cluster === "mainnet" ? "mainnet-beta" : cluster}
                  className="w-full"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Different Variants */}
        <Card className="bg-background text-foreground">
          <CardHeader>
            <CardTitle>Different Variants</CardTitle>
            <CardDescription className="text-muted-foreground">
              Various button styles and sizes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["default", "outline", "ghost", "link"] as const).map(
              (variant) => (
                <div key={variant} className="space-y-2">
                  <h4 className="font-medium capitalize">{variant} Variant</h4>
                  <TxnExplorerLink
                    signature={sampleSignatures.mainnet}
                    variant={variant}
                    className="w-full"
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Different Sizes */}
      <Card className="mt-8 bg-background text-foreground">
        <CardHeader>
          <CardTitle>Different Sizes</CardTitle>
          <CardDescription className="text-muted-foreground">
            Various button sizes for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(["sm", "default", "lg", "icon"] as const).map((size) => (
              <div key={size} className="space-y-2">
                <h4 className="font-medium text-sm capitalize">{size}</h4>
                <TxnExplorerLink
                  signature={sampleSignatures.mainnet}
                  size={size}
                  className="w-full"
                >
                  {size === "icon" ? "🔗" : undefined}
                </TxnExplorerLink>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
