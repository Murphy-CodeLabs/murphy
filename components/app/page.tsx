"use client"

import { ConnectWalletButton } from "@/components/ui/murphy/connect-wallet-button"
import { WalletProvider } from "@/components/providers/wallet-provider"
import { Wallet } from "lucide-react"

export default function TestPage() {
  return (
    <WalletProvider>
      <div className="flex h-screen items-center justify-center">
        <div className="container mx-auto max-w-md p-8 text-center">
          <h1 className="mb-6 text-2xl font-bold">Connect Your Solana Wallet</h1>
          <ConnectWalletButton>
            <Wallet className="size-4 mr-2" />
            Connect Wallet
          </ConnectWalletButton>
        </div>
      </div>
    </WalletProvider>
  )
}
