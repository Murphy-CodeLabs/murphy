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
  isMainnet: true, // Changed default to true for mainnet
  walletType: 'standard',
  setWalletType: () => null,
  networkType: WalletAdapterNetwork.Mainnet, // Changed default to Mainnet
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

  // Network detection - only force devnet for LazorKit operations
  const isMainnet = useMemo(() => {
    const mainnetEnv = process.env.NEXT_PUBLIC_USE_MAINNET
    return mainnetEnv === undefined ? true : mainnetEnv === "true" // Default to mainnet
  }, [])

  const networkType = useMemo(
    () => walletType === 'lazorkit' ? WalletAdapterNetwork.Devnet : (isMainnet ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet),
    [isMainnet, walletType]
  )

  // RPC endpoints management - use devnet RPC for LazorKit, otherwise use configured endpoint
  const publicRPCs = useMemo(
    () => [walletType === 'lazorkit' ? DEFAULT_DEVNET_RPC : (isMainnet ? DEFAULT_MAINNET_RPC : DEFAULT_DEVNET_RPC)],
    [isMainnet, walletType]
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

  // Auto-connect effect
  useEffect(() => {
    if (props.autoConnect && walletType === 'lazorkit') {
      // Attempt to reconnect LazorKit wallet on mount
      const reconnectLazorKit = async () => {
        try {
          // The actual reconnection will be handled by the LazorKitWalletProvider
          console.log('Attempting to reconnect LazorKit wallet...')
        } catch (error) {
          console.error('Failed to reconnect LazorKit wallet:', error)
        }
      }
      reconnectLazorKit()
    }
  }, [props.autoConnect, walletType])

  // Effect to handle network switching for LazorKit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cluster = walletType === 'lazorkit' ? "devnet" : (isMainnet ? "mainnet" : "devnet")
      window.localStorage.setItem("NEXT_PUBLIC_CLUSTER", cluster)
      ;(window as any).NEXT_PUBLIC_CLUSTER = cluster
      window.dispatchEvent(new CustomEvent("clusterChanged", { detail: { cluster } }))
    }
  }, [walletType, isMainnet])

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
