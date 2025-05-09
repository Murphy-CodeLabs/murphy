"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Signer
} from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { 
  createMint, 
  createTokenPool,
  compress,
} from "@lightprotocol/compressed-token";
import { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { createRpc } from "@lightprotocol/stateless.js";
import bs58 from "bs58";

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

// Type for mint form values
type MintFormValues = {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  supply: number;
};

// Create custom resolver for form
const customResolver = (data: any) => {
  const errors: any = {};

  if (!data.tokenName) {
    errors.tokenName = {
      type: "required",
      message: "Token name is required",
    };
  }

  if (!data.tokenSymbol) {
    errors.tokenSymbol = {
      type: "required",
      message: "Token symbol is required",
    };
  }

  if (data.decimals === undefined || data.decimals === null || data.decimals === "") {
    errors.decimals = {
      type: "required",
      message: "Decimals are required",
    };
  } else if (Number(data.decimals) < 0 || Number(data.decimals) > 9) {
    errors.decimals = {
      type: "range",
      message: "Decimals must be between 0 and 9",
    };
  }

  if (data.supply === undefined || data.supply === null || data.supply === "") {
    errors.supply = {
      type: "required",
      message: "Supply is required",
    };
  } else if (Number(data.supply) <= 0) {
    errors.supply = {
      type: "min",
      message: "Supply must be greater than 0",
    };
  }

  return {
    values: Object.keys(errors).length === 0 ? data : {},
    errors,
  };
};

export function MintTokenForm({ className }: { className?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState('input'); // input, confirming, success, error
  const [error, setError] = useState('');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [mintAddress, setMintAddress] = useState('');
  const [ataAddress, setAtaAddress] = useState('');
  
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // Form setup with react-hook-form
  const form = useForm<MintFormValues>({
    defaultValues: {
      tokenName: "",
      tokenSymbol: "",
      decimals: 9,
      supply: 1000000000, // Default 1 billion
    },
    mode: "onSubmit",
    resolver: customResolver,
  });

  // Adapter to convert signTransaction to Signer
  const createSignerAdapter = () => {
    const adapter = {
      publicKey: publicKey!,
      secretKey: Uint8Array.from([]), // Not actually used
      async signTransaction(tx: Transaction) {
        tx.feePayer = publicKey!;
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        return await signTransaction!(tx);
      }
    } as Signer;
    return adapter;
  };

  // Then use this adapter with APIs
  const signerAdapter = createSignerAdapter();

  // Handle form submission
  const onSubmit = async (values: MintFormValues) => {
    if (!connected || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    if (!signTransaction || !sendTransaction) {
      toast.error("Wallet does not support transaction signing");
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setCurrentStage('confirming');

      // Create RPC connection
      const lightConnection = createRpc(
        connection.rpcEndpoint,
        connection.rpcEndpoint,
        connection.rpcEndpoint
      );
      
      toast.message("Creating token...", {
        description: "Initializing transaction"
      });
      
      // Create a new mint keypair
      const mintKeypair = Keypair.generate();
      
      // Create mint (token) using compressed-token API
      const { mint: mintPubkey, transactionSignature: createMintTxId } = await createMint(
        lightConnection,
        signerAdapter,
        publicKey,
        values.decimals
      );
      
      // Create associated token account to store tokens
      const ata = await getOrCreateAssociatedTokenAccount(
        lightConnection,
        signerAdapter,
        mintPubkey,
        publicKey
      );
      
      // Mint tokens into user's associated token account
      const mintToTxId = await mintTo(
        lightConnection,
        signerAdapter,
        mintPubkey,
        ata.address,
        publicKey,
        values.supply * Math.pow(10, values.decimals)
      );
      
      // Compress the newly created tokens
      const compressedTokenTxId = await compress(
        lightConnection,
        signerAdapter,
        mintPubkey,
        values.supply * Math.pow(10, values.decimals) / 2,
        signerAdapter,
        ata.address,
        publicKey
      );
      
      // Save information
      setTransactionSignature(compressedTokenTxId);
      setMintAddress(mintPubkey.toString());
      setAtaAddress(ata.address.toString());
      setCurrentStage('success');
      
      toast.success("Compressed token created successfully!", {
        description: `Transaction: ${compressedTokenTxId}`
      });

      form.reset();
    } catch (error: any) {
      console.error('Error creating token:', error);
      
      // Check if user rejected the transaction
      if (error.message && error.message.includes("User rejected")) {
        setError("User rejected the transaction");
        toast.error("Transaction was canceled", {
          description: "You canceled the token creation transaction"
        });
      } else {
        setError(`Token creation failed: ${error.message}`);
        toast.error("Transaction failed", {
          description: error.message || "Unable to create token"
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
      <h3 className="text-xl font-bold">Token Created Successfully!</h3>
      <p className="text-muted-foreground">Your compressed token has been created.</p>
      {mintAddress && (
        <div className="p-2 bg-gray-50 rounded text-sm break-all">
          <span className="font-medium">Token Address:</span> {mintAddress}
        </div>
      )}
      {ataAddress && (
        <div className="p-2 bg-gray-50 rounded text-sm break-all mt-2">
          <span className="font-medium">Associated Token Account:</span> {ataAddress}
        </div>
      )}
      {transactionSignature && (
        <a 
          href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View Transaction
        </a>
      )}
      <Button 
        onClick={() => {
          setCurrentStage('input');
          form.reset();
        }}
        className="w-full"
      >
        Create Another Token
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
      <h3 className="text-xl font-bold">Token Creation Failed</h3>
      <p className="text-muted-foreground">{error || 'An error occurred while creating the token.'}</p>
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
      <div className="mx-auto flex h-20 w-20 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
      <h3 className="text-xl font-bold">Creating Token</h3>
      <p className="text-muted-foreground">Please confirm the transaction in your wallet...</p>
    </div>
  );

  // Render input form
  const renderInputForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tokenName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Name</FormLabel>
              <FormControl>
                <Input placeholder="My Token" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tokenSymbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Symbol</FormLabel>
              <FormControl>
                <Input placeholder="MTK" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="decimals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decimals</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0} 
                  max={9} 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
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
              <FormLabel>Initial Supply</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
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
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Token...
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
    <Card className={`w-full max-w-3xl mx-auto ${className || ""}`}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="h-5 w-5 mr-2" />
          Create Compressed Token
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}

export default MintTokenForm;