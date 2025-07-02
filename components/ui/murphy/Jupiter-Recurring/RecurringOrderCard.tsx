"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RecurringOrder {
  id: string;
  inputMint: string;
  outputMint: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

function shortAddress(addr: string) {
  return addr ? addr.slice(0, 4) + "..." + addr.slice(-4) : "-";
}

export interface RecurringOrderCardProps {
  order: any;
  className?: string;
  style?: React.CSSProperties;
}

export function RecurringOrderCard({ order, className, style }: RecurringOrderCardProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
        return "default";
      case "cancelled":
      case "expired":
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className={cn("min-w-[340px] p-6 rounded-2xl shadow-xl bg-neutral-950", className)} style={style}>
      <CardContent className="p-0 flex flex-col gap-3">
        {/* Order ID */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Order ID</span>
          <span className="flex items-center gap-1">
            <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{shortAddress(order.id)}</span>
            <Button size="icon" variant="ghost" onClick={handleCopy} className="h-6 w-6" title="Copy Order ID">
              <Copy size={14} />
            </Button>
            <a href={`https://solscan.io/account/${order.id}`} target="_blank" rel="noopener noreferrer" title="View on Solscan">
              <ExternalLink size={15} className="text-muted-foreground hover:text-primary" />
            </a>
            {copied && <span className="text-green-500 ml-1 text-xs">Copied!</span>}
          </span>
        </div>
        {/* From */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground font-medium">From</span>
          <span className="font-mono bg-muted px-2 py-0.5 rounded">{shortAddress(order.inputMint)}</span>
        </div>
        {/* To */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground font-medium">To</span>
          <span className="font-mono bg-muted px-2 py-0.5 rounded">{shortAddress(order.outputMint)}</span>
        </div>
        {/* Status */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Status</span>
          <Badge variant={getStatusVariant(order.status)} className="uppercase tracking-wide px-3 py-0.5 text-xs">
            {order.status}
          </Badge>
        </div>
        {/* Created */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Created</span>
          <span className="font-mono text-xs">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</span>
        </div>
        {/* Updated (if different from created) */}
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Updated</span>
            <span className="font-mono text-xs">{new Date(order.updatedAt).toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecurringOrderCard; 