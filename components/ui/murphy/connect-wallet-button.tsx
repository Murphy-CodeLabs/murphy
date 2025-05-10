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
// ----- Label Constants -----
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
} as const

// ----- Props -----
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

// ----- Wallet List Item -----
export const WalletListItem: FC<WalletListItemProps> = ({ handleClick, tabIndex, wallet }) => (
  <Button onClick={handleClick} tabIndex={tabIndex} variant="outline" className="justify-start w-full">
    {wallet.adapter.icon && (
      <img
        src={wallet.adapter.icon || "/placeholder.svg"}
        alt={`${wallet.adapter.name} icon`}
        className="mr-2 h-5 w-5"
      />
    )}
    {wallet.adapter.name}
    {wallet.readyState === WalletReadyState.Installed && (
      <span className="ml-auto text-xs text-green-500">Installed</span>
    )}
  </Button>
)

// ----- Enhanced Wallet Modal Component -----
export const EnhancedWalletModal: FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ open, onOpenChange }) => {
  const { wallets, select } = useWallet()
  const [expanded, setExpanded] = useState(false)
  const { connect: connectLazorKit, disconnect: disconnectLazorKit, isLoading: isLoadingLazorKit, isConnected: isLazorKitConnected, smartWalletAuthorityPubkey } = useLazorKitWalletContext()

  // Access the modal context to get network information
  const modalContext = React.useContext(ModalContext)
  const isMainnet = modalContext?.isMainnet ?? true
  const { walletType, setWalletType } = modalContext || { walletType: 'standard', setWalletType: () => {} }

  const [listedWallets, collapsedWallets] = useMemo(() => {
    const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed)
    const notInstalled = wallets.filter((w) => w.readyState !== WalletReadyState.Installed)
    return installed.length ? [installed, notInstalled] : [notInstalled, []]
  }, [wallets])

  const handleWalletClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, walletName: string) => {
      event.preventDefault()
      select(walletName as WalletName)
      setWalletType('standard')
      onOpenChange(false)
    },
    [select, onOpenChange, setWalletType],
  )

  const handleLazorKitConnect = useCallback(async () => {
    try {
      await connectLazorKit()
      setWalletType('lazorkit')
      onOpenChange(false)
    } catch (error) {
      console.error("LazorKit connection error:", error)
    }
  }, [connectLazorKit, onOpenChange, setWalletType])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect wallet to continue</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Network:{" "}
            <span className={isMainnet ? "text-green-500" : "text-yellow-500"}>{isMainnet ? "Mainnet" : "Devnet"}</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="standard" className="w-full mt-2">
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
              <DialogDescription>
                LazorKit Wallet provides a way to integrate Solana smart wallet with Passkey support into your dApp.
              </DialogDescription>
              <Button 
                onClick={handleLazorKitConnect} 
                disabled={isLoadingLazorKit}
                className="w-full"
              >
                {isLoadingLazorKit 
                  ? "Connecting..." 
                  : "Connect with Passkey"}
              </Button>
              
              {/* Display wallet information if connected */}
              {isLazorKitConnected && (
                <div className="mt-2 text-sm">
                  <p className="text-green-500">Connected</p>
                  <p className="font-mono break-all">{smartWalletAuthorityPubkey || "No address"}</p>
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

// ----- Wallet Multi Button -----
export function BaseWalletMultiButton({ children, labels = LABELS, ...props }: Props) {
  // State hooks
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Context hooks
  const { buttonState, onConnect, onDisconnect, publicKey, walletIcon, walletName } = useWalletMultiButton({
    onSelectWallet() {
      setWalletModalOpen(true)
    },
  })
  
  const { connect: connectLazorKit, disconnect: disconnectLazorKit, isLoading: isLoadingLazorKit, isConnected: isLazorKitConnected, smartWalletAuthorityPubkey } = useLazorKitWalletContext()
  
  const modalContext = React.useContext(ModalContext)
  const { walletType, setWalletType } = modalContext || { walletType: 'standard', setWalletType: () => {} }

  // All useMemo must be declared here
  const isAnyWalletConnected = useMemo(() => {
    if (walletType === 'standard') {
      return !!publicKey
    } else {
      // Only check isConnected, not dependent on smartWalletAuthorityPubkey
      return isLazorKitConnected
    }
  }, [publicKey, isLazorKitConnected, walletType])

  const content = useMemo(() => {
    // Before component is mounted, always use "Select Wallet" to match SSR
    if (!mounted) {
      return labels["no-wallet"]
    }

    // When connected to LazorKit, show LazorKit address or public key
    if (walletType === 'lazorkit' && isLazorKitConnected) {
      const address = smartWalletAuthorityPubkey || (publicKey ? publicKey.toBase58() : null)
      return address ? address.slice(0, 4) + ".." + address.slice(-4) : "Connected"
    }
    
    // When connected to standard wallet, show address
    if (walletType === 'standard' && publicKey) {
      const base58 = publicKey.toBase58()
      return base58.slice(0, 4) + ".." + base58.slice(-4)
    }

    // When not connected, prioritize custom children text
    if (children) {
      return children
    } else if (buttonState === "connecting") {
      return labels["connecting"]
    } else {
      return labels["has-wallet"]
    }
  }, [buttonState, children, labels, publicKey, mounted, walletType, isLazorKitConnected, smartWalletAuthorityPubkey])

  const currentWalletAddress = useMemo(() => {
    if (walletType === 'lazorkit' && smartWalletAuthorityPubkey) {
      return smartWalletAuthorityPubkey
    } else if (walletType === 'standard' && publicKey) {
      return publicKey.toBase58()
    }
    return ""
  }, [walletType, smartWalletAuthorityPubkey, publicKey])

  // useEffect hooks
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handler functions
  const handleDisconnect = () => {
    if (walletType === 'lazorkit') {
      disconnectLazorKit()
      console.log('LazorKit Wallet disconnected')
    } else if (onDisconnect) {
      onDisconnect()
    }
    setMenuOpen(false)
  }

  // Render logic after declaring all hooks
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

  // If connected, show the dropdown menu
  return (
    <>
      <EnhancedWalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button {...props}>
            {walletType === 'standard' && walletIcon && (
              <img src={walletIcon || "/partner/solana-logo.svg"} alt="Wallet icon" className="mr-2 h-4 w-4" />
            )}
            {walletType === 'lazorkit' && (
              <img src="/partner/solana-logo.svg" alt="LazorKit Wallet" className="mr-2 h-4 w-4" />
            )}
            {content}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {currentWalletAddress && (
            <DropdownMenuItem
              onClick={async () => {
                await navigator.clipboard.writeText(currentWalletAddress)
                setCopied(true)
                setTimeout(() => setCopied(false), 400)
              }}
            >
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

// ----- Public Exported Button -----
export function ConnectWalletButton(props: WalletButtonProps) {
  return <BaseWalletMultiButton {...props} />
}