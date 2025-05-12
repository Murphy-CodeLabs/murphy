"use client";

import React from "react";
import { Keypair, PublicKey, Signer, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";
import { createTokenPool } from '@lightprotocol/compressed-token';
import { 
    createMetadataAccountV3,
    MPL_TOKEN_METADATA_PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
    mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import { createSignerFromKeypair, publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import bs58 from "bs58";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Form schema
const formSchema = z.object({
  privateKey: z.string().min(1, "Private key is required"),
  tokenName: z.string().min(1, "Token name is required"),
  tokenSymbol: z.string().min(1, "Token symbol is required").max(10, "Symbol must be less than 10 characters"),
  tokenDecimals: z.number().min(0).max(9, "Decimals must be between 0 and 9"),
  tokenSupply: z.number().min(1, "Supply must be greater than 0"),
  tokenDescription: z.string().optional(),
  tokenImage: z.string().optional(),
  tokenUri: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function MintTokenForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentStage, setCurrentStage] = React.useState<'input' | 'success' | 'error'>('input');
  const [error, setError] = React.useState("");
  const [isMainnet, setIsMainnet] = React.useState(false);
  const [result, setResult] = React.useState<{
    mint: string;
    poolTxId: string;
    ata: string;
    mintToTxId: string;
    metadataTxId: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privateKey: "",
      tokenName: "",
      tokenSymbol: "",
      tokenDecimals: 9,
      tokenSupply: 1000000000,
      tokenDescription: "",
      tokenImage: "",
      tokenUri: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue("tokenImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMetadata = async (
    connection: any,
    payer: Keypair,
    mint: PublicKey,
    metadata: {
      name: string;
      symbol: string;
      uri: string;
    }
  ) => {
    const metadataProgramId = new PublicKey(TOKEN_METADATA_PROGRAM_ID);
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        metadataProgramId.toBytes(),
        mint.toBytes(),
      ],
      metadataProgramId
    );

    // Create a Umi instance
    const umi = createUmi(connection.rpcEndpoint)
      .use(web3JsRpc(connection))
      .use(mplTokenMetadata());

    // Create a signeridentity from the payer Keypair
    const signerIdentity = createSignerFromKeypair(umi, { 
        publicKey: publicKey(payer.publicKey.toBase58()),
        secretKey: payer.secretKey 
    });
    umi.use({
        install(umiContext) {
            umiContext.identity = signerIdentity;
            umiContext.payer = signerIdentity;
        }
    });

    const umiMintPublicKey = publicKey(mint.toBase58());
    const umiMetadataPda = publicKey(metadataAddress.toBase58());
    const umiSystemProgram = publicKey(SystemProgram.programId.toBase58());

    const createMetadataInstructionBuilder = createMetadataAccountV3(
      umi, 
      {
        metadata: umiMetadataPda,
        mint: umiMintPublicKey,
        mintAuthority: signerIdentity, 
        payer: signerIdentity,          
        updateAuthority: signerIdentity, 
        systemProgram: umiSystemProgram,
        
          data: {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
      }
    );

    const { signature } = await createMetadataInstructionBuilder.sendAndConfirm(umi, {
        confirm: { commitment: 'confirmed' }
    });
    
    // The signature from Umi is a Uint8Array, convert to base58 string for consistency
    return bs58.encode(signature); 
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      setError("");

      const rpcEndpoint = isMainnet 
        ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL 
        : process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET;

      if (!rpcEndpoint) {
        throw new Error("RPC endpoint not configured");
      }

      // Create keypair from private key
      const PAYER = Keypair.fromSecretKey(bs58.decode(values.privateKey));
      
      // Create RPC connection
      const connection = createRpc(rpcEndpoint);

      // Create mint
    const mint = await createMint(
        connection,
        PAYER,
        PAYER.publicKey,
        null,
        values.tokenDecimals
      );

      // Create metadata
      const metadataTxId = await createMetadata(
        connection,
        PAYER,
        mint,
        {
          name: values.tokenName,
          symbol: values.tokenSymbol,
          uri: values.tokenUri || "",
        }
      );

      // Register mint for compression
    const poolTxId = await createTokenPool(connection, PAYER, mint);

      // Create associated token account
    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        PAYER.publicKey
    );

      // Calculate supply with decimals
      const supply = values.tokenSupply * Math.pow(10, values.tokenDecimals);

      // Mint tokens
    const mintToTxId = await mintTo(
        connection,
        PAYER,
        mint,
        ata.address,
        PAYER.publicKey,
        supply
      );

      setResult({
        mint: mint.toBase58(),
        poolTxId,
        ata: ata.address.toBase58(),
        mintToTxId,
        metadataTxId,
      });
      setCurrentStage('success');
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
    setImagePreview("");
  };

  // Add helper function to handle long text
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  // Add helper function to copy text
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
                <td className="py-3 px-4 text-sm">Token Name</td>
                <td className="py-3 px-4 text-sm font-medium">{form.getValues("tokenName")}</td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(form.getValues("tokenName"))}
                  >
                    Copy
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Token Symbol</td>
                <td className="py-3 px-4 text-sm font-medium">{form.getValues("tokenSymbol")}</td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(form.getValues("tokenSymbol"))}
                  >
                    Copy
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Mint Address</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(result?.mint || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result?.mint || "")}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('token', result?.mint || ""), '_blank')}
                  >
                    View
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Pool Transaction</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(result?.poolTxId || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result?.poolTxId || "")}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('tx', result?.poolTxId || ""), '_blank')}
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
                <td className="py-3 px-4 text-sm">Mint Transaction</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(result?.mintToTxId || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result?.mintToTxId || "")}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('tx', result?.mintToTxId || ""), '_blank')}
                  >
                    View
                  </Button>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-sm">Metadata Transaction</td>
                <td className="py-3 px-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <span>{truncateText(result?.metadataTxId || "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result?.metadataTxId || "")}
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getSolscanUrl('tx', result?.metadataTxId || ""), '_blank')}
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
          Create Another Token
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => {
            const data = {
              tokenName: form.getValues("tokenName"),
              tokenSymbol: form.getValues("tokenSymbol"),
              mintAddress: result?.mint,
              poolTxId: result?.poolTxId,
              tokenAccount: result?.ata,
              mintTxId: result?.mintToTxId,
              metadataTxId: result?.metadataTxId,
            };
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
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
                onCheckedChange={setIsMainnet}
                disabled={isSubmitting}
              />
              <span className="text-sm text-muted-foreground">Mainnet</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Select network to create token on
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tokenName"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Token Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter token name"
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
            name="tokenSymbol"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Token Symbol</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter token symbol"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tokenDecimals"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Decimals</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    placeholder="Enter decimals"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
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
            name="tokenSupply"
            render={({ field }) => (
              <FormItem className="bg-secondary/50 rounded-lg p-4">
                <FormLabel>Total Supply</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter total supply"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
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
          name="tokenDescription"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter token description"
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
          name="tokenImage"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Token Image</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                    className="hidden"
                    id="token-image"
                  />
                  <label
                    htmlFor="token-image"
                    className="flex items-center gap-2 cursor-pointer bg-background px-4 py-2 rounded-md hover:bg-accent"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Image</span>
                  </label>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tokenUri"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Token URI</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter token URI"
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
          name="privateKey"
          render={({ field }) => (
            <FormItem className="bg-secondary/50 rounded-lg p-4">
              <FormLabel>Private Key</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your private key"
                  {...field}
                  disabled={isSubmitting}
                  className="bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
              <div className="mt-2 px-2 py-1.5 text-sm bg-yellow-100/20 border border-yellow-400/50 text-yellow-600 dark:text-yellow-400 rounded-md">
                ⚠️ <strong>Warning:</strong> Do not use your main wallet containing large amounts of money. Create a new wallet or use a separate wallet for this purpose to ensure asset safety.
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating Token on {isMainnet ? "Mainnet" : "Devnet"}...
            </>
          ) : (
            `Create Token on ${isMainnet ? "Mainnet" : "Devnet"}`
          )}
        </Button>
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Compressed Token</CardTitle>
      </CardHeader>
      <CardContent>
        {renderStageContent()}
      </CardContent>
    </Card>
  );
}