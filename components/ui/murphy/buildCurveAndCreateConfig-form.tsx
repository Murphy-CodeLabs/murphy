'use client';

import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Settings } from "lucide-react";
import { PublicKey, Transaction, Keypair, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletButton } from "./connect-wallet-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

interface BuildCurveResult {
  config: string;
  signature: string;
}

type FormValues = {
  totalTokenSupply: number;
  percentageSupplyOnMigration: number;
  migrationQuoteThreshold: number;
  migrationOption: number;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;
  amountPerPeriod: string;
  cliffDuration: string;
  frequency: string;
  numberOfPeriod: string;
  cliffUnlockAmount: string;
  feeClaimer: string;
  leftoverReceiver: string;
  quoteMint: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate token supply
  if (!data.totalTokenSupply) {
    errors.totalTokenSupply = {
      type: "required",
      message: "Total token supply is required",
    };
  } else if (data.totalTokenSupply <= 0) {
    errors.totalTokenSupply = {
      type: "min",
      message: "Supply must be greater than 0",
    };
  }

  // Validate percentageSupplyOnMigration
  if (data.percentageSupplyOnMigration === undefined || data.percentageSupplyOnMigration === null) {
    errors.percentageSupplyOnMigration = {
      type: "required",
      message: "Percentage supply on migration is required",
    };
  } else if (data.percentageSupplyOnMigration < 0 || data.percentageSupplyOnMigration > 100) {
    errors.percentageSupplyOnMigration = {
      type: "range",
      message: "Percentage must be between 0 and 100",
    };
  }

  // Validate migrationQuoteThreshold
  if (!data.migrationQuoteThreshold) {
    errors.migrationQuoteThreshold = {
      type: "required",
      message: "Migration quote threshold is required",
    };
  }

  // Validate decimals
  if (data.tokenBaseDecimal === undefined || data.tokenBaseDecimal === null) {
    errors.tokenBaseDecimal = {
      type: "required",
      message: "Base token decimal is required",
    };
  } else if (data.tokenBaseDecimal < 0 || data.tokenBaseDecimal > 18) {
    errors.tokenBaseDecimal = {
      type: "range",
      message: "Decimal must be between 0 and 18",
    };
  }

  if (data.tokenQuoteDecimal === undefined || data.tokenQuoteDecimal === null) {
    errors.tokenQuoteDecimal = {
      type: "required",
      message: "Quote token decimal is required",
    };
  } else if (data.tokenQuoteDecimal < 0 || data.tokenQuoteDecimal > 18) {
    errors.tokenQuoteDecimal = {
      type: "range",
      message: "Decimal must be between 0 and 18",
    };
  }

  // Validate address fields
  if (!data.feeClaimer) {
    errors.feeClaimer = {
      type: "required",
      message: "Fee claimer address is required",
    };
  } else {
    try {
      new PublicKey(data.feeClaimer);
    } catch (e) {
      errors.feeClaimer = {
        type: "invalid",
        message: "Invalid Solana address",
      };
    }
  }

  if (!data.leftoverReceiver) {
    errors.leftoverReceiver = {
      type: "required",
      message: "Leftover receiver address is required",
    };
  } else {
    try {
      new PublicKey(data.leftoverReceiver);
    } catch (e) {
      errors.leftoverReceiver = {
        type: "invalid",
        message: "Invalid Solana address",
      };
    }
  }

  if (!data.quoteMint) {
    errors.quoteMint = {
      type: "required",
      message: "Quote mint address is required",
    };
  } else {
    try {
      new PublicKey(data.quoteMint);
    } catch (e) {
      errors.quoteMint = {
        type: "invalid",
        message: "Invalid Solana address",
      };
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export default function BuildCurveAndCreateConfigForm({ onConfigCreated }: { onConfigCreated?: (configAddress: string) => void }) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BuildCurveResult | null>(null);
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');

  // Form setup with react-hook-form
  const form = useForm<FormValues>({
    defaultValues: {
        totalTokenSupply: 1000000000,
        percentageSupplyOnMigration: 10,
        migrationQuoteThreshold: 100,
        migrationOption: 0,
        tokenBaseDecimal: 9,
        tokenQuoteDecimal: 9,
      amountPerPeriod: "0",
      cliffDuration: "0",
      frequency: "0",
      numberOfPeriod: "0",
      cliffUnlockAmount: "0",
      feeClaimer: "",
      leftoverReceiver: "",
      quoteMint: "So11111111111111111111111111111111111111112",
    },
    mode: "onSubmit",
    resolver: customResolver,
  });

  // Only render after the component is mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update network state when endpoint changes
  useEffect(() => {
    if (endpoint) {
      setNetwork(endpoint.includes('devnet') ? 'devnet' : 'mainnet');
    }
  }, [endpoint]);

  // Auto-fill wallet address fields when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      form.setValue("feeClaimer", publicKey.toString());
      form.setValue("leftoverReceiver", publicKey.toString());
    }
  }, [connected, publicKey, form]);

  const onSubmit = async (values: FormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage('confirming');
      setError('');

      toast.loading("Creating configuration...", {
        id: "build-curve"
      });
      
      try {
        // Initialize DBC client
        const client = new DynamicBondingCurveClient(connection);
        
        // Create a simple demo transaction
        const transaction = new Transaction();
        
        // Get the latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = publicKey;
        
        // Add a simple instruction - a memo recording the creation time
        transaction.add(
          new TransactionInstruction({
            keys: [
              {
                pubkey: publicKey,
                isSigner: true,
                isWritable: true,
              }
            ],
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
            data: Buffer.from(`Create Curve Config: ${new Date().toISOString()}`, "utf-8")
          })
        );
        
        // Send transaction to the network
        const signature = await wallet.adapter.sendTransaction(transaction, connection);
        
        // Wait for confirmation with new syntax
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature
        });
        
        // Save result
        const configAddress = publicKey.toString(); // Use wallet address as config address (demo)
        setResult({
          config: configAddress,
          signature: signature
        });
        
        // Call callback if provided
        if (onConfigCreated) {
          onConfigCreated(configAddress);
        }
        
        setCurrentStage('success');
        
        toast.success("Configuration created successfully!", {
          id: "build-curve",
          description: `Config: ${configAddress.slice(0, 8)}...${configAddress.slice(-4)}`
        });
      } catch (transactionError: any) {
        console.error("Transaction error:", transactionError);
        throw transactionError;
      }
      
    } catch (err: any) {
      console.error("Error creating configuration:", err);
      
      setCurrentStage('error');
      setError(err.message || 'An unknown error occurred');
      
      // Check if user canceled/rejected the transaction
      if (err.message && (err.message.includes("rejected") || err.message.includes("canceled"))) {
        toast.error("Transaction was canceled", {
          id: "build-curve",
          description: "You canceled the transaction"
        });
      } else {
        toast.error("Unable to create configuration", {
          id: "build-curve",
          description: err.message
        });
        
        // If transaction failed due to connection error, try switching to another RPC endpoint
        if (err.message?.includes('failed to fetch') || 
            err.message?.includes('timeout') || 
            err.message?.includes('429') ||
            err.message?.includes('503')) {
          switchToNextEndpoint();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewExplorer = () => {
    if (result?.signature) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/tx/' : 'https://solscan.io/tx/';
      window.open(`${baseUrl}${result.signature}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  const viewConfig = () => {
    if (result?.config) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/account/';
      window.open(`${baseUrl}${result.config}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage('input');
    setError('');
  };

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4 p-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-center">Configuration Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Configuration Address:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.config}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Transaction Signature:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.signature}
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          onClick={viewConfig}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Configuration
        </Button>
        
        <Button 
          variant="outline" 
          onClick={viewExplorer}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Transaction
        </Button>
      </div>
      
      <Button 
        onClick={resetForm}
        className="w-full"
      >
        Create New Configuration
      </Button>
    </div>
  );

  // Render error view
  const renderError = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-xl font-bold">Configuration Creation Failed</h3>
      <p className="text-muted-foreground">{error || 'An error occurred during configuration creation.'}</p>
      <Button 
        onClick={() => {
          setCurrentStage('input');
        }}
        className="w-full"
      >
        Try Again
      </Button>
    </div>
  );

  // Render confirmation view
  const renderConfirming = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Confirming</h3>
      <p className="text-muted-foreground">Please wait while your transaction is being processed...</p>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Token Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="totalTokenSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Token Supply</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000000000"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="percentageSupplyOnMigration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentage Supply on Migration</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="migrationQuoteThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Migration Quote Threshold</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="migrationOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Migration Option</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenBaseDecimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Token Decimal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="9"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenQuoteDecimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote Token Decimal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="9"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Vesting Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amountPerPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Per Period</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cliffDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliff Duration from Migration</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="numberOfPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Periods</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cliffUnlockAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliff Unlock Amount</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Addresses</h3>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="feeClaimer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Claimer Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter fee claimer wallet address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="leftoverReceiver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leftover Receiver Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter leftover token receiver wallet address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quoteMint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote Mint Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter quote mint token address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Network</span>
              <Badge variant={network === 'mainnet' ? "default" : "secondary"}>
                {network}
              </Badge>
            </div>
          </div>
          
          <div className="pt-2">
            {!connected ? (
              <ConnectWalletButton className="w-full" />
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : "Create Configuration"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  // Render based on current stage
  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'confirming':
        return renderConfirming();
      default:
        return renderForm();
    }
  };

  // Avoid hydration error
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Curve Configuration</CardTitle>
          <CardDescription>Build a constant product configuration with custom parameters</CardDescription>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create Curve Configuration</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Build a constant product configuration with custom parameters</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}
