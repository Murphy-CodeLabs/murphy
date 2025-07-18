// components/providers/lazorkit-wallet-context.tsx
"use client"

import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from "react"
import { useWallet as useLazorKitWallet, WalletAccount } from "@lazorkit/wallet"
import { Transaction, PublicKey, TransactionInstruction } from "@solana/web3.js"

// Custom error class for LazorKit errors
class LazorKitError extends Error {
  constructor(message: string, public code?: string, public isAccountNotFound: boolean = false) {
    super(message)
    this.name = 'LazorKitError'
  }
}

// Extended WalletAccount to include createSmartWallet
interface ExtendedWalletAccount extends WalletAccount {
  createSmartWallet?: () => Promise<void>
}

// Connect Response type for createPasskeyOnly
interface ConnectResponse {
  publicKey: string
  credentialId: string
  isCreated: boolean
  connectionType: 'create' | 'get'
  timestamp: number
}

// Extended LazorKit wallet interface
interface ExtendedLazorKitWallet {
  smartWalletPubkey: PublicKey | null
  isConnected: boolean
  isLoading: boolean
  isConnecting: boolean
  isSigning: boolean
  error: Error | null
  account: WalletAccount | null
  connect: () => Promise<WalletAccount>
  disconnect: () => Promise<void>
  signTransaction: (instruction: TransactionInstruction) => Promise<Transaction>
  signAndSendTransaction: (instruction: TransactionInstruction) => Promise<string>
  createPasskeyOnly: () => Promise<ConnectResponse>
  createSmartWalletOnly: (passkeyData: ConnectResponse) => Promise<{smartWalletAddress: string, account: WalletAccount}>
  reconnect: () => Promise<WalletAccount>
}

interface LazorKitWalletContextState {
  smartWalletPubkey: PublicKey | null
  isConnected: boolean
  isLoading: boolean
  isConnecting: boolean
  isSigning: boolean
  error: Error | null
  account: ExtendedWalletAccount | null
  connect: () => Promise<ExtendedWalletAccount>
  disconnect: () => Promise<void>
  reconnect: () => Promise<ExtendedWalletAccount>
  signTransaction: (instruction: TransactionInstruction) => Promise<Transaction>
  signAndSendTransaction: (instruction: TransactionInstruction) => Promise<string>
  createPasskeyOnly: () => Promise<ConnectResponse>
  createSmartWalletOnly: (passkeyData: ConnectResponse) => Promise<{smartWalletAddress: string, account: ExtendedWalletAccount}>
  clearError: () => void
}

const defaultContext: LazorKitWalletContextState = {
  smartWalletPubkey: null,
  isConnected: false,
  isLoading: false,
  isConnecting: false,
  isSigning: false,
  error: null,
  account: null,
  connect: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  disconnect: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  reconnect: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  signTransaction: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  signAndSendTransaction: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  createPasskeyOnly: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  createSmartWalletOnly: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  clearError: () => {}
}

export const LazorKitWalletContext = createContext<LazorKitWalletContextState>(defaultContext)

export const useLazorKitWalletContext = () => {
  const context = useContext(LazorKitWalletContext)
  if (!context) {
    throw new LazorKitError("useLazorKitWalletContext must be used within a LazorKitWalletProvider")
  }
  return context
}

// Utility function for error handling
const handleError = (err: unknown): Error => {
  if (err instanceof Error) {
    // Check for specific error types
    if (err.message.includes('Account does not exist') || 
        err.message.includes('has no data')) {
      return new LazorKitError(
        "Smart wallet needs to be initialized. Please try connecting again.", 
        'ACCOUNT_NOT_FOUND',
        true
      )
    }
    if (err.message.includes('NO_STORED_CREDENTIALS')) {
      return new LazorKitError("No stored credentials found", 'NO_STORED_CREDENTIALS')
    }
    if (err.message.includes('INVALID_CREDENTIALS')) {
      return new LazorKitError("Invalid credentials", 'INVALID_CREDENTIALS')
    }
    return err
  }
  return new LazorKitError(err instanceof Object ? JSON.stringify(err) : String(err))
}

export function LazorKitWalletProvider({ children }: { children: React.ReactNode }) {
  const wallet = useLazorKitWallet() as unknown as ExtendedLazorKitWallet

  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  const clearError = useCallback(() => setError(null), [])

  // Auto-retry connection on certain errors
  useEffect(() => {
    if (error && retryCount < MAX_RETRIES && !isConnecting) {
      const timer = setTimeout(() => {
        console.log(`Retrying connection (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        setRetryCount(prev => prev + 1)
        connect()
      }, Math.min(1000 * Math.pow(2, retryCount), 8000)) // Exponential backoff

      return () => clearTimeout(timer)
    }
  }, [error, retryCount, isConnecting])

  const connect = useCallback(async () => {
    if (isConnecting) return wallet.account as ExtendedWalletAccount
    
    try {
      setIsConnecting(true)
      setError(null)
      
      // First try reconnecting with stored credentials
      try {
        const reconnectedAccount = await wallet.reconnect()
        setRetryCount(0)
        return reconnectedAccount as ExtendedWalletAccount
      } catch (reconnectError) {
        // If reconnect fails, try new connection
        try {
          const newAccount = await wallet.connect()
          setRetryCount(0)
          return newAccount as ExtendedWalletAccount
        } catch (connectError) {
          throw handleError(connectError)
        }
      }
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [wallet.connect, wallet.reconnect, wallet.account, isConnecting])

  const disconnect = useCallback(async () => {
    try {
      setError(null)
      await wallet.disconnect()
      setRetryCount(0)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.disconnect])

  const reconnect = useCallback(async () => {
    try {
      setError(null)
      return await wallet.reconnect() as ExtendedWalletAccount
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.reconnect])

  const createPasskeyOnly = useCallback(async () => {
    try {
      setError(null)
      return await wallet.createPasskeyOnly()
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.createPasskeyOnly])

  const createSmartWalletOnly = useCallback(async (passkeyData: ConnectResponse) => {
    try {
      setError(null)
      return await wallet.createSmartWalletOnly(passkeyData)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.createSmartWalletOnly])

  const signTransaction = useCallback(async (instruction: TransactionInstruction) => {
    try {
      setError(null)
      return await wallet.signTransaction(instruction)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.signTransaction])

  const signAndSendTransaction = useCallback(async (instruction: TransactionInstruction) => {
    try {
      setError(null)
      return await wallet.signAndSendTransaction(instruction)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [wallet.signAndSendTransaction])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    smartWalletPubkey: wallet.smartWalletPubkey,
    isConnected: wallet.isConnected,
    isLoading: wallet.isLoading,
    isConnecting,
    isSigning: wallet.isSigning,
    error,
    account: wallet.account as ExtendedWalletAccount,
    connect,
    disconnect,
    reconnect,
    signTransaction,
    signAndSendTransaction,
    createPasskeyOnly,
    createSmartWalletOnly,
    clearError
  }), [
    wallet.smartWalletPubkey,
    wallet.isConnected,
    wallet.isLoading,
    isConnecting,
    wallet.isSigning,
    error,
    wallet.account,
    connect,
    disconnect,
    reconnect,
    signTransaction,
    signAndSendTransaction,
    createPasskeyOnly,
    createSmartWalletOnly,
    clearError
  ])

  return (
    <LazorKitWalletContext.Provider value={value}>
      {children}
    </LazorKitWalletContext.Provider>
  )
}