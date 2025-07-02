"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import useRecurringJupiter, { RecurringType, OrderStatus } from "./useRecurringJupiter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RecurringOrderCard } from "./RecurringOrderCard";
import { cn } from "@/lib/utils";
import { RefreshCw, FolderOpen } from "lucide-react";

const RECURRING_TYPE_OPTIONS: { label: string; value: RecurringType }[] = [
  { label: "Time-based", value: "time" },
  { label: "Price-based", value: "price" },
  { label: "All", value: "all" },
];
const ORDER_STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "Active", value: "active" },
  { label: "History", value: "history" },
];

const LOCAL_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
  { label: "Failed", value: "failed" },
];

export function RecurringOrderWidget({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { publicKey, connected } = useWallet();
  const {
    loading,
    error,
    data,
    recurringType,
    orderStatus,
    includeFailedTx,
    setRecurringType,
    setOrderStatus,
    setIncludeFailedTx,
    refetch,
  } = useRecurringJupiter();

  const [localStatus, setLocalStatus] = useState<string>("all");

  useEffect(() => {
    if (connected && publicKey) {
      refetch();
    }
    // eslint-disable-next-line
  }, [connected, publicKey]);

  if (!connected || !publicKey) {
    return (
      <Card className={cn("max-w-md mx-auto", className)}>
        <CardHeader>
          <CardTitle>Recurring Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to view your recurring orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full bg-neutral-950 border border-neutral-800 shadow-2xl rounded-2xl p-0 flex flex-col", className)} style={style}>
      <CardHeader className="flex flex-col gap-1 px-8 pt-8 pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle className="text-2xl font-extrabold text-white tracking-tight">Your Recurring Orders</CardTitle>
          <span className="text-sm text-neutral-400 font-normal">All your DCA orders in one place</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-8 pb-8">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full mb-2">
          <div className="flex flex-1 flex-col md:flex-row gap-4">
            <Select value={recurringType} onValueChange={(v) => setRecurringType(v as RecurringType, orderStatus, includeFailedTx)}>
              <SelectTrigger className="min-w-[140px] bg-neutral-900 border border-neutral-800 text-white focus:ring-2 focus:ring-violet-600 rounded-lg px-4 py-2">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orderStatus} onValueChange={(v) => { setOrderStatus(v as OrderStatus); setLocalStatus("all"); }}>
              <SelectTrigger className="min-w-[120px] bg-neutral-900 border border-neutral-800 text-white focus:ring-2 focus:ring-violet-600 rounded-lg px-4 py-2">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orderStatus === "history" && (
              <Select value={localStatus} onValueChange={setLocalStatus}>
                <SelectTrigger className="min-w-[120px] bg-neutral-900 border border-neutral-800 text-white focus:ring-2 focus:ring-violet-600 rounded-lg px-4 py-2">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {LOCAL_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <Switch checked={includeFailedTx} onCheckedChange={setIncludeFailedTx} id="failedtx" />
              <label htmlFor="failedtx" className="text-xs text-neutral-300 whitespace-nowrap">Include Failed Tx</label>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={loading} className="min-w-[100px] bg-neutral-900 border border-violet-700 text-violet-400 hover:bg-violet-950 hover:text-white font-semibold rounded-lg transition">
              {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : "Refresh"}
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[180px]">
          {error && typeof error === "string" && (
            error.trim().startsWith("{") && error.trim().endsWith("}")
              ? <div className="text-red-600 text-base mb-2">No orders found or API returned empty result.</div>
              : <div className="text-red-600 text-base mb-2">{error}</div>
          )}
          {loading && <div className="text-neutral-400 text-base">Loading orders...</div>}
          {!loading && (!data || data.length === 0) && (
            <div className="flex flex-col items-center gap-2 mt-6">
              <FolderOpen className="w-12 h-12 text-neutral-700 mb-2" />
              <div className="text-lg text-neutral-400 font-medium">No recurring orders found.</div>
            </div>
          )}
          <div className="flex flex-col w-full gap-2 mt-2">
            {data && data
              .filter((order: any) => {
                if (orderStatus !== "history") return true;
                if (localStatus === "all") return true;
                return order.status.toLowerCase() === localStatus.toLowerCase();
              })
              .map((order: any) => (
                <div key={order.id} className="w-full border-b border-neutral-800 last:border-b-0 hover:bg-neutral-900/80 transition rounded-lg px-2 py-2">
                  <RecurringOrderCard order={order} className="bg-transparent border-none shadow-none p-0" />
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecurringOrderWidget; 
