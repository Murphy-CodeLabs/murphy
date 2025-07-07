"use client";

import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

// Metaplex Core imports
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  mplCore,
  createV1,
  createCollectionV1,
  addPluginV1,
  PluginType,
  createPlugin,
  ruleSet,
  approvePluginAuthorityV1,
  revokePluginAuthorityV1
} from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  publicKey as umiPublicKey,
  percentAmount,
  some,
  none
} from "@metaplex-foundation/umi";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectWalletButton } from "./connect-wallet-button";

// Icons
import {
  Loader2,
  Upload,
  Plus,
  X,
  Copy,
  ExternalLink,
  Coins,
  FileImage,
  Settings,
  Shield,
  CheckCircle,
  Layers,
  Lock,
  Unlock
} from "lucide-react";

// Notifications
import { toast } from "sonner";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Types
interface CoreAssetResult {
  asset: string;
  collection?: string;
  transactionSignature: string;
  pluginSignatures?: string[];
}

interface PluginConfig {
  type: PluginType;
  enabled: boolean;
  config?: any;
}

type AssetType = 'asset' | 'collection';
const formatSignature = (signature: Uint8Array | string): string => {
  if (typeof signature === 'string') {
    return signature;
  }
  return btoa(String.fromCharCode(...signature));
};
const formSchema = z.object({
  assetType: z.enum(['asset', 'collection']),
  name: z.string().min(1, "Name is required").max(32, "Name must be less than 32 characters"),
  uri: z.string().refine((val) => {
    if (val === '') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, "Invalid URI format"),
  collection: z.string(),
  owner: z.string(),
  updateAuthority: z.string(),
  enableRoyalties: z.boolean(),
  royaltyPercentage: z.number().min(0).max(100),
  enableFreeze: z.boolean(),
  freezeAuthority: z.string(),
  enableBurn: z.boolean(),
  burnAuthority: z.string(),
  enableTransfer: z.boolean(),
  transferAuthority: z.string(),
  enableUpdateDelegate: z.boolean(),
  updateDelegateAuthority: z.string(),
  enableAttributes: z.boolean(),
  attributes: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
  permanent: z.boolean(),
});

type FormSchema = z.infer<typeof formSchema>;


interface CoreAssetLaunchpadProps {
  className?: string;
  onAssetCreated?: (result: CoreAssetResult) => void;
  defaultAssetType?: AssetType;
}

export function CoreAssetLaunchpad({
  className,
  onAssetCreated,
  defaultAssetType = 'asset'
}: CoreAssetLaunchpadProps) {
  // Hooks
  const { publicKey, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { endpoint } = useContext(ModalContext);

  // State
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<CoreAssetResult | null>(null);
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');
  const [activeFormTab, setActiveFormTab] = useState("basic");

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assetType: 'asset',
      name: '',
      uri: '',
      collection: '',
      owner: '',
      updateAuthority: '',
      enableRoyalties: false,
      royaltyPercentage: 5,
      enableFreeze: false,
      freezeAuthority: '',
      enableBurn: false,
      burnAuthority: '',
      enableTransfer: false,
      transferAuthority: '',
      enableUpdateDelegate: false,
      updateDelegateAuthority: '',
      enableAttributes: false,
      attributes: [],
      permanent: false,
    },
  });



  // Effects
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
      form.setValue('owner', publicKey.toString());
      form.setValue('updateAuthority', publicKey.toString());
      form.setValue('freezeAuthority', publicKey.toString());
      form.setValue('burnAuthority', publicKey.toString());
      form.setValue('transferAuthority', publicKey.toString());
      form.setValue('updateDelegateAuthority', publicKey.toString());
    }
  }, [connected, publicKey, form]);

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

  // Attribute management
  const addAttribute = () => {
    const currentAttributes = form.getValues('attributes');
    form.setValue('attributes', [
      ...currentAttributes,
      { key: "", value: "" }
    ]);
  };

  const removeAttribute = (index: number) => {
    const currentAttributes = form.getValues('attributes');
    form.setValue('attributes', currentAttributes.filter((_, i) => i !== index));
  };

  // Main submission handler
  const onSubmit = async (values: FormSchema) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage('confirming');
      setError("");

      toast.loading("Creating Core Asset...", { id: "core-asset-launchpad" });

      // Initialize UMI with Core plugin
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(wallet.adapter))
        .use(mplCore());

      let createResult;
      let pluginSignatures: string[] = [];

      if (values.assetType === 'collection') {
        // Create Collection
        const collectionSigner = generateSigner(umi);

        createResult = await createCollectionV1(umi, {
          collection: collectionSigner,
          name: values.name,
          uri: values.uri || "",
          updateAuthority: values.updateAuthority ?
            umiPublicKey(values.updateAuthority) :
            umi.identity.publicKey,
        }).sendAndConfirm(umi);

        // Add plugins to collection if enabled
        if (values.enableRoyalties) {
          const royaltyResult = await addPluginV1(umi, {
            asset: collectionSigner.publicKey,
            plugin: createPlugin({
              type: 'Royalties',
              data: {
                basisPoints: values.royaltyPercentage * 100,
                creators: [{
                  address: umi.identity.publicKey,
                  percentage: 100,
                }],
                ruleSet: ruleSet('None'),
              },
            }),
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(royaltyResult.signature));
        }

        setResult({
          asset: collectionSigner.publicKey.toString(),
          collection: collectionSigner.publicKey.toString(),
          transactionSignature: Buffer.from(createResult.signature).toString('base64'),
          pluginSignatures,
        });

      } else {
        // Create Asset
        const assetSigner = generateSigner(umi);

        const createAssetParams: any = {
          asset: assetSigner,
          name: values.name,
          uri: values.uri || "",
          owner: values.owner ?
            umiPublicKey(values.owner) :
            umi.identity.publicKey,
          updateAuthority: values.updateAuthority ?
            umiPublicKey(values.updateAuthority) :
            umi.identity.publicKey,
        };

        // Add to collection if specified
        if (values.collection) {
          createAssetParams.collection = umiPublicKey(values.collection);
        }

        createResult = await createV1(umi, createAssetParams).sendAndConfirm(umi);

        // Add plugins if enabled
        if (values.enableRoyalties) {
          const royaltyResult = await addPluginV1(umi, {
            asset: assetSigner.publicKey,
            plugin: createPlugin({
              type: 'Royalties',
              data: {
                basisPoints: values.royaltyPercentage * 100,
                creators: [{
                  address: umi.identity.publicKey,
                  percentage: 100,
                }],
                ruleSet: ruleSet('None'),
              },
            }),
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(royaltyResult.signature));
        }

        if (values.enableFreeze && values.freezeAuthority) {
          const freezeResult = await addPluginV1(umi, {
            asset: assetSigner.publicKey,
            plugin: createPlugin({
              type: 'FreezeDelegate',
              data: {
                frozen: false,
              },
            }),
            initAuthority: {
              __kind: 'Address',
              address: umiPublicKey(values.freezeAuthority),
            },
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(freezeResult.signature));
        }

        if (values.enableBurn && values.burnAuthority) {
          const burnResult = await addPluginV1(umi, {
            asset: assetSigner.publicKey,
            plugin: createPlugin({
              type: 'BurnDelegate',
            }),
            initAuthority: {
              __kind: 'Address',
              address: umiPublicKey(values.burnAuthority),
            },
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(burnResult.signature));
        }

        if (values.enableTransfer && values.transferAuthority) {
          const transferResult = await addPluginV1(umi, {
            asset: assetSigner.publicKey,
            plugin: createPlugin({
              type: 'TransferDelegate',
            }),
            initAuthority: {
              __kind: 'Address',
              address: umiPublicKey(values.transferAuthority),
            },
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(transferResult.signature));
        }



        if (values.enableAttributes && values.attributes.length > 0) {
          const attributesResult = await addPluginV1(umi, {
            asset: assetSigner.publicKey,
            plugin: createPlugin({
              type: 'Attributes',
              data: {
                attributeList: values.attributes.map(attr => ({
                  key: attr.key,
                  value: attr.value,
                })),
              },
            }),
          }).sendAndConfirm(umi);

          pluginSignatures.push(formatSignature(attributesResult.signature));
        }

        setResult({
          asset: assetSigner.publicKey.toString(),
          collection: values.collection || undefined,
          transactionSignature: Buffer.from(createResult.signature).toString('base64'),
          pluginSignatures,
        });
      }

      setCurrentStage('success');

      toast.success("Core Asset created successfully!", {
        id: "core-asset-launchpad",
        description: `${values.name}`
      });

      if (onAssetCreated) {
        onAssetCreated({
          asset: result?.asset || "",
          collection: result?.collection,
          transactionSignature: result?.transactionSignature || "",
          pluginSignatures,
        });
      }

    } catch (err: any) {
      console.error("Error creating Core Asset:", err);
      setError(err.message || "Failed to create Core Asset");
      setCurrentStage('error');

      toast.error("Failed to create Core Asset", {
        id: "core-asset-launchpad",
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage('input');
    setError("");
  };

  // Render stages
  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-2 text-lg font-semibold">Core Asset Created Successfully!</h3>
        <p className="text-muted-foreground">Your Core Asset has been created with plugins</p>
      </div>

      {result && (
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Asset Name</Label>
                <p className="text-sm">{form.getValues('name')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <p className="text-sm">{form.getValues('assetType')}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Asset Address</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {result.asset.slice(0, 8)}...{result.asset.slice(-8)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result.asset)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {result.collection && result.collection !== result.asset && (
              <div>
                <Label className="text-sm font-medium">Collection</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {result.collection.slice(0, 8)}...{result.collection.slice(-8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.collection!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {result.pluginSignatures && result.pluginSignatures.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Plugins Added</Label>
                <p className="text-sm text-muted-foreground">
                  {result.pluginSignatures.length} plugin(s) configured
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => viewInExplorer(result.asset)}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Asset
              </Button>
              <Button
                variant="outline"
                onClick={() => viewInExplorer(result.transactionSignature, 'tx')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Transaction
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button onClick={resetForm} className="w-full">
        Create Another Asset
      </Button>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <X className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold">Creation Failed</h3>
      <div className="bg-destructive/10 text-destructive rounded-lg p-4">
        <p className="text-sm">{error}</p>
      </div>
      <Button onClick={() => setCurrentStage('input')} className="w-full">
        Try Again
      </Button>
    </div>
  );

  const renderConfirming = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold">Creating Core Asset</h3>
      <p className="text-muted-foreground">
        Please confirm the transaction in your wallet...
      </p>
    </div>
  );

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Asset Type Selection */}
        <FormField
          control={form.control}
          name="assetType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Type</FormLabel>
              <FormControl>
                <Tabs value={field.value} onValueChange={field.onChange}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="asset">
                      <Layers className="h-4 w-4 mr-2" />
                      Core Asset
                    </TabsTrigger>
                    <TabsTrigger value="collection">
                      <FileImage className="h-4 w-4 mr-2" />
                      Collection
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="plugins">Plugins</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Basic Information */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Core Asset" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uri"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata URI</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/metadata.json" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('assetType') === 'asset' && (
              <FormField
                control={form.control}
                name="collection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Collection address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Owner address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="updateAuthority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Update Authority</FormLabel>
                    <FormControl>
                      <Input placeholder="Update authority address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="plugins" className="space-y-4">
            {/* Royalties Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Royalties Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableRoyalties"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableRoyalties') && (
                <FormField
                  control={form.control}
                  name="royaltyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Royalty Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Freeze Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Freeze Delegate Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableFreeze"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableFreeze') && (
                <FormField
                  control={form.control}
                  name="freezeAuthority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Freeze Authority</FormLabel>
                      <FormControl>
                        <Input placeholder="Freeze authority address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Burn Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Burn Delegate Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableBurn"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableBurn') && (
                <FormField
                  control={form.control}
                  name="burnAuthority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Burn Authority</FormLabel>
                      <FormControl>
                        <Input placeholder="Burn authority address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Transfer Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Transfer Delegate Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableTransfer"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableTransfer') && (
                <FormField
                  control={form.control}
                  name="transferAuthority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Authority</FormLabel>
                      <FormControl>
                        <Input placeholder="Transfer authority address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Attributes Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Attributes Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableAttributes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableAttributes') && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Attributes</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Attribute
                    </Button>
                  </div>

                  {form.watch('attributes').map((_, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.key`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key</FormLabel>
                            <FormControl>
                              <Input placeholder="trait_type" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`attributes.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="value" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttribute(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Update Delegate Plugin */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Update Delegate Plugin</Label>
                <FormField
                  control={form.control}
                  name="enableUpdateDelegate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('enableUpdateDelegate') && (
                <FormField
                  control={form.control}
                  name="updateDelegateAuthority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Delegate Authority</FormLabel>
                      <FormControl>
                        <Input placeholder="Update delegate authority address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Permanent Setting */}
            <div className="space-y-4 border rounded-lg p-4">
              <FormField
                control={form.control}
                name="permanent"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <Label>Permanent Asset</Label>
                      <p className="text-xs text-muted-foreground">
                        Makes the asset immutable (cannot be updated or burned)
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Network Info */}
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

        {/* Submit Button */}
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
                  Creating Core Asset...
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4" />
                  Create Core Asset
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

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

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Core Asset Launchpad</CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-6 w-6" />
          Core Asset Launchpad
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create next-generation Core Assets with advanced plugin system
        </p>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}
