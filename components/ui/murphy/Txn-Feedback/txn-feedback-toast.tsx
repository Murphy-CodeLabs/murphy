"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { TxnFeedbackProps } from "@/types/transaction"

export function TxnFeedbackToast({ status, onRetry, onClose }: TxnFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (status.status !== "idle") {
      setIsVisible(true)
    }
  }, [status.status])

  useEffect(() => {
    if (status.status === "success") {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [status.status, onClose])

  if (!isVisible || status.status === "idle") return null

  const getIcon = () => {
    switch (status.status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "preparing":
      case "signing":
      case "sending":
      case "confirming":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getMessage = () => {
    switch (status.status) {
      case "preparing":
        return "Preparing transaction..."
      case "signing":
        return "Please sign the transaction"
      case "sending":
        return "Sending transaction..."
      case "confirming":
        return "Confirming transaction..."
      case "success":
        return "Transaction successful!"
      case "error":
        return status.error || "Transaction failed"
      default:
        return "Processing..."
    }
  }

  const getBgColor = () => {
    switch (status.status) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 max-w-sm w-full",
        "transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
    >
      <div className={cn("rounded-lg border p-4 shadow-lg", getBgColor())}>
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{getMessage()}</p>
            {status.signature && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                Signature: {status.signature.slice(0, 8)}...{status.signature.slice(-8)}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            {status.status === "error" && onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="text-xs bg-transparent">
                Retry
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsVisible(false)
                onClose?.()
              }}
              className="text-xs"
            >
              ×
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
