"use client"

import React from "react"
import { LazorkitProvider } from "@lazorkit/wallet"

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com"
const DEFAULT_IPFS_URL = "https://portal.lazor.sh"
const DEFAULT_PAYMASTER_URL = "https://lazorkit-paymaster.onrender.com"

export function ClientLazorKitProvider({ children }: { children: React.ReactNode }) {
  // Validate and use environment variables with fallbacks
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_RPC_URL
  const ipfsUrl = process.env.LAZORKIT_PORTAL_URL || DEFAULT_IPFS_URL
  const paymasterUrl = process.env.LAZORKIT_PAYMASTER_URL || DEFAULT_PAYMASTER_URL

  // Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    console.debug('LazorKit Provider Configuration:', {
      rpcUrl,
      ipfsUrl,
      paymasterUrl
    })
  }

  return (
    <LazorkitProvider
      rpcUrl={rpcUrl}
      ipfsUrl={ipfsUrl}
      paymasterUrl={paymasterUrl}
    >
      {children}
    </LazorkitProvider>
  )
}