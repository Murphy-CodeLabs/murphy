"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, RefreshCw, Settings, CoinsIcon } from "lucide-react";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { ConnetWalletButton } from "./connect-wallet-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useJupiterTrade } from "@/hook/murphis/use-JupiterTrade";
import { ModalContext } from "@/components/providers/wallet-provider";

// Token info type
export type TokenInfo = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  mintAddress?: string;
  icon?: string;
  apr?: number; // APR rate for staking
};

// Staking info interface
interface StakingInfo {
  apr: number;
  lockupPeriod: number; // Token lockup time (in days)
  rewardToken?: TokenInfo; // Token received after staking
}

// Type for stake form values
type StakeFormValues = {
  token: string;
  amount: number | undefined;
  lockupPeriod: number; // Unit in days
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate token input
  if (!data.token) {
    errors.token = {
      type: "required",
      message: "Please select a token to stake",
    };
  }

  // Validate amount
  if (data.amount === undefined || data.amount === null || data.amount === "") {
    errors.amount = {
      type: "required",
      message: "Amount is required",
    };
  } else if (Number(data.amount) <= 0) {
    errors.amount = {
      type: "min",
      message: "Amount must be greater than 0",
    };
  }

  // Validate lockup period
  if (!data.lockupPeriod) {
    errors.lockupPeriod = {
      type: "required",
      message: "Please select a lockup period",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

// Stake options
const STAKE_OPTIONS = [
  { value: "7", label: "7 days", apr: 5 },
  { value: "30", label: "30 days", apr: 10 },
  { value: "90", label: "90 days", apr: 15 },
  { value: "180", label: "180 days", apr: 20 },
  { value: "365", label: "365 days", apr: 25 },
];

// Props interface
export interface StakeFormProps {
  onStake?: (values: StakeFormValues) => Promise<void>;
  tokens?: TokenInfo[];
  isLoading?: boolean;
  showTokenBalance?: boolean;
  className?: string;
}

export function StakeForm({
  onStake,
  tokens,
  isLoading = false,
  showTokenBalance = true,
  className,
}: StakeFormProps) {
  // State variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [amountValue, setAmountValue] = useState<string>("");
  const [lockupPeriod, setLockupPeriod] = useState<number>(30); // Default 30 days
  const [estimatedReward, setEstimatedReward] = useState<number>(0);
  
  const { publicKey, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { getBalance } = useJupiterTrade();
  const { endpoint } = useContext(ModalContext);

  // Form setup with react-hook-form
  const form = useForm<StakeFormValues>({
    defaultValues: {
      token: "",
      amount: undefined,
      lockupPeriod: 30,
    },
    mode: "onSubmit",  // Only validate on submit
    resolver: customResolver,  // Use our custom resolver
  });

  // Available tokens state
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);

  // Determine network from connection endpoint
  const networkName = useMemo(() => {
    if (!connection) return "Unknown";

    const endpoint = connection.rpcEndpoint;

    if (endpoint.includes("devnet")) return "Devnet";
    if (endpoint.includes("testnet")) return "Testnet";
    if (endpoint.includes("mainnet")) return "Mainnet";
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))
      return "Localnet";

    // Custom endpoint - show partial URL
    const url = new URL(endpoint);
    return url.hostname;
  }, [connection]);

  // Fetch token accounts from wallet
  const fetchTokenAccounts = async (ownerPublicKey: PublicKey) => {
    try {
      setIsLoadingTokens(true);

      // Get SOL balance
      let solBalance = 0;
      try {
        if(!connection){
          throw new Error("No connection available");
        }
        solBalance = (await connection.getBalance(ownerPublicKey)) / LAMPORTS_PER_SOL;

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            solBalance = (await
              connection.getBalance(ownerPublicKey)) / LAMPORTS_PER_SOL;
              break;
            } catch (error: any) {
              retryCount++;
              if (retryCount === maxRetries) {
                throw error;
              }

              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
            }
          }
      } catch (error: any) {
        console.error("Error fetching SOL balance:", error);
        toast.error("Failed to fetch SOL balance", {
          description: error?.message || "Please check your wallet connection",
        })
      }

      // Predefined stakeable tokens
      const defaultTokens: TokenInfo[] = [
        {
          id: "sol",
          symbol: "SOL",
          name: "Solana",
          balance: solBalance,
          decimals: 9,
          mintAddress: "So11111111111111111111111111111111111111112",
          icon: "/crypto-logos/solana-logo.svg",
          apr: 5.5,
        },
        {
          id: "msol",
          symbol: "mSOL",
          name: "Marinade Staked SOL",
          balance: 0,
          decimals: 9,
          mintAddress: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
          icon: "/crypto-logos/msol-logo.svg",
          apr: 6.2,
        },
        {
          id: "bsol",
          symbol: "bSOL",
          name: "Blaze Staked SOL",
          balance: 0,
          decimals: 9,
          mintAddress: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
          icon: "/crypto-logos/bsol-logo.svg",
          apr: 6.5,
        },
        {
          id: "jitosol",
          symbol: "jitoSOL",
          name: "Jito Staked SOL",
          balance: 0,
          decimals: 9,
          mintAddress: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
          icon: "/crypto-logos/jito-logo.svg",
          apr: 7.1,
        }
      ];

      // Fetch SPL tokens using the provider connection
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          ownerPublicKey,
          {
            programId: new PublicKey(
              "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            ),
          }
        );

        // Update token balances for pre-defined tokens
        for (const account of tokenAccounts.value) {
          const accountData = account.account.data.parsed.info;
          const mintAddress = accountData.mint;
          const tokenAmount = accountData.tokenAmount;

          // Find if this is one of our pre-defined tokens
          const tokenIndex = defaultTokens.findIndex(t => t.mintAddress === mintAddress);
          if (tokenIndex >= 0 && tokenAmount.uiAmount > 0) {
            defaultTokens[tokenIndex].balance = tokenAmount.uiAmount;
          }
        }
      } catch (error) {
        console.error("Error fetching SPL token accounts:", error);
      }

      // Return tokens with balances
      return defaultTokens;
    } catch (error) {
      console.error("Error fetching token accounts:", error);
      // Return basic SOL token on error
      return [
        {
          id: "sol",
          symbol: "SOL",
          name: "Solana",
          balance: 0,
          decimals: 9,
          icon: "/crypto-logos/solana-logo.svg",
          apr: 5.5,
        },
      ];
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Load tokens effect
  useEffect(() => {
    // If tokens are provided as props, use those
    if (tokens) {
      setAvailableTokens(tokens);
    }
    // Otherwise, if wallet is connected, fetch tokens
    else if (connected && publicKey) {
      fetchTokenAccounts(publicKey)
        .then((fetchedTokens) => {
          setAvailableTokens(fetchedTokens);
        })
        .catch((error) => {
          console.error("Error setting tokens:", error);
          // Set default SOL token on error
          setAvailableTokens([
            {
              id: "sol",
              symbol: "SOL",
              name: "Solana",
              balance: 0,
              decimals: 9,
              icon: "/crypto-logos/solana-logo.svg",
              apr: 5.5,
            },
          ]);
        });
    }
  }, [tokens, connected, publicKey]);

  // Handle use max amount
  const handleUseMax = (e?: React.MouseEvent) => {
    // Prevent form submit event if there is an event
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (selectedToken && selectedToken.balance > 0) {
      // If SOL is selected, keep 0.01 SOL for transaction fees
      let maxAmount: number;
      
      if (selectedToken.id === "sol" || 
          selectedToken.mintAddress === "So11111111111111111111111111111111111111112") {
        // Keep 0.05 SOL for transaction fees, enough for most transactions
        maxAmount = Math.max(selectedToken.balance - 0.05, 0);
      } else {
        maxAmount = selectedToken.balance;
      }
      
      setAmountValue(maxAmount.toString());
      form.setValue("amount", maxAmount, {
        shouldValidate: false,
        shouldDirty: true,
        shouldTouch: true,
      });
      
      // Calculate estimated reward
      calculateEstimatedReward(maxAmount, lockupPeriod);
    }
  };

  // Handle amount input change
  const handleAmountChange = (value: string) => {
    setAmountValue(value);
    const parsedValue = value === "" ? undefined : parseFloat(value);
    form.setValue("amount", parsedValue, {
      shouldValidate: false  // Prevent validation
    });
    
    if (parsedValue && parsedValue > 0) {
      calculateEstimatedReward(parsedValue, lockupPeriod);
    } else {
      setEstimatedReward(0);
    }
  };

  // Handle token selection change
  const handleTokenChange = (tokenId: string) => {
    const token = availableTokens.find((t) => t.id === tokenId);
    
    if (!token) return;
    
    setSelectedToken(token);
    form.setValue("token", token.id, {
      shouldValidate: false  // Prevent validation
    });
    
    // Recalculate estimated reward if amount exists
    if (amountValue && parseFloat(amountValue) > 0) {
      calculateEstimatedReward(parseFloat(amountValue), lockupPeriod);
    }
  };

  // Handle lockup period change
  const handleLockupPeriodChange = (value: string) => {
    const days = parseInt(value);
    setLockupPeriod(days);
    form.setValue("lockupPeriod", days, {
      shouldValidate: false  // Prevent validation
    });
    
    // Recalculate estimated reward if amount exists
    if (amountValue && parseFloat(amountValue) > 0) {
      calculateEstimatedReward(parseFloat(amountValue), days);
    }
  };

  // Calculate estimated reward
  const calculateEstimatedReward = (amount: number, days: number) => {
    if (!selectedToken || !amount || amount <= 0 || !days) {
      setEstimatedReward(0);
      return;
    }
    
    // Find the APR for the selected period
    const option = STAKE_OPTIONS.find(opt => parseInt(opt.value) === days);
    const apr = option?.apr || 0;
    
    // Calculate reward: amount * (apr/100) * (days/365)
    const reward = amount * (apr / 100) * (days / 365);
    setEstimatedReward(reward);
  };

  // Separate function to update balances
  const updateBalances = async () => {
    setIsUpdatingBalance(true);
    try {
      const updatedTokens = await fetchTokenAccounts(publicKey!);
      setAvailableTokens(updatedTokens);
      if (selectedToken) {
        const updatedToken = updatedTokens.find(t => t.id === selectedToken.id);
        if (updatedToken) {
          setSelectedToken(updatedToken);
        }
      }
      toast.success("Balances updated");
    } catch (error) {
      console.error("Error updating balances:", error);
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: StakeFormValues) => {
    if (!connected) {
      toast.error("Wallet not connected");
      return;
    }

    if (!publicKey) {
      toast.error("Public key not found");
      return;
    }

    if (!connection) {
      toast.error("Invalid connection");
      return;
    }

    if (!endpoint) {
      toast.error("RPC endpoint not found");
      return;
    }

    if (!selectedToken) {
      toast.error("Select a token");
      return;
    }

    if (!values.amount || values.amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check token address
      if (!selectedToken.mintAddress) {
        throw new Error("Token mintAddress not found");
      }
      
      // Create PublicKey from address
      const tokenMint = new PublicKey(selectedToken.mintAddress);
      
      // Log staking information for debugging
      console.log("=== Staking Information ===");
      console.log("Endpoint:", endpoint);
      console.log("Token:", selectedToken.symbol, tokenMint.toString());
      console.log("Amount:", values.amount);
      console.log("Lockup period:", values.lockupPeriod, "days");
      console.log("Estimated reward:", estimatedReward.toFixed(4), selectedToken.symbol);
      console.log("Wallet connected:", connected ? "Yes" : "No");
      console.log("PublicKey:", publicKey.toString());
      console.log("========================");
      
      // Check wallet
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      
      // Simulate staking (in a real app, you would call your staking contract here)
      toast.success("Staking initiated", {
        description: "This is a demo. In a real app, your tokens would be staked now."
      });
      
      // Optional callback to parent component
      if (onStake) {
        await onStake(values);
      }
      
      // Reset form
      setAmountValue("");
      setEstimatedReward(0);
      form.setValue("amount", undefined, {
        shouldValidate: false
      });
      
      // Update balances after successful staking
      setTimeout(() => {
        updateBalances();
      }, 2000);
      
    } catch (error: any) {
      console.error("Staking error:", error);
      toast.error("Staking failed", {
        description: error.message || "Transaction failed"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render token item for the select dropdown
  const renderTokenItem = (token: TokenInfo) => (
    <SelectItem key={token.id} value={token.id}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {token.icon && (
            <div className="w-5 h-5 mr-2 rounded-full overflow-hidden flex items-center justify-center">
              <img
                src={token.icon || "/placeholder.svg"}
                alt={token.symbol}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <span>{token.symbol}</span>
        </div>
        {showTokenBalance && (
          <span className="text-muted-foreground ml-2 text-sm">
            {token.balance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: token.decimals > 6 ? 6 : token.decimals,
            })}
          </span>
        )}
      </div>
    </SelectItem>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stake Tokens</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={updateBalances} 
            disabled={isUpdatingBalance || !connected}
          >
            <RefreshCw className={`h-4 w-4 ${isUpdatingBalance ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              // Check if clicking MAX button then do not submit
              const target = e.target as HTMLElement;
              const maxButton = target.querySelector('.max-button');
              if (maxButton && (maxButton === document.activeElement || maxButton.contains(document.activeElement as Node))) {
                e.preventDefault();
                return;
              }
              
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Token Select Field */}
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Token</FormLabel>
                  <Select
                    onValueChange={(value) => handleTokenChange(value)}
                    value={field.value}
                    disabled={!connected || isLoadingTokens}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingTokens || isUpdatingBalance
                              ? "Loading..."
                              : "Select a token"
                          }
                        >
                          {selectedToken && (
                            <div className="flex items-center">
                              {selectedToken.icon && (
                                <img
                                  src={selectedToken.icon}
                                  alt={selectedToken.symbol}
                                  className="w-5 h-5 mr-2 rounded-full"
                                />
                              )}
                              {selectedToken.symbol}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTokens || isUpdatingBalance ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>
                            {isUpdatingBalance
                              ? "Updating balances..."
                              : "Loading tokens..."}
                          </span>
                        </div>
                      ) : availableTokens.length > 0 ? (
                        <SelectGroup>
                          {availableTokens.map(renderTokenItem)}
                        </SelectGroup>
                      ) : (
                        <div className="p-2 text-muted-foreground text-center">
                          No tokens found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Token Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <FormLabel>Amount</FormLabel>
                    {selectedToken && showTokenBalance && (
                      <div className="flex items-center text-xs text-muted-foreground space-x-1">
                        <span>
                          Balance: {selectedToken.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: selectedToken.decimals > 6 ? 6 : selectedToken.decimals,
                          })}
                        </span>
                        <div className="max-button-container" onClick={(e) => e.stopPropagation()}>
                          <span 
                            className="cursor-pointer h-auto py-0 px-2 text-xs text-primary hover:underline max-button" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUseMax();
                            }}
                          >
                            MAX
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.0"
                        step="any"
                        value={amountValue}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        disabled={!connected || !selectedToken}
                        className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    {selectedToken && (
                      <div className="flex items-center bg-background px-3 py-2 rounded-md">
                        {selectedToken.icon && (
                          <img
                            src={selectedToken.icon}
                            alt={selectedToken.symbol}
                            className="w-5 h-5 mr-2 rounded-full"
                          />
                        )}
                        <span>{selectedToken.symbol}</span>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lockup Period Field */}
            <FormField
              control={form.control}
              name="lockupPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lockup Period</FormLabel>
                  <Select
                    onValueChange={(value) => handleLockupPeriodChange(value)}
                    value={field.value?.toString()}
                    disabled={!connected}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lockup period">
                          {STAKE_OPTIONS.find(opt => parseInt(opt.value) === lockupPeriod)?.label}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {STAKE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center justify-between w-full">
                              <span>{option.label}</span>
                              <span className="text-green-500 text-sm">{option.apr}% APR</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Reward */}
            {estimatedReward > 0 && selectedToken && (
              <div className="border border-border rounded-lg p-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Estimated Reward</span>
                  <span className="font-medium text-green-500">
                    +{estimatedReward.toFixed(4)} {selectedToken.symbol}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {STAKE_OPTIONS.find(opt => parseInt(opt.value) === lockupPeriod)?.apr}% APR for {lockupPeriod} days
                </div>
              </div>
            )}

            {/* Add stake button section */}
            <div className="pt-2">
              {!connected ? (
                <ConnetWalletButton className="w-full" />
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    isLoading ||
                    !selectedToken ||
                    !amountValue ||
                    parseFloat(amountValue) <= 0
                  }
                >
                  {isSubmitting || isLoading? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Staking...
                    </>
                  ) : (
                    "Stake"
                  )}
                </Button>
              )}
            </div>

            {/* Network Info */}
            <div className="text-xs text-center text-muted-foreground">
              Network: {networkName}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
