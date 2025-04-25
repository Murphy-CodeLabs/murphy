'use client';

import { useState, useContext, useEffect } from 'react';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { mintToCollectionV1 } from '@metaplex-foundation/mpl-bubblegum';
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConnetWalletButton } from "./connect-wallet-button";
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

export interface MintCNFTProps {
  collectionMint?: string;
  merkleTree?: string;
  rpcUrl?: string;
  className?: string;
}

// Type for CNFT form values
type CNFTFormValues = {
  name: string;
  symbol: string;
  uri: string;
  merkleTreeAddress: string;
  collectionMint: string;
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

  // Validate merkleTreeAddress
  if (!data.merkleTreeAddress) {
    errors.merkleTreeAddress = {
      type: "required",
      message: "Merkle Tree address is required",
    };
  }

  try {
    // Validate address format for merkleTreeAddress
    if (data.merkleTreeAddress) {
      umiPublicKey(data.merkleTreeAddress);
    }
  } catch (err) {
    errors.merkleTreeAddress = {
      type: "pattern",
      message: "Invalid Solana address",
    };
  }

  try {
    // Validate address format for collectionMint (if provided)
    if (data.collectionMint) {
      umiPublicKey(data.collectionMint);
    }
  } catch (err) {
    errors.collectionMint = {
      type: "pattern",
      message: "Invalid Solana address",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function MintCNFT({ collectionMint: propCollectionMint, merkleTree: propMerkleTree, className }: MintCNFTProps) {
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
  const form = useForm<CNFTFormValues>({
    defaultValues: {
      name: "",
      symbol: "",
      uri: "",
      merkleTreeAddress: propMerkleTree || "",
      collectionMint: propCollectionMint || "",
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
  const onSubmit = async (values: CNFTFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setCurrentStage('confirming');
      
      toast.loading("Creating CNFT...", {
        id: "create-cnft"
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
      
      // Convert addresses
      const walletPublicKey = publicKey.toBase58();
      const leafOwnerPubkey = umiPublicKey(walletPublicKey);
      const merkleTreePubkey = umiPublicKey(values.merkleTreeAddress);
      
      // Use mintToCollectionV1 instead of mintV1
      const { mplBubblegum } = await import('@metaplex-foundation/mpl-bubblegum');
      umi.use(mplBubblegum());
      
      // Check if collection exists
      let collectionMintPubkey;
      if (values.collectionMint) {
        try {
          collectionMintPubkey = umiPublicKey(values.collectionMint);
          
          // Check collection by direct fetch
          try {
            // Check if collection exists by getting account info
            const collectionAccount = await umi.rpc.getAccount(collectionMintPubkey);
            if (!collectionAccount.exists) {
              throw new Error("Collection does not exist");
            }
          } catch (err) {
            throw new Error("Invalid or not found Collection NFT. Please try another collection.");
          }
        } catch (err) {
          throw new Error("Invalid collection. Please try another collection or leave empty to create new.");
        }
      } else {
        try {
          // Create a temporary collection if none exists
          const tempCollectionMint = generateSigner(umi);
          
          // Create collection NFT and wait for full confirmation
          const createCollectionResult = await createNft(umi, {
            mint: tempCollectionMint,
            name: values.name + " Collection",
            symbol: values.symbol,
            uri: values.uri,
            sellerFeeBasisPoints: percentAmount(5.0),
            isCollection: true,
          }).sendAndConfirm(umi);
          
          // Wait 2 seconds for transaction to be fully confirmed on network
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          collectionMintPubkey = tempCollectionMint.publicKey;
        } catch (err) {
          throw new Error("Failed to create collection for CNFT. Please try with an existing collection.");
        }
      }
      
      // Configure mintToCollectionV1
      const metadataArgs = {
        name: values.name,
        uri: values.uri,
        sellerFeeBasisPoints: 500,
        collection: {
          key: collectionMintPubkey,
          verified: false
        },
        creators: [
          { address: umi.identity.publicKey, verified: false, share: 100 }
        ],
      };
      
      const mintConfig = {
        leafOwner: leafOwnerPubkey,
        merkleTree: merkleTreePubkey,
        collectionMint: collectionMintPubkey,
        metadata: metadataArgs,
      };
      
      try {
        const nftSigner = generateSigner(umi);
        const mintResult = await mintToCollectionV1(umi, mintConfig).sendAndConfirm(umi);
        
        // Save result
        setResult({
          signature: mintResult.signature.toString(),
          nftAddress: nftSigner.publicKey.toString()
        });
        
        toast.success("CNFT created successfully!", {
          id: "create-cnft",
          description: `cNFT: ${values.name}`
        });
        
        setCurrentStage('success');
      } catch (mintErrorUnknown) {
        const mintError = mintErrorUnknown as Error;
        // If error is related to collection metadata, try creating new collection
        if (mintError.message && mintError.message.includes("collection_metadata")) {
          // Create new collection
          const newCollectionMint = generateSigner(umi);
          
          try {
            // Create collection NFT and wait for confirmation
            const createCollectionResult = await createNft(umi, {
              mint: newCollectionMint,
              name: values.name + " Collection",
              symbol: values.symbol,
              uri: values.uri,
              sellerFeeBasisPoints: percentAmount(5.0),
              isCollection: true,
            }).sendAndConfirm(umi);
            
            // Wait 2 seconds for transaction confirmation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try minting again with new collection
            const newMintConfig = {
              ...mintConfig,
              collectionMint: newCollectionMint.publicKey,
              metadata: {
                ...metadataArgs,
                collection: {
                  key: newCollectionMint.publicKey,
                  verified: false
                }
              }
            };
            
            const nftSigner = generateSigner(umi);
            const newMintResult = await mintToCollectionV1(umi, newMintConfig).sendAndConfirm(umi);
            
            // Save result
            setResult({
              signature: newMintResult.signature.toString(),
              nftAddress: nftSigner.publicKey.toString()
            });
            
            toast.success("CNFT created successfully with new collection!", {
              id: "create-cnft",
              description: `cNFT: ${values.name}`
            });
            
            setCurrentStage('success');
            
            // Update form with new collection mint
            form.setValue('collectionMint', newCollectionMint.publicKey.toString());
          } catch (retryErrorUnknown) {
            const retryError = retryErrorUnknown as Error;
            throw new Error(`Cannot create CNFT: ${retryError.message}`);
          }
        } else {
          // If it's a different error, throw it again
          throw mintError;
        }
      }
    } catch (err: any) {
      console.error("Create CNFT error:", err);
      setError(err.message);
      setCurrentStage('error');
      
      toast.error("Failed to create CNFT", {
        id: "create-cnft",
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
      <h3 className="text-xl font-bold text-center">CNFT Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">CNFT Address:</div>
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
          View CNFT
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
        Create New CNFT
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
      <p className="text-muted-foreground">{error || 'An error occurred while creating the CNFT.'}</p>
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
      <div className="mx-auto flex h-20 w-20 items-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Creating CNFT</h3>
      <p className="text-muted-foreground">Please wait while your CNFT is being created...</p>
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
                <FormLabel>CNFT Name</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter CNFT name"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Display name of the CNFT
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
                Short symbol for your CNFT
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
                Link to the metadata of the CNFT (JSON)
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="merkleTreeAddress"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Merkle Tree Address</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter Merkle Tree address"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Address of the Merkle Tree to mint CNFT into
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="collectionMint"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Collection Mint (Optional)</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="Enter Collection Mint address or leave empty to create new"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Collection NFT mint address, if left empty, a new collection will be created
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
          </div>
          
          <div className="pt-2">
            {!connected ? (
              <ConnetWalletButton className="w-full" />
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
                ) : "Create CNFT"}
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
          <CardTitle>Create CNFT</CardTitle>
          <CardDescription>Create a new compressed NFT on Solana</CardDescription>
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
          <span>Create CNFT</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Create a new compressed NFT on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}