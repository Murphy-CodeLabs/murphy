"use client";

import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectWalletButton } from "./connect-wallet-button";

// Icons
import {
  Loader2,
  Upload,
  Plus,
  X,
  Copy,
  ExternalLink,
  Users,
  Send,
  Coins,
  DollarSign,
  Settings,
  CheckCircle,
  AlertTriangle,
  FileText
} from "lucide-react";

// Notifications
import { toast } from "sonner";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Types
interface HydraFanoutResult {
  fanout: string;
  distributionSignatures: string[];
  totalRecipients: number;
  totalAmount: number;
  successfulTransfers: number;
  failedTransfers: number;
}

interface Recipient {
  address: string;
  amount: number;
  share: number;
}

type DistributionType = 'fixed' | 'percentage' | 'equal';
type TokenType = 'SOL' | 'SPL';

// Form Schema
const formSchema = z.object({
  distributionType: z.enum(['fixed', 'percentage', 'equal']),
  tokenType: z.enum(['SOL', 'SPL']),
  tokenMint: z.string(),
  totalAmount: z.number().min(0, "Amount must be non-negative"),
  recipients: z.array(z.object({
    address: z.string(),
    amount: z.number().min(0, "Amount must be non-negative"),
    share: z.number().min(0).max(100),
  })).min(1, "At least one recipient is required"),
  batchSize: z.number().min(1).max(20),
  delayBetweenBatches: z.number().min(0).max(5000),
  enableFanout: z.boolean(),
  fanoutName: z.string(),
  csvData: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface HydraFanoutFormProps {
  className?: string;
  onDistributionComplete?: (result: HydraFanoutResult) => void;
  defaultTokenType?: TokenType;
}

export function HydraFanoutForm({
  className,
  onDistributionComplete,
  defaultTokenType = 'SOL'
}: HydraFanoutFormProps) {
  // Hooks
  const { publicKey, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { endpoint } = useContext(ModalContext);

  // State
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'processing' | 'success' | 'error'>('input');
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<HydraFanoutResult | null>(null);
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');
  const [activeFormTab, setActiveFormTab] = useState("setup");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distributionType: 'fixed',
      tokenType: defaultTokenType,
      tokenMint: "",
      totalAmount: 0,
      recipients: [{ address: "", amount: 0, share: 0 }],
      batchSize: 10,
      delayBetweenBatches: 1000,
      enableFanout: false,
      fanoutName: "",
      csvData: "",
    },
  });

  // Effects
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (endpoint) {
      setNetwork(endpoint.includes('devnet') ? 'devnet' : 'mainnet');
    }
  }, [endpoint]);

  // Helper functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const viewInExplorer = (address: string, type: 'address' | 'tx' = 'address') => {
    const baseUrl = network === 'devnet'
      ? `https://explorer.solana.com/${type}/`
      : `https://solscan.io/${type === 'address' ? 'account' : 'tx'}/`;
    window.open(
      `${baseUrl}${address}${network === 'devnet' ? '?cluster=devnet' : ''}`,
      '_blank'
    );
  };

  // Recipient management
  const addRecipient = () => {
    const currentRecipients = form.getValues('recipients');
    form.setValue('recipients', [
      ...currentRecipients,
      { address: "", amount: 0, share: 0 }
    ]);
  };

  const removeRecipient = (index: number) => {
    const currentRecipients = form.getValues('recipients');
    if (currentRecipients.length > 1) {
      form.setValue('recipients', currentRecipients.filter((_, i) => i !== index));
    }
  };

  // CSV import functionality
  const handleCSVImport = (csvText: string) => {
    if (!csvText || csvText.trim() === '') {
      toast.error("Please enter CSV data");
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const recipients: Recipient[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(part => part.trim());
        if (parts.length < 2) {
          throw new Error(`Invalid CSV format at line ${i + 1}. Expected: address,amount`);
        }

        const address = parts[0];
        const amount = parseFloat(parts[1]);

        if (!address || isNaN(amount) || amount < 0) {
          throw new Error(`Invalid data at line ${i + 1}`);
        }

        // Ensure all required properties are set
        recipients.push({
          address,
          amount,
          share: 0  // Default share value
        });
      }

      if (recipients.length === 0) {
        throw new Error("No valid recipients found in CSV");
      }

      form.setValue('recipients', recipients);
      form.setValue('csvData', ''); // Clear CSV data after import
      toast.success(`Imported ${recipients.length} recipients from CSV`);
    } catch (err: any) {
      toast.error("CSV Import Error: " + err.message);
    }
  };

  // Calculate equal distribution
  const calculateEqualDistribution = () => {
    const totalAmount = form.getValues('totalAmount') || 0;
    const recipients = form.getValues('recipients');
    const amountPerRecipient = totalAmount / recipients.length;

    const updatedRecipients = recipients.map(recipient => ({
      ...recipient,
      amount: amountPerRecipient
    }));

    form.setValue('recipients', updatedRecipients);
  };

  // Validate recipients
  const validateRecipients = (recipients: Recipient[]): string | null => {
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Validate address
      if (!recipient.address || recipient.address.trim() === '') {
        return `Address is required for recipient ${i + 1}`;
      }

      try {
        new PublicKey(recipient.address);
      } catch {
        return `Invalid address at recipient ${i + 1}`;
      }

      // Validate amounts based on distribution type
      const distributionType = form.getValues('distributionType');

      if (distributionType === 'fixed' && (!recipient.amount || recipient.amount <= 0)) {
        return `Invalid amount at recipient ${i + 1}`;
      }

      if (distributionType === 'percentage' && (!recipient.share || recipient.share <= 0)) {
        return `Invalid share at recipient ${i + 1}`;
      }
    }

    // Validate percentage totals
    if (form.getValues('distributionType') === 'percentage') {
      const totalShare = recipients.reduce((sum, r) => sum + (r.share || 0), 0);
      if (Math.abs(totalShare - 100) > 0.01) {
        return `Total shares must equal 100% (currently ${totalShare}%)`;
      }
    }

    return null;
  };

  // Create SOL transfer instruction
  const createSOLTransferInstruction = (to: PublicKey, amount: number) => {
    return SystemProgram.transfer({
      fromPubkey: publicKey!,
      toPubkey: to,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    });
  };

  // Create SPL token transfer instruction
  const createSPLTransferInstruction = async (to: PublicKey, mint: PublicKey, amount: number) => {
    const fromTokenAccount = await getAssociatedTokenAddress(mint, publicKey!);
    const toTokenAccount = await getAssociatedTokenAddress(mint, to);

    return createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      publicKey!,
      Math.floor(amount * Math.pow(10, 9)), // Assuming 9 decimals
    );
  };

  // Process batch distribution
  const processBatch = async (recipients: Recipient[], batchIndex: number) => {
    const transaction = new Transaction();
    const values = form.getValues();

    for (const recipient of recipients) {
      const recipientPubkey = new PublicKey(recipient.address);

      if (values.tokenType === 'SOL') {
        const instruction = createSOLTransferInstruction(recipientPubkey, recipient.amount || 0);
        transaction.add(instruction);
      } else if (values.tokenType === 'SPL' && values.tokenMint) {
        const mintPubkey = new PublicKey(values.tokenMint);
        const instruction = await createSPLTransferInstruction(recipientPubkey, mintPubkey, recipient.amount || 0);
        transaction.add(instruction);
      }
    }

    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey!;

    // Sign and send transaction
    const signature = await wallet!.adapter.sendTransaction(transaction, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature);

    return signature;
  };

  // Main submission handler
  const onSubmit = async (values: FormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate recipients
    const validationError = validateRecipients(values.recipients);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage('confirming');
      setError("");

      toast.loading("Starting distribution...", { id: "distribution" });

      // Prepare recipients based on distribution type
      let finalRecipients: Recipient[] = [...values.recipients];

      if (values.distributionType === 'percentage') {
        // Calculate amounts from percentages
        finalRecipients = values.recipients.map(r => ({
          ...r,
          amount: (values.totalAmount * r.share) / 100
        }));
      } else if (values.distributionType === 'equal') {
        // Calculate equal amounts
        const amountPerRecipient = values.totalAmount / values.recipients.length;
        finalRecipients = values.recipients.map(r => ({
          ...r,
          amount: amountPerRecipient
        }));
      }

      // Process in batches
      const signatures: string[] = [];
      const batchSize = values.batchSize;
      const batches = [];

      for (let i = 0; i < finalRecipients.length; i += batchSize) {
        batches.push(finalRecipients.slice(i, i + batchSize));
      }

      setCurrentStage('processing');
      setProgress({ current: 0, total: batches.length });

      let successfulTransfers = 0;
      let failedTransfers = 0;

      for (let i = 0; i < batches.length; i++) {
        try {
          const signature = await processBatch(batches[i], i);
          signatures.push(signature);
          successfulTransfers += batches[i].length;

          setProgress({ current: i + 1, total: batches.length });

          // Delay between batches
          if (i < batches.length - 1 && values.delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, values.delayBetweenBatches));
          }
        } catch (err) {
          console.error(`Batch ${i + 1} failed:`, err);
          failedTransfers += batches[i].length;
        }
      }

      // Set result
      const totalAmount = finalRecipients.reduce((sum, r) => sum + (r.amount || 0), 0);
      const result: HydraFanoutResult = {
        fanout: values.enableFanout ? `fanout-${Date.now()}` : "",
        distributionSignatures: signatures,
        totalRecipients: finalRecipients.length,
        totalAmount,
        successfulTransfers,
        failedTransfers
      };

      setResult(result);
      setCurrentStage('success');

      if (onDistributionComplete) {
        onDistributionComplete(result);
      }

      toast.success(`Distribution completed! ${successfulTransfers}/${finalRecipients.length} successful`, {
        id: "distribution"
      });

    } catch (err: any) {
      console.error("Distribution error:", err);
      setError(err.message || "Distribution failed");
      setCurrentStage('error');

      toast.error("Distribution failed", {
        id: "distribution",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage('input');
    setError("");
    setProgress({ current: 0, total: 0 });
  };

  // Render stages
  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-2 text-lg font-semibold">Distribution Completed!</h3>
        <p className="text-muted-foreground">Your tokens have been distributed</p>
      </div>

      {result && (
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Total Recipients</Label>
                <p className="text-sm">{result.totalRecipients}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Amount</Label>
                <p className="text-sm">{result.totalAmount.toFixed(6)} {form.getValues('tokenType')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Successful</Label>
                <p className="text-sm text-green-600">{result.successfulTransfers}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Failed</Label>
                <p className="text-sm text-red-600">{result.failedTransfers}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Transactions ({result.distributionSignatures.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.distributionSignatures.map((sig, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs font-mono">
                      {sig.slice(0, 8)}...{sig.slice(-8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewInExplorer(sig, 'tx')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button onClick={resetForm} className="w-full">
        Create New Distribution
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <X className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold">Distribution Failed</h3>
      <div className="bg-destructive/10 text-destructive rounded-lg p-4">
        <p className="text-sm">{error}</p>
      </div>
      <Button onClick={() => setCurrentStage('input')} className="w-full">
        Try Again
      </Button>
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold">Processing Distribution</h3>
      <p className="text-muted-foreground">
        Processing batch {progress.current} of {progress.total}...
      </p>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderConfirming = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold">Preparing Distribution</h3>
      <p className="text-muted-foreground">
        Please confirm the transactions in your wallet...
      </p>
    </div>
  );

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            {/* Distribution Type */}
            <FormField
              control={form.control}
              name="distributionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distribution Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select distribution type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="equal">Equal Split</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Token Type */}
            <FormField
              control={form.control}
              name="tokenType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Type</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="SOL">
                          <DollarSign className="h-4 w-4 mr-2" />
                          SOL
                        </TabsTrigger>
                        <TabsTrigger value="SPL">
                          <Coins className="h-4 w-4 mr-2" />
                          SPL Token
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SPL Token Mint */}
            {form.watch('tokenType') === 'SPL' && (
              <FormField
                control={form.control}
                name="tokenMint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Mint Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter SPL token mint address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Total Amount */}
            {(form.watch('distributionType') === 'percentage' || form.watch('distributionType') === 'equal') && (
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount to Distribute</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000000001"
                        placeholder="0.0"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Equal Distribution Helper */}
            {form.watch('distributionType') === 'equal' && (
              <Button
                type="button"
                variant="outline"
                onClick={calculateEqualDistribution}
                className="w-full"
              >
                Calculate Equal Distribution
              </Button>
            )}
          </TabsContent>

          <TabsContent value="recipients" className="space-y-4">
            {/* CSV Import */}
            <div className="space-y-4 border rounded-lg p-4">
              <Label className="text-base font-semibold">CSV Import</Label>
              <FormField
                control={form.control}
                name="csvData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV Data (address,amount)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="address1,100&#10;address2,200&#10;address3,150"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCSVImport(form.getValues('csvData') || '')}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Import from CSV
              </Button>
            </div>

            {/* Recipients List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Recipients</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>

              {form.watch('recipients').map((_, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Recipient {index + 1}</Label>
                    {form.watch('recipients').length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`recipients.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Recipient wallet address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('distributionType') === 'fixed' && (
                    <FormField
                      control={form.control}
                      name={`recipients.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000000001"
                              placeholder="0.0"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('distributionType') === 'percentage' && (
                    <FormField
                      control={form.control}
                      name={`recipients.${index}.share`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Share (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0.0"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('distributionType') === 'equal' && (
                    <div>
                      <Label>Amount (calculated)</Label>
                      <p className="text-sm text-muted-foreground">
                        {((form.getValues('totalAmount') || 0) / form.getValues('recipients').length).toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Batch Settings */}
            <div className="space-y-4 border rounded-lg p-4">
              <Label className="text-base font-semibold">Batch Settings</Label>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batchSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Size</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 10)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delayBetweenBatches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delay (ms)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="5000"
                          step="100"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1000)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fanout Settings */}
            <div className="space-y-4 border rounded-lg p-4">
              <FormField
                control={form.control}
                name="enableFanout"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label>Enable Hydra Fanout</Label>
                      <p className="text-xs text-muted-foreground">
                        Create a reusable fanout for future distributions
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('enableFanout') && (
                <FormField
                  control={form.control}
                  name="fanoutName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fanout Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Distribution Fanout" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Network Info */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Network</span>
            <Badge variant={network === 'mainnet' ? "default" : "secondary"}>
              {network}
            </Badge>
          </div>
          {connected && publicKey && (
            <div className="flex justify-between items-center text-sm">
              <span>Wallet</span>
              <span className="font-mono text-xs">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          {!connected ? (
            <ConnectWalletButton className="w-full" />
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Distribution...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Start Distribution
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'processing':
        return renderProcessing();
      case 'confirming':
        return renderConfirming();
      default:
        return renderForm();
    }
  };

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Hydra Fanout Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          Hydra Fanout Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribute tokens or SOL to multiple recipients efficiently
        </p>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export default HydraFanoutForm;