"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import useRecurringJupiter from "./useRecurringJupiter";
import { RecurringOrderCard } from "./RecurringOrderCard";
import { cn } from "@/lib/utils";

export function RecurringActiveOrders({ className }: { className?: string }) {
  const { publicKey, connected } = useWallet();
  const {
    loading,
    error,
    data,
    refetch,
  } = useRecurringJupiter("all", "active");

  // Auto-fetch data when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refetch();
    }
  }, [connected, publicKey, refetch]);

  if (!connected || !publicKey) {
    return (
      <Card className={cn("w-[400px] mx-auto px-6 py-4 rounded-xl shadow-sm", className)}>
        <CardHeader>
          <CardTitle>Active Recurring Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to view active orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-[400px] mx-auto px-6 py-4 rounded-xl shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between mb-2 p-0 border-none bg-transparent gap-2">
        <CardTitle className="flex-1 truncate">Active Recurring Orders</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={loading}
          className="min-w-[40px] flex items-center justify-center"
          aria-label="Refresh"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
        </Button>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        {error && (
          typeof error === "string" && error.trim().startsWith("{") && error.trim().endsWith("}")
            ? <div className="text-red-600 text-sm mb-2">No active recurring orders found.</div>
            : <div className="text-red-600 text-sm mb-2">{error}</div>
        )}
        {loading && <div className="text-muted-foreground">Loading orders...</div>}
        {!loading && (!data || data.length === 0) && (
          <div className="text-muted-foreground">No active recurring orders found.</div>
        )}
        <div className="flex flex-col gap-4">
          {data && data.map((order: any) => (
            <RecurringOrderCard key={order.id} order={order} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecurringActiveOrders; 
