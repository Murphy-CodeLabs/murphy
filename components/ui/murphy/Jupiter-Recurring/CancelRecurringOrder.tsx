"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Info, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type RecurringType = "time" | "price"

interface CancelOrderResponse {
  requestId: string
  transaction: string
}

interface CancelOrderError {
  code: number
  error: string
  status: string
}

export function CancelRecurringOrder({ className }: { className?: string }) {
  const { publicKey, connected, signTransaction } = useWallet()
  const [orderId, setOrderId] = useState("")
  const [recurringType, setRecurringType] = useState<RecurringType>("time")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    requestId?: string
    transaction?: string
  } | null>(null)

  const handleCancelOrder = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!orderId.trim()) {
      toast.error("Please enter an order ID")
      return
    }

    setLoading(true)
    setResult(null)

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
      })

      const cancelData: CancelOrderResponse | CancelOrderError = await cancelResponse.json()

      if (!cancelResponse.ok) {
        const errorData = cancelData as CancelOrderError
        throw new Error(errorData.error || `HTTP ${cancelResponse.status}: ${errorData.status}`)
      }

      const successData = cancelData as CancelOrderResponse

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
      })

      const executeData = await executeResponse.json()

      // Nếu API trả về transaction cần ký (giả sử có field 'needsSignature' và 'transaction')
      if (executeData.needsSignature && executeData.transaction) {
        try {
          const txBuffer = Buffer.from(executeData.transaction, "base64")
          // @ts-ignore
          const { Transaction } = await import("@solana/web3.js")
          const tx = Transaction.from(txBuffer)
          const signed = await signTransaction(tx)

          // Gửi giao dịch đã ký lên mạng
          const sendResp = await fetch("https://lite-api.jup.ag/recurring/v1/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: successData.requestId,
              transaction: Buffer.from(signed.serialize()).toString("base64"),
            }),
          })

          const sendData = await sendResp.json()
          if (!sendResp.ok) throw new Error(sendData.error || "Failed to send signed transaction")

          setResult({
            success: true,
            message: "Order cancelled and signed successfully!",
            requestId: successData.requestId,
            transaction: sendData.txid || sendData.transaction || executeData.transaction,
          })
          toast.success("Order cancelled and signed successfully!")
          setOrderId("")
          return
        } catch (e: any) {
          setResult({ success: false, message: e.message || "Failed to sign transaction" })
          toast.error(e.message || "Failed to sign transaction")
          setLoading(false)
          return
        }
      }

      if (!executeResponse.ok) {
        throw new Error(executeData.error || `Failed to execute transaction: ${executeResponse.status}`)
      }

      setResult({
        success: true,
        message: "Order cancelled successfully!",
        requestId: successData.requestId,
        transaction: executeData.txid || executeData.transaction || successData.transaction,
      })
      toast.success("Order cancelled successfully!")

      // Clear form
      setOrderId("")
    } catch (error: any) {
      console.error("Cancel order error:", error)
      setResult({
        success: false,
        message: error.message || "Failed to cancel order",
      })
      toast.error(error.message || "Failed to cancel order")
    } finally {
      setLoading(false)
    }
  }

  if (!connected || !publicKey) {
    return (
      <Card className={cn("max-w-2xl mx-auto", className)}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cancel Recurring Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>Please connect your wallet to cancel recurring orders.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("max-w-2xl mx-auto", className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Cancel Recurring Order</CardTitle>
        <p className="text-muted-foreground mt-1">Permanently cancel your active recurring DCA orders</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5" />
            Order Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-base">
                Order ID
              </Label>
              <Input
                id="orderId"
                placeholder="Enter order ID to cancel..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                disabled={loading}
                className="h-12 text-lg font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringType" className="text-base">
                Recurring Type
              </Label>
              <Select
                value={recurringType}
                onValueChange={(value: RecurringType) => setRecurringType(value)}
                disabled={loading}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select recurring type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">Time-based</SelectItem>
                  <SelectItem value="price">Price-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Warning */}
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Warning: This action cannot be undone</p>
              <p className="text-sm">
                Cancelling this recurring order will permanently stop all future executions. Make sure you have the
                correct Order ID before proceeding.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Button */}
        <Button
          onClick={handleCancelOrder}
          disabled={loading || !orderId.trim()}
          className="w-full h-12 text-lg"
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
          <div className="space-y-4">
            {result.success ? (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{result.message}</p>

                    {result.requestId && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Request ID:</span>
                        <code className="block text-xs font-mono bg-muted p-2 rounded break-all">
                          {result.requestId}
                        </code>
                      </div>
                    )}

                    {result.transaction && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Transaction:</span>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`https://explorer.solana.com/tx/${result.transaction}?cluster=mainnet-beta`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              View on Explorer <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                        <code className="block text-xs font-mono bg-muted p-2 rounded break-all">
                          {result.transaction}
                        </code>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-base">Cancellation Failed</p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-mono break-all">{result.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Please check your Order ID and try again. If the problem persists, contact support.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">How to Cancel Orders:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Enter the Order ID from your recurring order</li>
            <li>Select the correct recurring type (time-based or price-based)</li>
            <li>Review the warning and click "Cancel Order"</li>
            <li>Sign the transaction when prompted by your wallet</li>
            <li>Wait for confirmation on the Solana network</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Tip:</strong> You can find your Order ID in your order history or transaction records.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default CancelRecurringOrder
