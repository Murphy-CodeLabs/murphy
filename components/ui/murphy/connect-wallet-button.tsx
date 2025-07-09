"use client"

import React, { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletName, WalletReadyState } from "@solana/wallet-adapter-base"
import { useWalletMultiButton } from "@/hook/murphy/use-walletMultiButton"
import { Button } from "../button"
import { ModalContext } from "@/components/providers/wallet-provider"
import { useLazorKitWalletContext } from "@/components/providers/lazorkit-wallet-context"

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs"

// Constants
const LABELS = {
  "change-wallet": "Change Wallet",
  connecting: "Connecting...",
  "copy-address": "Copy Address",
  copied: "Copied",
  disconnect: "Disconnect",
  "has-wallet": "Connect Wallet",
  "no-wallet": "Select Wallet",
  "lazorkit-wallet": "Connect Passkey",
  "standard-wallet": "Standard Wallet",
  "connection-error": "Connection Error",
  "retry-connection": "Retry Connection",
  "initializing": "Initializing Smart Wallet...",
  "initialization-error": "Failed to initialize wallet",
} as const

// Types
type WalletButtonProps = React.ComponentProps<"button"> & {
  labels?: Partial<typeof LABELS>
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

type Props = WalletButtonProps

export interface WalletListItemProps {
  handleClick: React.MouseEventHandler<HTMLButtonElement>
  tabIndex?: number
  wallet: {
    adapter: {
      name: string
      icon?: string
    }
    readyState: WalletReadyState
  }
}

// Wallet List Item Component
export const WalletListItem: FC<WalletListItemProps> = ({ handleClick, tabIndex, wallet }) => {
  const isInstalled = wallet.readyState === WalletReadyState.Installed
  
  return (
    <Button 
      onClick={handleClick} 
      tabIndex={tabIndex} 
      variant="outline" 
      className="justify-start w-full"
      disabled={!isInstalled && wallet.adapter.name !== "Phantom"}
    >
      {wallet.adapter.icon && (
        <img
          src={wallet.adapter.icon}
          alt={`${wallet.adapter.name} icon`}
          className="mr-2 h-5 w-5"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg"
          }}
        />
      )}
      {wallet.adapter.name}
      {isInstalled && (
        <span className="ml-auto text-xs text-green-500">Installed</span>
      )}
    </Button>
  )
}

