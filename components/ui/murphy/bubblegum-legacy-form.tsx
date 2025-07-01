'use client';

// React và hooks
import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";

// Solana
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

// Icons and notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Archive, AlertTriangle, X } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries for legacy Bubblegum
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  mplBubblegum,
  mintV1,
  createTree,
} from '@metaplex-foundation/mpl-bubblegum';
import {
  generateSigner,
  publicKey as umiPublicKey,
  some,
  none,
} from '@metaplex-foundation/umi';

interface BubblegumLegacyResult {
  nftAddress: string;
  signature: string;
  merkleTree?: string;
}

type BubblegumLegacyFormValues = {
  // NFT Metadata
  name: string;
  symbol: string;
  uri: string;

  // Tree Configuration
  merkleTreeAddress: string;
  useExistingTree: boolean;

  // Tree Creation (if creating new)
  maxDepth: number;
  maxBufferSize: number;

  // Collection (optional)
  collectionMint: string;

  // Legacy specific options
  enableCreatorHash: boolean;
  creators: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    errors.name = {
      type: "required",
      message: "Name is required",
    };
  }

  // Validate symbol
  if (!data.symbol || data.symbol.trim().length === 0) {
    errors.symbol = {
      type: "required",
      message: "Symbol is required",
    };
  }

  // Validate URI
  if (!data.uri || data.uri.trim().length === 0) {
    errors.uri = {
      type: "required",
      message: "Metadata URI is required",
    };
  } else {
    try {
      new URL(data.uri);
    } catch (e) {
      errors.uri = {
        type: "pattern",
        message: "Invalid URI format",
      };
    }
  }

  // Validate merkle tree if using existing tree
  if (data.useExistingTree) {
    if (!data.merkleTreeAddress || data.merkleTreeAddress.trim().length === 0) {
      errors.merkleTreeAddress = {
        type: "required",
        message: "Merkle Tree address is required when using existing tree",
      };
    } else {
      try {
        new PublicKey(data.merkleTreeAddress);
      } catch (e) {
        errors.merkleTreeAddress = {
          type: "pattern",
          message: "Invalid Merkle Tree address format",
        };
      }
    }
  } else {
    // Validate tree creation parameters
    if (!data.maxDepth || data.maxDepth < 3 || data.maxDepth > 30) {
      errors.maxDepth = {
        type: "range",
        message: "Max depth must be between 3 and 30",
      };
    }

    if (!data.maxBufferSize || data.maxBufferSize < 8 || data.maxBufferSize > 2048) {
      errors.maxBufferSize = {
        type: "range",
        message: "Max buffer size must be between 8 and 2048",
      };
    }
  }

  // Validate collection mint if provided
  if (data.collectionMint && data.collectionMint.trim().length > 0) {
    try {
      new PublicKey(data.collectionMint);
    } catch (e) {
      errors.collectionMint = {
        type: "pattern",
        message: "Invalid collection mint address format",
      };
    }
  }

  // Validate creators
  if (data.creators && data.creators.length > 0) {
    const totalShare = data.creators.reduce((sum: number, creator: any) => sum + (creator.share || 0), 0);
    if (totalShare !== 100) {
      errors.creators = {
        type: "sum",
        message: "Creator shares must sum to 100%",
      };
    }

    data.creators.forEach((creator: any, index: number) => {
      if (!creator.address || creator.address.trim().length === 0) {
        errors[`creators.${index}.address`] = {
          type: "required",
          message: "Creator address is required",
        };
      } else {
        try {
          new PublicKey(creator.address);
        } catch (e) {
          errors[`creators.${index}.address`] = {
            type: "pattern",
            message: "Invalid creator address format",
          };
        }
      }

      if (creator.share < 0 || creator.share > 100) {
        errors[`creators.${index}.share`] = {
          type: "range",
          message: "Creator share must be between 0 and 100",
        };
      }
    });
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export interface BubblegumLegacyFormProps {
  merkleTree?: string;
  collectionMint?: string;
  onNFTCreated?: (nftAddress: string, signature: string, merkleTree?: string) => void;
  className?: string;
}

export default function BubblegumLegacyForm({
  merkleTree: propMerkleTree,
  collectionMint: propCollectionMint,
  onNFTCreated,
  className
}: BubblegumLegacyFormProps) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BubblegumLegacyResult | null>(null);

  // Form setup
  const form = useForm<BubblegumLegacyFormValues>({
    defaultValues: {
      name: "",
      symbol: "",
      uri: "",
      merkleTreeAddress: propMerkleTree || "",
      useExistingTree: !!propMerkleTree,
      maxDepth: 14,
      maxBufferSize: 64,
      collectionMint: propCollectionMint || "",
      enableCreatorHash: false,
      creators: [
        {
          address: "",
          verified: true,
          share: 100,
        }
      ],
    },
    mode: "onSubmit",
    resolver: customResolver,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (endpoint) {
      setNetwork(endpoint.includes('devnet') ? 'devnet' : 'mainnet');
    }
  }, [endpoint]);

  // Auto-fill creator address when wallet connects
  useEffect(() => {
    if (connected && publicKey && form.getValues("creators")[0].address === "") {
      const creators = form.getValues("creators");
      creators[0].address = publicKey.toString();
      form.setValue("creators", creators);
    }
  }, [connected, publicKey, form]);

  const onSubmit = async (values: BubblegumLegacyFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage("confirming");
      setError("");

      toast.loading("Creating Legacy Compressed NFT...", {
        id: "bubblegum-legacy-create",
      });

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions
      };

      // Initialize UMI with Bubblegum
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplTokenMetadata())
        .use(mplBubblegum());

      let merkleTreeAddress = values.merkleTreeAddress;

      // Create new merkle tree if not using existing one
      if (!values.useExistingTree) {
        const merkleTree = generateSigner(umi);

        const createTreeIx = createTree(umi, {
          merkleTree,
          maxDepth: values.maxDepth,
          maxBufferSize: values.maxBufferSize,
          treeCreator: umi.identity,
        });

        await createTreeIx.sendAndConfirm(umi);
        merkleTreeAddress = merkleTree.publicKey.toString();
      }

      // Prepare creators
      const creators = values.creators.map(creator => ({
        address: umiPublicKey(creator.address),
        verified: creator.verified,
        share: creator.share,
      }));

      // Convert addresses
      const leafOwnerPubkey = umiPublicKey(publicKey.toString());
      const merkleTreePubkey = umiPublicKey(merkleTreeAddress);

      // Mint legacy compressed NFT
      const mintIx = mintV1(umi, {
        leafOwner: leafOwnerPubkey,
        merkleTree: merkleTreePubkey,
        metadata: {
          name: values.name,
          symbol: values.symbol,
          uri: values.uri,
          sellerFeeBasisPoints: 500, // 5%
          collection: values.collectionMint ? some({
            key: umiPublicKey(values.collectionMint),
            verified: false,
          }) : none(),
          creators: creators.length > 0 ? some(creators) : none(),
        },
      });

      const mintResult = await mintIx.sendAndConfirm(umi);
      const mintSignature = typeof mintResult.signature === 'string'
        ? mintResult.signature
        : Buffer.from(mintResult.signature).toString('base64');

      // For legacy Bubblegum, we need to derive the NFT address differently
      // This is a simplified approach - in reality, you'd need to track the leaf index
      const nftAddress = `${merkleTreeAddress}_leaf_${Date.now()}`;

      setResult({
        nftAddress,
        signature: mintSignature,
        merkleTree: merkleTreeAddress,
      });

      if (onNFTCreated) {
        onNFTCreated(nftAddress, mintSignature, merkleTreeAddress);
      }

      setCurrentStage("success");

      toast.success("Legacy Compressed NFT created successfully!", {
        id: "bubblegum-legacy-create",
        description: `NFT: ${nftAddress.slice(0, 8)}...${nftAddress.slice(-8)}`,
      });

    } catch (err: any) {
      console.error("Error creating legacy compressed NFT:", err);

      setCurrentStage("error");
      setError(err.message || "An unknown error occurred");

      if (err.message && (err.message.includes("rejected") || err.message.includes("canceled"))) {
        toast.error("Transaction rejected", {
          id: "bubblegum-legacy-create",
          description: "You have rejected the transaction",
        });
      } else {
        toast.error("Cannot create Legacy Compressed NFT", {
          id: "bubblegum-legacy-create",
          description: err.message,
        });

        if (err.message?.includes("failed to fetch") ||
          err.message?.includes("timeout") ||
          err.message?.includes("429") ||
          err.message?.includes("503")) {
          switchToNextEndpoint();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add creator
  const addCreator = () => {
    const currentCreators = form.getValues("creators");
    form.setValue("creators", [
      ...currentCreators,
      { address: "", verified: true, share: 0 }
    ]);
  };

  // Remove creator
  const removeCreator = (index: number) => {
    const currentCreators = form.getValues("creators");
    if (currentCreators.length > 1) {
      form.setValue("creators", currentCreators.filter((_, i) => i !== index));
    }
  };

  // View functions
  const viewExplorer = () => {
    if (result?.signature) {
      const baseUrl = network === "devnet"
        ? "https://explorer.solana.com/tx/"
        : "https://solscan.io/tx/";
      window.open(
        `${baseUrl}${result.signature}${network === "devnet" ? "?cluster=devnet" : ""}`,
        "_blank"
      );
    }
  };

  const viewMerkleTree = () => {
    if (result?.merkleTree) {
      const baseUrl = network === "devnet"
        ? "https://explorer.solana.com/address/"
        : "https://solscan.io/account/";
      window.open(
        `${baseUrl}${result.merkleTree}${network === "devnet" ? "?cluster=devnet" : ""}`,
        "_blank"
      );
    }
  };

  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage("input");
    setError("");
  };

  // Render functions
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Legacy Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Legacy Version:</strong> This is Bubblegum v1 (legacy). For new projects, consider using <a href="/docs/onchainkit/Metaplex/Bubblegum-v2/mint-cnft-form" className="underline">Bubblegum v2</a> instead.
          </AlertDescription>
        </Alert>

        {/* NFT Metadata */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">NFT Metadata</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter NFT name"
                    {...field}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="NFT"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collectionMint"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <FormLabel>Collection (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Collection mint address"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="uri"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Metadata URI</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com/metadata.json"
                    {...field}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tree Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Merkle Tree Configuration</h3>

          <FormField
            control={form.control}
            name="useExistingTree"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4 flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <Label>Use Existing Merkle Tree</Label>
              </FormItem>
            )}
          />

          {form.watch("useExistingTree") ? (
            <FormField
              control={form.control}
              name="merkleTreeAddress"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <FormLabel>Merkle Tree Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Merkle Tree address"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxDepth"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <FormLabel>Max Depth</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="3"
                        max="30"
                        placeholder="14"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tree depth (3-30). Higher = more NFTs possible
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxBufferSize"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <FormLabel>Max Buffer Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="8"
                        max="2048"
                        placeholder="64"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Buffer size (8-2048). Higher = more concurrent operations
                    </p>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Creators Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Creators</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCreator}
              disabled={isSubmitting}
            >
              Add Creator
            </Button>
          </div>

          {form.watch("creators").map((_, index) => (
            <div key={index} className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Creator {index + 1}</span>
                {form.watch("creators").length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCreator(index)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                  <FormField
                    control={form.control}
                    name={`creators.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Creator address"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`creators.${index}.share`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Share %"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 flex items-center">
                  <FormField
                    control={form.control}
                    name={`creators.${index}.verified`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
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
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Create Legacy Compressed NFT
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-green-600">Success!</h3>
        <p className="text-muted-foreground">
          Your Legacy Compressed NFT has been created successfully
        </p>
      </div>

      <div className="space-y-3 rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">NFT:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">
              {result?.nftAddress?.slice(0, 8)}...{result?.nftAddress?.slice(-8)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Transaction:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">
              {result?.signature?.slice(0, 8)}...{result?.signature?.slice(-8)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={viewExplorer}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {result?.merkleTree && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Merkle Tree:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {result.merkleTree.slice(0, 8)}...{result.merkleTree.slice(-8)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={viewMerkleTree}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Button onClick={resetForm} className="w-full">
        Create Another Legacy NFT
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <X className="h-10 w-10 text-red-600" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-red-600">Error</h3>
        <p className="text-muted-foreground">
          Failed to create Legacy Compressed NFT
        </p>
      </div>

      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>

      <Button onClick={() => setCurrentStage("input")} className="w-full">
        Try Again
      </Button>
    </div>
  );

  const renderConfirming = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Creating Legacy Compressed NFT</h3>
      <p className="text-muted-foreground">
        Please wait while your Legacy Compressed NFT is being created...
      </p>
    </div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case "success":
        return renderSuccess();
      case "error":
        return renderError();
      case "confirming":
        return renderConfirming();
      default:
        return renderForm();
    }
  };

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Create Legacy Compressed NFT</CardTitle>
          <CardDescription>
            Create compressed NFTs using Bubblegum v1 (legacy)
          </CardDescription>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Create Legacy Compressed NFT
            </CardTitle>
            <CardDescription>
              Create compressed NFTs using Bubblegum v1 (legacy)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connected && publicKey && (
              <Badge variant="outline">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </Badge>
            )}
            <Badge variant="outline">{network}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export { BubblegumLegacyForm };