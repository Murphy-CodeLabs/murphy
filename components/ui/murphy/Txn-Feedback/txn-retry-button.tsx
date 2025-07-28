"use client"

import type React from "react"
import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TxnRetryButtonProps {
  onRetry: () => Promise<void> | void
  disabled?: boolean
  maxRetries?: number
  retryDelay?: number
  children?: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function TxnRetryButton({
  onRetry,
  disabled = false,
  maxRetries = 3,
  retryDelay = 1000,
  children = "Retry",
  className,
  variant = "default",
  size = "default",
}: TxnRetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleRetry = async () => {
    if (retryCount >= maxRetries || isRetrying) return

    setIsRetrying(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      await onRetry()
      setRetryCount(0)
    } catch (error) {
      setRetryCount((prev) => prev + 1)
      console.error("Retry failed:", error)
    } finally {
      setIsRetrying(false)
    }
  }

  const isDisabled = disabled || isRetrying || retryCount >= maxRetries

  return (
    <Button onClick={handleRetry} disabled={isDisabled} variant={variant} size={size} className={cn(className)}>
      <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
      {isRetrying ? "Retrying..." : children}
      {retryCount > 0 && (
        <span className="ml-1 text-xs opacity-70">
          ({retryCount}/{maxRetries})
        </span>
      )}
    </Button>
  )
}
