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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons and notifications
import { toast } from "sonner";
import {
  Loader2,
  ExternalLink,
  Search,
  TreePine,
  Plus,
  Settings,
  Eye,
  Copy,
  RefreshCw,
  Trash2,
  Edit,
  Send,
  Info,
  CheckCircle,
  X,
  ArrowUpDown,
  AlertTriangle
} from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex libraries for Compressed NFTs
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplBubblegum, mintToCollectionV1, createTree } from '@metaplex-foundation/mpl-bubblegum';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  publicKey as umiPublicKey,
  percentAmount,
} from '@metaplex-foundation/umi';

// Types
interface CompressedNFT {
  id: string;
  name: string;
  image?: string;
  description?: string;
  merkleTree: string;
  leafIndex: number;
  owner: string;
  collection?: string;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  uri: string;
  compressed: boolean;
}

interface MerkleTreeInfo {
  address: string;
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
  authority: string;
  creationSlot: number;
  totalMinted: number;
  totalCapacity: number;
}

interface CNFTCollection {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  totalItems: number;
  merkleTree: string;
}

type ActiveTab = 'view' | 'mint' | 'manage' | 'trees' | 'collections';

// Form types
type ViewCNFTFormValues = {
  searchType: 'assetId' | 'treeAndLeaf' | 'owner';
  assetId: string;
  treeAddress: string;
  leafIndex: number;
  ownerAddress: string;
};

type MintCNFTFormValues = {
  name: string;
  symbol: string;
  uri: string;
  description: string;
  merkleTree: string;
  collection: string;
  useExistingCollection: boolean;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
};

type ManageTreeFormValues = {
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
};

