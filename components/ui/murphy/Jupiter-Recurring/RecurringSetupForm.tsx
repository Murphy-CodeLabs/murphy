"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOKENS } from "@/constants/swap/jupiter-constants";
import { cn } from "@/lib/utils";

// Murphy style: atomic, composable, real API only

export type RecurringSetupFormValues = {
  inputMint: string;
  outputMint: string;
  inAmount: number | undefined;
  numberOfOrders: number;
  interval: number; // seconds
  minPrice?: number | null;
  maxPrice?: number | null;
  startAt?: number | null;
};

const SUPPORTED_TOKENS = [
  { symbol: "SOL", mint: TOKENS.SOL.toString() },
  { symbol: "USDC", mint: TOKENS.USDC.toString() },
  { symbol: "USDT", mint: TOKENS.USDT.toString() },
];

export function RecurringSetupForm({ onOrderCreated, className }: { onOrderCreated?: (orderId: string) => void; className?: string }) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  });

  // Murphy: only render after wallet is connected
  if (!connected || !publicKey) {
    return (
      <Card className={cn("max-w-md mx-auto", className)}>
        <CardHeader>
          <CardTitle>Setup Recurring DCA Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to continue.</p>
        </CardContent>
      </Card>
    );
  }

  // Murphy: handle submit
  const onSubmit = async (values: RecurringSetupFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Validate
      if (!values.inAmount || values.inAmount <= 0) throw new Error("Amount must be greater than 0");
      if (values.inputMint === values.outputMint) throw new Error("Input and output tokens must be different");
      if (!publicKey) throw new Error("Wallet not connected");

      // Prepare payload for Jupiter Recurring API
      // Convert amount to raw (assume 6 decimals for USDC/USDT, 9 for SOL)
      const decimals = values.inputMint === TOKENS.SOL.toString() ? 9 : 6;
      const inAmountRaw = Math.floor((values.inAmount || 0) * Math.pow(10, decimals));

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
      };

      // Call Jupiter Recurring API (mainnet, no mock)
      const resp = await fetch("https://lite-api.jup.ag/recurring/v1/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok || !data.transaction) {
        throw new Error(data.error || "Failed to create order");
      }

      // Sign and send transaction
      const txBuf = Buffer.from(data.transaction, "base64");
      // @ts-ignore
      const tx = (window as any).VersionedTransaction
        ? new (window as any).VersionedTransaction(txBuf)
        : (await import("@solana/web3.js")).VersionedTransaction.deserialize(txBuf);
      const signed = await signTransaction?.(tx);
      if (!signed) throw new Error("Transaction signing failed");
      const txid = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(txid, "confirmed");

      setSuccess(txid);
      toast.success("Recurring DCA order created!", { description: `Tx: ${txid}` });
      if (onOrderCreated) onOrderCreated(txid);
    } catch (e: any) {
      setError(e.message || "Unknown error");
      toast.error("Failed to create recurring order", { description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle>Setup Recurring DCA Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="inputMint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Token</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {SUPPORTED_TOKENS.map((t) => (
                                <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
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
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="outputMint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Token</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {SUPPORTED_TOKENS.map((t) => (
                                <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
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
            </div>
            <FormField
              control={form.control}
              name="inAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.000001}
                      placeholder="Amount to DCA (e.g. 100)"
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
                  <FormLabel>Number of Orders</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Number of DCA cycles"
                      {...field}
                      value={field.value ?? 2}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interval (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={60}
                      step={60}
                      placeholder="Interval between orders (e.g. 86400 = 1 day)"
                      {...field}
                      value={field.value ?? 86400}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Optional: minPrice, maxPrice, startAt */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Recurring Order"}
            </Button>
            {success && (
              <div className="text-green-600 text-sm break-all mt-2">
                Success! Tx: <a href={`https://solscan.io/tx/${success}`} target="_blank" rel="noopener noreferrer" className="underline">{success}</a>
              </div>
            )}
            {error && (
              <div className="text-red-600 text-sm mt-2">{error}</div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default RecurringSetupForm; 
