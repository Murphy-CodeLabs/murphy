'use client';

import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";
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

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries asynchronously
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner } from '@metaplex-foundation/umi';
import { createTree } from '@metaplex-foundation/mpl-bubblegum';

interface CreateMerkleTreeResult {
  mint: string;
  signature: string;
}

type MerkleTreeFormValues = {
  maxDepth: number;
  maxBuffer: number;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate max depth
  if (data.maxDepth === undefined || data.maxDepth === null || data.maxDepth === "") {
    errors.maxDepth = {
      type: "required",
      message: "Max depth is required",
    };
  } else if (Number(data.maxDepth) < 1 || Number(data.maxDepth) > 30) {
    errors.maxDepth = {
      type: "range",
      message: "Max depth must be between 1 and 30",
    };
  }

  // Validate max buffer
  if (data.maxBuffer === undefined || data.maxBuffer === null || data.maxBuffer === "") {
    errors.maxBuffer = {
      type: "required",
      message: "Max buffer size is required",
    };
  } else if (Number(data.maxBuffer) < 1) {
    errors.maxBuffer = {
      type: "min",
      message: "Max buffer size must be greater than 0",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function CreateMerkleTree({ onMerkleTreeCreated }: { onMerkleTreeCreated?: (merkleTreeAddress: string) => void }) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateMerkleTreeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error

  // Form setup with react-hook-form
  const form = useForm<MerkleTreeFormValues>({
    defaultValues: {
      maxDepth: 14,
      maxBuffer: 64,
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
  const onSubmit = async (values: MerkleTreeFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setCurrentStage('confirming');

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
      
      toast.loading("Creating Merkle Tree...", {
        id: "create-merkle-tree"
      });
      
      // Create Merkle Tree
      const merkleTree = generateSigner(umi);
      const builder = await createTree(umi, {
        merkleTree,
        maxDepth: values.maxDepth,
        maxBufferSize: values.maxBuffer,
      });
      
      const createResult = await builder.sendAndConfirm(umi);
      
      // Convert signature to string format
      const signatureStr = typeof createResult.signature === 'string' 
        ? createResult.signature 
        : Buffer.from(createResult.signature).toString('base64');
      
      // Convert merkle tree address to string
      const merkleTreeAddressStr = merkleTree.publicKey.toString();
      
      // Save result
      setResult({
        mint: merkleTreeAddressStr,
        signature: signatureStr
      });
      
      // Call callback if provided
      if (onMerkleTreeCreated) {
        onMerkleTreeCreated(merkleTreeAddressStr);
      }
      
      toast.success("Merkle Tree created successfully!", {
        id: "create-merkle-tree",
        description: `Address: ${merkleTreeAddressStr.slice(0, 8)}...${merkleTreeAddressStr.slice(-8)}`
      });
      
      setCurrentStage('success');
      
    } catch (err: any) {
      console.error("Create Merkle Tree error:", err);
      setError(err.message);
      setCurrentStage('error');
      
      // Check if user canceled/rejected the transaction
      if (err.message && (err.message.includes("rejected") || err.message.includes("canceled"))) {
        toast.error("Transaction canceled", {
          id: "create-merkle-tree",
          description: "You canceled the transaction"
        });
      } else {
        toast.error("Failed to create Merkle Tree", {
          id: "create-merkle-tree",
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

  const viewMerkleTree = () => {
    if (result?.mint) {
      const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/account/';
      window.open(`${baseUrl}${result.mint}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
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
      <h3 className="text-xl font-bold text-center">Merkle Tree Created!</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Merkle Tree Address:</div>
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
          onClick={viewMerkleTree}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Merkle Tree
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
        Create New Merkle Tree
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
      <p className="text-muted-foreground">{error || 'An error occurred while creating the Merkle Tree.'}</p>
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
      <h3 className="text-xl font-bold">Creating Merkle Tree</h3>
      <p className="text-muted-foreground">Please wait while your Merkle Tree is being created...</p>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="maxDepth"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Max Depth</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="number"
                  placeholder="14"
                  min="1"
                  max="30"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum depth of the Merkle tree (recommended: 14-20)
              </p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="maxBuffer"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Max Buffer Size</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="number"
                  placeholder="64"
                  min="1"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum buffer size for concurrent operations (recommended: 64-256)
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
                ) : "Create Merkle Tree"}
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
          <CardTitle>Create Merkle Tree</CardTitle>
          <CardDescription>Create a new Merkle Tree on Solana</CardDescription>
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
          <span>Create Merkle Tree</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Create a new Merkle Tree on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
} 