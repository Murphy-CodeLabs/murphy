"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, Loader2, Wallet } from "lucide-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

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

// Type for our form values
type FormValues = {
  destination: string;
  amount: number | undefined;
  token: string;
};

// Type for token options
export type TokenInfo = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  mintAddress?: string;
  icon?: string;
};

// Create a custom resolver that doesn't cause deep instantiation error
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate destination
  if (!data.destination) {
    errors.destination = {
      type: "required",
      message: "Destination address is required",
    };
  } else if (data.destination.length < 32) {
    errors.destination = {
      type: "minLength",
      message: "Destination address must be a valid Solana address",
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

  // Validate token
  if (!data.token) {
    errors.token = {
      type: "required",
      message: "Please select a token",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export interface SendTokenFormProps {
  onSendToken?: (values: FormValues) => Promise<void>;
  tokens?: TokenInfo[];
  isLoading?: boolean;
  showTokenBalance?: boolean;
  validateDestination?: (address: string) => Promise<boolean>;
  className?: string;
}

export function SendTokenForm({
  onSendToken,
  tokens,
  isLoading = false,
  showTokenBalance = true,
  validateDestination,
  className,
}: SendTokenFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amountValue, setAmountValue] = useState<string>("");

  // Default form with explicit type to avoid deep instantiation error
  const form = useForm<FormValues>({
    defaultValues: {
      destination: "",
      amount: undefined,
      token: "",
    },
    resolver: customResolver,
  });

  // Load available tokens from wallet
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

  // Fetch token accounts from devnet
  const fetchTokenAccounts = async (ownerPublicKey: PublicKey) => {
    try {
      setIsLoadingTokens(true);

      // Default SOL token
      let solBalance = 0;

      // Get SOL balance using connection from provider
      try {
        solBalance =
          (await connection.getBalance(ownerPublicKey)) / LAMPORTS_PER_SOL;
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
      }

      // Always include SOL with the real balance
      const defaultTokens: TokenInfo[] = [
        {
          id: "sol",
          symbol: "SOL",
          name: "Solana",
          balance: solBalance,
          decimals: 9,
          mintAddress: "So11111111111111111111111111111111111111112", // Native SOL mint address
          icon: "/crypto-logos/solana-logo.svg",
        },
      ];

      // Fetch SPL tokens using the provider connection
      const splTokens: TokenInfo[] = [];

      try {
        // Use getParsedTokenAccountsByOwner from the provider connection
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

      // Return combined tokens - using spread operator to combine arrays
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

  // Validate Solana address
  const isValidSolanaAddress = async (address: string): Promise<boolean> => {
    try {
      if (validateDestination) {
        return await validateDestination(address);
      }

      // Basic validation - check if it's a valid Solana public key format
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Handle form submission with actual token transfer
  async function handleSubmit(values: FormValues) {
    if (!connected || !publicKey || !connection) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to send tokens",
      });
      return;
    }

    const isValid = await isValidSolanaAddress(values.destination);
    if (!isValid) {
      toast.error("Invalid destination address", {
        description: "Please enter a valid Solana address",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      toast.message("Processing transaction...", {
        description: "Preparing to send tokens to destination address",
      });

      if (onSendToken) {
        await onSendToken(values);
      } else {
        const destinationPubkey = new PublicKey(values.destination);
        const selectedTokenInfo = availableTokens.find(
          (t) => t.id === values.token
        );

        if (!selectedTokenInfo || values.amount === undefined) {
          throw new Error("Invalid token or amount");
        }

        const transaction = new Transaction();

        if (values.token === "sol") {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: destinationPubkey,
              lamports: Math.floor(values.amount * LAMPORTS_PER_SOL),
            })
          );
        } else if (selectedTokenInfo.mintAddress) {
          const mintPubkey = new PublicKey(selectedTokenInfo.mintAddress);
          const senderATA = await getAssociatedTokenAddress(
            mintPubkey,
            publicKey
          );
          const receiverATA = await getAssociatedTokenAddress(
            mintPubkey,
            destinationPubkey
          );

          transaction.add(
            createTransferInstruction(
              senderATA,
              receiverATA,
              publicKey,
              Math.floor(
                values.amount * Math.pow(10, selectedTokenInfo.decimals)
              )
            )
          );
        }

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signature = await sendTransaction(transaction, connection);

        toast.message("Transaction sent", {
          description: "Waiting for confirmation...",
        });

        try {
          let confirmed = false;
          let retries = 0;
          const maxRetries = 30;

          while (!confirmed && retries < maxRetries) {
            retries++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const { value } = await connection.getSignatureStatus(signature);

            if (
              value?.confirmationStatus === "confirmed" ||
              value?.confirmationStatus === "finalized"
            ) {
              confirmed = true;
              break;
            }
          }

          if (!confirmed) {
            throw new Error(
              "Transaction confirmation timed out. Please check your wallet for status."
            );
          }
        } catch (confirmError) {
          console.error("Error confirming transaction:", confirmError);
          toast.warning("Transaction sent but confirmation failed", {
            description:
              "Your transaction was submitted but we couldn't confirm it. Please check your wallet for status.",
          });
        }
      }

      toast.success("Transaction complete", {
        description: `Successfully sent ${values.amount} ${
          selectedToken?.symbol || values.token
        } to ${values.destination.slice(0, 6)}...${values.destination.slice(
          -4
        )}`,
      });

      if (publicKey) {
        setIsUpdatingBalance(true);

        setTimeout(async () => {
          try {
            const updatedTokens = await fetchTokenAccounts(publicKey);

            setAvailableTokens((prevTokens) => {
              return prevTokens.map((token) => {
                const updatedToken = updatedTokens.find(
                  (t) => t.id === token.id
                );
                if (updatedToken) {
                  return { ...token, balance: updatedToken.balance };
                }
                return token;
              });
            });

            if (selectedToken) {
              const updatedToken = updatedTokens.find(
                (t) => t.id === selectedToken.id
              );
              if (updatedToken) {
                setSelectedToken((prev) =>
                  prev ? { ...prev, balance: updatedToken.balance } : null
                );
              }
            }

            toast.message("Balance updated", {
              description: "Your token balances have been refreshed",
            });
          } catch (error) {
            console.error("Error updating balances:", error);
          } finally {
            setIsUpdatingBalance(false);
          }
        }, 2000);
      }

      const currentTokenValue = form.getValues("token");
      form.reset({
        destination: "",
        amount: undefined,
        token: currentTokenValue,
      });
      setAmountValue("");
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Transaction failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  }

  const handleTokenChange = (value: string) => {
    const token = availableTokens.find((t) => t.id === value);
    if (token) {
      setSelectedToken(token);
      form.setValue("token", value);
    }
  };

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
        <CardTitle className="flex items-center">
          <Wallet className="h-5 w-5 mr-2" />
          Send Tokens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Destination Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter wallet address"
                      {...field}
                      disabled={!connected}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Token</FormLabel>
                    <Select
                      onValueChange={handleTokenChange}
                      defaultValue={field.value}
                      disabled={!connected}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full min-w-[180px]">
                          <SelectValue
                            placeholder={
                              isLoadingTokens || isUpdatingBalance
                                ? "Loading tokens..."
                                : "Select a token"
                            }
                          />
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

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <FormLabel>Amount</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.0"
                        step="any"
                        value={amountValue}
                        onChange={(e) => {
                          setAmountValue(e.target.value);
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number.parseFloat(e.target.value)
                          );
                        }}
                        disabled={!connected}
                      />
                    </FormControl>
                    {selectedToken && showTokenBalance && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Available:{" "}
                        {selectedToken.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits:
                            selectedToken.decimals > 6
                              ? 6
                              : selectedToken.decimals,
                        })}{" "}
                        {selectedToken.symbol}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {connected ? (
              <Button
                type="button"
                onClick={() => form.handleSubmit(handleSubmit)()}
                className="w-full"
                disabled={isSubmitting || isLoading || isLoadingTokens}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Transaction...
                  </>
                ) : (
                  <>
                    Send Tokens
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <ConnetWalletButton className="w-full">
                Connect Wallet
              </ConnetWalletButton>
            )}

            {connected && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Network</span>
                  <span className="font-medium bg-muted px-2 py-1 rounded">
                    {networkName}
                  </span>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
