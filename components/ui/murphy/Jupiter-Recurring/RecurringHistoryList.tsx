"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import useRecurringJupiter from "./useRecurringJupiter";
import { RecurringOrderCard } from "./RecurringOrderCard";
import { cn } from "@/lib/utils";

export function RecurringHistoryList({ className }: { className?: string }) {
  const { publicKey, connected } = useWallet();
  const {
    loading,
    error,
    data,
    refetch,
  } = useRecurringJupiter("all", "history");

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
          <CardTitle>Recurring Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to view order history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-[400px] mx-auto px-6 py-4 rounded-xl shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between mb-2 p-0 border-none bg-transparent gap-2">
        <CardTitle className="flex-1 truncate">Recurring Order History</CardTitle>
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
            ? <div className="text-red-600 text-sm mb-2">No order history found.</div>
            : <div className="text-red-600 text-sm mb-2">{error}</div>
        )}
        {loading && <div className="text-muted-foreground">Loading order history...</div>}
        {!loading && (!data || data.length === 0) && (
          <div className="text-muted-foreground">No order history found.</div>
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

export default RecurringHistoryList; 
