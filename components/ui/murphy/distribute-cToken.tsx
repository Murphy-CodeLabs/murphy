"use client";

import React, { useContext } from "react";
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  calculateComputeUnitPrice,
  createRpc,
  selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConnectWalletButton } from "./connect-wallet-button";
import { ModalContext } from "@/components/providers/wallet-provider";

// Form schema - no need for privateKey anymore
const formSchema = z.object({
  mintAddress: z.string().min(1, "Mint address is required"),
  recipients: z.string().min(1, "Recipient list is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
});

type FormValues = z.infer<typeof formSchema>;

export function DistributeTokenForm({ className }: { className?: string }) {
  // Use hook from wallet adapter
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { endpoint, isMainnet } = useContext(ModalContext);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStage, setCurrentStage] = React.useState<'input' | 'success' | 'error'>('input');
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    txId: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mintAddress: "",
      recipients: "",
      amount: 100,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Check if the wallet is connected
      if (!connected || !publicKey || !signTransaction) {
        toast.error("Please connect your wallet first");
        return;
      }

      setIsSubmitting(true);
      setError("");
      setCurrentStage('input');

      const rpcEndpoint = isMainnet 
        ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
        : process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET;

      if (!rpcEndpoint) {
        throw new Error("RPC endpoint is not configured");
      }
      
      // Create RPC connection
      const connection = createRpc(rpcEndpoint);

      // Convert mint address
      const mintAddress = new PublicKey(values.mintAddress);
      
      // Convert recipient list
      const airDropAddresses = values.recipients.split(',')
        .map(address => address.trim())
        .filter(address => address.length > 0)
        .map(address => new PublicKey(address));

      if (airDropAddresses.length === 0) {
        throw new Error("No valid recipient addresses");
      }

      // 1. Find Associated Token Account address
      const ataAddress = await getAssociatedTokenAddress(mintAddress, publicKey);

      // 2. Check if ATA already exists
      let ataExists = false;
      try {
        await getAccount(connection, ataAddress);
        ataExists = true;
      } catch (e) {
        // ATA doesn't exist
        ataExists = false;
      }

      // 3. If not, create ATA with a separate transaction
      if (!ataExists) {
        console.log("Creating new Associated Token Account...");
        const createAtaTx = new Transaction();
        createAtaTx.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            ataAddress, // ATA address
            publicKey, // owner
            mintAddress // token mint
          )
        );
        
        createAtaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        createAtaTx.feePayer = publicKey;
        
        const signedCreateAtaTx = await signTransaction(createAtaTx);
        const createAtaTxId = await connection.sendRawTransaction(signedCreateAtaTx.serialize());
        await connection.confirmTransaction({
          signature: createAtaTxId,
          blockhash: (await connection.getLatestBlockhash()).blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        });
        console.log("ATA created with tx ID:", createAtaTxId);
      }

      // Select new tree for each transaction
  const activeStateTrees = await connection.getStateTreeInfos();
  const treeInfo = selectStateTreeInfo(activeStateTrees);

      // Select token pool info
  const infos = await getTokenPoolInfos(connection, mintAddress);
  const info = selectTokenPoolInfo(infos);

      const amount = bn(values.amount);

  const instructions = [];
      // Adjust compute units based on the number of recipients
      const computeUnits = 120000 + (airDropAddresses.length > 1 ? 10000 * (airDropAddresses.length - 1) : 0);
      
  instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: calculateComputeUnitPrice(20000, computeUnits),
    })
  );

  const compressInstruction = await CompressedTokenProgram.compress({
        payer: publicKey,
        owner: publicKey,
        source: ataAddress,
    toAddress: airDropAddresses,
    amount: airDropAddresses.map(() => amount),
    mint: mintAddress,
    tokenPoolInfo: info,
    outputStateTreeInfo: treeInfo,
  });
  instructions.push(compressInstruction);

      // Sign and send transaction with connected wallet
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Create transaction and add instructions
      const transaction = new Transaction();
      instructions.forEach(instruction => transaction.add(instruction));
      
      // Set blockhash and feePayer information
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      console.log("Signing transaction...");
      
      try {
        // Sign transaction with connected wallet
        const signedTx = await signTransaction(transaction);
        
        console.log("Sending transaction...");
        const txId = await connection.sendRawTransaction(signedTx.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction({
          signature: txId,
          blockhash,
          lastValidBlockHeight,
        });
        
        console.log("Transaction confirmed:", txId);
        
        setResult({
          txId
        });
        setCurrentStage('success');
        
        toast.success("Distribution successful!", {
          description: `Transaction: ${txId}`
        });
      } catch (signError: any) {
        console.error('Error signing transaction:', signError);
        
        // Analyze error if user canceled the transaction
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
        throw signError;
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setCurrentStage('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setResult(null);
    setCurrentStage("input");
    setError("");
  };

  // Add helper function to handle long text
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  // Add helper function to copy text
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Add helper function to create Solscan link
  const getSolscanUrl = (type: 'tx' | 'token' | 'account', id: string) => {
    const cluster = isMainnet ? '' : '?cluster=devnet';
    return `https://solscan.io/${type}/${id}${cluster}`;
  };

  // Render success view
  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="bg-secondary/50 rounded-lg p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Field</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Value</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Token Address</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(form.getValues("mintAddress") || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(form.getValues("mintAddress"))}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('token', form.getValues("mintAddress")), '_blank')}
                  >
                    View
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Amount Per Recipient</td>
                <td className="py-3 px-4 text-sm font-medium">{form.getValues("amount")}</td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(form.getValues("amount").toString())}
                  >
                    Copy
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Transaction ID</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(result?.txId || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result?.txId || "")}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('tx', result?.txId || ""), '_blank')}
                  >
                    View
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={resetForm} className="flex-1">
          Distribute More Tokens
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              Generate QR Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code to Claim Token</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
              <QRCode
                value={JSON.stringify({
                  mintAddress: form.getValues("mintAddress"),
                  amount: form.getValues("amount"),
                  type: "compressed-token-claim",
                  timestamp: new Date().toISOString(),
                })}
                size={250}
                level="H"
                fgColor="#000"
                bgColor="#fff"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Người nhận có thể quét mã QR này để nhận token
              </p>
              <div className="flex flex-col items-center mt-2 w-full">
                <p className="text-xs text-muted-foreground">Token: {truncateText(form.getValues("mintAddress"), 10)}</p>
                <p className="text-xs text-muted-foreground">Số lượng: {form.getValues("amount")}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => {
            const data = {
              mintAddress: form.getValues("mintAddress"),
              amount: form.getValues("amount"),
              recipients: form.getValues("recipients").split(',').map(addr => addr.trim()),
              txId: result?.txId,
            };
            copyToClipboard(JSON.stringify(data, null, 2));
          }}
        >
          Copy All Data
        </Button>
      </div>
    </div>
  );

  // Render error view
  const renderError = () => (
    <div className="space-y-4">
      <div className="bg-destructive/10 text-destructive rounded-lg p-4">
        {error}
      </div>
      <Button onClick={resetForm} className="w-full">
        Try Again
      </Button>
    </div>
  );

  // Render input form
  const renderInputForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-secondary/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="network-switch">Network</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Devnet</span>
              <Switch
                id="network-switch"
                checked={isMainnet}
                disabled={true} // Use value from context
                className="cursor-not-allowed"
              />
              <span className="text-sm text-muted-foreground">Mainnet</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Network selection is controlled by your wallet settings
          </p>
        </div>

        <FormField
          control={form.control}
          name="mintAddress"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Token Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter token address (e.g., BJA...)"
                  {...field}
                  disabled={isSubmitting || !connected}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipients"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Recipients</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter addresses, separated by commas (e.g., BJA...,EDF...)"
                  {...field}
                  disabled={isSubmitting || !connected}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Token Amount (per recipient)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter token amount"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isSubmitting || !connected}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
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
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Distributing Tokens...
                </>
              ) : (
                "Distribute Tokens"
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
      default:
        return renderInputForm();
    }
  };

  return (
    <Card className={className || "w-full"}>
      <CardHeader>
        <CardTitle>Compressed Token Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}
