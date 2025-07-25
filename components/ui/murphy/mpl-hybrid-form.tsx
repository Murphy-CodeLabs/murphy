"use client";

import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram, Transaction } from "@solana/web3.js";

// Metaplex UMI imports
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mplTokenMetadata,
  createV1 as createNftV1,
  createFungible,
  TokenStandard
} from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  publicKey as umiPublicKey,
  percentAmount,
  some,
  none,
  sol,
  dateTime,
  createGenericFile
} from "@metaplex-foundation/umi";

// SPL Token imports for fungible tokens
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from "@solana/spl-token";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
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
  Coins,
  FileImage,
  Settings,
  Shield,
  CheckCircle,
  Layers,
  Lock,
  Unlock,
  ArrowLeftRight,
  RefreshCw
} from "lucide-react";

// Notifications
import { toast } from "sonner";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Types
interface MPLHybridResult {
  escrow?: string;
  token?: string;
  nft?: string;
  transactionSignature: string;
  hybridSignatures?: string[];
}

interface EscrowConfig {
  name: string;
  uri: string;
  max: number;
  min: number;
  amount: number;
  feeLocation: string;
  feeAmount: number;
  solFeeAmount: number;
  path: number;
  bump: number;
}

type HybridType = 'escrow' | 'token' | 'capture' | 'release';
type TokenType = 'fungible' | 'nft' | 'pnft';

const formSchema = z.object({
  hybridType: z.enum(['escrow', 'token', 'capture', 'release']),
  tokenType: z.enum(['fungible', 'nft', 'pnft']),
  escrowName: z.string(),
  escrowUri: z.string(),
  maxAmount: z.number().min(0, "Max amount must be non-negative"),
  minAmount: z.number().min(0, "Min amount must be non-negative"),
  escrowAmount: z.number().min(0, "Amount must be non-negative"),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenUri: z.string(),
  tokenDecimals: z.number().min(0).max(9),
  tokenSupply: z.number().min(1, "Supply must be greater than 0"),
  nftName: z.string(),
  nftDescription: z.string(),
  nftImage: z.string(),
  nftAttributes: z.array(z.object({
    trait_type: z.string(),
    value: z.string(),
  })),

  feeLocation: z.string(),
  feeAmount: z.number().min(0, "Fee amount must be non-negative"),
  solFeeAmount: z.number().min(0, "SOL fee amount must be non-negative"),

  // Hybrid Settings
  enableRoyalties: z.boolean(),
  royaltyPercentage: z.number().min(0).max(100),

  enableTimelock: z.boolean(),
  unlockDate: z.string(),

  enableWhitelist: z.boolean(),
  whitelistAddresses: z.array(z.string()),

  // Advanced Settings
  path: z.number().min(0),
  bump: z.number().min(0),

  // Capture/Release specific
  targetEscrow: z.string(),
  targetToken: z.string(),
  captureAmount: z.number().min(0, "Capture amount must be non-negative"),
  releaseAmount: z.number().min(0, "Release amount must be non-negative"),
});

type FormValues = z.infer<typeof formSchema>;

interface MPLHybridFormProps {
  className?: string;
  onHybridCreated?: (result: MPLHybridResult) => void;
  defaultHybridType?: HybridType;
}

