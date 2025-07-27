"use client"

import { useState, useEffect } from "react"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PendingTransaction {
  id: string
  signature?: string
  description: string
  startTime: number
}

interface TxnPendingIndicatorProps {
  transactions: PendingTransaction[]
  onCancel?: (id: string) => void
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  className?: string
}

export function TxnPendingIndicator({
  transactions,
  onCancel,
  position = "bottom-right",
  className,
}: TxnPendingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (transactions.length === 0) {
      setIsExpanded(false)
    }
  }, [transactions.length])

  if (transactions.length === 0) return null

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  }

  const getElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    if (elapsed < 60) return `${elapsed}s`
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
  }

  return (
    <div className={cn("fixed z-50 max-w-sm", positionClasses[position], className)}>
      {!isExpanded ? (
        <Button onClick={() => setIsExpanded(true)} className="rounded-full shadow-lg" size="sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {transactions.length} pending
          <Badge variant="secondary" className="ml-2">
            {transactions.length}
          </Badge>
        </Button>
      ) : (
        <div className="bg-white rounded-lg shadow-lg border p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Pending Transactions</h3>
            <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)} className="h-6 w-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{getElapsedTime(tx.startTime)}</p>
                  </div>
                </div>
                {onCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(tx.id)}
                    className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
