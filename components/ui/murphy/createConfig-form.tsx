'use client';

import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Settings } from "lucide-react";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

enum FeeSchedulerMode {
  Linear = 0
}

interface CreateConfigResult {
  config: string;
  signature: string;
}

type CreateConfigFormValues = {
  feeClaimer: string;
  leftoverReceiver: string;
  quoteMint: string;
  cliffFeeNumerator: string;
  binStep: number;
  tokenDecimal: number;
  partnerLpPercentage: number;
  creatorLpPercentage: number;
  partnerLockedLpPercentage: number;
  creatorLockedLpPercentage: number;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate feeClaimer
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
        type: "pattern",
        message: "Invalid address format",
      };
    }
  }

  // Validate leftoverReceiver
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
        type: "pattern",
        message: "Invalid address format",
      };
    }
  }

  // Validate quoteMint
  if (!data.quoteMint) {
    errors.quoteMint = {
      type: "required",
      message: "Quote mint address is required",
    };
  }

  // Validate cliffFeeNumerator
  if (!data.cliffFeeNumerator) {
    errors.cliffFeeNumerator = {
      type: "required",
      message: "Cliff fee numerator is required",
    };
  }

  // Validate binStep
  if (data.binStep === undefined || data.binStep === null || data.binStep === "") {
    errors.binStep = {
      type: "required",
      message: "Bin step is required",
    };
  } else if (Number(data.binStep) < 1) {
    errors.binStep = {
      type: "min",
      message: "Bin step must be greater than 0",
    };
  }

  // Validate tokenDecimal
  if (data.tokenDecimal === undefined || data.tokenDecimal === null || data.tokenDecimal === "") {
    errors.tokenDecimal = {
      type: "required",
      message: "Token decimal is required",
    };
  } else if (Number(data.tokenDecimal) < 0 || Number(data.tokenDecimal) > 18) {
    errors.tokenDecimal = {
      type: "range",
      message: "Token decimal must be between 0 and 18",
    };
  }

  // Validate LP percentages
  const validatePercentage = (field: string, name: string) => {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors[field] = {
        type: "required",
        message: `${name} is required`,
      };
    } else if (Number(data[field]) < 0 || Number(data[field]) > 100) {
      errors[field] = {
        type: "range",
        message: `${name} must be between 0 and 100`,
      };
    }
  };

  validatePercentage("partnerLpPercentage", "Partner LP percentage");
  validatePercentage("creatorLpPercentage", "Creator LP percentage");
  validatePercentage("partnerLockedLpPercentage", "Partner locked LP percentage");
  validatePercentage("creatorLockedLpPercentage", "Creator locked LP percentage");

  // Validate that percentages sum to 100
  const totalPercentage = Number(data.partnerLpPercentage || 0) + 
                          Number(data.creatorLpPercentage || 0) + 
                          Number(data.partnerLockedLpPercentage || 0) + 
                          Number(data.creatorLockedLpPercentage || 0);
  
  if (totalPercentage !== 100) {
    errors.partnerLpPercentage = {
      type: "validate",
      message: "LP percentages must sum to 100%",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function CreateConfigForm({ onConfigCreated }: { onConfigCreated?: (configAddress: string) => void }) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateConfigResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error

  // Form setup with react-hook-form
  const form = useForm<CreateConfigFormValues>({
    defaultValues: {
      feeClaimer: "",
      leftoverReceiver: "",
      quoteMint: "So11111111111111111111111111111111111111112", // SOL by default
      cliffFeeNumerator: "2500000",
      binStep: 1,
      tokenDecimal: 9,
      partnerLpPercentage: 25,
      creatorLpPercentage: 25,
      partnerLockedLpPercentage: 25,
      creatorLockedLpPercentage: 25,
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

  // Auto-fill wallet address into form fields when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      
      // Only set if fields are empty
      if (!form.getValues("feeClaimer")) {
        form.setValue("feeClaimer", walletAddress, { shouldValidate: false });
      }
      
      if (!form.getValues("leftoverReceiver")) {
        form.setValue("leftoverReceiver", walletAddress, { shouldValidate: false });
      }
    }
  }, [connected, publicKey, form]);

  // Handle form submission
  const onSubmit = async (values: CreateConfigFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setCurrentStage('confirming');

      toast.loading("Creating config...", {
        id: "create-config"
      });

      // Create a new keypair for config
      const configKeypair = Keypair.generate();
      
      // Initialize DBC client
      const client = new DynamicBondingCurveClient(connection);
      
      // Create params for createConfig
      const createConfigParams = {
        payer: publicKey,
        config: configKeypair.publicKey,
        feeClaimer: new PublicKey(values.feeClaimer),
        leftoverReceiver: new PublicKey(values.leftoverReceiver),
        quoteMint: new PublicKey(values.quoteMint),
    poolFees: {
        baseFee: {
            cliffFeeNumerator: new BN(values.cliffFeeNumerator),
            numberOfPeriod: 0,
            reductionFactor: new BN('0'),
            periodFrequency: new BN('0'),
            feeSchedulerMode: FeeSchedulerMode.Linear,
        },
        dynamicFee: {
            binStep: values.binStep,
            binStepU128: new BN('1844674407370955'),
            filterPeriod: 10,
            decayPeriod: 120,
            reductionFactor: 1000,
            variableFeeControl: 100000,
            maxVolatilityAccumulator: 100000,
        },
    },
    activationType: 0,
    collectFeeMode: 0,
        migrationOption: 0,
    tokenType: 0,
        tokenDecimal: values.tokenDecimal,
    migrationQuoteThreshold: new BN('1000000000'),
        partnerLpPercentage: values.partnerLpPercentage,
        creatorLpPercentage: values.creatorLpPercentage,
        partnerLockedLpPercentage: values.partnerLockedLpPercentage,
        creatorLockedLpPercentage: values.creatorLockedLpPercentage,
    sqrtStartPrice: new BN('58333726687135158'),
    lockedVesting: {
        amountPerPeriod: new BN('0'),
        cliffDurationFromMigrationTime: new BN('0'),
        frequency: new BN('0'),
        numberOfPeriod: new BN('0'),
        cliffUnlockAmount: new BN('0'),
    },
    migrationFeeOption: 0,
    tokenSupply: {
        preMigrationTokenSupply: new BN('10000000000000000000'),
        postMigrationTokenSupply: new BN('10000000000000000000'),
    },
    padding: [
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
        new BN(0),
    ],
    curve: [
        {
            sqrtPrice: new BN('233334906748540631'),
            liquidity: new BN('622226417996106429201027821619672729'),
        },
        {
            sqrtPrice: new BN('79226673521066979257578248091'),
            liquidity: new BN('1'),
        },
    ],
      };
      
      // Create transaction
      const transaction = await client.partners.createConfig(createConfigParams);
      
      // Get recentBlockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Set feePayer for transaction
      transaction.feePayer = publicKey;
      
      // Partially sign transaction with config keypair if needed
      transaction.partialSign(configKeypair);
      
      // Sign and send transaction
      const signature = await wallet.adapter.sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });
      
      // Save result
      const configAddress = configKeypair.publicKey.toString();
      setResult({
        config: configAddress,
        signature: signature
      });
      
      // Call callback if provided
      if (onConfigCreated) {
        onConfigCreated(configAddress);
      }
      
      toast.success("Configuration created successfully!", {
        id: "create-config",
        description: `Config: ${configAddress.slice(0, 8)}...${configAddress.slice(-8)}`
      });
      
      setCurrentStage('success');
      
    } catch (err: any) {
      console.error("Create Config error:", err);
      setError(err.message);
      setCurrentStage('error');
      
      // Check if user canceled/rejected the transaction
      if (err.message && (err.message.includes("rejected") || err.message.includes("canceled"))) {
        toast.error("Transaction canceled", {
          id: "create-config",
          description: "You canceled the transaction"
        });
      } else {
        toast.error("Failed to create configuration", {
          id: "create-config",
          description: err.message
        });
        
        // If transaction fails due to connection error, try switching to another endpoint
        if (err.message.includes('failed to fetch') || 
            err.message.includes('timeout') || 
            err.message.includes('429') ||
            err.message.includes('503')) {
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
    setError(null);
    setCurrentStage('input');
  };

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4 p-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-center">Config Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Config Address:</div>
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
          View Config
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
        Create New Config
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
      <h3 className="text-xl font-bold">Creation Failed</h3>
      <p className="text-muted-foreground">{error || 'An error occurred while creating the configuration.'}</p>
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
      <h3 className="text-xl font-bold">Creating Config</h3>
      <p className="text-muted-foreground">Please wait while your configuration is being created...</p>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="feeClaimer"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Fee Claimer</FormLabel>
                </div>
                <FormControl>
                  <Input
                    placeholder="Address that will receive fees"
                    {...field}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Address that will be able to claim fees from the pool
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="leftoverReceiver"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Leftover Receiver</FormLabel>
                </div>
                <FormControl>
                  <Input
                    placeholder="Address that will receive leftover tokens"
                    {...field}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Address that will receive leftover tokens
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="quoteMint"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Quote Mint</FormLabel>
                </div>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-none bg-transparent h-auto text-xl font-medium focus:ring-0">
                      <SelectValue placeholder="Select quote token">
                        {field.value === "So11111111111111111111111111111111111111112" && (
                          <div className="flex items-center">
                            <img 
                              src="/crypto-logos/solana-logo.svg" 
                              alt="SOL" 
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            SOL
                          </div>
                        )}
                        {field.value === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && (
                          <div className="flex items-center">
                            <img 
                              src="/crypto-logos/usd-coin-usdc-logo.svg" 
                              alt="USDC" 
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            USDC
                          </div>
                        )}
                        {field.value === "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" && (
                          <div className="flex items-center">
                            <img 
                              src="/crypto-logos/tether-usdt-logo.svg" 
                              alt="USDT" 
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            USDT
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="So11111111111111111111111111111111111111112">
                        <div className="flex items-center">
                          <img 
                            src="/crypto-logos/solana-logo.svg" 
                            alt="SOL" 
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                          SOL
                        </div>
                      </SelectItem>
                      <SelectItem value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
                        <div className="flex items-center">
                          <img 
                            src="/crypto-logos/usd-coin-usdc-logo.svg" 
                            alt="USDC" 
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                          USDC
                        </div>
                      </SelectItem>
                      <SelectItem value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">
                        <div className="flex items-center">
                          <img 
                            src="/crypto-logos/tether-usdt-logo.svg" 
                            alt="USDT" 
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                          USDT
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  The quote token for the pool
                </p>
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cliffFeeNumerator"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Cliff Fee Numerator</FormLabel>
                </div>
                <FormControl>
                  <Input
                    placeholder="2500000"
                    {...field}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Base fee for the pool
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="binStep"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Bin Step</FormLabel>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1"
                    min="1"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Bin step for dynamic fee calculation
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tokenDecimal"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Token Decimal</FormLabel>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="9"
                    min="0"
                    max="18"
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Decimal places for the token
                </p>
              </FormItem>
            )}
          />
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
          <div className="font-medium">LP Distribution</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="partnerLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Partner LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creatorLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Creator LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="partnerLockedLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Partner Locked LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creatorLockedLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Creator Locked LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            LP distribution percentages must sum to 100%. These percentages determine how liquidity provider tokens are distributed.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Network</span>
              <Badge variant={network === 'mainnet' ? "default" : "secondary"}>
                {network}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Default Fee Scheduler Mode</span>
              <span className="font-medium">Linear</span>
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
                ) : "Create Config"}
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
          <CardTitle>Create Config</CardTitle>
          <CardDescription>Create a new DBC configuration</CardDescription>
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
          <span>Create Config</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Create a new DBC configuration for pools</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export default CreateConfigForm;
