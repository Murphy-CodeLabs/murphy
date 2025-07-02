"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type RecurringType = "time" | "price";

interface CancelOrderResponse {
  requestId: string;
  transaction: string;
}

interface CancelOrderError {
  code: number;
  error: string;
  status: string;
}

export function CancelRecurringOrder({ className }: { className?: string }) {
  const { publicKey, connected, signTransaction } = useWallet();
  const [orderId, setOrderId] = useState("");
  const [recurringType, setRecurringType] = useState<RecurringType>("time");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    requestId?: string;
    transaction?: string;
  } | null>(null);

  const handleCancelOrder = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!orderId.trim()) {
      toast.error("Please enter an order ID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Step 1: Get cancel transaction from Jupiter API
      const cancelResponse = await fetch("https://lite-api.jup.ag/recurring/v1/cancelOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: orderId.trim(),
          user: publicKey.toString(),
          recurringType: recurringType,
        }),
      });

      const cancelData: CancelOrderResponse | CancelOrderError = await cancelResponse.json();

      if (!cancelResponse.ok) {
        const errorData = cancelData as CancelOrderError;
        throw new Error(errorData.error || `HTTP ${cancelResponse.status}: ${errorData.status}`);
      }

      const successData = cancelData as CancelOrderResponse;

      // Step 2: Execute the transaction
      const executeResponse = await fetch("https://lite-api.jup.ag/recurring/v1/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: successData.requestId,
          transaction: successData.transaction,
        }),
      });

      const executeData = await executeResponse.json();

      // Nếu API trả về transaction cần ký (giả sử có field 'needsSignature' và 'transaction')
      if (executeData.needsSignature && executeData.transaction) {
        try {
          const txBuffer = Buffer.from(executeData.transaction, "base64");
          // @ts-ignore
          const { Transaction } = await import("@solana/web3.js");
          const tx = Transaction.from(txBuffer);
          const signed = await signTransaction(tx);
          // Gửi giao dịch đã ký lên mạng
          const sendResp = await fetch("https://lite-api.jup.ag/recurring/v1/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: successData.requestId,
              transaction: Buffer.from(signed.serialize()).toString("base64"),
            }),
          });
          const sendData = await sendResp.json();
          if (!sendResp.ok) throw new Error(sendData.error || "Failed to send signed transaction");
          setResult({
            success: true,
            message: "Order cancelled and signed successfully!",
            requestId: successData.requestId,
            transaction: sendData.txid || sendData.transaction || executeData.transaction,
          });
          toast.success("Order cancelled and signed successfully!");
          setOrderId("");
          return;
        } catch (e: any) {
          setResult({ success: false, message: e.message || "Failed to sign transaction" });
          toast.error(e.message || "Failed to sign transaction");
          setLoading(false);
          return;
        }
      }

      if (!executeResponse.ok) {
        throw new Error(executeData.error || `Failed to execute transaction: ${executeResponse.status}`);
      }

      setResult({
        success: true,
        message: "Order cancelled successfully!",
        requestId: successData.requestId,
        transaction: executeData.txid || executeData.transaction || successData.transaction,
      });

      toast.success("Order cancelled successfully!");
      
      // Clear form
      setOrderId("");

    } catch (error: any) {
      console.error("Cancel order error:", error);
      setResult({
        success: false,
        message: error.message || "Failed to cancel order",
      });
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey) {
    return (
      <Card className={cn("w-full max-w-md mx-auto px-6 py-4 rounded-xl shadow-sm", className)}>
        <CardHeader>
          <CardTitle>Cancel Recurring Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to cancel recurring orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto px-6 py-4 rounded-xl shadow-sm", className)}>
      <CardHeader className="p-0 mb-4 border-none bg-transparent">
        <CardTitle>Cancel Recurring Order</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {/* Order ID Input */}
        <div className="space-y-2">
          <Label htmlFor="orderId">Order ID</Label>
          <Input
            id="orderId"
            placeholder="Enter order ID to cancel..."
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            disabled={loading}
            className="break-all"
          />
        </div>

        {/* Recurring Type Select */}
        <div className="space-y-2">
          <Label htmlFor="recurringType">Recurring Type</Label>
          <Select value={recurringType} onValueChange={(value: RecurringType) => setRecurringType(value)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Select recurring type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time-based</SelectItem>
              <SelectItem value="price">Price-based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Warning Alert */}
        <Alert className="w-full border-orange-200 bg-orange-50 pl-0">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 text-left">
            This action will permanently cancel your recurring order. This action cannot be undone.
          </AlertDescription>
        </Alert>

        {/* Cancel Button */}
        <Button
          onClick={handleCancelOrder}
          disabled={loading || !orderId.trim()}
          className="w-full"
          variant="destructive"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cancelling Order...
            </>
          ) : (
            "Cancel Order"
          )}
        </Button>

        {/* Result Display */}
        {result && (
          <div className="mt-4 w-full">
            {result.success ? (
              <Alert className="w-full border-green-200 bg-green-50 overflow-x-auto">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-left">
                  <div className="space-y-2">
                    <p className="font-medium break-all">{result.message}</p>
                    {result.requestId && (
                      <div className="text-sm break-all">
                        <span className="font-medium">Request ID:</span>{" "}
                        <span className="font-mono bg-green-100 px-1 rounded break-all">{result.requestId}</span>
                      </div>
                    )}
                    {result.transaction && (
                      <div className="text-sm break-all flex items-center gap-2">
                        <span className="font-medium">Transaction:</span>{" "}
                        <span className="font-mono bg-green-100 px-1 rounded break-all">{result.transaction}</span>
                        <a
                          href={`https://explorer.solana.com/tx/${result.transaction}?cluster=mainnet-beta`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 underline text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View on Explorer
                        </a>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="w-full border-red-200 bg-red-50 overflow-x-auto pl-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 break-all text-left">
                  <div className="space-y-2">
                    <p className="font-medium">Cancellation Failed</p>
                    <p className="text-sm break-all">{result.message}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Enter the order ID you want to cancel</li>
            <li>Select the recurring type (time or price-based)</li>
            <li>Click "Cancel Order" to submit the cancellation</li>
            <li>The transaction will be signed and sent to the network</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default CancelRecurringOrder; 
