"use client";

import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle, Settings } from "lucide-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";

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

// Context
import { ModalContext } from "@/components/providers/wallet-provider";

enum FeeSchedulerMode {
  Linear = 0,
}

interface BuildCurveResult {
  config: string;
  signature: string;
}

type FormValues = {
  // Các tham số của buildCurveByMarketCapParam
  totalTokenSupply: number;
  initialMarketCap: number;
  migrationMarketCap: number;
  migrationOption: number;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;

  // Tham số của feeSchedulerParam
  numberOfPeriod: number;
  reductionFactor: number;
  periodFrequency: number;
  feeSchedulerMode: number;

  // Các thông số khác
  baseFeeBps: number;
  dynamicFeeEnabled: boolean;
  activationType: number;
  collectFeeMode: number;
  migrationFeeOption: number;
  tokenType: number;

  // Phân phối LP
  partnerLpPercentage: number;
  creatorLpPercentage: number;
  partnerLockedLpPercentage: number;
  creatorLockedLpPercentage: number;

  // Địa chỉ
  feeClaimer: string;
  leftoverReceiver: string;
  quoteMint: string;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate totalTokenSupply
  if (!data.totalTokenSupply) {
    errors.totalTokenSupply = {
      type: "required",
      message: "Total token supply is required",
    };
  } else if (data.totalTokenSupply <= 0) {
    errors.totalTokenSupply = {
      type: "min",
      message: "Total token supply must be greater than 0",
    };
  }

  // Validate initialMarketCap
  if (!data.initialMarketCap) {
    errors.initialMarketCap = {
      type: "required",
      message: "Initial market cap is required",
    };
  } else if (data.initialMarketCap <= 0) {
    errors.initialMarketCap = {
      type: "min",
      message: "Initial market cap must be greater than 0",
    };
  }

  // Validate migrationMarketCap
  if (!data.migrationMarketCap) {
    errors.migrationMarketCap = {
      type: "required",
      message: "Migration market cap is required",
    };
  } else if (data.migrationMarketCap <= 0) {
    errors.migrationMarketCap = {
      type: "min",
      message: "Migration market cap must be greater than 0",
    };
  }

  // Validate tokenBaseDecimal
  if (data.tokenBaseDecimal === undefined || data.tokenBaseDecimal === null) {
    errors.tokenBaseDecimal = {
      type: "required",
      message: "Token base decimal is required",
    };
  } else if (data.tokenBaseDecimal < 0 || data.tokenBaseDecimal > 18) {
    errors.tokenBaseDecimal = {
      type: "range",
      message: "Token base decimal must be between 0 and 18",
    };
  }

  // Validate tokenQuoteDecimal
  if (data.tokenQuoteDecimal === undefined || data.tokenQuoteDecimal === null) {
    errors.tokenQuoteDecimal = {
      type: "required",
      message: "Token quote decimal is required",
    };
  } else if (data.tokenQuoteDecimal < 0 || data.tokenQuoteDecimal > 18) {
    errors.tokenQuoteDecimal = {
      type: "range",
      message: "Token quote decimal must be between 0 and 18",
    };
  }

  // Validate address fields
  const validateAddress = (field: string, name: string) => {
    if (!data[field]) {
      errors[field] = {
        type: "required",
        message: `${name} is required`,
      };
    } else {
      try {
        new PublicKey(data[field]);
      } catch (e) {
        errors[field] = {
          type: "invalid",
          message: "Invalid Solana address",
        };
      }
    }
  };

  validateAddress("feeClaimer", "Fee claimer address");
  validateAddress("leftoverReceiver", "Leftover receiver address");
  validateAddress("quoteMint", "Quote mint address");

  // Validate LP percentages
  const validatePercentage = (field: string, name: string) => {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      errors[field] = {
        type: "required",
        message: `${name} is required`,
      };
    } else if (Number(data[field]) < 0 || Number(data[field]) > 100) {
      errors[field] = {
        type: "range",
        message: `${name} must be between 0 and 100%`,
      };
    }
  };

  validatePercentage("partnerLpPercentage", "Partner LP percentage");
  validatePercentage("creatorLpPercentage", "Creator LP percentage");
  validatePercentage(
    "partnerLockedLpPercentage",
    "Partner locked LP percentage"
  );
  validatePercentage(
    "creatorLockedLpPercentage",
    "Creator locked LP percentage"
  );

  // Validate that percentages sum to 100
  const totalPercentage =
    Number(data.partnerLpPercentage || 0) +
    Number(data.creatorLpPercentage || 0) +
    Number(data.partnerLockedLpPercentage || 0) +
    Number(data.creatorLockedLpPercentage || 0);

  if (totalPercentage !== 100) {
    errors.partnerLpPercentage = {
      type: "validate",
      message: "Total LP percentage must be 100%",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export default function BuildCurveAndCreateConfigByMarketCapForm({
  onConfigCreated,
}: {
  onConfigCreated?: (configAddress: string) => void;
}) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet } = useWallet();
  const { switchToNextEndpoint, endpoint } = useContext(ModalContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BuildCurveResult | null>(null);
  const [currentStage, setCurrentStage] = useState<
    "input" | "confirming" | "success" | "error"
  >("input");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [network, setNetwork] = useState("devnet");

  // Form setup with react-hook-form
  const form = useForm<FormValues>({
    defaultValues: {
      totalTokenSupply: 1000000000,
      initialMarketCap: 98,
      migrationMarketCap: 3200,
      migrationOption: 0,
      tokenBaseDecimal: 9,
      tokenQuoteDecimal: 9,

      numberOfPeriod: 0,
      reductionFactor: 0,
      periodFrequency: 0,
      feeSchedulerMode: FeeSchedulerMode.Linear,

      baseFeeBps: 2500000,
      dynamicFeeEnabled: false,
      activationType: 0,
      collectFeeMode: 0,
      migrationFeeOption: 0,
      tokenType: 0,

      partnerLpPercentage: 25,
      creatorLpPercentage: 25,
      partnerLockedLpPercentage: 25,
      creatorLockedLpPercentage: 25,

      feeClaimer: "",
      leftoverReceiver: "",
      quoteMint: "So11111111111111111111111111111111111111112", // SOL by default
    },
    mode: "onSubmit",
    resolver: customResolver,
  });

  // Chỉ render sau khi component được mount trên client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cập nhật trạng thái network khi endpoint thay đổi
  useEffect(() => {
    if (endpoint) {
      setNetwork(endpoint.includes("devnet") ? "devnet" : "mainnet");
    }
  }, [endpoint]);

  // Tự động điền địa chỉ ví khi ví kết nối
  useEffect(() => {
    if (connected && publicKey) {
      form.setValue("feeClaimer", publicKey.toString());
      form.setValue("leftoverReceiver", publicKey.toString());
    }
  }, [connected, publicKey, form]);

  // Xử lý khi form được gửi đi
  const onSubmit = async (values: FormValues) => {
    if (!connected || !publicKey || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStage("confirming");
      setError("");

      toast.loading("Creating configuration...", {
        id: "build-curve-market-cap",
      });

      try {
        // Khởi tạo DBC client
        const client = new DynamicBondingCurveClient(connection);

        // Tạo keypair mới cho config
        const configKeypair = Keypair.generate();

        // Tạo các tham số cho hàm buildCurveAndCreateConfigByMarketCap
        const params = {
          buildCurveByMarketCapParam: {
            totalTokenSupply: values.totalTokenSupply,
            initialMarketCap: values.initialMarketCap,
            migrationMarketCap: values.migrationMarketCap,
            migrationOption: values.migrationOption,
            tokenBaseDecimal: values.tokenBaseDecimal,
            tokenQuoteDecimal: values.tokenQuoteDecimal,
            feeSchedulerParam: {
              numberOfPeriod: values.numberOfPeriod,
              reductionFactor: values.reductionFactor,
              periodFrequency: values.periodFrequency,
              feeSchedulerMode: values.feeSchedulerMode,
            },
            baseFeeBps: values.baseFeeBps,
            dynamicFeeEnabled: values.dynamicFeeEnabled,
            activationType: values.activationType,
            collectFeeMode: values.collectFeeMode,
            migrationFeeOption: values.migrationFeeOption,
            tokenType: values.tokenType,
            lockedVesting: {
              amountPerPeriod: new BN("0"),
              cliffDurationFromMigrationTime: new BN("0"),
              frequency: new BN("0"),
              numberOfPeriod: new BN("0"),
              cliffUnlockAmount: new BN("0"),
            },
            partnerLpPercentage: values.partnerLpPercentage,
            creatorLpPercentage: values.creatorLpPercentage,
            partnerLockedLpPercentage: values.partnerLockedLpPercentage,
            creatorLockedLpPercentage: values.creatorLockedLpPercentage,
          },
          feeClaimer: new PublicKey(values.feeClaimer),
          leftoverReceiver: new PublicKey(values.leftoverReceiver),
          payer: publicKey,
          quoteMint: new PublicKey(values.quoteMint),
          config: configKeypair.publicKey,
        };

        // Tạo transaction
        const transaction =
          await client.partners.buildCurveAndCreateConfigByMarketCap(params);

        // Lấy blockhash gần nhất
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        // Đặt feePayer cho transaction
        transaction.feePayer = publicKey;

        // Ký giao dịch với configKeypair
        transaction.partialSign(configKeypair);

        // Gửi và ký giao dịch
        const signature = await wallet.adapter.sendTransaction(
          transaction,
          connection
        );

        // Đợi xác nhận
        await connection.confirmTransaction({
          blockhash,
          lastValidBlockHeight,
          signature,
        });

        // Lưu kết quả
        const configAddress = configKeypair.publicKey.toString();
        setResult({
          config: configAddress,
          signature: signature,
        });

        // Gọi callback nếu được cung cấp
        if (onConfigCreated) {
          onConfigCreated(configAddress);
        }

        setCurrentStage("success");

        toast.success("Configuration created successfully!", {
          id: "build-curve-market-cap",
          description: `Config: ${configAddress.slice(
            0,
            8
          )}...${configAddress.slice(-8)}`,
        });
      } catch (transactionError: any) {
        console.error("Transaction error: ", transactionError);
        throw transactionError;
      }
    } catch (err: any) {
      console.error("Error creating configuration:", err);

      setCurrentStage("error");
      setError(err.message || "An unknown error occurred");

      // Kiểm tra nếu người dùng hủy/từ chối giao dịch
      if (
        err.message &&
        (err.message.includes("rejected") || err.message.includes("canceled"))
      ) {
        toast.error("Transaction rejected", {
          id: "build-curve-market-cap",
          description: "You have rejected the transaction",
        });
      } else {
        toast.error("Cannot create configuration", {
          id: "build-curve-market-cap",
          description: err.message,
        });

        // Nếu giao dịch thất bại do lỗi kết nối, thử chuyển sang RPC endpoint khác
        if (
          err.message?.includes("failed to fetch") ||
          err.message?.includes("timeout") ||
          err.message?.includes("429") ||
          err.message?.includes("503")
        ) {
          switchToNextEndpoint();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chức năng mở explorer để xem giao dịch
  const viewExplorer = () => {
    if (result?.signature) {
      const baseUrl =
        network === "devnet"
          ? "https://explorer.solana.com/tx/"
          : "https://solscan.io/tx/";
      window.open(
        `${baseUrl}${result.signature}${
          network === "devnet" ? "?cluster=devnet" : ""
        }`,
        "_blank"
      );
    }
  };

  // Chức năng mở explorer để xem cấu hình
  const viewConfig = () => {
    if (result?.config) {
      const baseUrl =
        network === "devnet"
          ? "https://explorer.solana.com/address/"
          : "https://solscan.io/account/";
      window.open(
        `${baseUrl}${result.config}${
          network === "devnet" ? "?cluster=devnet" : ""
        }`,
        "_blank"
      );
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage("input");
    setError("");
  };

  // Render form view
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Market parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="totalTokenSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total token supply</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000000000"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialMarketCap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial market cap</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="98"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="migrationMarketCap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Migration market cap</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="3200"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="migrationOption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Migration option</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tokenBaseDecimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token base decimal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="9"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tokenQuoteDecimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token quote decimal</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="9"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Fee parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="baseFeeBps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base fee (BPS)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2500000"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dynamicFeeEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-1"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable dynamic fee</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
          <div className="font-medium">LP distribution</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="partnerLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Partner LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="creatorLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Creator LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partnerLockedLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Partner locked LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="creatorLockedLpPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Creator locked LP %</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="25"
                      min="0"
                      max="100"
                      {...field}
                      disabled={isSubmitting}
                      className="bg-transparent text-sm h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Total LP percentage must be 100%. These ratios determine how token
            LP is distributed.
          </p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4">
          <h3 className="font-medium mb-4">Address</h3>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="feeClaimer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee claimer address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter fee claimer address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leftoverReceiver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leftover receiver address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter leftover receiver address"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quoteMint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote mint address</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select quote mint address" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="So11111111111111111111111111111111111111112">
                          <div className="flex items-center">
                            <img
                              src="/crypto-logos/solana-logo.svg"
                              alt="SOL"
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            SOL
                          </div>
                        </SelectItem>
                        <SelectItem value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
                          <div className="flex items-center">
                            <img
                              src="/crypto-logos/usd-coin-usdc-logo.svg"
                              alt="USDC"
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            USDC
                          </div>
                        </SelectItem>
                        <SelectItem value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">
                          <div className="flex items-center">
                            <img
                              src="/crypto-logos/tether-usdt-logo.svg"
                              alt="USDT"
                              className="w-5 h-5 mr-2 rounded-full"
                            />
                            USDT
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Network</span>
              <Badge variant={network === "mainnet" ? "default" : "secondary"}>
                {network}
              </Badge>
            </div>
          </div>

          <div className="pt-2">
            {!connected ? (
              <ConnectWalletButton className="w-full" />
            ) : (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create configuration by market cap"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4 p-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-center">Configuration created!</h3>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Configuration address:
        </div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.config}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Transaction signature:
        </div>
        <div className="bg-secondary/60 rounded p-2 text-sm font-mono break-all">
          {result?.signature}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={viewConfig} className="flex-1">
          <ExternalLink className="h-4 w-4 mr-2" />
          View configuration
        </Button>

        <Button variant="outline" onClick={viewExplorer} className="flex-1">
          <ExternalLink className="h-4 w-4 mr-2" />
          View transaction
        </Button>
      </div>

      <Button onClick={resetForm} className="w-full">
        Create new configuration
      </Button>
    </div>
  );

  // Render error view
  const renderError = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-10 w-10 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold">Failed to create configuration</h3>
      <p className="text-muted-foreground">
        {error || "An error occurred during configuration creation."}
      </p>
      <Button
        onClick={() => {
          setCurrentStage("input");
        }}
        className="w-full"
      >
        Try again
      </Button>
    </div>
  );

  // Render confirmation view
  const renderConfirming = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Confirming</h3>
      <p className="text-muted-foreground">
        Please wait while your transaction is being processed...
      </p>
    </div>
  );

  // Render dựa trên stage hiện tại
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

  // Tránh lỗi hydration
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create configuration by market cap</CardTitle>
          <CardDescription>
            Build a non-decreasing configuration based on market cap
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create configuration by market cap</span>
          {connected && publicKey && (
            <Badge variant="outline" className="ml-2">
              {publicKey.toString().slice(0, 4)}...
              {publicKey.toString().slice(-4)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Build a non-decreasing configuration based on market cap
        </CardDescription>
      </CardHeader>
      <CardContent>{renderStageContent()}</CardContent>
    </Card>
  );
}
