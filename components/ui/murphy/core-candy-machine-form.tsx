'use client';

// React và hooks
import { useState, useEffect, useContext } from 'react';
import { useForm } from "react-hook-form";

// Solana
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Icons and notifications
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Settings, Plus, X } from "lucide-react";

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

// Import Metaplex Core Candy Machine libraries
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import {
  create,
  addConfigLines,
  fetchCandyMachine,
  CandyMachine,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  generateSigner,
  publicKey as umiPublicKey,
  sol,
  dateTime,
  some,
  none,
} from '@metaplex-foundation/umi';

interface CoreCandyMachineResult {
  candyMachine: string;
  signature: string;
  collection?: string;
}

interface ConfigLine {
  name: string;
  uri: string;
}

type CoreCandyMachineFormValues = {
  // Basic Settings
  itemsAvailable: number;
  price: number;
  symbol: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;

  // Collection (optional)
  collection?: string;

  // Sale Settings
  goLiveDate?: string;
  endDate?: string;

  // Config Lines
  configLines: ConfigLine[];

  // Guards (simplified for Core)
  enableBotTax: boolean;
  enableSolPayment: boolean;
  enableStartDate: boolean;
  enableEndDate: boolean;
  botTaxLamports: number;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate itemsAvailable
  if (!data.itemsAvailable || data.itemsAvailable <= 0) {
    errors.itemsAvailable = {
      type: "required",
      message: "Items available must be greater than 0",
    };
  }

  // Validate price
  if (data.price === undefined || data.price < 0) {
    errors.price = {
      type: "required",
      message: "Price must be 0 or greater",
    };
  }

  // Validate symbol
  if (!data.symbol || data.symbol.length > 10) {
    errors.symbol = {
      type: "required",
      message: "Symbol is required and must be 10 characters or less",
    };
  }

  // Validate sellerFeeBasisPoints
  if (data.sellerFeeBasisPoints < 0 || data.sellerFeeBasisPoints > 10000) {
    errors.sellerFeeBasisPoints = {
      type: "range",
      message: "Seller fee must be between 0 and 10000 basis points (0-100%)",
    };
  }

  // Validate collection if provided
  if (data.collection && data.collection.trim()) {
    try {
      new PublicKey(data.collection);
    } catch (e) {
      errors.collection = {
        type: "pattern",
        message: "Invalid collection address format",
      };
    }
  }

  // Validate config lines
  if (!data.configLines || data.configLines.length === 0) {
    errors.configLines = {
      type: "required",
      message: "At least one config line is required",
    };
  } else {
    data.configLines.forEach((line: ConfigLine, index: number) => {
      if (!line.name) {
        errors[`configLines.${index}.name`] = {
          type: "required",
          message: "Name is required",
        };
      }
      if (!line.uri) {
        errors[`configLines.${index}.uri`] = {
          type: "required",
          message: "URI is required",
        };
      } else {
        try {
          new URL(line.uri);
        } catch (e) {
          errors[`configLines.${index}.uri`] = {
            type: "pattern",
            message: "Invalid URI format",
          };
        }
      }
    });
  }

  // Validate dates if enabled
  if (data.enableStartDate && data.goLiveDate) {
    const startDate = new Date(data.goLiveDate);
    if (isNaN(startDate.getTime())) {
      errors.goLiveDate = {
        type: "pattern",
        message: "Invalid start date format",
      };
    }
  }

  if (data.enableEndDate && data.endDate) {
    const endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime())) {
      errors.endDate = {
        type: "pattern",
        message: "Invalid end date format",
      };
    }

    // Check if end date is after start date
    if (data.enableStartDate && data.goLiveDate) {
      const startDate = new Date(data.goLiveDate);
      if (endDate <= startDate) {
        errors.endDate = {
          type: "logic",
          message: "End date must be after start date",
        };
      }
    }
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export interface CoreCandyMachineFormProps {
  collection?: string;
  onCandyMachineCreated?: (candyMachine: string, signature: string) => void;
  className?: string;
}

