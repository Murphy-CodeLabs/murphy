"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDown, Loader2, RefreshCw, Settings } from "lucide-react";
import {
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  clusterApiUrl
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
import { ConnectWalletButton } from "./connect-wallet-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ModalContext } from "@/components/providers/wallet-provider";

// Type for stake form values
type StakeFormValues = {
  amountToStake: number | undefined;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  // Validate amount
  if (data.amountToStake === undefined || data.amountToStake === null || data.amountToStake === "") {
    errors.amountToStake = {
      type: "required",
      message: "Amount is required",
    };
  } else if (Number(data.amountToStake) <= 0) {
    errors.amountToStake = {
      type: "min",
      message: "Amount must be greater than 0",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function StakeForm() {
  // State variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [solBalance, setSolBalance] = useState("--");
  const [amountToStake, setAmountToStake] = useState<string>("");
  const [transactionSignature, setTransactionSignature] = useState('');
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error
  const [error, setError] = useState('');
  
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { endpoint } = useContext(ModalContext);
  
  // Form setup with react-hook-form
  const form = useForm<StakeFormValues>({
    defaultValues: {
      amountToStake: undefined,
    },
    mode: "onSubmit",  // Only validate on submit
    resolver: customResolver,  // Use our custom resolver
  });

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

  // Fetch SOL balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setSolBalance('--');
    }
  }, [connected, publicKey, connection]);

  // Fetch SOL balance
  const fetchBalance = async () => {
    if (!connected || !publicKey || !connection) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await connection.getBalance(publicKey);
      const solBalanceFormatted = (balance / LAMPORTS_PER_SOL).toFixed(6);
      setSolBalance(solBalanceFormatted);
      console.log(`fetchBalance: SOL balance = ${solBalanceFormatted}`);
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      setSolBalance('0');
      toast.error('Unable to fetch SOL balance', {
        description: 'Please check your wallet connection',
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Handle use max amount
  const handleUseMax = (e?: React.MouseEvent) => {
    // Prevent form submit event if there is an event
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (solBalance !== '--' && parseFloat(solBalance) > 0) {
      // Keep 0.05 SOL for transaction fees
      const maxAmount = Math.max(parseFloat(solBalance) - 0.05, 0);
      setAmountToStake(maxAmount.toString());
      form.setValue("amountToStake", maxAmount, {
        shouldValidate: false,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  // Handle amount input change with debounce
  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmountToStake(value);
      const parsedValue = value === "" ? undefined : parseFloat(value);
      form.setValue("amountToStake", parsedValue, {
        shouldValidate: false  // Prevent validation
      });
    }
  };

  // Handle form submission - Stake SOL with Solayer
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

    if (!values.amountToStake || values.amountToStake <= 0) {
      toast.error("Invalid amount");
      return;
    }

    // Check SOL balance
    const inputAmount = values.amountToStake;
    if (solBalance !== '--' && parseFloat(solBalance) < inputAmount) {
      // Allow very small discrepancy for SOL (to account for transaction fees)
      if (inputAmount - parseFloat(solBalance) < 0.001) {
        console.log(`Detected small discrepancy in SOL balance, proceeding`);
      } else {
        toast.error("Insufficient SOL balance");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');
      setCurrentStage('confirming');
      
      // Log transaction information for debugging
      console.log("=== Transaction Information ===");
      console.log("Endpoint:", endpoint);
      console.log("Amount:", values.amountToStake);
      console.log("Wallet connected:", connected ? "Yes" : "No");
      console.log("PublicKey:", publicKey.toString());
      console.log("========================");
      
      // Use internal API route to avoid CORS error
      const response = await fetch(
        `/api/murphis/solayer/stake?amount=${parseFloat(amountToStake)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account: publicKey.toBase58(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Stake request failed");
      }

      const data = await response.json();

      // Decode transaction from base64
      const txBuffer = Buffer.from(data.transaction, "base64");
      
      // Create VersionedTransaction from received data
      const tx = VersionedTransaction.deserialize(txBuffer);
      
      // Update to latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      tx.message.recentBlockhash = blockhash;
      
      // Sign transaction with user's wallet
      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing");
      }
      
      console.log("Signing transaction...");
      
      try {
        const signedTx = await signTransaction(tx);
        
        console.log("Sending transaction...");
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        
        console.log("Transaction sent, signature:", signature);
        
        // Wait for transaction confirmation
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        
        setTransactionSignature(signature);
        setCurrentStage('success');
        
        toast.success("Staking successful!", {
          description: `Transaction: ${signature}`
        });
        
        // Reset form
        setAmountToStake("");
        form.setValue("amountToStake", undefined, {
          shouldValidate: false
        });
        
        // Refresh balance after successful stake
        fetchBalance();
      } catch (signError: any) {
        console.error('Error signing transaction:', signError);
        
        // Analyze user-canceled transaction error
        if (signError.message && signError.message.includes("canceled")) {
          toast.error("Transaction canceled", {
            description: "You canceled the transaction"
          });
          setError("You canceled the transaction");
        } else {
          toast.error("Error signing transaction", {
            description: signError.message || "Unable to sign transaction"
          });
          setError(`Error signing transaction: ${signError.message}`);
        }
        
        setCurrentStage('error');
        throw signError; // Re-throw to handle in finally
      }
      
    } catch (error: any) {
      console.error('Staking error:', error);
      
      // Signing error already handled above, no need to show toast again
      if (!error.message?.includes("canceled")) {
        setError(`Staking failed: ${error.message}`);
        toast.error("Transaction failed", {
          description: error.message || "Unable to complete transaction"
        });
      }
      
      setCurrentStage('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold">Staking Successful!</h3>
      <p className="text-muted-foreground">Your SOL has been successfully staked with Solayer.</p>
      {transactionSignature && (
        <a 
          href={`https://explorer.solana.com/tx/${transactionSignature}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View transaction
        </a>
      )}
      <Button 
        onClick={() => {
          setCurrentStage('input');
          setAmountToStake('');
        }}
        className="w-full"
      >
        Stake more SOL
      </Button>
    </div>
  );

  // Render error view
  const renderError = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-xl font-bold">Staking Failed</h3>
      <p className="text-muted-foreground">{error || 'An error occurred while staking your SOL.'}</p>
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

  // Render confirmation view
  const renderConfirming = () => (
    <div className="space-y-4 p-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Confirming Transaction</h3>
      <p className="text-muted-foreground">Please wait while your staking transaction is being processed...</p>
    </div>
  );

  // Render input form
  const renderInputForm = () => (
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
        <FormField
          control={form.control}
          name="amountToStake"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <FormLabel>Stake Amount</FormLabel>
                <div className="flex items-center text-xs text-muted-foreground space-x-1">
                  <span>
                    Balance: {isLoadingBalance ? '...' : solBalance}
                  </span>
                  {connected && solBalance !== '--' && parseFloat(solBalance) > 0 && (
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
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0.0"
                    value={amountToStake}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!connected || isSubmitting}
                    className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <div className="min-w-[140px] h-auto bg-background flex items-center justify-center p-2 rounded-md">
                  <div className="flex items-center">
                    <img
                      src="/crypto-logos/solana-logo.svg"
                      alt="SOL"
                      className="w-5 h-5 mr-2 rounded-full"
                      onError={(e) => {
                        console.log("Error loading SOL logo, using fallback");
                        e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNpcmNsZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4="; 
                      }}
                    />
                    SOL
                  </div>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Staking Platform</span>
              <span className="font-medium">Solayer</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Reward Token</span>
              <span className="font-medium">sSOL</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Estimated APY</span>
              <span className="font-medium">9.26%</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Fee</span>
              <span className="font-medium">0%</span>
            </div>
          </div>
          
          <div className="pt-2">
            {!connected ? (
              <ConnectWalletButton className="w-full" />
            ) : (
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isSubmitting ||
                  !amountToStake ||
                  parseFloat(amountToStake) <= 0 || 
                  (solBalance !== '--' && parseFloat(solBalance) < parseFloat(amountToStake) && 
                   !(parseFloat(amountToStake) - parseFloat(solBalance) < 0.001))
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Staking...
                  </>
                ) : (
                  (solBalance !== '--' && parseFloat(solBalance) < parseFloat(amountToStake) && 
                  !(parseFloat(amountToStake) - parseFloat(solBalance) < 0.001))
                    ? 'Insufficient SOL balance'
                    : 'Stake SOL'
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  // Render based on current stage
  const renderStageContent = () => {
    switch (currentStage) {
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      case 'confirming':
        return renderConfirming();
      default:
        return renderInputForm();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stake SOL</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export default StakeForm;