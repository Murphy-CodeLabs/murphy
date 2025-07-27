"use client"

import type React from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TxnExplorerLinkProps {
  signature: string
  cluster?: "mainnet-beta" | "testnet" | "devnet"
  children?: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  showIcon?: boolean
}

export function TxnExplorerLink({
  signature,
  cluster = "mainnet-beta",
  children,
  className,
  variant = "outline",
  size = "sm",
  showIcon = true,
}: TxnExplorerLinkProps) {
  const getExplorerUrl = () => {
    const baseUrl = "https://explorer.solana.com/tx"
    const clusterParam = cluster !== "mainnet-beta" ? `?cluster=${cluster}` : ""
    return `${baseUrl}/${signature}${clusterParam}`
  }

  const handleClick = () => {
    window.open(getExplorerUrl(), "_blank", "noopener,noreferrer")
  }

  return (
    <Button onClick={handleClick} variant={variant} size={size} className={cn(className)}>
      {children || (
        <>
          View on Explorer
          {showIcon && <ExternalLink className="w-4 h-4 ml-2" />}
        </>
      )}
    </Button>
  )
}
