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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons and notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, Search, TreePine, Archive, Info, Copy } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

interface DASApiResponse {
  id: string;
  interface: string;
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  supply: {
    print_max_supply: number;
    print_current_supply: number;
    edition_nonce: number;
  };
  mutable: boolean;
  burnt: boolean;
  mint_extensions?: any;
  compression: {
    eligible: boolean;
    compressed: boolean;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    tree: string;
    seq: number;
    leaf_id: number;
  };
  grouping: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty: {
    royalty_model: string;
    target?: string;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  content: {
    $schema: string;
    json_uri: string;
    files: Array<{
      uri: string;
      mime: string;
    }>;
    metadata: {
      attributes: Array<{
        trait_type: string;
        value: string;
      }>;
      description: string;
      name: string;
      symbol: string;
      image?: string;
      external_url?: string;
    };
    links: {
      external_url?: string;
      image?: string;
    };
  };
}
interface DASApiError {
  code: number;
  message: string;
  data?: any;
}
interface CompressedNFTData {
  assetId: string;
  tree: string;
  leafIndex: number;
  proof: string[];
  metadata?: {
    name: string;
    symbol: string;
    uri: string;
    creators?: Array<{
      address: string;
      verified: boolean;
      share: number;
    }>;
  };
  owner: string;
  compressed: boolean;
  readable: boolean;
}

interface CompressedNFTMetadata {
  name: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

type CompressedNFTFormValues = {
  assetId: string;
  treeAddress: string;
  leafIndex: number;
};
const DAS_API_ENDPOINTS = {
  mainnet: [
    'https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY',
    'https://rpc.simplehash.com/solana-mainnet',
    'https://solana-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY',
  ],
  devnet: [
    'https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY',
    'https://rpc.simplehash.com/solana-devnet',
    'https://solana-devnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY',
  ],
};
const getDASApiUrl = (network: string) => {
  if (network === 'mainnet') {
    return 'https://mainnet.helius-rpc.com/?api-key=demo'; // Replace with your API key
  }
  return 'https://devnet.helius-rpc.com/?api-key=demo'; // Replace with your API key
};

// DAS API method for getting asset by ID
const callDASApi = async (method: string, params: any, network: string) => {
  const url = getDASApiUrl(network);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'compressed-nft-viewer',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`DAS API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(`DAS API error: ${result.error.message}`);
  }

  return result.result;
};
// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate asset ID (if provided)
  if (data.assetId && data.assetId.trim()) {
    try {
      new PublicKey(data.assetId);
    } catch (e) {
      errors.assetId = {
        type: "pattern",
        message: "Invalid asset ID format",
      };
    }
  }

  // Validate tree address (if provided)
  if (data.treeAddress && data.treeAddress.trim()) {
    try {
      new PublicKey(data.treeAddress);
    } catch (e) {
      errors.treeAddress = {
        type: "pattern",
        message: "Invalid tree address format",
      };
    }
  }

  // Validate leaf index
  if (data.leafIndex !== undefined && data.leafIndex < 0) {
    errors.leafIndex = {
      type: "min",
      message: "Leaf index must be 0 or greater",
    };
  }

  // Either assetId OR (treeAddress + leafIndex) is required
  if (!data.assetId || data.assetId.trim().length === 0) {
    if (!data.treeAddress || data.treeAddress.trim().length === 0) {
      errors.treeAddress = {
        type: "required",
        message: "Tree address is required when Asset ID is not provided",
      };
    }
    if (data.leafIndex === undefined || data.leafIndex === "") {
      errors.leafIndex = {
        type: "required",
        message: "Leaf index is required when Asset ID is not provided",
      };
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export interface CompressedNFTViewerProps {
  assetId?: string;
  treeAddress?: string;
  leafIndex?: number;
  className?: string;
}

export default function CompressedNFTViewer({
  assetId: propAssetId,
  treeAddress: propTreeAddress,
  leafIndex: propLeafIndex,
  className
}: CompressedNFTViewerProps) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet } = useWallet();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [currentStage, setCurrentStage] = useState<'input' | 'loading' | 'success' | 'error'>('input');
  const [error, setError] = useState<string | null>(null);
  const [cnftData, setCnftData] = useState<CompressedNFTData | null>(null);
  const [cnftMetadata, setCnftMetadata] = useState<CompressedNFTMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState("by-asset-id");

  // Form setup
  const form = useForm<CompressedNFTFormValues>({
    defaultValues: {
      assetId: propAssetId || "",
      treeAddress: propTreeAddress || "",
      leafIndex: propLeafIndex || 0,
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

  // Fetch metadata when CNFT data is loaded
  useEffect(() => {
    if (cnftData?.metadata?.uri) {
      fetchMetadata(cnftData.metadata.uri);
    } else {
      setCnftMetadata(null);
    }
  }, [cnftData]);

  const fetchMetadata = async (uri: string) => {
    try {
      setIsLoadingMetadata(true);

      // Handle IPFS URIs
      let metadataUrl = uri;
      if (uri.startsWith('ipfs://')) {
        metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      const response = await fetch(metadataUrl, {
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.status}`);
      }