export function MPLHybridForm({
  className,
  onHybridCreated,
  defaultHybridType = 'escrow'
}: MPLHybridFormProps) {
  // Hooks
  const { publicKey, connected, wallet, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { endpoint } = useContext(ModalContext);

  // State
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<MPLHybridResult | null>(null);
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');
  const [activeFormTab, setActiveFormTab] = useState("basic");

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hybridType: defaultHybridType,
      tokenType: 'fungible',
      escrowName: "",
      escrowUri: "",
      maxAmount: 1000000,
      minAmount: 0,
      escrowAmount: 0,
      tokenName: "",
      tokenSymbol: "",
      tokenUri: "",
      tokenDecimals: 9,
      tokenSupply: 1000000,
      nftName: "",
      nftDescription: "",
      nftImage: "",
      nftAttributes: [],
      feeLocation: "",
      feeAmount: 0,
      solFeeAmount: 0,
      enableRoyalties: false,
      royaltyPercentage: 5,
      enableTimelock: false,
      unlockDate: "",
      enableWhitelist: false,
      whitelistAddresses: [],
      path: 0,
      bump: 0,
      targetEscrow: "",
      targetToken: "",
      captureAmount: 0,
      releaseAmount: 0,
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

  useEffect(() => {
    if (connected && publicKey) {
      form.setValue('feeLocation', publicKey.toString());
    }
  }, [connected, publicKey, form]);

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

  // Attribute management
  const addAttribute = () => {
    const currentAttributes = form.getValues('nftAttributes');
    form.setValue('nftAttributes', [
      ...currentAttributes,
      { trait_type: "", value: "" }
    ]);
  };

  const removeAttribute = (index: number) => {
    const currentAttributes = form.getValues('nftAttributes');
    form.setValue('nftAttributes', currentAttributes.filter((_, i) => i !== index));
  };

  // Whitelist management
  const addWhitelistAddress = () => {
    const currentAddresses = form.getValues('whitelistAddresses');
    form.setValue('whitelistAddresses', [...currentAddresses, ""]);
  };

  const removeWhitelistAddress = (index: number) => {
    const currentAddresses = form.getValues('whitelistAddresses');
    form.setValue('whitelistAddresses', currentAddresses.filter((_, i) => i !== index));
  };

  const createEscrow = async (values: FormValues) => {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      // Create a PDA for the escrow account
      const escrowSeed = Buffer.from("escrow");
      const [escrowPDA] = PublicKey.findProgramAddressSync(
        [escrowSeed, publicKey.toBuffer()],
        new PublicKey("11111111111111111111111111111111") // System program as placeholder
      );

      // Create escrow account transaction
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: escrowPDA,
          lamports: await connection.getMinimumBalanceForRentExemption(256),
          space: 256,
          programId: SystemProgram.programId,
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return {
        escrow: escrowPDA.toString(),
        signature: signature,
      };

    } catch (error) {
      console.error("Error creating escrow:", error);
      throw error;
    }
  };

  // Create Token (simplified mock implementation)
  const createToken = async (values: FormValues) => {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      // Create UMI instance
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity({ publicKey }))
        .use(mplTokenMetadata());

      // Generate mint keypair
      const mint = generateSigner(umi);

      let signature: string;

      if (values.tokenType === 'fungible') {
        // Create fungible token
        const createResult = await createFungible(umi, {
          mint,
          name: values.tokenName,
          symbol: values.tokenSymbol,
          uri: values.tokenUri,
          sellerFeeBasisPoints: percentAmount(5), // 5% royalty
          decimals: values.tokenDecimals,
          isMutable: true,
        }).send(umi);

        signature = createResult.toString();

      } else {
        // Create NFT or Programmable NFT
        const createResult = await createNftV1(umi, {
          mint,
          name: values.tokenName,
          symbol: values.tokenSymbol,
          uri: values.tokenUri,
          sellerFeeBasisPoints: percentAmount(5),
          isMutable: true,
          tokenStandard: values.tokenType === 'pnft' ? TokenStandard.ProgrammableNonFungible : TokenStandard.NonFungible,
        }).send(umi);

        signature = createResult.toString();
      }

      return {
        token: mint.publicKey.toString(),
        signature: signature,
      };

    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
    }
  };

  // Capture tokens (simplified mock implementation)
  const captureTokens = async (values: FormValues) => {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      // Validate addresses
      const escrowAddress = new PublicKey(values.targetEscrow);
      const tokenAddress = new PublicKey(values.targetToken);

      // Get token account addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        tokenAddress,
        publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        tokenAddress,
        escrowAddress
      );

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: escrowAddress,
          lamports: Math.floor(values.captureAmount * 1e9), // Convert to lamports
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signature = await wallet!.adapter.sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return {
        signature: signature,
      };

    } catch (error) {
      console.error("Error capturing tokens:", error);
      throw error;
    }
  };

  const releaseTokens = async (values: FormValues) => {
    if (!connected || !publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      // Validate addresses
      const escrowAddress = new PublicKey(values.targetEscrow);
      const tokenAddress = new PublicKey(values.targetToken);

      // For release, we would typically need to sign as the escrow authority
      // This is a simplified implementation
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: escrowAddress,
          toPubkey: publicKey,
          lamports: Math.floor(values.releaseAmount * 1e9), // Convert to lamports
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction
      const signature = await wallet!.adapter.sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return {
        signature: signature,
      };

    } catch (error) {
      console.error("Error releasing tokens:", error);
      throw error;
    }
  };

  // Main submission handler
  const onSubmit = async (values: FormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate based on hybrid type
    if (values.hybridType === 'escrow') {
      if (!values.escrowName || values.escrowName.trim() === '') {
        toast.error("Escrow name is required");
        return;
      }
      if (values.maxAmount <= 0) {
        toast.error("Max amount must be greater than 0");
        return;
      }
    }

    if (values.hybridType === 'token') {
      if (!values.tokenName || values.tokenName.trim() === '') {
        toast.error("Token name is required");
        return;
      }
      if (!values.tokenSymbol || values.tokenSymbol.trim() === '') {
        toast.error("Token symbol is required");
        return;
      }
    }

    if (values.hybridType === 'capture' || values.hybridType === 'release') {
      if (!values.targetEscrow || values.targetEscrow.trim() === '') {
        toast.error("Target escrow address is required");
        return;
      }
      if (!values.targetToken || values.targetToken.trim() === '') {
        toast.error("Target token address is required");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setCurrentStage('confirming');
      setError("");

      toast.loading("Processing Hybrid operation...", { id: "mpl-hybrid" });

      let operationResult;
      const hybridSignatures: string[] = [];

      switch (values.hybridType) {
        case 'escrow':
          operationResult = await createEscrow(values);
          setResult({
            escrow: operationResult.escrow,
            transactionSignature: operationResult.signature,
            hybridSignatures,
          });
          break;

        case 'token':
          operationResult = await createToken(values);
          setResult({
            token: operationResult.token,
            transactionSignature: operationResult.signature,
            hybridSignatures,
          });
          break;

        case 'capture':
          operationResult = await captureTokens(values);
          setResult({
            transactionSignature: operationResult.signature,
            hybridSignatures,
          });
          break;

        case 'release':
          operationResult = await releaseTokens(values);
          setResult({
            transactionSignature: operationResult.signature,
            hybridSignatures,
          });
          break;

        default:
          throw new Error("Invalid hybrid type");
      }

      setCurrentStage('success');

      toast.success("Hybrid operation completed successfully!", {
        id: "mpl-hybrid",
        description: `${values.hybridType} operation completed`
      });

      if (onHybridCreated && result) {
        onHybridCreated(result);
      }

    } catch (err: any) {
      console.error("Error processing hybrid operation:", err);
      setError(err.message || "Failed to process hybrid operation");
      setCurrentStage('error');

      toast.error("Hybrid operation failed", {
        id: "mpl-hybrid",
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
  };

  // Render stages
  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-2 text-lg font-semibold">Hybrid Operation Completed!</h3>
        <p className="text-muted-foreground">Your hybrid operation was successful</p>
      </div>

      {result && (
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Operation Type</Label>
                <p className="text-sm">{form.getValues('hybridType')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Token Type</Label>
                <p className="text-sm">{form.getValues('tokenType')}</p>
              </div>
            </div>

            {result.escrow && (
              <div>
                <Label className="text-sm font-medium">Escrow Address</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {result.escrow.slice(0, 8)}...{result.escrow.slice(-8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.escrow!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {result.token && (
              <div>
                <Label className="text-sm font-medium">Token Address</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {result.token.slice(0, 8)}...{result.token.slice(-8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.token!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => viewInExplorer(result.transactionSignature, 'tx')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Transaction
              </Button>
              {(result.escrow || result.token) && (
                <Button
                  variant="outline"
                  onClick={() => viewInExplorer(result.escrow || result.token!)}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Asset
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Button onClick={resetForm} className="w-full">
        Create Another Hybrid Operation
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <X className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold">Operation Failed</h3>
      <div className="bg-destructive/10 text-destructive rounded-lg p-4">
        <p className="text-sm">{error}</p>
      </div>
      <Button onClick={() => setCurrentStage('input')} className="w-full">
        Try Again
      </Button>
    </div>
  );

  const renderConfirming = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold">Processing Hybrid Operation</h3>
      <p className="text-muted-foreground">
        Please confirm the transaction in your wallet...
      </p>
    </div>
  );

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Hybrid Type Selection */}
        <FormField
          control={form.control}
          name="hybridType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operation Type</FormLabel>
              <FormControl>
                <Tabs value={field.value} onValueChange={field.onChange}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="escrow">
                      <Lock className="h-4 w-4 mr-2" />
                      Escrow
                    </TabsTrigger>
                    <TabsTrigger value="token">
                      <Coins className="h-4 w-4 mr-2" />
                      Token
                    </TabsTrigger>
                    <TabsTrigger value="capture">
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Capture
                    </TabsTrigger>
                    <TabsTrigger value="release">
                      <Unlock className="h-4 w-4 mr-2" />
                      Release
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Escrow Configuration */}
            {form.watch('hybridType') === 'escrow' && (
              <>
                <FormField
                  control={form.control}
                  name="escrowName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escrow Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Hybrid Escrow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="escrowUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escrow Metadata URI</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/metadata.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="minAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1000000"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="escrowAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Token Configuration */}
            {form.watch('hybridType') === 'token' && (
              <>
                <FormField
                  control={form.control}
                  name="tokenType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fungible">Fungible Token</SelectItem>
                            <SelectItem value="nft">NFT</SelectItem>
                            <SelectItem value="pnft">Programmable NFT</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tokenName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Hybrid Token" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tokenSymbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="HYB" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tokenUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Metadata URI</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/token-metadata.json" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('tokenType') === 'fungible' && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tokenDecimals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Decimals</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="9"
                              placeholder="9"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 9)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tokenSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supply</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1000000"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 1000000)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}

            {/* Capture/Release Configuration */}
            {(form.watch('hybridType') === 'capture' || form.watch('hybridType') === 'release') && (
              <>
                <FormField
                  control={form.control}
                  name="targetEscrow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Escrow Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Escrow address to interact with" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Token Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Token address to transfer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={form.watch('hybridType') === 'capture' ? 'captureAmount' : 'releaseAmount'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch('hybridType') === 'capture' ? 'Capture Amount' : 'Release Amount'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            {/* Fee Configuration */}
            <div className="space-y-4 border rounded-lg p-4">
              <Label className="text-base font-semibold">Fee Configuration</Label>

              <FormField
                control={form.control}
                name="feeLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Recipient Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Fee recipient wallet address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="feeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Fee Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="solFeeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SOL Fee Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Advanced settings content */}
            <div className="space-y-4 border rounded-lg p-4">
              <Label className="text-base font-semibold">Advanced Settings</Label>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bump"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bump</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                  Processing...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Execute Hybrid Operation
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
          <CardTitle>MPL Hybrid Form</CardTitle>
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
          <RefreshCw className="h-6 w-6" />
          MPL Hybrid Operations
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage hybrid token and escrow operations with advanced functionality
        </p>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}
