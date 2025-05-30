"use client";

import { ModalContext } from "@/components/providers/wallet-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useJupiterTrade } from "@/hook/murphy/use-JupiterTrade";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    LAMPORTS_PER_SOL,
    PublicKey,
} from "@solana/web3.js";
import { Info, Loader2 } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConnectWalletButton } from "./connect-wallet-button";


interface ExchangeQuote {
    outputAmount: string;
    exchangeRate: number;
    priceImpactPct: number;
    estimatedFee: number;
}


type SolExchangeFormValues = {
    solAmount: number | undefined;
    customTokenMint: string;
    slippage: number;
};


const customResolver = (data: any) => {
    const errors: any = {};


    if (data.solAmount === undefined || data.solAmount === null || data.solAmount === "") {
        errors.solAmount = {
            type: "required",
            message: "SOL amount is required",
        };
    } else if (Number(data.solAmount) <= 0) {
        errors.solAmount = {
            type: "min",
            message: "SOL amount must be greater than 0",
        };
    } else if (Number(data.solAmount) < 0.01) {
        errors.solAmount = {
            type: "min",
            message: "Minimum SOL amount is 0.01",
        };
    }


    if (!data.customTokenMint || data.customTokenMint.trim() === "") {
        errors.customTokenMint = {
            type: "required",
            message: "Token mint address is required",
        };
    } else {
        try {
            new PublicKey(data.customTokenMint.trim());
        } catch {
            errors.customTokenMint = {
                type: "invalid",
                message: "Invalid Solana token mint address",
            };
        }
    }

    return {
        values: Object.keys(errors).length === 0 ? data : {},
        errors,
    };
};


export interface SolExchangeFormProps {
    onExchange?: (values: SolExchangeFormValues & { signature: string }) => Promise<void>;
    defaultSlippage?: number;
    showEstimatedFee?: boolean;
    className?: string;
}

