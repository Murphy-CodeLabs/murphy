"use client"

import React from "react"
import { LazorkitProvider } from "@lazorkit/wallet"

const DEFAULT_RPC_URL = "https://api.devnet.solana.com" // Changed to devnet as per docs
const DEFAULT_IPFS_URL = "https://portal.lazor.sh"
const DEFAULT_PAYMASTER_URL = "https://lazorkit-paymaster.onrender.com"

export function ClientLazorKitProvider({ children }: { children: React.ReactNode }) {
  // Validate and use environment variables with fallbacks
  const rpcUrl = process.env.LAZORKIT_RPC_URL || DEFAULT_RPC_URL
  const ipfsUrl = process.env.LAZORKIT_PORTAL_URL || DEFAULT_IPFS_URL
  const paymasterUrl = process.env.LAZORKIT_PAYMASTER_URL || DEFAULT_PAYMASTER_URL

  // Enable debug mode in development
  const debug = process.env.NODE_ENV === 'development'

  // Log configuration in development
  if (debug) {
    console.debug('LazorKit Provider Configuration:', {
      rpcUrl,
      ipfsUrl,
      paymasterUrl,
      debug
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