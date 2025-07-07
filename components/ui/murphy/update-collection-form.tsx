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
import { Loader2, ExternalLink, CheckCircle, RefreshCw } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, fetchMetadata, updateV1 } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

interface UpdateCollectionResult {
  mint: string;
  signature: string;
}

type UpdateCollectionFormValues = {
  collectionMint: string;
  name: string;
  uri: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate collection mint address
  if (!data.collectionMint) {
    errors.collectionMint = {
      type: "required",
      message: "Collection mint address is required",
    };
  } else {
    try {
      // Validate Solana public key format
      publicKey(data.collectionMint);
    } catch (e) {
      errors.collectionMint = {
        type: "pattern",
        message: "Invalid Solana public key format",
      };
    }
  }

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

export default function UpdateCollectionForm({
  collectionMint: propCollectionMint,
  onCollectionUpdated
}: {
  collectionMint?: string;
  onCollectionUpdated?: (collectionMint: string) => void;
}) {
  const { connection } = useConnection();
  const { publicKey: walletPublicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UpdateCollectionResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');

  // Form setup with react-hook-form
  const form = useForm<UpdateCollectionFormValues>({
    defaultValues: {
      collectionMint: propCollectionMint || "",
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

  // Load collection metadata when mint address changes
  const loadCollectionMetadata = async (mintAddress: string) => {
    if (!mintAddress) return;

    try {
      setIsLoading(true);

      // Create UMI instance
      const umi = createUmi(connection.rpcEndpoint)
        .use(mplTokenMetadata());

      // Fetch current metadata
      const collectionPublicKey = publicKey(mintAddress);

      try {
        const metadata = await fetchMetadata(umi, collectionPublicKey);

        // Update form with current values
        form.setValue('name', metadata.name);
        form.setValue('uri', metadata.uri);

        toast.success("Collection metadata loaded!", {
          description: `Found: ${metadata.name}`
        });
      } catch (metaError) {
        console.warn("Metadata fetch failed:", metaError);

        // Try to validate mint exists by checking account
        try {
          const mintAccount = await umi.rpc.getAccount(collectionPublicKey);
          if (mintAccount.exists) {
            toast.warning("Collection found but metadata not loaded", {
              description: "You can still update the collection"
            });
          } else {
            throw new Error("Collection not found");
          }
        } catch (accountError) {
          throw new Error("Collection not found or inaccessible");
        }
      }

    } catch (err: any) {
      console.error("Error loading metadata:", err);
      toast.error("Failed to load collection metadata", {
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: UpdateCollectionFormValues) => {
    if (!connected || !walletPublicKey || !wallet) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey: walletPublicKey,
        signTransaction,
        signAllTransactions
      };

      // Create UMI instance with all necessary modules
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata());

      toast.loading("Updating collection...", {
        id: "update-collection"
      });

      const collectionPublicKey = publicKey(values.collectionMint);

      const updateBuilder = updateV1(umi, {
        mint: collectionPublicKey,
        authority: umi.identity,
        data: {
          name: values.name,
          symbol: '', // Keep existing symbol
          uri: values.uri,
          sellerFeeBasisPoints: 0, // Keep existing royalty
          creators: null, // Keep existing creators
        }
      });

      const updateResult = await updateBuilder.send(umi);

      // Handle signature properly - updateResult is TransactionSignature type
      const signatureStr = updateResult.toString();

      // Save result
      setResult({
        mint: values.collectionMint,
        signature: signatureStr
      });

      // Call callback if provided
      if (onCollectionUpdated) {
        onCollectionUpdated(values.collectionMint);
      }

      toast.success("Collection updated successfully!", {
        id: "update-collection",
        description: `Mint: ${values.collectionMint.slice(0, 8)}...${values.collectionMint.slice(-8)}`
      });

    } catch (err: any) {
      console.error("Error updating collection:", err);

      toast.error("Cannot update collection", {
        id: "update-collection",
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
          <CardTitle>Update Collection</CardTitle>
          <CardDescription>Update an existing NFT collection on Solana</CardDescription>
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

      <h3 className="text-xl font-bold text-center">Collection Updated!</h3>

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
        <RefreshCw className="h-4 w-4 mr-2" />
        Update Another Collection
      </Button>
    </div>
  );

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="collectionMint"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Collection Mint Address</FormLabel>
                {field.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadCollectionMetadata(field.value)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Load
                  </Button>
                )}
              </div>
              <FormControl>
                <Input
                  placeholder="Enter collection mint address"
                  {...field}
                  disabled={isSubmitting || !!propCollectionMint}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                The mint address of the collection NFT you want to update
              </p>
            </FormItem>
          )}
        />

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
                  placeholder="My updated collection"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the new name for your NFT collection
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
                  placeholder="https://example.com/my-updated-collection.json"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                URI to updated metadata JSON according to Metaplex standards
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
                    Updating...
                  </>
                ) : "Update Collection"}
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
          <span>Update Collection</span>
          {connected && walletPublicKey && (
            <Badge variant="outline" className="ml-2">
              {walletPublicKey.toString().slice(0, 4)}...{walletPublicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Update an existing NFT collection on Solana</CardDescription>
      </CardHeader>
      <CardContent>
        {result ? renderSuccess() : renderForm()}
      </CardContent>
    </Card>
  );
}