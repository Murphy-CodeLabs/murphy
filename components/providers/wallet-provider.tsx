"use client"

import React, { useState, useMemo, createContext, useCallback, useEffect } from "react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import type { Adapter } from "@solana/wallet-adapter-base"
import {
  WalletProvider as SolanaWalletProvider,
  ConnectionProvider as SolanaConnectionProvider,
  ConnectionProviderProps,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import { TxnSettingsProvider } from "@/components/ui/murphy/txn-settings"
import { ClientLazorKitProvider } from "./client-lazorkit-provider"
import { LazorKitWalletProvider } from "./lazorkit-wallet-context"

import "@solana/wallet-adapter-react-ui/styles.css"

// Constants
const DEFAULT_MAINNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
const DEFAULT_DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET || "https://api.devnet.solana.com"

// Create wrapper components
const ConnectionProviderWrapper = (props: ConnectionProviderProps) => (
  <SolanaConnectionProvider {...props} />
)

const WalletProviderWrapper = (props: any) => (
  <SolanaWalletProvider {...props} />
)

interface WalletProviderProps {
  children: React.ReactNode
  network?: WalletAdapterNetwork
  endpoint?: string
  wallets?: Adapter[]
  autoConnect?: boolean
}

interface ModalContextState {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  endpoint?: string
  switchToNextEndpoint: () => void
  availableEndpoints: string[]
  currentEndpointIndex: number
  isMainnet: boolean
  walletType: 'standard' | 'lazorkit'
  setWalletType: (type: 'standard' | 'lazorkit') => void
  networkType: WalletAdapterNetwork
}

export const ModalContext = createContext<ModalContextState>({
  isOpen: false,
  setIsOpen: () => null,
  endpoint: undefined,
  switchToNextEndpoint: () => null,
  availableEndpoints: [],
  currentEndpointIndex: 0,
  isMainnet: true,
  walletType: 'standard',
  setWalletType: () => null,
  networkType: WalletAdapterNetwork.Mainnet,
})

export const WalletProvider = ({ children, ...props }: WalletProviderProps) => {
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [walletType, setWalletType] = useState<'standard' | 'lazorkit'>(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem('walletType')
      return (savedType as 'standard' | 'lazorkit') || 'standard'
    }
    return 'standard'
  })

  // Network detection
  const isMainnet = useMemo(() => {
    const mainnetEnv = process.env.NEXT_PUBLIC_USE_MAINNET
    return mainnetEnv === undefined ? true : mainnetEnv === "true"
  }, [])

  const networkType = useMemo(
    () => isMainnet ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    [isMainnet]
  )

  // RPC endpoints management
  const publicRPCs = useMemo(
    () => [isMainnet ? DEFAULT_MAINNET_RPC : DEFAULT_DEVNET_RPC],
    [isMainnet]
  )

  const endpoint = useMemo(() => {
    if (props.endpoint) {
      return props.endpoint
    }
    return publicRPCs[currentEndpointIndex]
  }, [props.endpoint, publicRPCs, currentEndpointIndex])

  // Endpoint switching with error handling
  const switchToNextEndpoint = useCallback(() => {
    setCurrentEndpointIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % publicRPCs.length
      console.log(
        `Switching RPC endpoint from ${publicRPCs[prevIndex]} to ${publicRPCs[nextIndex]}`
      )
      return nextIndex
    })
  }, [publicRPCs])

  // Wallet adapters
  const wallets = useMemo(
    () => props.wallets || [new PhantomWalletAdapter()],
    [props.wallets]
  )

  // Persist wallet type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('walletType', walletType)
    }
  }, [walletType])

  // Context value memoization
  const contextValue = useMemo(() => ({
    isOpen,
    setIsOpen,
    endpoint,
    switchToNextEndpoint,
    availableEndpoints: publicRPCs,
    currentEndpointIndex,
    isMainnet,
    walletType,
    setWalletType,
    networkType,
  }), [
    isOpen,
    endpoint,
    switchToNextEndpoint,
    publicRPCs,
    currentEndpointIndex,
    isMainnet,
    walletType,
    networkType,
  ])

  return (
    <ModalContext.Provider value={contextValue}>
      <ConnectionProviderWrapper endpoint={endpoint}>
        <WalletProviderWrapper 
          wallets={wallets} 
          autoConnect={props.autoConnect}
          onError={(error: Error) => {
            console.error('Wallet error:', error)
            // Attempt to switch endpoint on connection errors
            if (error.message.includes('connection') || error.message.includes('network')) {
              switchToNextEndpoint()
            }
          }}
        >
          <WalletModalProvider>
            <ClientLazorKitProvider>
              <LazorKitWalletProvider>
                <TxnSettingsProvider>{children}</TxnSettingsProvider>
              </LazorKitWalletProvider>
            </ClientLazorKitProvider>
          </WalletModalProvider>
        </WalletProviderWrapper>
      </ConnectionProviderWrapper>
    </ModalContext.Provider>
  )
}