// Enhanced Wallet Modal Component
export const EnhancedWalletModal: FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ open, onOpenChange }) => {
  const { wallets, select } = useWallet()
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'standard' | 'lazorkit'>('standard')
  const [isInitializing, setIsInitializing] = useState(false)
  
  const { 
    connect: connectLazorKit, 
    disconnect: disconnectLazorKit, 
    isLoading: isLoadingLazorKit, 
    isConnected: isLazorKitConnected,
    smartWalletPubkey,
    error: lazorKitError,
    clearError
  } = useLazorKitWalletContext()

  const modalContext = React.useContext(ModalContext)
  const isMainnet = modalContext?.isMainnet ?? true
  const { walletType, setWalletType } = modalContext || { walletType: 'standard', setWalletType: () => {} }

  // Memoize wallet lists
  const { listedWallets, collapsedWallets } = useMemo(() => {
    const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed)
    const notInstalled = wallets.filter((w) => w.readyState !== WalletReadyState.Installed)
    return {
      listedWallets: installed.length ? installed : notInstalled,
      collapsedWallets: installed.length ? notInstalled : []
    }
  }, [wallets])

  const handleWalletClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>, walletName: string) => {
      event.preventDefault()
      try {
        await select(walletName as WalletName)
        setWalletType('standard')
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to select wallet:', error)
      }
    },
    [select, onOpenChange, setWalletType],
  )

  const handleLazorKitConnect = useCallback(async () => {
    try {
      clearError()
      setIsInitializing(false)
      console.log("Starting LazorKit connection...")
      
      try {
        const account = await connectLazorKit()
        console.log("LazorKit connected, account:", account)
        
        if (!account || !account.publicKey) {
          throw new Error("Failed to get wallet account")
        }

        const walletAddress = account.publicKey.toString()
        console.log('Connected with address:', walletAddress)
        
        window.localStorage.setItem('SMART_WALLET_ADDRESS', walletAddress)
        setWalletType('lazorkit')
        onOpenChange(false)
      } catch (error) {
        // Check if error indicates need for initialization
        if (error instanceof Error && 
            (error.message.includes('Account does not exist') || 
             error.message.includes('needs to be initialized'))) {
          setIsInitializing(true)
          // Retry connection which should trigger initialization
          const account = await connectLazorKit()
          if (!account || !account.publicKey) {
            throw new Error("Failed to initialize wallet")
          }
          const walletAddress = account.publicKey.toString()
          window.localStorage.setItem('SMART_WALLET_ADDRESS', walletAddress)
          setWalletType('lazorkit')
          onOpenChange(false)
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error("LazorKit connection error:", error)
      setIsInitializing(false)
    }
  }, [connectLazorKit, setWalletType, onOpenChange, clearError])

  // Effect to handle successful connection
  useEffect(() => {
    if (isLazorKitConnected && smartWalletPubkey) {
      const walletAddress = smartWalletPubkey.toString()
      window.localStorage.setItem('SMART_WALLET_ADDRESS', walletAddress)
      setWalletType('lazorkit')
      onOpenChange(false)
    }
  }, [isLazorKitConnected, smartWalletPubkey, setWalletType, onOpenChange])

  // Effect to sync active tab with wallet type
  useEffect(() => {
    setActiveTab(walletType)
  }, [walletType])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect wallet to continue</DialogTitle>
          <DialogDescription className="space-y-2">
            Choose your preferred wallet to connect to this dApp.
          </DialogDescription>
          <div className="text-sm mt-2">
            Network Status:{" "}
            <span className={isMainnet ? "text-green-500" : "text-yellow-500"}>
              {isMainnet ? "Mainnet" : "Devnet"}
            </span>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'standard' | 'lazorkit')} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">{LABELS["standard-wallet"]}</TabsTrigger>
            <TabsTrigger value="lazorkit">{LABELS["lazorkit-wallet"]}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="mt-2">
            <div className="flex flex-col gap-2 py-2">
              {listedWallets.map((wallet) => (
                <WalletListItem
                  key={wallet.adapter.name}
                  wallet={wallet}
                  handleClick={(e) => handleWalletClick(e, wallet.adapter.name)}
                />
              ))}
              {collapsedWallets.length > 0 && (
                <Collapsible open={expanded} onOpenChange={setExpanded} className="w-full">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      {expanded ? "Hide options" : "Show more options"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {collapsedWallets.map((wallet) => (
                      <WalletListItem
                        key={wallet.adapter.name}
                        wallet={wallet}
                        handleClick={(e) => handleWalletClick(e, wallet.adapter.name)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="lazorkit" className="mt-2">
            <div className="flex flex-col gap-4 py-2">
              <div className="text-sm text-muted-foreground">
                LazorKit Wallet provides a way to integrate Solana smart wallet with Passkey support into your dApp.
              </div>
              
              {lazorKitError && (
                <div className="flex flex-col gap-2 text-sm text-red-500 mb-2">
                  <span>Error: {lazorKitError.message}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      clearError()
                      handleLazorKitConnect()
                    }}
                  >
                    {LABELS["retry-connection"]}
                  </Button>
                </div>
              )}
              
              {!isLazorKitConnected ? (
                <Button 
                  onClick={handleLazorKitConnect} 
                  disabled={isLoadingLazorKit || isInitializing}
                  className="w-full"
                >
                  {isLoadingLazorKit || isInitializing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      <span>{isInitializing ? LABELS["initializing"] : LABELS["connecting"]}</span>
                    </div>
                  ) : (
                    "Connect with Passkey"
                  )}
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <img 
                        src="/murphy/logo/murphy.svg" 
                        alt="LazorKit Wallet" 
                        className="h-5 w-5"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                      <span className="font-medium">
                        {smartWalletPubkey?.toString().slice(0, 8)}...{smartWalletPubkey?.toString().slice(-8)}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        disconnectLazorKit()
                        window.localStorage.removeItem('SMART_WALLET_ADDRESS')
                        setWalletType('standard')
                      }}
                    >
                      {LABELS["disconnect"]}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-4">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

// Wallet Multi Button Component
export function BaseWalletMultiButton({ children, labels = LABELS, ...props }: Props) {
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { buttonState, onConnect, onDisconnect, publicKey, walletIcon, walletName } = useWalletMultiButton({
    onSelectWallet() {
      setWalletModalOpen(true)
    },
  })
  
  const { 
    disconnect: disconnectLazorKit, 
    isLoading: isLoadingLazorKit, 
    isConnected: isLazorKitConnected,
    smartWalletPubkey 
  } = useLazorKitWalletContext()
  
  const modalContext = React.useContext(ModalContext)
  const { walletType, setWalletType } = modalContext || { walletType: 'standard', setWalletType: () => {} }

  const isAnyWalletConnected = useMemo(() => {
    if (walletType === 'standard') {
      return !!publicKey
    } else {
      return isLazorKitConnected && !!smartWalletPubkey
    }
  }, [publicKey, isLazorKitConnected, walletType, smartWalletPubkey])

  const currentWalletAddress = useMemo(() => {
    if (walletType === 'lazorkit' && smartWalletPubkey) {
      return smartWalletPubkey.toString()
    } else if (walletType === 'standard' && publicKey) {
      return publicKey.toBase58()
    }
    return null
  }, [walletType, smartWalletPubkey, publicKey])

  const content = useMemo(() => {
    if (!mounted) return labels["no-wallet"]

    if (walletType === 'lazorkit' && isLazorKitConnected && smartWalletPubkey) {
      const address = smartWalletPubkey.toString()
      return (
        <div className="flex items-center gap-2">
          <img 
            src="/murphy/logo/murphy.svg" 
            alt="LazorKit Wallet" 
            className="h-4 w-4"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg"
            }}
          />
          <span>{address.slice(0, 4)}...{address.slice(-4)}</span>
        </div>
      )
    }
    
    if (walletType === 'standard' && publicKey) {
      const base58 = publicKey.toBase58()
      return (
        <div className="flex items-center gap-2">
          {walletIcon && (
            <img 
              src={walletIcon} 
              alt={walletName || "Wallet"} 
              className="h-4 w-4"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg"
              }}
            />
          )}
          <span>{base58.slice(0, 4)}...{base58.slice(-4)}</span>
        </div>
      )
    }

    if (children) {
      return children
    } else if (isLoadingLazorKit) {
      return (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          <span>{labels["connecting"]}</span>
        </div>
      )
    }
    
    return labels["has-wallet"]
  }, [mounted, walletType, smartWalletPubkey, publicKey, children, isLoadingLazorKit, labels, walletIcon, walletName, isLazorKitConnected])

  const handleDisconnect = useCallback(() => {
    if (walletType === 'lazorkit') {
      disconnectLazorKit()
      window.localStorage.removeItem('SMART_WALLET_ADDRESS')
      setWalletType('standard')
    } else if (onDisconnect) {
      onDisconnect()
    }
    setMenuOpen(false)
  }, [walletType, disconnectLazorKit, onDisconnect, setWalletType])

  const handleCopyAddress = useCallback(async () => {
    if (currentWalletAddress) {
      await navigator.clipboard.writeText(currentWalletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 400)
    }
  }, [currentWalletAddress])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isAnyWalletConnected) {
    return (
      <>
        <EnhancedWalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
        <Button
          {...props}
          onClick={() => {
            if (buttonState === "has-wallet" && onConnect) {
              onConnect()
            } else {
              setWalletModalOpen(true)
            }
          }}
        >
          {content}
        </Button>
      </>
    )
  }

  return (
    <>
      <EnhancedWalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button {...props}>
            {content}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {currentWalletAddress && (
            <DropdownMenuItem onClick={handleCopyAddress}>
              {copied ? labels["copied"] : labels["copy-address"]}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              setWalletModalOpen(true)
              setMenuOpen(false)
            }}
          >
            {labels["change-wallet"]}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisconnect}>
            {labels["disconnect"]}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

// Public Exported Button
export function ConnectWalletButton(props: WalletButtonProps) {
  return <BaseWalletMultiButton {...props} />
}