      const metadata = await response.json();

      // Transform metadata to our format
      const transformedMetadata: CompressedNFTMetadata = {
        name: metadata.name || cnftData?.metadata?.name || "Compressed NFT",
        description: metadata.description || "",
        image: metadata.image || metadata.image_url || "",
        external_url: metadata.external_url || "",
        attributes: metadata.attributes || [],
        properties: metadata.properties || {},
      };

      setCnftMetadata(transformedMetadata);
    } catch (err: any) {
      console.error("Error loading metadata:", err);

      // Enhanced fallback for various error types
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        toast.warning("Unable to load metadata due to CORS restrictions");
        setCnftMetadata({
          name: cnftData?.metadata?.name || "Compressed NFT",
          description: "Metadata could not be loaded due to CORS restrictions. This is common with decentralized storage.",
          image: "https://via.placeholder.com/300x300/6b7280/ffffff?text=CORS+Error",
          attributes: [
            {
              trait_type: "Status",
              value: "CORS Blocked"
            }
          ]
        });
      } else {
        toast.error("Failed to load metadata", {
          description: err.message
        });

        // Fallback metadata
        setCnftMetadata({
          name: cnftData?.metadata?.name || "Compressed NFT",
          description: "Failed to load metadata",
          image: "https://via.placeholder.com/300x300/ef4444/ffffff?text=Load+Error",
        });
      }
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const getCompressedNFTByAssetId = async (assetId: string) => {
    try {
      console.log(`Fetching compressed NFT by asset ID: ${assetId}`);

      // Call DAS API to get asset by ID
      const dasResult: DASApiResponse = await callDASApi(
        'getAsset',
        { id: assetId },
        network
      );

      // Check if asset is compressed
      if (!dasResult.compression || !dasResult.compression.compressed) {
        throw new Error('Asset is not a compressed NFT');
      }

      // Transform DAS response to our format
      const compressedNFTData: CompressedNFTData = {
        assetId: dasResult.id,
        tree: dasResult.compression.tree,
        leafIndex: dasResult.compression.leaf_id,
        proof: [], // Proof would need separate API call
        metadata: {
          name: dasResult.content.metadata.name,
          symbol: dasResult.content.metadata.symbol,
          uri: dasResult.content.json_uri,
          creators: dasResult.creators?.map(creator => ({
            address: creator.address,
            verified: creator.verified,
            share: creator.share,
          })) || [],
        },
        owner: dasResult.ownership.owner,
        compressed: dasResult.compression.compressed,
        readable: true,
      };

      return compressedNFTData;
    } catch (error: any) {
      console.error("Error fetching compressed NFT:", error);

      // If DAS API fails, provide helpful error message
      if (error.message.includes('DAS API')) {
        throw new Error(`DAS API error: ${error.message}. Please check your API key and network settings.`);
      }

      if (error.message.includes('not a compressed NFT')) {
        throw new Error('The provided asset ID is not a compressed NFT');
      }

      throw new Error(`Unable to retrieve compressed NFT: ${error.message}`);
    }
  };
  // Add missing functions and render after getCompressedNFTByAssetId function:

  const getCompressedNFTByTreeAndLeaf = async (treeAddress: string, leafIndex: number) => {
    try {
      console.log(`Fetching compressed NFT by tree: ${treeAddress}, leaf: ${leafIndex}`);

      // Call DAS API to get assets by tree
      const dasResult = await callDASApi(
        'getAssetsByTree',
        {
          tree: treeAddress,
          limit: 1000,
          page: 1,
        },
        network
      );

      // Find the asset with matching leaf index
      const matchingAsset = dasResult.items?.find((asset: DASApiResponse) =>
        asset.compression.leaf_id === leafIndex
      );

      if (!matchingAsset) {
        throw new Error(`No compressed NFT found at leaf index ${leafIndex} in tree ${treeAddress}`);
      }

      // Use the asset ID to get full details
      return await getCompressedNFTByAssetId(matchingAsset.id);
    } catch (error: any) {
      console.error("Error fetching compressed NFT by tree:", error);

      if (error.message.includes('DAS API')) {
        throw new Error(`DAS API error: ${error.message}. Please check your API key and network settings.`);
      }

      throw new Error(`Unable to retrieve compressed NFT: ${error.message}`);
    }
  };

  const getAssetProof = async (assetId: string) => {
    try {
      const proofResult = await callDASApi(
        'getAssetProof',
        { id: assetId },
        network
      );

      return {
        root: proofResult.root,
        proof: proofResult.proof,
        node_index: proofResult.node_index,
        leaf: proofResult.leaf,
        tree_id: proofResult.tree_id,
      };
    } catch (error: any) {
      console.warn("Could not fetch asset proof:", error);
      return null;
    }
  };

  const onSubmit = async (values: CompressedNFTFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setCnftData(null);
      setCurrentStage('loading');

      let data: CompressedNFTData;

      if (values.assetId && values.assetId.trim()) {
        // Search by Asset ID
        data = await getCompressedNFTByAssetId(values.assetId);

        // Try to fetch proof
        const proof = await getAssetProof(values.assetId);
        if (proof) {
          data.proof = proof.proof;
        }
      } else {
        // Search by Tree Address + Leaf Index
        data = await getCompressedNFTByTreeAndLeaf(values.treeAddress, values.leafIndex);

        // Try to fetch proof
        const proof = await getAssetProof(data.assetId);
        if (proof) {
          data.proof = proof.proof;
        }
      }

      setCnftData(data);
      setCurrentStage('success');

      toast.success("Compressed NFT found!", {
        description: `Found via DAS API: ${data.assetId.slice(0, 8)}...`
      });

    } catch (err: any) {
      console.error("Get Compressed NFT error:", err);
      setError(err.message);
      setCurrentStage('error');

      // Enhanced error handling for DAS API issues
      if (err.message.includes('DAS API')) {
        toast.error("DAS API Error", {
          description: "Please check your API key configuration or try again later"
        });
      } else if (err.message.includes('not a compressed NFT')) {
        toast.error("Invalid Asset", {
          description: "The provided asset ID is not a compressed NFT"
        });
      } else {
        toast.error("Failed to fetch Compressed NFT", {
          description: err.message
        });
      }

      // If query fails due to connection error, try switching to another endpoint
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

  // Helper functions
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const viewInExplorer = () => {
    if (cnftData?.assetId) {
      const baseUrl = network === 'devnet'
        ? 'https://explorer.solana.com/address/'
        : 'https://solscan.io/account/';
      window.open(
        `${baseUrl}${cnftData.assetId}${network === 'devnet' ? '?cluster=devnet' : ''}`,
        '_blank'
      );
    }
  };

  const viewTreeInExplorer = () => {
    if (cnftData?.tree) {
      const baseUrl = network === 'devnet'
        ? 'https://explorer.solana.com/address/'
        : 'https://solscan.io/account/';
      window.open(
        `${baseUrl}${cnftData.tree}${network === 'devnet' ? '?cluster=devnet' : ''}`,
        '_blank'
      );
    }
  };

  const resetForm = () => {
    form.reset();
    setCnftData(null);
    setCnftMetadata(null);
    setError(null);
    setCurrentStage('input');
  };

  // Render functions
  const renderForm = () => (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-asset-id">By Asset ID</TabsTrigger>
          <TabsTrigger value="by-tree-leaf">By Tree & Leaf</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TabsContent value="by-asset-id" className="space-y-4">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <FormLabel>Asset ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter compressed NFT asset ID"
                        {...field}
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      The unique identifier for the compressed NFT
                    </p>
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="by-tree-leaf" className="space-y-4">
              <FormField
                control={form.control}
                name="treeAddress"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <FormLabel>Merkle Tree Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter merkle tree address"
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
                name="leafIndex"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <FormLabel>Leaf Index</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                        className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      The position of the NFT in the merkle tree
                    </p>
                  </FormItem>
                )}
              />
            </TabsContent>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>DAS API Integration:</strong> This viewer uses the Digital Asset Standard (DAS) API.
                For production use, configure your API keys for Helius, Alchemy, or other DAS providers.
                <br />
                <span className="text-xs mt-1 block">
                  Current configuration uses demo endpoints with rate limits.
                </span>
              </AlertDescription>
            </Alert>

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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      View Compressed NFT
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 p-4">
      {isLoadingMetadata ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading compressed NFT metadata...</p>
        </div>
      ) : (
        <>
          <div className="mx-auto flex flex-col items-center justify-center">
            {cnftMetadata?.image ? (
              <div className="relative w-48 h-48 mb-4">
                <img
                  src={cnftMetadata.image}
                  alt={cnftMetadata.name || "Compressed NFT Image"}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/300?text=Image+Not+Available";
                  }}
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-secondary/50 rounded-lg mb-4">
                <TreePine className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <h3 className="text-xl font-bold text-center flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              {cnftMetadata?.name || cnftData?.metadata?.name || "Compressed NFT"}
            </h3>

            {cnftMetadata?.description && (
              <p className="text-sm text-muted-foreground text-center mt-2 max-w-sm">
                {cnftMetadata.description.length > 140
                  ? `${cnftMetadata.description.substring(0, 140)}...`
                  : cnftMetadata.description}
              </p>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Asset ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[200px]">{cnftData?.assetId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cnftData?.assetId || "")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Owner</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[200px]">{cnftData?.owner}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cnftData?.owner || "")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Merkle Tree</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[200px]">{cnftData?.tree}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cnftData?.tree || "")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Leaf Index</span>
                <span className="font-medium">{cnftData?.leafIndex}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Compressed</span>
                <Badge variant={cnftData?.compressed ? "default" : "secondary"}>
                  {cnftData?.compressed ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            {cnftMetadata?.attributes && cnftMetadata.attributes.length > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Attributes</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {cnftMetadata.attributes.map((attr, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-muted-foreground">{attr.trait_type}</span>
                      <span className="font-medium">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cnftData?.proof && cnftData.proof.length > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Merkle Proof</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Proof Length</span>
                    <span>{cnftData.proof.length}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {cnftData.proof.map((proof, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Proof {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs truncate max-w-[120px]">{proof}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(proof)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={viewInExplorer}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Asset
            </Button>

            <Button
              variant="outline"
              onClick={viewTreeInExplorer}
              className="flex-1"
            >
              <TreePine className="h-4 w-4 mr-2" />
              View Tree
            </Button>
          </div>

          <Button
            onClick={resetForm}
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Another
          </Button>
        </>
      )}
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <Archive className="h-10 w-10 text-red-600" />
      </div>
      <h3 className="text-xl font-bold">Compressed NFT Not Found</h3>
      <p className="text-muted-foreground">{error || 'Unable to retrieve compressed NFT information. Please check the details and try again.'}</p>
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

  const renderLoading = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Fetching Compressed NFT</h3>
      <p className="text-muted-foreground">Please wait while we retrieve the compressed NFT information...</p>
    </div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'loading':
        return renderLoading();
      default:
        return renderForm();
    }
  };

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>View Compressed NFT</CardTitle>
          <CardDescription>
            Lookup and display information of compressed NFTs on Solana
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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            View Compressed NFT
          </span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Lookup and display information of compressed NFTs on Solana using DAS API
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

// Remove the named export and use only default export
// export { CompressedNFTViewer };

export { CompressedNFTViewer };