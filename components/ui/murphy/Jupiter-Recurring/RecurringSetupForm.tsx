"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, CheckCircle, AlertCircle, Clock, Hash, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock TOKENS constant for demo
const TOKENS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSLUs2wyz9G1spG496EEefCcxyBmCEjz"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
}

export type RecurringSetupFormValues = {
  inputMint: string
  outputMint: string
  inAmount: number | undefined
  numberOfOrders: number
  interval: number // seconds
  minPrice?: number | null
  maxPrice?: number | null
  startAt?: number | null
}

const SUPPORTED_TOKENS = [
  { symbol: "SOL", mint: TOKENS.SOL.toString() },
  { symbol: "USDC", mint: TOKENS.USDC.toString() },
  { symbol: "USDT", mint: TOKENS.USDT.toString() },
]

const INTERVAL_PRESETS = [
  { label: "1 Hour", value: 3600 },
  { label: "6 Hours", value: 21600 },
  { label: "1 Day", value: 86400 },
  { label: "1 Week", value: 604800 },
]

export function RecurringSetupForm({
  onOrderCreated,
  className,
}: {
  onOrderCreated?: (orderId: string) => void
  className?: string
}) {
  const { publicKey, connected, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RecurringSetupFormValues>({
    defaultValues: {
      inputMint: SUPPORTED_TOKENS[1].mint, // USDC
      outputMint: SUPPORTED_TOKENS[0].mint, // SOL
      inAmount: undefined,
      numberOfOrders: 2,
      interval: 86400, // 1 day
      minPrice: null,
      maxPrice: null,
      startAt: null,
    },
    mode: "onSubmit",
  })

  // Only render after wallet is connected
  if (!connected || !publicKey) {
    return (
      <Card className={cn("max-w-2xl mx-auto", className)}>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Setup Recurring DCA Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please connect your wallet to continue.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Handle submit
  const onSubmit = async (values: RecurringSetupFormValues) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate
      if (!values.inAmount || values.inAmount <= 0) throw new Error("Amount must be greater than 0")
      if (values.inputMint === values.outputMint) throw new Error("Input and output tokens must be different")
      if (!publicKey) throw new Error("Wallet not connected")

      // Prepare payload for Jupiter Recurring API
      // Convert amount to raw (assume 6 decimals for USDC/USDT, 9 for SOL)
      const decimals = values.inputMint === TOKENS.SOL.toString() ? 9 : 6
      const inAmountRaw = Math.floor((values.inAmount || 0) * Math.pow(10, decimals))

      const payload = {
        user: publicKey.toString(),
        inputMint: values.inputMint,
        outputMint: values.outputMint,
        params: {
          time: {
            inAmount: inAmountRaw,
            numberOfOrders: values.numberOfOrders,
            interval: values.interval,
            minPrice: values.minPrice || null,
            maxPrice: values.maxPrice || null,
            startAt: values.startAt || null,
          },
        },
      }

      // Simulate API call for demo
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockTxId = "5j7K8L9M0N1O2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9"

      setSuccess(mockTxId)
      toast.success("Recurring DCA order created!", { description: `Tx: ${mockTxId}` })
      if (onOrderCreated) onOrderCreated(mockTxId)
    } catch (e: any) {
      setError(e.message || "Unknown error")
      toast.error("Failed to create recurring order", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedInputToken = SUPPORTED_TOKENS.find((t) => t.mint === form.watch("inputMint"))
  const selectedOutputToken = SUPPORTED_TOKENS.find((t) => t.mint === form.watch("outputMint"))

  return (
    <Card className={cn("max-w-2xl mx-auto", className)}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Setup Recurring DCA Order</CardTitle>
        <p className="text-muted-foreground mt-2">Automate your dollar-cost averaging strategy with recurring orders</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Token Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inputMint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">From Token</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {SUPPORTED_TOKENS.map((t) => (
                              <SelectItem key={t.mint} value={t.mint}>
                                {t.symbol}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputMint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">To Token</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {SUPPORTED_TOKENS.map((t) => (
                              <SelectItem key={t.mint} value={t.mint}>
                                {t.symbol}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Configuration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Order Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Amount per Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.000001}
                          placeholder="100"
                          className="h-12 text-lg"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfOrders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Number of Orders</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="10"
                          className="h-12 text-lg"
                          {...field}
                          value={field.value ?? 2}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Timing Configuration */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timing
              </h3>

              {/* Interval Presets */}
              <div className="space-y-3">
                <FormLabel className="text-base">Interval Presets</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {INTERVAL_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant={form.watch("interval") === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => form.setValue("interval", preset.value)}
                      disabled={isSubmitting}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Custom Interval (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={60}
                        step={60}
                        placeholder="86400"
                        className="h-12 text-lg"
                        {...field}
                        value={field.value ?? 86400}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Summary */}
            <div className="p-6 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Order Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-mono font-semibold">
                    {((form.watch("inAmount") || 0) * form.watch("numberOfOrders")).toLocaleString()}{" "}
                    {selectedInputToken?.symbol}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Frequency:</span>
                  <p className="font-mono font-semibold">
                    Every {Math.floor(form.watch("interval") / 3600)}h{" "}
                    {Math.floor((form.watch("interval") % 3600) / 60)}m
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-mono font-semibold">
                    ~{Math.floor((form.watch("interval") * form.watch("numberOfOrders")) / 86400)} days
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
              {isSubmitting ? "Creating Order..." : "Create Recurring Order"}
            </Button>

            {success && (
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center justify-between gap-2">
                    <span>Order created successfully!</span>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`https://solscan.io/tx/${success}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        View Tx <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <code className="block mt-2 text-xs font-mono break-all bg-emerald-100 dark:bg-emerald-900 p-2 rounded">
                    {success}
                  </code>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default RecurringSetupForm
