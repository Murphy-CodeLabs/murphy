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
  signTransaction: (instruction: TransactionInstruction) => Promise<Transaction>
  signAndSendTransaction: (instruction: TransactionInstruction) => Promise<string>
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
  signTransaction: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
  signAndSendTransaction: async () => { throw new LazorKitError("LazorKitWalletContext not initialized") },
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
    // Check for account not found error
    if (err.message.includes('Account does not exist') || 
        err.message.includes('has no data')) {
      return new LazorKitError(
        "Smart wallet needs to be initialized. Please try connecting again.", 
        'ACCOUNT_NOT_FOUND',
        true
      )
    }
    return err
  }
  return new LazorKitError(err instanceof Object ? JSON.stringify(err) : String(err))
}

export function LazorKitWalletProvider({ children }: { children: React.ReactNode }) {
  const {
    smartWalletPubkey,
    isConnected,
    isLoading,
    isSigning,
    account,
    connect: lazorKitConnect,
    disconnect: lazorKitDisconnect,
    signTransaction: lazorKitSignTransaction,
    signAndSendTransaction: lazorKitSignAndSendTransaction,
  } = useLazorKitWallet()

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
    if (isConnecting) return account as ExtendedWalletAccount
    
    try {
      setIsConnecting(true)
      setError(null)
      
      let result: ExtendedWalletAccount | null = null
      try {
        // First try normal connection
        result = await lazorKitConnect() as ExtendedWalletAccount
      } catch (err) {
        const error = handleError(err)
        
        // If account doesn't exist, try to create it
        if (error instanceof LazorKitError && error.isAccountNotFound && 'createSmartWallet' in (account || {})) {
          console.log("Smart wallet not found, attempting to create...")
          try {
            // Create smart wallet
            await (account as ExtendedWalletAccount).createSmartWallet?.()
            // Try connecting again
            result = await lazorKitConnect() as ExtendedWalletAccount
          } catch (createErr) {
            throw handleError(createErr)
          }
        } else {
          throw error
        }
      }

      if (!result) {
        throw new LazorKitError("Failed to connect: No account returned")
      }
      
      setRetryCount(0)
      return result
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [lazorKitConnect, account, isConnecting])

  const disconnect = useCallback(async () => {
    try {
      setError(null)
      await lazorKitDisconnect()
      setRetryCount(0)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [lazorKitDisconnect])

  const signTransaction = useCallback(async (instruction: TransactionInstruction) => {
    try {
      setError(null)
      return await lazorKitSignTransaction(instruction)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [lazorKitSignTransaction])

  const signAndSendTransaction = useCallback(async (instruction: TransactionInstruction) => {
    try {
      setError(null)
      return await lazorKitSignAndSendTransaction(instruction)
    } catch (err) {
      const error = handleError(err)
      setError(error)
      throw error
    }
  }, [lazorKitSignAndSendTransaction])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    smartWalletPubkey,
    isConnected,
    isLoading,
    isConnecting,
    isSigning,
    error,
    account,
    connect,
    disconnect,
    signTransaction,
    signAndSendTransaction,
    clearError
  }), [
    smartWalletPubkey,
    isConnected,
    isLoading,
    isConnecting,
    isSigning,
    error,
    account,
    connect,
    disconnect,
    signTransaction,
    signAndSendTransaction,
    clearError
  ])

  return (
    <LazorKitWalletContext.Provider value={value}>
      {children}
    </LazorKitWalletContext.Provider>
  )
}