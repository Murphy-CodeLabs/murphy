"use client";

import { ConnetWalletButton } from "@/components/ui/murphis";
import { Wallet } from "lucide-react";

export default function TestPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Connect Your Solana Wallet</h1>
      <ConnetWalletButton>
        <Wallet className="size-4 mr-2" />
        Connect Wallet
      </ConnetWalletButton>
    </div>
  );
}
