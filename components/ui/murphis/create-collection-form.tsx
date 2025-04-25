'use client';

// React và hooks
import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";

// Solana
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

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

// Icons và notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries asynchronously
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';

interface CreateCollectionResult {
  mint: string;
  signature: string;
}

type CollectionFormValues = {
  name: string;
  uri: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate collection name
  if (!data.name) {
    errors.name = {
      type: "required",
      message: "Collection name is required",
    };
  }

  // Validate metadata URI
  if (!data.uri) {
    errors.uri = {
      type: "required",
      message: "URI metadata is required",
    };
  } else {
    try {
      new URL(data.uri);
    } catch (e) {
      errors.uri = {
        type: "pattern",
        message: "Invalid URI. Please enter a full URI including https://",
      };
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export default function CreateCollectionForm({ onCollectionCreated }: { onCollectionCreated?: (collectionMint: string) => void }) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateCollectionResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');

  // Form setup with react-hook-form
  const form = useForm<CollectionFormValues>({
    defaultValues: {
      name: "",
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

  const onSubmit = async (values: CollectionFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction,
        signAllTransactions
      };

      // Create UMI instance with all necessary modules
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());
      
      // Create signer for collection mint
      const collectionMint = generateSigner(umi);
      
      toast.loading("Creating collection...", {
        id: "create-collection"
      });
      
      // Create collection NFT
      const createResult = await createNft(umi, {
        mint: collectionMint,
        name: values.name,
        uri: values.uri,
        sellerFeeBasisPoints: percentAmount(5.5), // 5.5%
        isCollection: true,
      }).sendAndConfirm(umi);
      
      // Convert signature to string format
      const signatureStr = typeof createResult.signature === 'string' 
        ? createResult.signature 
        : Buffer.from(createResult.signature).toString('base64');
      
      // Convert mint address to string
      const mintAddressStr = collectionMint.publicKey.toString();
      
      // Save result
      setResult({
        mint: mintAddressStr,
        signature: signatureStr
      });
      
      // Call callback if provided
      if (onCollectionCreated) {
        onCollectionCreated(mintAddressStr);
      }
      
      toast.success("Collection created successfully!", {
        id: "create-collection",
        description: `Mint: ${mintAddressStr.slice(0, 8)}...${mintAddressStr.slice(-8)}`
      });
      
      // Reset form
      form.reset();
    } catch (err: any) {
      console.error("Error creating collection:", err);
      
      toast.error("Cannot create collection", {
        id: "create-collection",
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

  const viewCollection = () => {
    if (result?.mint) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/token/';
      window.open(`${baseUrl}${result.mint}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
  };

  // Avoid hydration error
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Collection</CardTitle>
          <CardDescription>Create a new NFT collection on Solana</CardDescription>
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
      <h3 className="text-xl font-bold text-center">Collection Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Mint Address:</div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.mint}
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
          onClick={viewCollection}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Collection
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
        Create New Collection
      </Button>
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
                <FormLabel>Collection Name</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="My Awesome Collection"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the name for your NFT collection
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
                <FormLabel>URI Metadata</FormLabel>
              </div>
              <FormControl>
                <Input
                  placeholder="https://example.com/my-collection.json"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                URI to metadata JSON according to Metaplex standards
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
            
            <div className="flex justify-between items-center text-sm">
              <span>Royalty Fee</span>
              <span className="font-medium">5.5%</span>
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
                ) : "Create Collection"}
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
          <span>Create Collection</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Create a new NFT collection on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {result ? renderSuccess() : renderForm()}
      </CardContent>
    </Card>
  );
} 