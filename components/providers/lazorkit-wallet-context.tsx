// components/providers/lazorkit-wallet-context.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Interface for context
interface LazorKitWalletContextState {
  isConnected: boolean
  isLoading: boolean
  publicKey: string | null
  smartWalletAuthorityPubkey: string | null
  error: string | null
  credentialId?: string | null
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (instruction: any) => Promise<string>
}

// Create context with default values
export const LazorKitWalletContext = createContext<LazorKitWalletContextState>({
  isConnected: false,
  isLoading: false,
  publicKey: null,
  smartWalletAuthorityPubkey: null,
  error: null,
  credentialId: null,
  connect: async () => {},
  disconnect: () => {},
  signMessage: async () => "",
})

// Export hook to use context
export const useLazorKitWalletContext = () => useContext(LazorKitWalletContext)

// Client-only component
const LazorKitWalletProviderClient = dynamic(() => import('./client-lazorkit-provider').then(mod => mod.ClientLazorKitProvider), {
  ssr: false
})

// Provider Component
export function LazorKitWalletProvider({ children }: { children: React.ReactNode }) {
  return <LazorKitWalletProviderClient>{children}</LazorKitWalletProviderClient>
}