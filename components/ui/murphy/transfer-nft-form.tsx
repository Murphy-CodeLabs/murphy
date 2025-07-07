'use client';

// React và hooks
import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";

// Solana
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createTransferInstruction, getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

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

// Icons and notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';

interface TransferNFTResult {
  signature: string;
  nftMint: string;
  recipient: string;
}

type TransferNFTFormValues = {
  nftMintAddress: string;
  recipientAddress: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate NFT mint address
  if (!data.nftMintAddress) {
    errors.nftMintAddress = {
      type: "required",
      message: "NFT mint address is required",
    };
  } else {
    try {
      new PublicKey(data.nftMintAddress);
    } catch (e) {
      errors.nftMintAddress = {
        type: "pattern",
        message: "Invalid NFT mint address format",
      };
    }
  }

  // Validate recipient address
  if (!data.recipientAddress) {
    errors.recipientAddress = {
      type: "required",
      message: "Recipient address is required",
    };
  } else {
    try {
      new PublicKey(data.recipientAddress);
    } catch (e) {
      errors.recipientAddress = {
        type: "pattern",
        message: "Invalid recipient address format",
      };
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export default function TransferNFTForm({
  nftMint: propNftMint,
  onNFTTransferred
}: {
  nftMint?: string;
  onNFTTransferred?: (signature: string, recipient: string) => void;
}) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet, sendTransaction } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const [result, setResult] = useState<TransferNFTResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [nftMetadata, setNftMetadata] = useState<any>(null);

  // Form setup with react-hook-form
  const form = useForm<TransferNFTFormValues>({
    defaultValues: {
      nftMintAddress: propNftMint || "",
      recipientAddress: "",
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

  // Load NFT metadata when mint address changes
  const loadNFTMetadata = async (mintAddress: string) => {
    if (!mintAddress) {
      setNftMetadata(null);
      return;
    }

    try {
      setIsLoadingNFT(true);

      // Simple validation - check if mint account exists
      const mintPubkey = new PublicKey(mintAddress);
      const accountInfo = await connection.getAccountInfo(mintPubkey);

      if (!accountInfo) {
        throw new Error("NFT mint not found");
      }

      // Check if it's a valid token mint
      if (accountInfo.data.length !== 82) {
        throw new Error("Invalid token mint account");
      }

      // Set metadata
      setNftMetadata({
        name: "NFT",
        mint: mintAddress,
        exists: true
      });

      toast.success("NFT found!", {
        description: `Ready to transfer NFT: ${mintAddress.slice(0, 8)}...`
      });

    } catch (err: any) {
      console.error("Error loading NFT:", err);
      setNftMetadata(null);
      toast.error("Failed to load NFT", {
        description: err.message
      });
    } finally {
      setIsLoadingNFT(false);
    }
  };

  const onSubmit = async (values: TransferNFTFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);

      toast.loading("Transferring NFT...", {
        id: "transfer-nft"
      });

      // Create transaction for NFT transfer
      const transaction = new Transaction();

      // Get mint public key
      const mintPubkey = new PublicKey(values.nftMintAddress);
      const recipientPubkey = new PublicKey(values.recipientAddress);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      // Check if recipient token account exists
      const recipientAccountInfo = await connection.getAccountInfo(toTokenAccount);

      if (!recipientAccountInfo) {
        // Create associated token account for recipient
        const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            toTokenAccount,
            recipientPubkey,
            mintPubkey
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          1, // NFT amount is always 1
          [],
          mintPubkey
        )
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      // Save result
      setResult({
        signature,
        nftMint: values.nftMintAddress,
        recipient: values.recipientAddress
      });

      // Call callback if provided
      if (onNFTTransferred) {
        onNFTTransferred(signature, values.recipientAddress);
      }

      toast.success("NFT transferred successfully!", {
        id: "transfer-nft",
        description: `To: ${values.recipientAddress.slice(0, 8)}...${values.recipientAddress.slice(-8)}`
      });

    } catch (err: any) {
      console.error("Error transferring NFT:", err);

      toast.error("Cannot transfer NFT", {
        id: "transfer-nft",
        description: err.message
      });

      // If transaction fails due to connection error, try switching to another endpoint
      if (err.message.includes('failed to fetch') ||
        err.message.includes('timeout') ||
        err.message.includes('429') ||
        err.message.includes('503')) {
        switchToNextEndpoint();
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

  const viewNFT = () => {
    if (result?.nftMint) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/token/';
      window.open(`${baseUrl}${result.nftMint}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setNftMetadata(null);
  };

  // Avoid hydration error
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer NFT</CardTitle>
          <CardDescription>Transfer an NFT to another wallet on Solana</CardDescription>
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

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4 p-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>

      <h3 className="text-xl font-bold text-center">NFT Transferred!</h3>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">NFT Mint Address:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.nftMint}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Recipient Address:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.recipient}
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
          onClick={viewNFT}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View NFT
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
        <ArrowRight className="h-4 w-4 mr-2" />
        Transfer Another NFT
      </Button>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nftMintAddress"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>NFT Mint Address</FormLabel>
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadNFTMetadata(field.value)}
                    disabled={isLoadingNFT}
                  >
                    {isLoadingNFT ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Verify
                  </Button>
                )}
              </div>
              <FormControl>
                <Input
                  placeholder="Enter NFT mint address"
                  {...field}
                  disabled={isSubmitting || !!propNftMint}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              {nftMetadata && (
                <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                  <span className="text-green-700">✓ NFT verified and ready to transfer</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                The mint address of the NFT you want to transfer
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipientAddress"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Recipient Address</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter recipient wallet address"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                The wallet address that will receive the NFT
              </p>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Network</span>
              <Badge variant={network === 'mainnet' ? "default" : "secondary"}>
                {network}
              </Badge>
            </div>
            {connected && publicKey && (
              <div className="flex justify-between items-center text-sm">
                <span>Your Wallet</span>
                <span className="font-mono text-xs">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            {!connected ? (
              <ConnectWalletButton className="w-full" />
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !nftMetadata}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Transfer NFT
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transfer NFT</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Transfer an NFT to another wallet on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {result ? renderSuccess() : renderForm()}
      </CardContent>
    </Card>
  );
}