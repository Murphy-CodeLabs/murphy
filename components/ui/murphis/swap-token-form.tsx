"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDown, Loader2, RefreshCw, Settings } from "lucide-react";
import {
  PublicKey,
  Transaction,
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
import { ConnectWalletButton } from "./connect-wallet-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useJupiterTrade } from "@/hook/murphis/use-JupiterTrade";
import { ModalContext } from "@/components/providers/wallet-provider";

declare global {
  interface Window {
    quoteTimeout: NodeJS.Timeout | null;
  }
}

// Token info type
export type TokenInfo = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  mintAddress?: string;
  icon?: string;
};

// Quote result interface - must match the result from Jupiter API
interface QuoteResult {
  outputAmount: string;    // Amount of tokens received
  exchangeRate: number;    // Exchange rate
  priceImpactPct: number;  // Price impact (%)
  routeInfo: any;          // Route information
}

// Type for swap form values
type SwapFormValues = {
  tokenIn: string;
  tokenOut: string;
  amountIn: number | undefined;
  amountOut: number | undefined;
  slippage: number;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate token input
  if (!data.tokenIn) {
    errors.tokenIn = {
      type: "required",
      message: "Please select an input token",
    };
  }

  // Validate token output
  if (!data.tokenOut) {
    errors.tokenOut = {
      type: "required",
      message: "Please select an output token",
    };
  }

  // Validate amount
  if (data.amountIn === undefined || data.amountIn === null || data.amountIn === "") {
    errors.amountIn = {
      type: "required",
      message: "Amount is required",
    };
  } else if (Number(data.amountIn) <= 0) {
    errors.amountIn = {
      type: "min",
      message: "Amount must be greater than 0",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

// Props interface
export interface SwapFormProps {
  onSwap?: (values: SwapFormValues) => Promise<void>;
  tokens?: TokenInfo[];
  isLoading?: boolean;
  showTokenBalance?: boolean;
  className?: string;
}

export function SwapForm({
  onSwap,
  tokens,
  isLoading = false,
  showTokenBalance = true,
  className,
}: SwapFormProps) {
  // State variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTokenIn, setSelectedTokenIn] = useState<TokenInfo | null>(null);
  const [selectedTokenOut, setSelectedTokenOut] = useState<TokenInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [amountInValue, setAmountInValue] = useState<string>("");
  const [amountOutValue, setAmountOutValue] = useState<string>("");
  const [slippageValue, setSlippageValue] = useState<number>(0.5); // 0.5% default
  const [slippageSettingsOpen, setSlippageSettingsOpen] = useState(false);
  
  const { publicKey, connected, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const { executeTrade, getQuote } = useJupiterTrade();
  const { endpoint } = useContext(ModalContext);

  // Form setup with react-hook-form
  const form = useForm<SwapFormValues>({
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
      amountIn: undefined,
      amountOut: undefined,
      slippage: 0.5,
    },
    mode: "onSubmit",  // Only validate on submit
    resolver: customResolver,  // Use our custom resolver
  });

  // Available tokens state
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);

  // Add state to store timeout
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
    };
  }, [inputTimeout]);

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

      // Extended default tokens list
      const defaultTokens: TokenInfo[] = [
        {
          id: "sol",
          symbol: "SOL",
          name: "Solana",
          balance: solBalance,
          decimals: 9,
          mintAddress: "So11111111111111111111111111111111111111112",
          icon: "/crypto-logos/solana-logo.svg",
        },
        {
          id: "usdc",
          symbol: "USDC",
          name: "USD Coin",
          balance: 0,
          decimals: 6,
          mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          icon: "/crypto-logos/usd-coin-usdc-logo.svg",
        },
        {
          id: "usdt",
          symbol: "USDT",
          name: "Tether USD",
          balance: 0,
          decimals: 6,
          mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
          icon: "/crypto-logos/tether-usdt-logo.svg",
        }
      ];

      // Fetch SPL tokens using the provider connection
      const splTokens: TokenInfo[] = [];

      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          ownerPublicKey,
          {
            programId: new PublicKey(
              "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            ),
          }
        );

        for (const account of tokenAccounts.value) {
          const accountData = account.account.data.parsed.info;
          const mintAddress = accountData.mint;
          const tokenAmount = accountData.tokenAmount;

          if (tokenAmount.uiAmount > 0) {
            // Only include tokens with non-zero balance
            splTokens.push({
              id: mintAddress,
              symbol: mintAddress.substring(0, 4) + "...", // Use shortened mint as symbol if no metadata
              name: "Token " + mintAddress.substring(0, 6), // Use shortened mint as name if no metadata
              balance: tokenAmount.uiAmount,
              decimals: tokenAmount.decimals,
              mintAddress: mintAddress,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching SPL token accounts:", error);
      }

      // Return combined tokens
      return [...defaultTokens, ...splTokens];
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
    
    if (selectedTokenIn && selectedTokenIn.balance > 0) {
      // If SOL is selected, keep 0.01 SOL for transaction fees
      let maxAmount: number;
      
      if (selectedTokenIn.id === "sol" || 
          selectedTokenIn.mintAddress === "So11111111111111111111111111111111111111112") {
        // Keep 0.05 SOL for transaction fees, enough for most transactions
        maxAmount = Math.max(selectedTokenIn.balance - 0.05, 0);
      } else {
        maxAmount = selectedTokenIn.balance;
      }
      
      setAmountInValue(maxAmount.toString());
      form.setValue("amountIn", maxAmount, {
        shouldValidate: false,
        shouldDirty: true,
        shouldTouch: true,
      });
      
      // If the output token is selected, wait a bit before getting the quote
      if (selectedTokenOut && maxAmount > 0) {
        setTimeout(() => {
          fetchSwapQuote(maxAmount, true);
        }, 0);
      }
    }
  };

  // Handle amount input change with debounce
  const handleAmountInChange = (value: string) => {
    setAmountInValue(value);
    const parsedValue = value === "" ? undefined : parseFloat(value);
    form.setValue("amountIn", parsedValue, {
      shouldValidate: false  // Prevent validation
    });
    
    if (!parsedValue || parsedValue <= 0) {
      setAmountOutValue("");
      setQuoteResult(null);
      return;
    }

    // Cancel old timeout if any
    if (inputTimeout) {
      clearTimeout(inputTimeout);
    }
    
    // Automatically update the quote after the user stops typing for 500ms
    if (parsedValue && parsedValue > 0 && selectedTokenIn && selectedTokenOut) {
      const newTimeout = setTimeout(() => {
        fetchSwapQuote(parsedValue, false);
      }, 500);
      
      setInputTimeout(newTimeout);
    }
  };

  // Add blur event handler to ensure update when user loses focus
  const handleAmountInBlur = () => {
    if (amountInValue && parseFloat(amountInValue) > 0 && selectedTokenIn && selectedTokenOut) {
      fetchSwapQuote(parseFloat(amountInValue), false);
    }
  };

  // Handle token change
  const handleTokenChange = (isInput: boolean, tokenId: string) => {
    const token = availableTokens.find((t) => t.id === tokenId);
    
    if (!token) return;
    
    if (isInput) {
      if (selectedTokenOut && token.id === selectedTokenOut.id) {
        toast.error("Cannot select the same token", {
          description: "Please select different tokens for input and output",
        });
        return;
      }
      
      setSelectedTokenIn(token);
      form.setValue("tokenIn", token.id, {
        shouldValidate: false  // Prevent validation
      });
    } else {
      if (selectedTokenIn && token.id === selectedTokenIn.id) {
        toast.error("Cannot select the same token", {
          description: "Please select different tokens for input and output",
        });
        return;
      }
      
      setSelectedTokenOut(token);
      form.setValue("tokenOut", token.id, {
        shouldValidate: false  // Prevent validation
      });
    }
    
    // Clear amounts and re-quote if we have an input amount
    if (amountInValue && parseFloat(amountInValue) > 0) {
      fetchSwapQuote(parseFloat(amountInValue), false);
    }
  };

  // Handle slippage change
  const handleSlippageChange = (value: number) => {
    setSlippageValue(value);
    form.setValue("slippage", value, {
      shouldValidate: false  // Prevent validation
    });
  };

  // Switch tokens
  const handleSwitchTokens = () => {
    // Swap token selections
    const tempTokenIn = selectedTokenIn;
    const tempTokenOut = selectedTokenOut;
    
    setSelectedTokenIn(tempTokenOut);
    setSelectedTokenOut(tempTokenIn);
    
    if (tempTokenOut) {
      form.setValue("tokenIn", tempTokenOut.id, {
        shouldValidate: false  // Prevent validation
      });
    }
    
    if (tempTokenIn) {
      form.setValue("tokenOut", tempTokenIn.id, {
        shouldValidate: false  // Prevent validation
      });
    }
    
    // Clear amounts and re-quote if needed
    setAmountInValue("");
    setAmountOutValue("");
    form.setValue("amountIn", undefined, {
      shouldValidate: false  // Prevent validation
    });
    form.setValue("amountOut", undefined, {
      shouldValidate: false  // Prevent validation
    });
    setQuoteResult(null);
  };

  // Fetch swap quote
  const fetchSwapQuote = async (amount: number, isFromMaxButton: boolean = false) => {
    if (!connected || !publicKey) {
      toast.error("Wallet not connected", { 
        description: "Please connect your wallet to get a quote" 
      });
      return;
    }
  
    if (!selectedTokenIn || !selectedTokenOut) {
      toast.error("Select tokens", { 
        description: "Please select input and output tokens" 
      });
      return;
    }
  
    if (amount <= 0) {
      setAmountOutValue("");
      setQuoteResult(null);
      return;
    }
  
    try {
      setIsLoadingQuote(true);
  
      // Check token address
      if (!selectedTokenIn.mintAddress || !selectedTokenOut.mintAddress) {
        throw new Error("Token mintAddress not found");
      }

      // Create PublicKey from address
      const inputMint = new PublicKey(selectedTokenIn.mintAddress);
      const outputMint = new PublicKey(selectedTokenOut.mintAddress);
      const slippageBps = Math.floor(slippageValue * 100);
      
      // Call API to get quote
      const quoteResponse = await getQuote(
        outputMint,
        amount,
        inputMint,
        slippageBps
      );
  
      if (quoteResponse) {
        // Update state with result from API
        setQuoteResult(quoteResponse);
        setAmountOutValue(quoteResponse.outputAmount);
        form.setValue("amountOut", Number(quoteResponse.outputAmount), {
          shouldValidate: false
        });
      } else {
        setQuoteResult(null);
        setAmountOutValue("");
        form.setValue("amountOut", undefined, {
          shouldValidate: false
        });
      }
    } catch (error: any) {
      setQuoteResult(null);
      setAmountOutValue("");
      toast.error("Failed to get quote", {
        description: error?.message || "Unable to fetch quote from Jupiter"
      });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: SwapFormValues) => {
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

    if (!selectedTokenIn || !selectedTokenOut) {
      toast.error("Select tokens");
      return;
    }

    if (!values.amountIn || values.amountIn <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check token address
      if (!selectedTokenIn.mintAddress || !selectedTokenOut.mintAddress) {
        throw new Error("Token mintAddress not found");
      }
      
      // Create PublicKey from address
      const inputMint = new PublicKey(selectedTokenIn.mintAddress);
      const outputMint = new PublicKey(selectedTokenOut.mintAddress);
      const slippageBps = Math.floor(slippageValue * 100);
      
      // Log transaction information for debugging
      console.log("=== Transaction Information ===");
      console.log("Endpoint:", endpoint);
      console.log("Input token:", selectedTokenIn.symbol, inputMint.toString());
      console.log("Output token:", selectedTokenOut.symbol, outputMint.toString());
      console.log("Amount:", values.amountIn);
      console.log("Slippage:", slippageBps, "bps");
      console.log("Wallet connected:", connected ? "Yes" : "No");
      console.log("PublicKey:", publicKey.toString());
      console.log("========================");
      
      // Check all parameters before executing the transaction
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      
      try {
        // Execute the swap transaction with proper validation
        console.log("Calling executeTrade with parameters:");
        console.log(" - outputMint:", outputMint.toString());
        console.log(" - inputAmount:", values.amountIn);
        console.log(" - inputMint:", inputMint.toString());
        console.log(" - slippageBps:", slippageBps);
        console.log(" - wallet:", typeof wallet, wallet ? "connected" : "not connected");
        
        // Check if wallet supports signTransaction method
        const walletAdapter = wallet as any;
        console.log(" - wallet supports signTransaction:", walletAdapter?.signTransaction ? "yes" : "no");
        console.log(" - endpoint:", endpoint);

        // Pass fewer parameters, compatible with new API
        const signature = await executeTrade(
          outputMint,
          values.amountIn,
          inputMint,
          slippageBps
        );
  
        toast.success("Swap successful!", {
          description: `Transaction: ${signature}`
        });
  
        // Reset form and update balances
        setAmountInValue("");
        setAmountOutValue("");
        form.setValue("amountIn", undefined, {
          shouldValidate: false
        });
        form.setValue("amountOut", undefined, {
          shouldValidate: false
        });
        setQuoteResult(null);
  
        // Update balances after successful swap
        if (publicKey) {
          await updateBalances();
        }
      } catch (tradeError: any) {
        console.error("Trade execution error:", tradeError);
        toast.error("Transaction failed", {
          description: tradeError.message || "Unable to execute transaction"
        });
      }
    } catch (error: any) {
      console.error("Swap error:", error);
      toast.error("Swap failed", {
        description: error.message || "Transaction failed"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Separate function to update balances
  const updateSelectedTokenBalances = (updatedTokens: TokenInfo[]) => {
    // Update selected token balances if they exist in the updated tokens list
    if (selectedTokenIn) {
      const updatedTokenIn = updatedTokens.find(t => t.id === selectedTokenIn.id);
      if (updatedTokenIn) {
        setSelectedTokenIn(updatedTokenIn);
      }
    }
    
    if (selectedTokenOut) {
      const updatedTokenOut = updatedTokens.find(t => t.id === selectedTokenOut.id);
      if (updatedTokenOut) {
        setSelectedTokenOut(updatedTokenOut);
      }
    }
  };

  // Existing updateBalances function remains the same
  const updateBalances = async () => {
    setIsUpdatingBalance(true);
    try {
      const updatedTokens = await fetchTokenAccounts(publicKey!);
      setAvailableTokens(updatedTokens);
      updateSelectedTokenBalances(updatedTokens);
      toast.success("Balances updated");
    } catch (error) {
      console.error("Error updating balances:", error);
    } finally {
      setIsUpdatingBalance(false);
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
          <span>Swap Tokens</span>
          <Popover open={slippageSettingsOpen} onOpenChange={setSlippageSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Slippage Tolerance</h4>
                <div className="flex items-center justify-between gap-2">
                  <Button 
                    variant={slippageValue === 0.1 ? "default" : "outline"} 
                    size="sm"
                    onClick={() => handleSlippageChange(0.1)}
                    className="flex-1"
                  >
                    0.1%
                  </Button>
                  <Button 
                    variant={slippageValue === 0.5 ? "default" : "outline"} 
                    size="sm"
                    onClick={() => handleSlippageChange(0.5)}
                    className="flex-1"
                  >
                    0.5%
                  </Button>
                  <Button 
                    variant={slippageValue === 1 ? "default" : "outline"} 
                    size="sm"
                    onClick={() => handleSlippageChange(1)}
                    className="flex-1"
                  >
                    1.0%
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Custom: {slippageValue.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[slippageValue]}
                    min={0.1}
                    max={5}
                    step={0.1}
                    onValueChange={(value) => handleSlippageChange(value[0])}
                  />
                  {slippageValue > 3 && (
                    <p className="text-yellow-500 text-sm">
                      High slippage increases the risk of price impact
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
            {/* Token Input Field */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="tokenIn"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <FormLabel>You Pay</FormLabel>
                      {selectedTokenIn && showTokenBalance && (
                        <div className="flex items-center text-xs text-muted-foreground space-x-1">
                          <span>
                            Balance: {selectedTokenIn.balance.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: selectedTokenIn.decimals > 6 ? 6 : selectedTokenIn.decimals,
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
                          value={amountInValue}
                          onChange={(e) => handleAmountInChange(e.target.value)}
                          onBlur={handleAmountInBlur}
                          disabled={!connected || !selectedTokenIn}
                          className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <Select
                        onValueChange={(value) => handleTokenChange(true, value)}
                        value={field.value}
                        disabled={!connected}
                      >
                        <FormControl>
                          <SelectTrigger className="min-w-[140px] h-auto bg-background">
                            <SelectValue
                              placeholder={
                                isLoadingTokens || isUpdatingBalance
                                  ? "Loading..."
                                  : "Select"
                              }
                            >
                              {selectedTokenIn && (
                                <div className="flex items-center">
                                  {selectedTokenIn.icon && (
                                    <img
                                      src={selectedTokenIn.icon}
                                      alt={selectedTokenIn.symbol}
                                      className="w-5 h-5 mr-2 rounded-full"
                                    />
                                  )}
                                  {selectedTokenIn.symbol}
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Arrow button to switch tokens */}
              <div className="flex justify-center -my-2 relative z-10">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10 bg-background border-background shadow-md"
                  onClick={handleSwitchTokens}
                  disabled={!selectedTokenIn || !selectedTokenOut}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Token Output Field */}
              <FormField
                control={form.control}
                name="tokenOut"
                render={({ field }) => (
                  <FormItem className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <FormLabel>You Receive</FormLabel>
                      {selectedTokenOut && showTokenBalance && (
                        <div className="text-xs text-muted-foreground">
                          Balance: {selectedTokenOut.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: selectedTokenOut.decimals > 6 ? 6 : selectedTokenOut.decimals,
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="0.0"
                          value={amountOutValue}
                          disabled={true} // Always disabled - calculated from input
                          className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <Select
                        onValueChange={(value) => handleTokenChange(false, value)}
                        value={field.value}
                        disabled={!connected}
                      >
                        <FormControl>
                          <SelectTrigger className="min-w-[140px] h-auto bg-background">
                            <SelectValue
                              placeholder={
                                isLoadingTokens || isUpdatingBalance
                                  ? "Loading..."
                                  : "Select"
                              }
                            >
                              {selectedTokenOut && (
                                <div className="flex items-center">
                                  {selectedTokenOut.icon && (
                                    <img
                                      src={selectedTokenOut.icon}
                                      alt={selectedTokenOut.symbol}
                                      className="w-5 h-5 mr-2 rounded-full"
                                    />
                                  )}
                                  {selectedTokenOut.symbol}
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Add swap button section */}
            <div className="pt-2">
              {!connected ? (
                <ConnectWalletButton className="w-full" />
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    isLoading ||
                    !selectedTokenIn ||
                    !selectedTokenOut ||
                    !amountInValue ||
                    parseFloat
                    (amountInValue) <= 0 || 
                    isLoadingQuote
                  }
                  >
                  {isSubmitting || isLoading? (
                    <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Swapping...
                    </>
                  ) : (
                    "Swap"
                  )}
                  </Button>
                )}
            </div>


            {/*/ Add exchange rate info if quote exists */}
            {quoteResult && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground text-center">
                  1 {selectedTokenIn?.symbol} ≈ {quoteResult.exchangeRate.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6
                  })} {selectedTokenOut?.symbol}
                </div>
                <div className="text-xs text-center flex justify-center gap-2">
                  <span className="text-muted-foreground">
                    Slippage: {slippageValue.toFixed(1)}%
                  </span>
                  {quoteResult.priceImpactPct > 1 && (
                    <span className={`${quoteResult.priceImpactPct > 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                      Price impact: {quoteResult.priceImpactPct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
