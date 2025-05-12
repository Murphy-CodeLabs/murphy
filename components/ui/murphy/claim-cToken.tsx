"use client";

import React, { useContext } from "react";
import {
    bn,
    buildAndSignTx,
    sendAndConfirmTx,
    dedupeSigner,
    Rpc,
    createRpc,
  } from "@lightprotocol/stateless.js";
  import { ComputeBudgetProgram, Keypair, PublicKey, Transaction } from "@solana/web3.js";
  import {
    CompressedTokenProgram,
    getTokenPoolInfos,
    selectMinCompressedTokenAccountsForTransfer,
    selectTokenPoolInfosForDecompression,
  } from "@lightprotocol/compressed-token";
  import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
  import bs58 from "bs58";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";
  import { useWallet, useConnection } from "@solana/wallet-adapter-react";
  import { toast } from "sonner";

  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { Loader2 } from "lucide-react";
  import { Switch } from "@/components/ui/switch";
  import { Label } from "@/components/ui/label";
  import { ConnectWalletButton } from "./connect-wallet-button";
  import { ModalContext } from "@/components/providers/wallet-provider";
  import { QrScannerComponent } from "./QrScannerComponent";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Alert, AlertDescription } from "@/components/ui/alert";
  
  // Form schema
  const formSchema = z.object({
    mintAddress: z.string().min(1, "Mint address is required"),
    amount: z.number().min(1, "Amount must be greater than 0"),
  });

  type FormValues = z.infer<typeof formSchema>;

  // Add this data type at the top of the file or just before the component
  interface QrResult {
    getText(): string;
  }

  export function ClaimTokenForm({ className }: { className?: string }) {
    // Use hook from wallet adapter
    const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
    const { connection } = useConnection();
    const { endpoint } = useContext(ModalContext);
    
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [currentStage, setCurrentStage] = React.useState<'input' | 'success' | 'error'>('input');
    const [error, setError] = React.useState("");
    const [result, setResult] = React.useState<{
      txId: string;
      ata: string;
    } | null>(null);
    const [showScanner, setShowScanner] = React.useState(false);
    const [isMainnet, setIsMainnet] = React.useState(true);

    const form = useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        mintAddress: "",
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
        const mint = new PublicKey(values.mintAddress);
        const amount = values.amount;

        // 1. Find Associated Token Account address
        const ataAddress = await getAssociatedTokenAddress(mint, publicKey);

        // 2. Check if ATA already exists
        const ataInfo = await connection.getAccountInfo(ataAddress);

        // 3. If not, create ATA with a separate transaction
        if (!ataInfo) {
          console.log("Creating new Associated Token Account...");
          const createAtaTx = new Transaction();
          createAtaTx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              ataAddress, // ATA address
              publicKey, // owner
              mint // token mint
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

        // 4. Get compressed token accounts
        const compressedTokenAccounts =
          await connection.getCompressedTokenAccountsByOwner(publicKey, {
            mint,
          });

        if (!compressedTokenAccounts.items.length) {
          throw new Error("No compressed tokens found in account");
        }

        // 5. Select compressed token account for transfer
        const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
          compressedTokenAccounts.items,
          bn(amount)
        );

        // 6. Get validity proof
        const proof = await connection.getValidityProof(
          inputAccounts.map((account) => account.compressedAccount.hash)
        );

        // 7. Get token pool information
        const tokenPoolInfos = await getTokenPoolInfos(connection, mint);

        // 8. Select token pool info for decompression
        const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
          tokenPoolInfos,
          amount
        );

        // 9. Build instruction
        const ix = await CompressedTokenProgram.decompress({
          payer: publicKey,
          inputCompressedTokenAccounts: inputAccounts,
          toAddress: ataAddress,
          amount,
          tokenPoolInfos: selectedTokenPoolInfos,
          recentInputStateRootIndices: proof.rootIndices,
          recentValidityProof: proof.compressedProof,
        });

        // 10. Sign and send transaction using connected wallet
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        
        // Create transaction and add instructions
        const transaction = new Transaction();
        transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
        transaction.add(ix);
        
        // Set blockhash and feePayer information
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;
        
        console.log("Signing transaction...");
        
        try {
          // Sign transaction using connected wallet
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
            txId,
            ata: ataAddress.toBase58()
          });
          setCurrentStage('success');
          
          toast.success("Decompression successful!", {
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

    // Add function to handle successful QR scan
    const handleScan = (data: string) => {
      try {
        console.log("QR data received:", data);

        // Try parsing JSON data
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // If not JSON, check if it's simple text
          if (data.includes("mintAddress")) {
            // Extract information from text string
            const mintMatch = data.match(/mintAddress[=:]\s*["']?([^"',}&\s]+)/i);
            const amountMatch = data.match(/amount[=:]\s*["']?([0-9]+)/i);
            
            if (mintMatch) {
              parsedData = {
                mintAddress: mintMatch[1],
                amount: amountMatch ? parseInt(amountMatch[1]) : 100
              };
            }
          }
        }

        // Check if data is compressed token data
        if (parsedData && parsedData.mintAddress) {
          // Check Solana address format
          try {
            new PublicKey(parsedData.mintAddress);
          } catch (e) {
            toast.error("Invalid token address");
            return;
          }

          // Check type to confirm this is a compressed token QR code
          if (parsedData.type === "compressed-token-claim" || !parsedData.type) {
            form.setValue("mintAddress", parsedData.mintAddress);
            if (parsedData.amount && !isNaN(Number(parsedData.amount))) {
              form.setValue("amount", Number(parsedData.amount));
            }
            
            setShowScanner(false);
            toast.success("QR code scanned successfully", {
              description: `Token: ${parsedData.mintAddress.slice(0, 6)}...${parsedData.mintAddress.slice(-4)}`
            });
          } else {
            toast.error("QR code is not a compressed token");
          }
        } else {
          toast.error("QR code does not contain valid token information");
        }
      } catch (error) {
        console.error("QR processing error:", error);
        toast.error("Unable to process QR code");
      }
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
                  <td className="py-3 px-4 text-sm">Token Account</td>
                  <td className="py-3 px-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span>{truncateText(result?.ata || "")}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result?.ata || "")}
                      >
                        Copy
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getSolscanUrl('account', result?.ata || ""), '_blank')}
                    >
                      View
                    </Button>
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">Amount</td>
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
            Claim More Tokens
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              const data = {
                mintAddress: form.getValues("mintAddress"),
                amount: form.getValues("amount"),
                ata: result?.ata,
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
                  disabled={false}
                  onCheckedChange={setIsMainnet}
                />
                <span className="text-sm text-muted-foreground">Mainnet</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select the network you want to use to process tokens
            </p>
          </div>

          <div className="flex justify-end mb-2">
            <Dialog open={showScanner} onOpenChange={setShowScanner}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Scan QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan QR Code</DialogTitle>
                </DialogHeader>
                <div className="w-full py-2">
                  <QrScannerComponent
                    onScan={handleScan}
                    stopScanning={!showScanner}
                  />
                </div>
                <div className="bg-muted p-3 rounded-md text-sm">
                  Bring the QR code into the camera's view to automatically fill in the token information
                </div>
                
                <Alert className="mt-2 bg-yellow-500/10 text-yellow-600 border-yellow-200">
                  <AlertDescription className="text-xs">
                    Note: After a successful scan, you still need to press the "Decompress Tokens" button to confirm
                  </AlertDescription>
                </Alert>
              </DialogContent>
            </Dialog>
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
            name="amount"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Token Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter the amount of tokens to decompress"
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
                    Decompressing Tokens...
                  </>
                ) : (
                  "Decompress Tokens"
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
          <CardTitle>Decompress Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStageContent()}
        </CardContent>
      </Card>
    );
  }