export function SolExchangeForm({
    onExchange,
    defaultSlippage = 1.0,
    showEstimatedFee = true,
    className,
}: SolExchangeFormProps) {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [quote, setQuote] = useState<ExchangeQuote | null>(null);
    const [solBalance, setSolBalance] = useState<number>(0);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [solAmountValue, setSolAmountValue] = useState<string>("");
    const [customTokenMintValue, setCustomTokenMintValue] = useState<string>("");

    const { publicKey, connected, wallet } = useWallet();
    const { connection } = useConnection();
    const { executeTrade, getQuote, getBalance } = useJupiterTrade();
    const { endpoint } = useContext(ModalContext);


    const form = useForm<SolExchangeFormValues>({
        defaultValues: {
            solAmount: undefined,
            customTokenMint: "",
            slippage: defaultSlippage,
        },
        mode: "onSubmit",
        resolver: customResolver,
    });


    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");


    const fetchSolBalance = async () => {
        if (!connected || !publicKey || !connection) return;

        try {
            setIsLoadingBalance(true);
            const balance = await connection.getBalance(publicKey);
            setSolBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
            console.error("Error fetching SOL balance:", error);
            toast.error("Failed to fetch SOL balance");
        } finally {
            setIsLoadingBalance(false);
        }
    };


    useEffect(() => {
        fetchSolBalance();
    }, [connected, publicKey]);


    const handleUseMax = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (solBalance > 0) {

            const maxAmount = Math.max(solBalance - 0.05, 0);
            setSolAmountValue(maxAmount.toString());
            form.setValue("solAmount", maxAmount, {
                shouldValidate: false,
                shouldDirty: true,
                shouldTouch: true,
            });


            if (customTokenMintValue.trim()) {
                setTimeout(() => {
                    fetchExchangeQuote(maxAmount, customTokenMintValue.trim());
                }, 100);
            }
        }
    };


    const handleSolAmountChange = (value: string) => {
        setSolAmountValue(value);
        const parsedValue = value === "" ? undefined : parseFloat(value);
        form.setValue("solAmount", parsedValue, {
            shouldValidate: false,
        });

        if (!parsedValue || parsedValue <= 0 || !customTokenMintValue.trim()) {
            setQuote(null);
            return;
        }


        const timeoutId = setTimeout(() => {
            fetchExchangeQuote(parsedValue, customTokenMintValue.trim());
        }, 500);

        return () => clearTimeout(timeoutId);
    };


    const handleCustomTokenMintChange = (value: string) => {
        setCustomTokenMintValue(value);
        form.setValue("customTokenMint", value, {
            shouldValidate: false,
        });


        setQuote(null);


        if (solAmountValue && parseFloat(solAmountValue) > 0 && value.trim()) {
            setTimeout(() => {
                fetchExchangeQuote(parseFloat(solAmountValue), value.trim());
            }, 500);
        }
    };


    const fetchExchangeQuote = async (solAmount: number, tokenMintAddress: string) => {
        if (!connected || !publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        try {

            const outputMint = new PublicKey(tokenMintAddress);

            setIsLoadingQuote(true);

            const slippageBps = Math.floor(form.getValues("slippage") * 100);

            const quoteResult = await getQuote(
                outputMint,
                solAmount,
                SOL_MINT,
                slippageBps
            );

            if (quoteResult) {
                setQuote({
                    outputAmount: quoteResult.outputAmount,
                    exchangeRate: quoteResult.exchangeRate,
                    priceImpactPct: quoteResult.priceImpactPct,
                    estimatedFee: 0.005,
                });
            } else {
                setQuote(null);
                toast.error("Unable to get quote for this token");
            }
        } catch (error: any) {
            console.error("Error fetching quote:", error);
            setQuote(null);

            if (error.message.includes("Invalid")) {
                toast.error("Invalid token mint address");
            } else {
                toast.error("Failed to get quote", {
                    description: error?.message || "Unable to fetch quote from Jupiter"
                });
            }
        } finally {
            setIsLoadingQuote(false);
        }
    };


    const onSubmit = async (values: SolExchangeFormValues) => {
        if (!connected || !publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        if (!values.solAmount || values.solAmount <= 0) {
            toast.error("Invalid SOL amount");
            return;
        }

        if (values.solAmount > solBalance - 0.05) {
            toast.error("Insufficient SOL balance", {
                description: "Keep at least 0.05 SOL for transaction fees"
            });
            return;
        }

        try {
            setIsSubmitting(true);

            const outputMint = new PublicKey(values.customTokenMint.trim());
            const slippageBps = Math.floor(values.slippage * 100);

            console.log("=== SOL Exchange Transaction ===");
            console.log("SOL Amount:", values.solAmount);
            console.log("Output Token:", outputMint.toString());
            console.log("Slippage:", slippageBps, "bps");
            console.log("Wallet:", publicKey.toString());

            const result = await executeTrade(
                outputMint,
                values.solAmount,
                SOL_MINT,
                slippageBps
            );

            if (result?.success && result?.txid) {
                toast.success("Exchange successful!", {
                    description: `Transaction: ${result.txid}`
                });


                if (onExchange) {
                    await onExchange({
                        ...values,
                        signature: result.txid
                    });
                }


                setSolAmountValue("");
                setCustomTokenMintValue("");
                form.setValue("solAmount", undefined);
                form.setValue("customTokenMint", "");
                setQuote(null);


                await fetchSolBalance();
            } else {
                throw new Error("Transaction failed");
            }
        } catch (error: any) {
            console.error("Exchange error:", error);
            toast.error("Exchange failed", {
                description: error.message || "Transaction failed"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>SOL → Custom Token Exchange</span>
                    <Info className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit(onSubmit)(e);
                        }}
                        className="space-y-6"
                    >
                        <FormField
                            control={form.control}
                            name="solAmount"
                            render={({ field }) => (
                                <FormItem className="bg-secondary/50 rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <FormLabel>SOL Amount</FormLabel>
                                        {connected && (
                                            <div className="flex items-center text-xs text-muted-foreground space-x-2">
                                                <span>
                                                    Balance: {isLoadingBalance ? (
                                                        <Loader2 className="h-3 w-3 animate-spin inline" />
                                                    ) : (
                                                        solBalance.toLocaleString(undefined, {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 6,
                                                        })
                                                    )} SOL
                                                </span>
                                                {solBalance > 0 && (
                                                    <span
                                                        className="cursor-pointer text-primary hover:underline"
                                                        onClick={handleUseMax}
                                                    >
                                                        MAX
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0.0"
                                                step="any"
                                                min="0.01"
                                                value={solAmountValue}
                                                onChange={(e) => handleSolAmountChange(e.target.value)}
                                                disabled={!connected}
                                                className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                                            />
                                        </FormControl>
                                        <div className="min-w-[80px] bg-background rounded px-3 py-2 border">
                                            <div className="flex items-center">
                                                <img
                                                    src="/crypto-logos/solana-logo.svg"
                                                    alt="SOL"
                                                    className="w-5 h-5 mr-2 rounded-full"
                                                />
                                                <span className="font-medium">SOL</span>
                                            </div>
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="customTokenMint"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom Token Mint Address</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter Solana token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)"
                                            value={customTokenMintValue}
                                            onChange={(e) => handleCustomTokenMintChange(e.target.value)}
                                            disabled={!connected}
                                            className="font-mono text-sm"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {quote && (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>You will receive:</span>
                                            <span className="font-medium">{quote.outputAmount} tokens</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Exchange rate:</span>
                                            <span className="text-sm">1 SOL ≈ {quote.exchangeRate.toLocaleString()} tokens</span>
                                        </div>
                                        {quote.priceImpactPct > 1 && (
                                            <div className="flex justify-between">
                                                <span>Price impact:</span>
                                                <span className={quote.priceImpactPct > 3 ? "text-red-500" : "text-yellow-500"}>
                                                    {quote.priceImpactPct.toFixed(2)}%
                                                </span>
                                            </div>
                                        )}
                                        {showEstimatedFee && (
                                            <div className="flex justify-between">
                                                <span>Estimated fee:</span>
                                                <span className="text-sm">{quote.estimatedFee} SOL</span>
                                            </div>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {isLoadingQuote && (
                            <Alert>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertDescription>
                                    Getting quote for your exchange...
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="pt-2">
                            {!connected ? (
                                <ConnectWalletButton className="w-full" />
                            ) : (
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={
                                        isSubmitting ||
                                        !solAmountValue ||
                                        !customTokenMintValue ||
                                        parseFloat(solAmountValue) <= 0 ||
                                        isLoadingQuote ||
                                        !quote
                                    }
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Exchanging...
                                        </>
                                    ) : (
                                        "Exchange SOL"
                                    )}
                                </Button>
                            )}
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                <strong>Important:</strong> Make sure the token mint address is correct.
                                This exchange will swap your SOL for the specified custom token.
                                Always verify the token contract before proceeding.
                            </AlertDescription>
                        </Alert>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}