export default function CoreCandyMachineForm({
  collection: propCollection,
  onCandyMachineCreated,
  className
}: CoreCandyMachineFormProps) {
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
  const [result, setResult] = useState<CoreCandyMachineResult | null>(null);

  // Form setup
  const form = useForm<CoreCandyMachineFormValues>({
    defaultValues: {
      itemsAvailable: 100,
      price: 0.1,
      symbol: "CORE",
      sellerFeeBasisPoints: 500, // 5%
      isMutable: true,
      collection: propCollection || "",
      configLines: [
        { name: "Core NFT #1", uri: "https://example.com/metadata/1.json" }
      ],
      enableBotTax: false,
      enableSolPayment: true,
      enableStartDate: false,
      enableEndDate: false,
      botTaxLamports: 10000000, // 0.01 SOL
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

  const onSubmit = async (values: CoreCandyMachineFormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage("confirming");
      setError("");

      toast.loading("Creating Core Candy Machine...", {
        id: "core-candy-machine-create",
      });

      // Create wallet adapter for signing transactions
      const walletAdapter = {
        publicKey: publicKey,
        signTransaction,
        signAllTransactions
      };

      // Initialize UMI with Core Candy Machine
      const umi = createUmi(connection.rpcEndpoint)
        .use(walletAdapterIdentity(walletAdapter))
        .use(mplCore())
        .use(mplCandyMachine());

      // Generate candy machine keypair
      const candyMachine = generateSigner(umi);

      // Prepare guards
      const guards: any = {};

      if (values.enableSolPayment) {
        guards.solPayment = some({
          lamports: sol(values.price),
          destination: umi.identity.publicKey,
        });
      }

      if (values.enableBotTax) {
        guards.botTax = some({
          lamports: BigInt(values.botTaxLamports),
          lastInstruction: true,
        });
      }

      if (values.enableStartDate && values.goLiveDate) {
        guards.startDate = some({
          date: dateTime(new Date(values.goLiveDate).toISOString()),
        });
      }

      if (values.enableEndDate && values.endDate) {
        guards.endDate = some({
          date: dateTime(new Date(values.endDate).toISOString()),
        });
      }

      // Create candy machine configuration
      const createIx = create(umi, {
        candyMachine,
        collection: values.collection && values.collection.trim()
          ? umiPublicKey(values.collection)
          : undefined,
        collectionUpdateAuthority: umi.identity,
        itemsAvailable: values.itemsAvailable,
        sellerFeeBasisPoints: values.sellerFeeBasisPoints,
        configLineSettings: some({
          prefixName: values.symbol + " #",
          nameLength: 32,
          prefixUri: "",
          uriLength: 200,
          isSequential: false,
        }),
        guards,
      });

      // Send transaction
      const createResult = await createIx.sendAndConfirm(umi);

      // Convert signature to string format
      const createSignature = typeof createResult.signature === 'string'
        ? createResult.signature
        : Buffer.from(createResult.signature).toString('base64');

      // Add config lines if provided
      if (values.configLines.length > 0) {
        const configLinesFormatted = values.configLines.map((line) => ({
          name: line.name,
          uri: line.uri,
        }));

        const addConfigLinesIx = addConfigLines(umi, {
          candyMachine: candyMachine.publicKey,
          index: 0,
          configLines: configLinesFormatted,
        });

        await addConfigLinesIx.sendAndConfirm(umi);
      }

      const candyMachineAddress = candyMachine.publicKey.toString();

      setResult({
        candyMachine: candyMachineAddress,
        signature: createSignature,
        collection: values.collection || undefined,
      });

      if (onCandyMachineCreated) {
        onCandyMachineCreated(candyMachineAddress, createSignature);
      }

      setCurrentStage("success");

      toast.success("Core Candy Machine created successfully!", {
        id: "core-candy-machine-create",
        description: `Candy Machine: ${candyMachineAddress.slice(0, 8)}...${candyMachineAddress.slice(-8)}`,
      });

    } catch (err: any) {
      console.error("Error creating Core Candy Machine:", err);

      setCurrentStage("error");
      setError(err.message || "An unknown error occurred");

      if (err.message && (err.message.includes("rejected") || err.message.includes("canceled"))) {
        toast.error("Transaction rejected", {
          id: "core-candy-machine-create",
          description: "You have rejected the transaction",
        });
      } else {
        toast.error("Cannot create Core Candy Machine", {
          id: "core-candy-machine-create",
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

  // Add config line
  const addConfigLine = () => {
    const currentLines = form.getValues("configLines");
    form.setValue("configLines", [
      ...currentLines,
      { name: `Core NFT #${currentLines.length + 1}`, uri: "" }
    ]);
  };

  // Remove config line
  const removeConfigLine = (index: number) => {
    const currentLines = form.getValues("configLines");
    if (currentLines.length > 1) {
      form.setValue("configLines", currentLines.filter((_, i) => i !== index));
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

  const viewCandyMachine = () => {
    if (result?.candyMachine) {
      const baseUrl = network === "devnet"
        ? "https://explorer.solana.com/address/"
        : "https://solscan.io/account/";
      window.open(
        `${baseUrl}${result.candyMachine}${network === "devnet" ? "?cluster=devnet" : ""}`,
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
        {/* Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="itemsAvailable"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <FormLabel>Items Available</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
              name="price"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <FormLabel>Price (SOL)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.1"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
            name="symbol"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Symbol</FormLabel>
                <FormControl>
                  <Input
                    placeholder="CORE"
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
            name="sellerFeeBasisPoints"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Royalty Fee (Basis Points)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="500"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  500 = 5% royalty fee
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="collection"
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

        {/* Guards */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Guards</h3>

          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <FormField
              control={form.control}
              name="enableSolPayment"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <Label>Enable SOL Payment</Label>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enableBotTax"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <Label>Enable Bot Tax</Label>
                </FormItem>
              )}
            />

            {form.watch("enableBotTax") && (
              <FormField
                control={form.control}
                name="botTaxLamports"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Tax (Lamports)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      10,000,000 lamports = 0.01 SOL
                    </p>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="enableStartDate"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <Label>Enable Start Date</Label>
                </FormItem>
              )}
            />

            {form.watch("enableStartDate") && (
              <FormField
                control={form.control}
                name="goLiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="enableEndDate"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <Label>Enable End Date</Label>
                </FormItem>
              )}
            />

            {form.watch("enableEndDate") && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Config Lines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Config Lines</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addConfigLine}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="space-y-3">
            {form.watch("configLines").map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end bg-secondary/50 rounded-lg p-3">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`configLines.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Name</FormLabel>}
                        <FormControl>
                          <Input
                            placeholder="Core NFT Name"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-7">
                  <FormField
                    control={form.control}
                    name={`configLines.${index}.uri`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Metadata URI</FormLabel>}
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                            disabled={isSubmitting}
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
                    onClick={() => removeConfigLine(index)}
                    disabled={form.watch("configLines").length === 1 || isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
                    <Settings className="mr-2 h-4 w-4" />
                    Create Core Candy Machine
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
          Your Core Candy Machine has been created successfully
        </p>
      </div>

      <div className="space-y-3 rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Candy Machine:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">
              {result?.candyMachine?.slice(0, 8)}...{result?.candyMachine?.slice(-8)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={viewCandyMachine}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
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

        {result?.collection && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Collection:</span>
            <span className="text-sm font-mono">
              {result.collection.slice(0, 8)}...{result.collection.slice(-8)}
            </span>
          </div>
        )}
      </div>

      <Button onClick={resetForm} className="w-full">
        Create Another Core Candy Machine
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
          Failed to create Core Candy Machine
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
      <h3 className="text-xl font-bold">Creating Core Candy Machine</h3>
      <p className="text-muted-foreground">
        Please wait while your Core Candy Machine is being created...
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
          <CardTitle>Create Core Candy Machine</CardTitle>
          <CardDescription>
            Set up your Core NFT collection launchpad
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
            <CardTitle>Create Core Candy Machine</CardTitle>
            <CardDescription>
              Set up your Core NFT collection launchpad using Metaplex Core standard
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

export { CoreCandyMachineForm };