// Custom resolver for view form
const viewFormResolver = (data: any) => {
  const errors: any = {};

  if (data.searchType === 'assetId') {
    if (!data.assetId || data.assetId.trim().length === 0) {
      errors.assetId = {
        type: "required",
        message: "Asset ID is required",
      };
    } else {
      try {
        new PublicKey(data.assetId);
      } catch (e) {
        errors.assetId = {
          type: "pattern",
          message: "Invalid Asset ID format",
        };
      }
    }
  } else if (data.searchType === 'treeAndLeaf') {
    if (!data.treeAddress || data.treeAddress.trim().length === 0) {
      errors.treeAddress = {
        type: "required",
        message: "Tree address is required",
      };
    } else {
      try {
        new PublicKey(data.treeAddress);
      } catch (e) {
        errors.treeAddress = {
          type: "pattern",
          message: "Invalid tree address format",
        };
      }
    }

    if (data.leafIndex === undefined || data.leafIndex < 0) {
      errors.leafIndex = {
        type: "min",
        message: "Leaf index must be 0 or greater",
      };
    }
  } else if (data.searchType === 'owner') {
    if (!data.ownerAddress || data.ownerAddress.trim().length === 0) {
      errors.ownerAddress = {
        type: "required",
        message: "Owner address is required",
      };
    } else {
      try {
        new PublicKey(data.ownerAddress);
      } catch (e) {
        errors.ownerAddress = {
          type: "pattern",
          message: "Invalid owner address format",
        };
      }
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

// Custom resolver for mint form
const mintFormResolver = (data: any) => {
  const errors: any = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = {
      type: "required",
      message: "Name is required",
    };
  }

  if (!data.symbol || data.symbol.trim().length === 0) {
    errors.symbol = {
      type: "required",
      message: "Symbol is required",
    };
  }

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

  if (!data.merkleTree || data.merkleTree.trim().length === 0) {
    errors.merkleTree = {
      type: "required",
      message: "Merkle Tree address is required",
    };
  } else {
    try {
      new PublicKey(data.merkleTree);
    } catch (e) {
      errors.merkleTree = {
        type: "pattern",
        message: "Invalid merkle tree address format",
      };
    }
  }

  if (data.useExistingCollection && (!data.collection || data.collection.trim().length === 0)) {
    errors.collection = {
      type: "required",
      message: "Collection address is required when using existing collection",
    };
  } else if (data.collection && data.collection.trim().length > 0) {
    try {
      new PublicKey(data.collection);
    } catch (e) {
      errors.collection = {
        type: "pattern",
        message: "Invalid collection address format",
      };
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export interface ImprovedCNFTManagerProps {
  className?: string;
  defaultTab?: ActiveTab;
}

export default function ImprovedCNFTManager({
  className,
  defaultTab = 'view'
}: ImprovedCNFTManagerProps) {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, wallet, signTransaction, signAllTransactions } = useWallet();
  const { endpoint, switchToNextEndpoint } = useContext(ModalContext);

  // State
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState('devnet');
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [compressedNFTs, setCompressedNFTs] = useState<CompressedNFT[]>([]);
  const [merkleTree, setMerkleTree] = useState<MerkleTreeInfo | null>(null);
  const [collections, setCollections] = useState<CNFTCollection[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<CompressedNFT | null>(null);

  // View form
  const viewForm = useForm<ViewCNFTFormValues>({
    defaultValues: {
      searchType: 'assetId',
      assetId: '',
      treeAddress: '',
      leafIndex: 0,
      ownerAddress: publicKey?.toString() || '',
    },
    mode: "onSubmit",
    resolver: viewFormResolver,
  });

  // Mint form
  const mintForm = useForm<MintCNFTFormValues>({
    defaultValues: {
      name: '',
      symbol: '',
      uri: '',
      description: '',
      merkleTree: '',
      collection: '',
      useExistingCollection: false,
      attributes: [{ trait_type: '', value: '' }],
    },
    mode: "onSubmit",
    resolver: mintFormResolver,
  });

  // Tree management form
  const treeForm = useForm<ManageTreeFormValues>({
    defaultValues: {
      maxDepth: 14,
      maxBufferSize: 64,
      canopyDepth: 0,
    },
    mode: "onSubmit",
  });

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
      viewForm.setValue('ownerAddress', publicKey.toString());
    }
  }, [connected, publicKey, viewForm]);

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

  // Search CNFTs
  const searchCNFTs = async (values: ViewCNFTFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      setCompressedNFTs([]);

      toast.loading("Searching compressed NFTs...", {
        id: "search-cnfts",
      });

      // Initialize UMI
      const umi = createUmi(connection.rpcEndpoint)
        .use(mplBubblegum());

      // Mock data for demonstration
      // In real implementation, you would use DAS API or indexer
      const mockCNFTs: CompressedNFT[] = [
        {
          id: `cnft_${Date.now()}_1`,
          name: "Compressed NFT #1",
          description: "A sample compressed NFT",
          image: "https://via.placeholder.com/300?text=CNFT+1",
          merkleTree: values.treeAddress || "11111111111111111111111111111111",
          leafIndex: 0,
          owner: values.ownerAddress || publicKey?.toString() || "11111111111111111111111111111111",
          collection: values.searchType === 'assetId' ? "22222222222222222222222222222222" : undefined,
          creators: [
            {
              address: publicKey?.toString() || "11111111111111111111111111111111",
              verified: true,
              share: 100,
            }
          ],
          attributes: [
            { trait_type: "Rarity", value: "Common" },
            { trait_type: "Type", value: "Compressed" },
          ],
          uri: "https://example.com/metadata/1.json",
          compressed: true,
        },
        {
          id: `cnft_${Date.now()}_2`,
          name: "Compressed NFT #2",
          description: "Another sample compressed NFT",
          image: "https://via.placeholder.com/300?text=CNFT+2",
          merkleTree: values.treeAddress || "11111111111111111111111111111111",
          leafIndex: 1,
          owner: values.ownerAddress || publicKey?.toString() || "11111111111111111111111111111111",
          creators: [
            {
              address: publicKey?.toString() || "11111111111111111111111111111111",
              verified: true,
              share: 100,
            }
          ],
          attributes: [
            { trait_type: "Rarity", value: "Rare" },
            { trait_type: "Type", value: "Compressed" },
          ],
          uri: "https://example.com/metadata/2.json",
          compressed: true,
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCompressedNFTs(mockCNFTs);

      toast.success("Compressed NFTs found!", {
        id: "search-cnfts",
        description: `Found ${mockCNFTs.length} compressed NFTs`,
      });

    } catch (err: any) {
      console.error("Error searching CNFTs:", err);
      setError(err.message);

      toast.error("Failed to search compressed NFTs", {
        id: "search-cnfts",
        description: err.message,
      });

      if (err.message?.includes("failed to fetch") ||
        err.message?.includes("timeout") ||
        err.message?.includes("429") ||
        err.message?.includes("503")) {
        switchToNextEndpoint();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mint CNFT
  const mintCNFT = async (values: MintCNFTFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      toast.loading("Minting compressed NFT...", {
        id: "mint-cnft",
      });

      // Create wallet adapter
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions
      };

      // Initialize UMI
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplBubblegum())
        .use(mplTokenMetadata());

      let collectionMint = values.collection;

      // Create new collection if not using existing one
      if (!values.useExistingCollection || !collectionMint) {
        const newCollectionMint = generateSigner(umi);

        const createCollectionResult = await createNft(umi, {
          mint: newCollectionMint,
          name: `${values.name} Collection`,
          symbol: values.symbol,
          uri: values.uri,
          sellerFeeBasisPoints: percentAmount(5.0),
          isCollection: true,
        }).sendAndConfirm(umi);

        collectionMint = newCollectionMint.publicKey.toString();

        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Mint compressed NFT
      const merkleTreePubkey = umiPublicKey(values.merkleTree);
      const collectionMintPubkey = umiPublicKey(collectionMint);

      const metadataArgs = {
        name: values.name,
        uri: values.uri,
        symbol: values.symbol,
        sellerFeeBasisPoints: 500,
        collection: {
          key: collectionMintPubkey,
          verified: false
        },
        creators: [
          { address: umi.identity.publicKey, verified: false, share: 100 }
        ],
      };

      const mintResult = await mintToCollectionV1(umi, {
        leafOwner: umi.identity.publicKey,
        merkleTree: merkleTreePubkey,
        collectionMint: collectionMintPubkey,
        metadata: metadataArgs,
      }).sendAndConfirm(umi);

      toast.success("Compressed NFT minted successfully!", {
        id: "mint-cnft",
        description: `NFT: ${values.name}`,
      });

      // Reset form
      mintForm.reset();

      // Refresh CNFTs list if on view tab
      if (activeTab === 'view') {
        const currentValues = viewForm.getValues();
        if (currentValues.ownerAddress) {
          await searchCNFTs(currentValues);
        }
      }

    } catch (err: any) {
      console.error("Error minting CNFT:", err);
      setError(err.message);

      toast.error("Failed to mint compressed NFT", {
        id: "mint-cnft",
        description: err.message,
      });

      if (err.message?.includes("failed to fetch") ||
        err.message?.includes("timeout") ||
        err.message?.includes("429") ||
        err.message?.includes("503")) {
        switchToNextEndpoint();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create Merkle Tree
  const createMerkleTree = async (values: ManageTreeFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      toast.loading("Creating merkle tree...", {
        id: "create-tree",
      });

      // Create wallet adapter
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions
      };

      // Initialize UMI
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplBubblegum());

      // Generate tree signer
      const merkleTree = generateSigner(umi);

      // Create tree
      const createTreeResult = await createTree(umi, {
        merkleTree,
        maxDepth: values.maxDepth,
        maxBufferSize: values.maxBufferSize,
        canopyDepth: values.canopyDepth,
        treeCreator: umi.identity,
      }).sendAndConfirm(umi);

      const treeAddress = merkleTree.publicKey.toString();

      // Update tree info
      const newTreeInfo: MerkleTreeInfo = {
        address: treeAddress,
        maxDepth: values.maxDepth,
        maxBufferSize: values.maxBufferSize,
        canopyDepth: values.canopyDepth,
        authority: publicKey.toString(),
        creationSlot: Date.now(), // Mock slot
        totalMinted: 0,
        totalCapacity: Math.pow(2, values.maxDepth),
      };

      setMerkleTree(newTreeInfo);

      toast.success("Merkle tree created successfully!", {
        id: "create-tree",
        description: `Tree: ${treeAddress.slice(0, 8)}...${treeAddress.slice(-8)}`,
      });

      // Reset form
      treeForm.reset();

    } catch (err: any) {
      console.error("Error creating merkle tree:", err);
      setError(err.message);

      toast.error("Failed to create merkle tree", {
        id: "create-tree",
        description: err.message,
      });

      if (err.message?.includes("failed to fetch") ||
        err.message?.includes("timeout") ||
        err.message?.includes("429") ||
        err.message?.includes("503")) {
        switchToNextEndpoint();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add attribute to mint form
  const addAttribute = () => {
    const currentAttributes = mintForm.getValues("attributes");
    mintForm.setValue("attributes", [
      ...currentAttributes,
      { trait_type: "", value: "" }
    ]);
  };

  // Remove attribute from mint form
  const removeAttribute = (index: number) => {
    const currentAttributes = mintForm.getValues("attributes");
    if (currentAttributes.length > 1) {
      mintForm.setValue("attributes", currentAttributes.filter((_, i) => i !== index));
    }
  };

  // Render view tab
  const renderViewTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Compressed NFTs
          </CardTitle>
          <CardDescription>
            Find compressed NFTs by Asset ID, Tree & Leaf Index, or Owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...viewForm}>
            <form onSubmit={viewForm.handleSubmit(searchCNFTs)} className="space-y-4">
              <FormField
                control={viewForm.control}
                name="searchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Method</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="assetId">Asset ID</TabsTrigger>
                          <TabsTrigger value="treeAndLeaf">Tree & Leaf</TabsTrigger>
                          <TabsTrigger value="owner">By Owner</TabsTrigger>
                        </TabsList>

                        <TabsContent value="assetId" className="space-y-4 mt-4">
                          <FormField
                            control={viewForm.control}
                            name="assetId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Asset ID</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter compressed NFT asset ID"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="treeAndLeaf" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={viewForm.control}
                              name="treeAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tree Address</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Merkle tree address"
                                      {...field}
                                      disabled={isLoading}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={viewForm.control}
                              name="leafIndex"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Leaf Index</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      disabled={isLoading}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="owner" className="space-y-4 mt-4">
                          <FormField
                            control={viewForm.control}
                            name="ownerAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Owner Address</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter owner wallet address"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search CNFTs
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results */}
      {compressedNFTs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                Found {compressedNFTs.length} Compressed NFTs
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchCNFTs(viewForm.getValues())}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {compressedNFTs.map((nft) => (
                <Card key={nft.id} className="border border-border/50">
                  <CardContent className="p-4">
                    {nft.image && (
                      <div className="aspect-square mb-3 overflow-hidden rounded-lg">
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/300?text=No+Image";
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">{nft.name}</h3>

                      {nft.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {nft.description}
                        </p>
                      )}

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tree:</span>
                          <span className="font-mono">
                            {nft.merkleTree.slice(0, 4)}...{nft.merkleTree.slice(-4)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Leaf:</span>
                          <span>{nft.leafIndex}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Owner:</span>
                          <span className="font-mono">
                            {nft.owner.slice(0, 4)}...{nft.owner.slice(-4)}
                          </span>
                        </div>
                      </div>

                      {nft.attributes && nft.attributes.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <div className="flex flex-wrap gap-1">
                            {nft.attributes.slice(0, 3).map((attr, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {attr.trait_type}: {attr.value}
                              </Badge>
                            ))}
                            {nft.attributes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{nft.attributes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-1 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedNFT(nft)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{selectedNFT?.name}</DialogTitle>
                              <DialogDescription>
                                Compressed NFT Details
                              </DialogDescription>
                            </DialogHeader>
                            {selectedNFT && (
                              <div className="space-y-4">
                                {selectedNFT.image && (
                                  <div className="aspect-square w-48 mx-auto overflow-hidden rounded-lg">
                                    <img
                                      src={selectedNFT.image}
                                      alt={selectedNFT.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-sm font-medium">Description</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedNFT.description || "No description"}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Merkle Tree</Label>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono">
                                          {selectedNFT.merkleTree.slice(0, 8)}...{selectedNFT.merkleTree.slice(-8)}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(selectedNFT.merkleTree)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-sm font-medium">Leaf Index</Label>
                                      <p className="text-sm">{selectedNFT.leafIndex}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label className="text-sm font-medium">Owner</Label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-mono">
                                        {selectedNFT.owner.slice(0, 8)}...{selectedNFT.owner.slice(-8)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(selectedNFT.owner)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                                    <div>
                                      <Label className="text-sm font-medium">Attributes</Label>
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        {selectedNFT.attributes.map((attr, index) => (
                                          <div key={index} className="bg-secondary/50 rounded p-2">
                                            <div className="text-xs text-muted-foreground">{attr.trait_type}</div>
                                            <div className="text-sm font-medium">{attr.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => viewInExplorer(selectedNFT.merkleTree)}
                                      className="flex-1"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Tree
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => copyToClipboard(selectedNFT.uri)}
                                      className="flex-1"
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy URI
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewInExplorer(nft.merkleTree)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render mint tab
  const renderMintTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Mint Compressed NFT
        </CardTitle>
        <CardDescription>
          Create a new compressed NFT with custom metadata
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...mintForm}>
          <form onSubmit={mintForm.handleSubmit(mintCNFT)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={mintForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter NFT name"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={mintForm.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="NFT"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={mintForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter NFT description"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mintForm.control}
              name="uri"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata URI</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/metadata.json"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={mintForm.control}
              name="merkleTree"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merkle Tree Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter merkle tree address"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collection Settings */}
            <div className="space-y-4 border rounded-lg p-4">
              <FormField
                control={mintForm.control}
                name="useExistingCollection"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <Label>Use Existing Collection</Label>
                  </FormItem>
                )}
              />

              {mintForm.watch("useExistingCollection") && (
                <FormField
                  control={mintForm.control}
                  name="collection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter collection mint address"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Attributes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAttribute}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </div>

              {mintForm.watch("attributes").map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <FormField
                      control={mintForm.control}
                      name={`attributes.${index}.trait_type`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Trait Type</FormLabel>}
                          <FormControl>
                            <Input
                              placeholder="e.g., Color"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-6">
                    <FormField
                      control={mintForm.control}
                      name={`attributes.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Value</FormLabel>}
                          <FormControl>
                            <Input
                              placeholder="e.g., Blue"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAttribute(index)}
                      disabled={mintForm.watch("attributes").length === 1 || isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

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
                    <span>Wallet</span>
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
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Mint Compressed NFT
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // Render trees tab
  const renderTreesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Create Merkle Tree
          </CardTitle>
          <CardDescription>
            Create a new merkle tree for compressed NFT storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...treeForm}>
            <form onSubmit={treeForm.handleSubmit(createMerkleTree)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={treeForm.control}
                  name="maxDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Depth</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="3"
                          max="30"
                          placeholder="14"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Tree depth (3-30). Higher = more capacity
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={treeForm.control}
                  name="maxBufferSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Buffer Size</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="8"
                          max="2048"
                          placeholder="64"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Buffer size (8-2048). Higher = more concurrent ops
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={treeForm.control}
                  name="canopyDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canopy Depth</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="17"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Canopy depth (0-17). Higher = cheaper operations
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Creating a merkle tree requires SOL for rent. Higher depths and buffer sizes cost more but allow for more NFTs and concurrent operations.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Estimated Capacity</span>
                    <span className="font-medium">
                      {Math.pow(2, treeForm.watch("maxDepth") || 14).toLocaleString()} NFTs
                    </span>
                  </div>
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
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Tree...
                        </>
                      ) : (
                        <>
                          <TreePine className="mr-2 h-4 w-4" />
                          Create Merkle Tree
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tree Info */}
      {merkleTree && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Merkle Tree Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tree Address</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {merkleTree.address.slice(0, 8)}...{merkleTree.address.slice(-8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(merkleTree.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Authority</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {merkleTree.authority.slice(0, 8)}...{merkleTree.authority.slice(-8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(merkleTree.authority)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Max Depth</Label>
                  <p className="text-sm">{merkleTree.maxDepth}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Buffer Size</Label>
                  <p className="text-sm">{merkleTree.maxBufferSize}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Canopy Depth</Label>
                  <p className="text-sm">{merkleTree.canopyDepth}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Capacity</Label>
                  <p className="text-sm">{merkleTree.totalCapacity.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Minted</Label>
                  <p className="text-sm">{merkleTree.totalMinted.toLocaleString()}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Usage</Label>
                  <p className="text-sm">
                    {((merkleTree.totalMinted / merkleTree.totalCapacity) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => viewInExplorer(merkleTree.address)}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(merkleTree.address)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render manage tab
  const renderManageTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            CNFT Management Tools
          </CardTitle>
          <CardDescription>
            Advanced tools for managing your compressed NFTs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" disabled>
              <Send className="h-6 w-6" />
              <span>Transfer CNFTs</span>
              <span className="text-xs text-muted-foreground">Transfer compressed NFTs to other wallets</span>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" disabled>
              <Edit className="h-6 w-6" />
              <span>Update Metadata</span>
              <span className="text-xs text-muted-foreground">Update CNFT metadata and attributes</span>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" disabled>
              <Trash2 className="h-6 w-6" />
              <span>Burn CNFTs</span>
              <span className="text-xs text-muted-foreground">Permanently destroy compressed NFTs</span>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" disabled>
              <ArrowUpDown className="h-6 w-6" />
              <span>Batch Operations</span>
              <span className="text-xs text-muted-foreground">Perform bulk operations on multiple CNFTs</span>
            </Button>
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Advanced management features are coming soon. These tools will provide comprehensive CNFT management capabilities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  // Render collections tab
  const renderCollectionsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            CNFT Collections
          </CardTitle>
          <CardDescription>
            Manage your compressed NFT collections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Collection management features are in development. This will include collection creation, metadata management, and analytics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Improved CNFT Manager</CardTitle>
          <CardDescription>
            Comprehensive compressed NFT management platform
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
              <TreePine className="h-6 w-6" />
              Improved CNFT Manager
            </CardTitle>
            <CardDescription>
              Comprehensive compressed NFT management platform
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View
            </TabsTrigger>
            <TabsTrigger value="mint" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Mint
            </TabsTrigger>
            <TabsTrigger value="trees" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Trees
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Collections
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="view" className="space-y-4">
              {renderViewTab()}
            </TabsContent>

            <TabsContent value="mint" className="space-y-4">
              {renderMintTab()}
            </TabsContent>

            <TabsContent value="trees" className="space-y-4">
              {renderTreesTab()}
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              {renderManageTab()}
            </TabsContent>

            <TabsContent value="collections" className="space-y-4">
              {renderCollectionsTab()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export { ImprovedCNFTManager };