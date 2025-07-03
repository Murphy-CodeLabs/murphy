'use client';

// React và hooks
import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";

// Solana
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons and notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, Search, Info, Copy, XCircle, CheckCircle, Eye } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, fetchMetadata, Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

// Types
type FormValues = {
  mintAddress: string;
};

export interface TokenMetadataViewerProps {
  mintAddress?: string;
  className?: string;
}

// Custom resolver for form validation
const customResolver = (data: any) => {
  const errors: any = {};
  if (!data.mintAddress) {
    errors.mintAddress = { type: "required", message: "Mint address is required" };
  } else {
    try {
      new PublicKey(data.mintAddress);
    } catch (e) {
      errors.mintAddress = { type: "pattern", message: "Invalid Solana address format" };
    }
  }
  return { values: Object.keys(errors).length === 0 ? data : {}, errors };
};

export default function TokenMetadataViewer({
  mintAddress: propMintAddress,
  className
}: TokenMetadataViewerProps) {
  // Hooks
  const { connection } = useConnection();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<'input' | 'loading' | 'success' | 'error'>('input');

  // Form setup
  const form = useForm<FormValues>({
    defaultValues: { mintAddress: propMintAddress || "" },
    mode: "onSubmit",
    resolver: customResolver,
  });

  // Effects
  useEffect(() => {
    setMounted(true);
    if (propMintAddress) {
      onSubmit({ mintAddress: propMintAddress });
    }
  }, [propMintAddress]);

  useEffect(() => {
    if (endpoint) {
      setNetwork(endpoint.includes('devnet') ? 'devnet' : 'mainnet');
    }
  }, [endpoint]);

  // Submit handler
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      setCurrentStage('loading');
      setError(null);
      setMetadata(null);

      toast.loading("Fetching token metadata...", { id: "fetch-metadata" });

      const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
      const mint = publicKey(values.mintAddress);

      const fetchedMetadata = await fetchMetadata(umi, mint);

      setMetadata(fetchedMetadata);
      setCurrentStage('success');
      toast.success("Metadata fetched successfully!", { id: "fetch-metadata" });

    } catch (err: any) {
      console.error("Error fetching metadata:", err);
      setError(err.message || "An unknown error occurred");
      setCurrentStage('error');
      toast.error("Failed to fetch metadata", { id: "fetch-metadata", description: err.message });

      if (err.message?.includes("failed to fetch") ||
        err.message?.includes("timeout") ||
        err.message?.includes("429") ||
        err.message?.includes("503")) {
        switchToNextEndpoint();
      }
    }
    finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const viewInExplorer = (address: string) => {
    const baseUrl = network === 'devnet' ? 'https://explorer.solana.com/address/' : 'https://solscan.io/token/';
    window.open(`${baseUrl}${address}${network === 'devnet' ? '?cluster=devnet' : ''}`, '_blank');
  };

  const resetForm = () => {
    form.reset({ mintAddress: "" });
    setMetadata(null);
    setError(null);
    setCurrentStage('input');
  };

  // Render functions
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="mintAddress"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Token Mint Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter token mint address"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">
                The mint address of the token you want to view metadata for
              </p>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Fetching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              View Metadata
            </>
          )}
        </Button>
      </form>
    </Form>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">Fetching metadata...</p>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-10 w-10 text-red-600" />
      </div>
      <h3 className="text-xl font-bold text-red-600">Error</h3>
      <p className="text-muted-foreground">Failed to fetch token metadata.</p>
      <Alert>
        <AlertDescription className="text-sm text-red-600 break-all">
          {error}
        </AlertDescription>
      </Alert>
      <Button onClick={resetForm} className="w-full">
        <Search className="h-4 w-4 mr-2" />
        Search Another Token
      </Button>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <div>
          <h4 className="font-semibold text-green-800">Metadata Found</h4>
          <p className="text-sm text-green-700">Successfully fetched on-chain metadata for the token.</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Basic Info */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" />
            Basic Information
          </h4>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{metadata?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Symbol</span>
              <span className="font-medium">{metadata?.symbol}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mint Address</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate max-w-[150px]">{metadata?.publicKey}</span>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(metadata?.publicKey.toString() || '')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Update Authority</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate max-w-[150px]">{metadata?.updateAuthority}</span>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(metadata?.updateAuthority.toString() || '')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold">Metadata Details</h4>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">URI</span>
              <a
                href={metadata?.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[200px] text-right"
              >
                {metadata?.uri}
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Seller Fee Basis Points</span>
              <span className="font-medium">
                {metadata?.sellerFeeBasisPoints.basisPoints.toString()} ({metadata?.sellerFeeBasisPoints.percent}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Primary Sale Happened</span>
              <Badge variant={metadata?.primarySaleHappened ? "default" : "secondary"}>
                {metadata?.primarySaleHappened ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Is Mutable</span>
              <Badge variant={metadata?.isMutable ? "default" : "secondary"}>
                {metadata?.isMutable ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Collection Info */}
        {metadata?.collection.__option === 'Some' && (
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold">Collection</h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[150px]">{metadata.collection.value.key}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(metadata.collection.value.key.toString() || '')}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Verified</span>
                <Badge variant={metadata.collection.value.verified ? "default" : "secondary"}>
                  {metadata.collection.value.verified ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Creators */}
        {metadata?.creators.__option === 'Some' && (
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold">Creators</h4>
            <div className="space-y-3">
              {metadata.creators.value.map((creator, index) => (
                <div key={index} className="border-t pt-3 first:border-t-0 first:pt-0">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Address</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono truncate max-w-[120px]">{creator.address}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(creator.address.toString())}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Share</span>
                      <span className="font-medium">{creator.share}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Verified</span>
                      <Badge variant={creator.verified ? "default" : "secondary"}>
                        {creator.verified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="outline" onClick={() => viewInExplorer(metadata?.publicKey.toString() || '')} className="flex-1">
          <ExternalLink className="h-4 w-4 mr-2" />
          View in Explorer
        </Button>
        <Button onClick={resetForm} className="flex-1">
          <Search className="h-4 w-4 mr-2" />
          Search Another
        </Button>
      </div>
    </div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 'success': return renderSuccess();
      case 'error': return renderError();
      case 'loading': return renderLoading();
      default: return renderForm();
    }
  };

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Token Metadata Viewer
        </CardTitle>
        <CardDescription>
          View on-chain metadata for any Solana token (fungible or NFT).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export { TokenMetadataViewer };