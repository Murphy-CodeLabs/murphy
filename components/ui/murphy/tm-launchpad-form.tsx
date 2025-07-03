"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectWalletButton } from "./connect-wallet-button";

// Icons
import { Coins, FileImage, Users, Settings, Plus, X, Loader2 } from "lucide-react";

// Notifications
import { toast } from "sonner";

// Types
interface TMLaunchpadResult {
  mint: string;
  signature: string;
  tokenType: string;
}

// Form Schema
const formSchema = z.object({
  // Token Type
  tokenType: z.enum(['fungible', 'nft', 'programmable-nft']),

  // Basic Info
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  description: z.string().optional(),
  image: z.string().url().optional(),
  externalUrl: z.string().url().optional(),

  // Fungible Token specific
  decimals: z.number().min(0).max(9).optional(),
  supply: z.number().min(1).optional(),

  // NFT specific
  attributes: z.array(z.object({
    trait_type: z.string(),
    value: z.string(),
  })).optional(),

  // Creators
  creators: z.array(z.object({
    address: z.string().min(1, "Address is required"),
    share: z.number().min(0).max(100),
    verified: z.boolean(),
  })).optional(),

  // Advanced
  sellerFeeBasisPoints: z.number().min(0).max(10000).default(500),
  isMutable: z.boolean().default(true),
  collection: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TMLaunchpadFormProps {
  className?: string;
  onTokenCreated?: (result: TMLaunchpadResult) => void;
}

export function TMLaunchpadForm({
  className,
  onTokenCreated
}: TMLaunchpadFormProps) {
  // State
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<'input' | 'confirming' | 'success' | 'error'>('input');
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<TMLaunchpadResult | null>(null);

  // Hooks
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenType: 'fungible',
      name: "",
      symbol: "",
      description: "",
      decimals: 9,
      supply: 1000000,
      sellerFeeBasisPoints: 500,
      isMutable: true,
      creators: [
        {
          address: "",
          share: 100,
          verified: true,
        }
      ],
      attributes: [],
    },
  });

  // Effects
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const creators = form.getValues("creators");
      if (creators && creators[0] && !creators[0].address) {
        creators[0].address = publicKey.toString();
        form.setValue("creators", creators);
      }
    }
  }, [connected, publicKey, form]);

  // Handlers
  const onSubmit = async (values: FormValues) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage('confirming');

      // TODO: Implement token creation logic here
      console.log("Creating token with values:", values);

      // Simulate token creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResult: TMLaunchpadResult = {
        mint: "MockMintAddress123...",
        signature: "MockSignature456...",
        tokenType: values.tokenType
      };

      setResult(mockResult);
      setCurrentStage('success');

      if (onTokenCreated) {
        onTokenCreated(mockResult);
      }

      toast.success("Token created successfully!");

    } catch (error) {
      console.error("Error creating token:", error);
      setError("Failed to create token");
      setCurrentStage('error');
      toast.error("Failed to create token");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add creator
  const addCreator = () => {
    const currentCreators = form.getValues("creators") || [];
    form.setValue("creators", [
      ...currentCreators,
      { address: "", share: 0, verified: false }
    ]);
  };

  // Remove creator
  const removeCreator = (index: number) => {
    const currentCreators = form.getValues("creators") || [];
    if (currentCreators.length > 1) {
      form.setValue("creators", currentCreators.filter((_, i) => i !== index));
    }
  };

  // Add attribute
  const addAttribute = () => {
    const currentAttributes = form.getValues("attributes") || [];
    form.setValue("attributes", [
      ...currentAttributes,
      { trait_type: "", value: "" }
    ]);
  };

  // Remove attribute
  const removeAttribute = (index: number) => {
    const currentAttributes = form.getValues("attributes") || [];
    form.setValue("attributes", currentAttributes.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage('input');
    setError("");
    setActiveTab("basic");
  };

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <Coins className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold">Token Created Successfully!</h3>
      <div className="bg-secondary/50 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Mint:</span>
            <span className="text-sm font-mono">{result?.mint}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Type:</span>
            <span className="text-sm">{result?.tokenType}</span>
          </div>
        </div>
      </div>
      <Button onClick={resetForm} className="w-full">
        Create Another Token
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
      <h3 className="text-lg font-semibold">Creating Token</h3>
      <p className="text-muted-foreground">
        Please wait while your token is being created...
      </p>
    </div>
  );

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Token Metadata Launchpad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'confirming':
        return renderConfirming();
      default:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="creators">Creators</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6 mt-6">
                  {/* Token Type Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Token Type</h3>
                    <FormField
                      control={form.control}
                      name="tokenType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-3 gap-4">
                              <div
                                className={`border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'fungible' ? 'border-primary bg-primary/5' : 'border-border'
                                  }`}
                                onClick={() => field.onChange('fungible')}
                              >
                                <Coins className="h-6 w-6 mb-2" />
                                <h4 className="font-medium">Fungible Token</h4>
                              </div>
                              <div
                                className={`border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'nft' ? 'border-primary bg-primary/5' : 'border-border'
                                  }`}
                                onClick={() => field.onChange('nft')}
                              >
                                <FileImage className="h-6 w-6 mb-2" />
                                <h4 className="font-medium">NFT</h4>
                              </div>
                              <div
                                className={`border rounded-lg p-4 cursor-pointer transition-colors ${field.value === 'programmable-nft' ? 'border-primary bg-primary/5' : 'border-border'
                                  }`}
                                onClick={() => field.onChange('programmable-nft')}
                              >
                                <Settings className="h-6 w-6 mb-2" />
                                <h4 className="font-medium">Programmable NFT</h4>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Basic Token Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Token Details</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Awesome Token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="MAT" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your token..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/image.png"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Fungible Token specific fields */}
                    {form.watch("tokenType") === "fungible" && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="decimals"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Decimals</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="9"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supply"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supply</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* NFT specific fields */}
                    {(form.watch("tokenType") === "nft" || form.watch("tokenType") === "programmable-nft") && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Attributes</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAttribute}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Attribute
                          </Button>
                        </div>

                        {form.watch("attributes")?.map((_, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <FormField
                              control={form.control}
                              name={`attributes.${index}.trait_type`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Trait</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Color" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`attributes.${index}.value`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel>Value</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Blue" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttribute(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="creators" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Creator Information</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCreator}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Creator
                      </Button>
                    </div>

                    {/* Creator cards với layout mở rộng */}
                    <div className="space-y-4">
                      {form.watch("creators")?.map((_, index) => (
                        <div key={index} className="border rounded-lg p-6 space-y-4 min-w-full">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">Creator {index + 1}</Label>
                            {(form.watch("creators")?.length || 0) > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCreator(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Address field - full width */}
                          <FormField
                            control={form.control}
                            name={`creators.${index}.address`}
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Creator Address</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Creator wallet address"
                                    {...field}
                                    className="w-full"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Share và Verified - side by side với spacing tốt hơn */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <FormField
                              control={form.control}
                              name={`creators.${index}.share`}
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Share Percentage (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Percentage of royalties for this creator
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`creators.${index}.verified`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col space-y-2">
                                  <FormLabel>Verification Status</FormLabel>
                                  <div className="flex items-center space-x-3 h-10">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <Label className="text-sm">
                                      {field.value ? 'Verified' : 'Unverified'}
                                    </Label>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Summary info */}
                          <div className="bg-secondary/30 rounded-md p-3 mt-4">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Creator Summary:</span>
                              <span className="font-medium">
                                {form.watch(`creators.${index}.share`) || 0}% share,
                                {form.watch(`creators.${index}.verified`) ? ' Verified' : ' Unverified'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total share validation */}
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Creator Shares:</span>
                        <span className={`text-sm font-medium ${(form.watch("creators")?.reduce((sum, creator) => sum + (creator.share || 0), 0) || 0) === 100
                            ? 'text-green-600'
                            : 'text-orange-600'
                          }`}>
                          {form.watch("creators")?.reduce((sum, creator) => sum + (creator.share || 0), 0) || 0}%
                        </span>
                      </div>
                      {(form.watch("creators")?.reduce((sum, creator) => sum + (creator.share || 0), 0) || 0) !== 100 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Total shares should equal 100% for proper royalty distribution
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Advanced Settings</h3>

                    <FormField
                      control={form.control}
                      name="sellerFeeBasisPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seller Fee (Basis Points)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="10000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            500 = 5%. Maximum is 10000 (100%)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isMutable"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <Label>Mutable</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow metadata to be updated after creation
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Collection mint address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="externalUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External URL (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://yourproject.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Submit Button */}
              <div className="pt-6">
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Token"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-6 w-6" />
          Token Metadata Launchpad
        </CardTitle>
        <CardDescription>
          Create tokens with rich metadata using Metaplex Token Metadata standard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export default TMLaunchpadForm;