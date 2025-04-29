'use client';

import { useState, useContext, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

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

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

export interface MintNFTProps {
  collectionMint?: string;
  rpcUrl?: string;
  className?: string;
}

// Type for NFT form values
type NFTFormValues = {
  name: string;
  symbol: string;
  uri: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate name
  if (!data.name) {
    errors.name = {
      type: "required",
      message: "Name is required",
    };
  }

  // Validate symbol
  if (!data.symbol) {
    errors.symbol = {
      type: "required",
      message: "Symbol is required",
    };
  }

  // Validate uri
  if (!data.uri) {
    errors.uri = {
      type: "required",
      message: "Metadata URI is required",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function MintNFT({ collectionMint, className }: MintNFTProps) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    signature: string;
    nftAddress: string;
  } | null>(null);

  // Form setup with react-hook-form
  const form = useForm<NFTFormValues>({
    defaultValues: {
      name: "",
      symbol: "",
      uri: "",
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

  // Handle form submission
  const onSubmit = async (values: NFTFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setCurrentStage('confirming');

      toast.loading("Creating NFT...", {
        id: "create-nft"
      });

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions
      };

      // Create UMI instance
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
      
      // Create NFT
      const nftMint = generateSigner(umi);
      
      const mintConfig: any = {
        mint: nftMint,
        name: values.name,
        symbol: values.symbol,
        uri: values.uri,
        sellerFeeBasisPoints: 500,
      };
      
      // Add collection mint if provided
      if (collectionMint) {
        try {
          const collectionPubkey = new PublicKey(collectionMint);
          mintConfig.collection = { key: collectionPubkey, verified: false };
        } catch (err) {
          console.warn("Invalid collection mint:", err);
        }
      }
      
      const mintResult = await createNft(umi, mintConfig).sendAndConfirm(umi);
      
      // Save result
      setResult({
        signature: mintResult.signature.toString(),
        nftAddress: nftMint.publicKey.toString()
      });
      
      toast.success("NFT created successfully!", {
        id: "create-nft",
        description: `NFT: ${values.name}`
      });
      
      setCurrentStage('success');
    } catch (err: any) {
      console.error("Create NFT error:", err);
      setError(err.message);
      setCurrentStage('error');
      
      toast.error("Failed to create NFT", {
        id: "create-nft",
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
    if (result?.nftAddress) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/account/';
      window.open(`${baseUrl}${result.nftAddress}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
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
      <h3 className="text-xl font-bold text-center">NFT Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">NFT Address:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.nftAddress}
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
        <Plus className="h-4 w-4 mr-2" />
        Create New NFT
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
      <p className="text-muted-foreground">{error || 'An error occurred while creating the NFT.'}</p>
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
      <h3 className="text-xl font-bold">Creating NFT</h3>
      <p className="text-muted-foreground">Please wait while your NFT is being created...</p>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>NFT Name</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter NFT name"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Display name of the NFT
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Symbol</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter symbol (e.g., BTC, ETH)"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Short symbol for your NFT
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="uri"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Metadata URI</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter metadata URI"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Link to the metadata of the NFT (JSON)
              </p>
            </FormItem>
          )}
        />
                
        <div className="space-y-4">
          {collectionMint && (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Collection Mint</span>
                <span className="font-mono text-xs truncate max-w-[200px]">{collectionMint}</span>
              </div>
            </div>
          )}
          
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
                ) : "Create NFT"}
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
      <Card className={className}>
        <CardHeader>
          <CardTitle>Create NFT</CardTitle>
          <CardDescription>Create a new NFT on Solana</CardDescription>
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
        <CardTitle className="flex items-center justify-between">
          <span>Create NFT</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Create a new NFT on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}