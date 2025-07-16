"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Check } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export interface RecurringOrder {
  id: string
  inputMint: string
  outputMint: string
  status: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}

function shortAddress(addr: string) {
  return addr ? addr.slice(0, 4) + "..." + addr.slice(-4) : "-"
}

export interface RecurringOrderCardProps {
  order: any
  className?: string
  style?: React.CSSProperties
}

export function RecurringOrderCard({ order, className, style }: RecurringOrderCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(order.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
        return "default"
      case "cancelled":
      case "expired":
      case "failed":
        return "destructive"
      case "pending":
      case "processing":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Card
      className={cn(
        "min-w-[420px] w-full max-w-md rounded-2xl border shadow-lg transition-shadow hover:shadow-xl",
        className,
      )}
      style={style}
    >
      <CardContent className="p-8 space-y-5">
        {/* Order ID */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Order ID</span>
          <div className="flex items-center gap-2">
            <code className="relative rounded bg-muted px-3 py-1.5 font-mono text-sm">{shortAddress(order.id)}</code>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              className={cn(
                "h-8 w-8 hover:bg-muted flex-shrink-0 transition-colors",
                copied && "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300",
              )}
              title={copied ? "Copied!" : "Copy Order ID"}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              asChild
              className="h-8 w-8 hover:bg-muted flex-shrink-0"
              title="View on Solscan"
            >
              <a href={`https://solscan.io/account/${order.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* From */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">From</span>
          <code className="relative rounded bg-muted px-3 py-1.5 font-mono text-sm">
            {shortAddress(order.inputMint)}
          </code>
        </div>

        {/* To */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">To</span>
          <code className="relative rounded bg-muted px-3 py-1.5 font-mono text-sm">
            {shortAddress(order.outputMint)}
          </code>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Status</span>
          <Badge variant={getStatusVariant(order.status)} className="font-medium uppercase tracking-wide px-3 py-1">
            {order.status}
          </Badge>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Created</span>
          <time className="text-sm text-muted-foreground font-mono">
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
          </time>
        </div>

        {/* Updated (if different from created) */}
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Updated</span>
            <time className="text-sm text-muted-foreground font-mono">
              {new Date(order.updatedAt).toLocaleString()}
            </time>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecurringOrderCard
