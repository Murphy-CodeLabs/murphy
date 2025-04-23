import { VersionedTransaction, PublicKey, Connection } from "@solana/web3.js";
import {
  TOKENS,
  DEFAULT_OPTIONS,
  JUP_API,
  JUP_REFERRAL_ADDRESS,
} from "../../constants/swap/jupiter-constants";
import { getMint, getAccount, getAssociatedTokenAddress, TokenAccountNotFoundError, TokenInvalidAccountOwnerError } from "@solana/spl-token";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import { config } from "../../config/swap";
import { useContext } from "react";
import { ModalContext } from "@/components/providers/wallet-provider";

/**
 * Interface for quote result from Jupiter
 */
export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  amount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: number;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
  outAmount: string;
  outAmountWithSlippage?: string;
}

/**
 * Get swap quote from Jupiter API
 * @param inputMint Mint address of input token
 * @param outputMint Mint address of output token
 * @param amount Amount of input token (scaled by decimals)
 * @param slippageBps Maximum slippage tolerance (basis points)
 * @returns Quote result
 */
export async function fetchQuote(
  outputMint: PublicKey,
  amount: number | string,
  inputMint: PublicKey,
  slippageBps: number = DEFAULT_OPTIONS.SLIPPAGE_BPS,
  useDynamicSlippage: boolean = false
): Promise<any> {
  try {
    // Convert amount to string to avoid issues with large numbers
    const amountStr = amount.toString();
    
    console.log(`fetchQuote: inputMint=${inputMint.toString()}, outputMint=${outputMint.toString()}, amount=${amountStr}`);
    
    // Validate parameters
    if (!inputMint || !outputMint || !amount || parseFloat(amountStr) <= 0) {
      throw new Error("Invalid quote parameters");
    }
    
    // Check if input token is native SOL
    const isNativeSol = inputMint.equals(TOKENS.SOL);
    
    const apiUrl = `${JUP_API}/quote?` +
      `inputMint=${isNativeSol ? TOKENS.SOL.toString() : inputMint.toString()}` +
      `&outputMint=${outputMint.toString()}` +
      `&amount=${amountStr}` +
      `&slippageBps=${slippageBps}` +
      `&minimizeSlippage=false` +
      `&onlyDirectRoutes=false` +
      `&maxAccounts=64` +
      `&swapMode=ExactIn`;
    
    console.log(`Sending API request: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors',
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jupiter API error (${response.status}): ${errorText}`);
      
      if (response.status === 400) {
        throw new Error(`Unable to get quote: Invalid token amount or insufficient liquidity (${response.status})`);
      } else if (response.status === 429) {
        throw new Error("Too many requests, please try again later");
      } else {
        throw new Error(`API error: ${response.status} - ${errorText || 'No error information'}`);
      }
    }
    
    const quoteResponse = await response.json();
    
    // Check if data is valid
    if (!quoteResponse) {
      console.error("Invalid quote data:", quoteResponse);
      throw new Error("Invalid quote data");
    }
    
    console.log("Received quote:", quoteResponse);
    return quoteResponse;
  } catch (error: any) {
    console.error("Error fetching quote:", error);
    throw new Error(`Unable to fetch quote: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Scale token amount by decimals
 * @param amount Token amount (user input)
 * @param decimals Token decimals
 */
export function scaleAmount(amount: number, decimals: number): number {
  return amount * Math.pow(10, decimals);
}

/**
 * Format token amount from lamports to decimals
 * @param amount Token amount (in lamports)
 * @param decimals Token decimals
 */
export function formatAmount(amount: string | number, decimals: number): string {
  try {
    // Convert amount to string if it's a number
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    
    // Convert to BigInt for precise handling of large numbers
    const amountBigInt = BigInt(amountStr);
    
    // Check if amount is zero
    if (amountBigInt === BigInt(0)) {
      return '0';
    }
    
    const divisor = BigInt(10 ** decimals);
    
    // Calculate whole part
    const wholePart = amountBigInt / divisor;
    
    // Calculate fractional part
    const fractionalPart = amountBigInt % divisor;
    
    // Format fractional part
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    
    // For SOL and very small amounts, ensure we show enough decimal places
    if (decimals === 9 && wholePart === BigInt(0) && fractionalPart > BigInt(0)) {
      // Format with fixed decimal places for visibility
      const formattedNumber = Number(amountBigInt) / Number(divisor);
      console.log(`Formatting small SOL amount: ${formattedNumber}`);
      
      // Ensure we display at least 4 significant digits
      // For 0.006, this would show 0.006 (not rounded)
      return formattedNumber.toFixed(Math.max(3, decimals.toString().length));
    }
    
    // Normal formatting for larger amounts
    // Remove trailing zeros but keep at least one decimal for small values
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    // If whole part is 0 and fractional part exists but would be trimmed to empty,
    // keep at least 4 decimal places to show small values
    if (wholePart === BigInt(0) && fractionalPart > BigInt(0) && trimmedFractional === '') {
      // Find first non-zero digit
      let significantDigits = 0;
      for (let i = 0; i < fractionalStr.length; i++) {
        if (fractionalStr[i] !== '0') {
          significantDigits = i;
          break;
        }
      }
      // Show at least the first non-zero digit and a few more
      const digitsToShow = Math.min(significantDigits + 3, fractionalStr.length);
      fractionalStr = fractionalStr.substring(0, digitsToShow);
    } else {
      fractionalStr = trimmedFractional;
    }
    
    // If no fractional part, return only whole part
    if (fractionalStr === '') {
      return wholePart.toString();
    }
    
    // Combine whole and fractional parts
    return `${wholePart.toString()}.${fractionalStr}`;
  } catch (error) {
    console.error("Error formatting token amount:", error);
    return '0';
  }
}

// Hardcoded decimals for common tokens to avoid errors when querying blockchain
const TOKEN_DECIMALS: { [key: string]: number } = {
  // USDC
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,
  // USDT
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6,
  // SOL (wrapped)
  'So11111111111111111111111111111111111111112': 9,
  // BONK
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5,
  // jitoSOL
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 9,
  // bSOL
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 9,
  // mSOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 9,
  // USDS
  'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA': 6,
};

/**
 * Function to get the decimals of a token by mint address
 */
const getTokenDecimals = (mintAddress: string): number => {
  // Use value from TOKEN_DECIMALS if available
  if (TOKEN_DECIMALS[mintAddress]) {
    return TOKEN_DECIMALS[mintAddress];
  }
  
  // Default value if not found
  console.warn(`Decimals for token ${mintAddress} not found, using default 6`);
  return 6;
};

/**
 * Solana blockchain token swap function, using Jupiter API
 */
const trade = async (
  outputMint: PublicKey,
  inputAmount: number,
  inputMint: PublicKey = TOKENS.USDC,
  slippageBps: number = DEFAULT_OPTIONS.SLIPPAGE_BPS,
  walletPublicKey: string, 
  wallet: any,
  connectionEndpoint: string
) => {
  try {
    // Check if all necessary parameters are provided
    if (!connectionEndpoint) {
      throw new Error("Connection endpoint is not defined");
    }
    
    if (!walletPublicKey) {
      throw new Error("Wallet public key is not defined");
    }
    
    if (!wallet) {
      throw new Error("Wallet is not defined");
    }
    
    // Check if wallet has signTransaction function
    console.log("Checking wallet before trade:", {
      walletType: typeof wallet,
      hasSignTransaction: typeof wallet.signTransaction === 'function'
    });
    
    if (typeof wallet.signTransaction !== 'function') {
      throw new Error("Wallet does not have signTransaction method");
    }
    
    // Create connection to Solana blockchain
    const connection = new Connection(connectionEndpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });

    // Display transaction information
    console.log(`Executing swap with slippage ${slippageBps / 100}%`);
    console.log("Input token decimal:", getTokenDecimals(inputMint.toString()));
    console.log("Output token decimal:", getTokenDecimals(outputMint.toString()));
    
    // Adjust calculation of scaledAmount to only take the integer part
    const inputDecimals = getTokenDecimals(inputMint.toString());
    const scaledAmount = Math.floor(inputAmount * Math.pow(10, inputDecimals));
    console.log("Scaled amount:", scaledAmount);

    // Get quote from Jupiter API
    const quoteResponse = await fetch(
      `${JUP_API}/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${scaledAmount}&slippageBps=${slippageBps}`,
      {
        method: "GET",
      }
    );

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error(`Jupiter API error (${quoteResponse.status}): ${errorText}`);
      
      if (quoteResponse.status === 400) {
        throw new Error(`Unable to get quote: Invalid token amount or insufficient liquidity (${quoteResponse.status}) - ${errorText}`);
      } else if (quoteResponse.status === 429) {
        throw new Error("Too many requests, please try again later");
      } else {
        throw new Error(`API error: ${quoteResponse.status} - ${errorText || 'No error information'}`);
      }
    }

    const quote = await quoteResponse.json();
    console.log("Quote response:", quote);
    
    // Set up referral fee if available
    const jupiterReferralAccount = process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT;
    const referralAccount = jupiterReferralAccount ? new PublicKey(jupiterReferralAccount) : undefined;

    // Execute swap
    const swapResponse = await fetch(`${JUP_API}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: walletPublicKey,
        feeAccount: referralAccount?.toString(),
        wrapAndUnwrapSol: true,
      }),
    });

    if (!swapResponse.ok) {
      throw new Error(`Error executing swap: ${swapResponse.status} ${swapResponse.statusText}`);
    }

    const swapResult = await swapResponse.json();
    console.log("Swap result:", swapResult);

    // Decode transaction
    const swapTransaction = VersionedTransaction.deserialize(
      Buffer.from(swapResult.swapTransaction, "base64")
    );

    // Sign and send transaction
    try {
      console.log("Signing transaction with wallet:", typeof wallet.signTransaction);
      const signedTransaction = await wallet.signTransaction(swapTransaction);
      console.log("Transaction successfully signed");
      
      const txid = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );
      console.log("Transaction sent. Txid:", txid);
      
      console.log("Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction(txid, "confirmed");
      console.log("Transaction confirmed:", confirmation);
      
      return { success: true, txid };
    } catch (error: any) {
      console.error("Error signing or sending transaction:", error);
      throw new Error(`Error signing or sending transaction: ${error.message}`);
    }
  } catch (error: any) {
    console.error("Error during trade execution:", error);
    throw error;
  }
};

/**
 * Get token balance for a wallet address
 * @param walletAddress Wallet address to check balance for
 * @param tokenMint Token mint address to check
 * @param connection Solana connection
 * @returns Balance as a string with proper decimal formatting
 */
export async function getTokenBalance(
  walletAddress: PublicKey,
  tokenMint: PublicKey,
  connection: Connection
): Promise<string> {
  try {
    console.log(`Fetching balance for token: ${tokenMint.toString()} for wallet: ${walletAddress.toString()}`);
    
    // Check if token is SOL (native)
    if (tokenMint.equals(TOKENS.SOL)) {
      console.log("Getting native SOL balance");
      // For native SOL, get the account info directly
      const balance = await connection.getBalance(walletAddress);
      console.log(`Raw SOL balance: ${balance}`);
      const formattedBalance = formatAmount(balance.toString(), 9); // SOL has 9 decimals
      console.log(`Formatted SOL balance: ${formattedBalance}`);
      return formattedBalance;
    }

    // For SPL tokens, get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      walletAddress
    );
    console.log(`Token account address: ${tokenAccount.toString()}`);

    try {
      // Get token decimals first
      let decimals = 9; // Default
      
      // Use hardcoded decimals if available
      const mintString = tokenMint.toString();
      console.log(`Checking decimals for token: ${mintString}`);
      
      if (TOKEN_DECIMALS[mintString]) {
        decimals = TOKEN_DECIMALS[mintString];
        console.log(`Using hardcoded decimals: ${decimals}`);
      } else {
        // Otherwise query the mint
        try {
          console.log("Querying mint info for decimals");
          const mintInfo = await getMint(connection, tokenMint);
          decimals = mintInfo.decimals;
          console.log(`Got decimals from mint: ${decimals}`);
        } catch (e) {
          console.error("Error getting mint info:", e);
          console.log("Using default decimals (9)");
          // Keep default decimals
        }
      }
      
      // Now get account info for the token account
      console.log("Fetching token account info");
      const account = await getAccount(connection, tokenAccount);
      console.log(`Raw token amount: ${account.amount.toString()}`);
      
      // Format the balance with proper decimals
      const formattedBalance = formatAmount(account.amount.toString(), decimals);
      console.log(`Formatted token balance: ${formattedBalance} (using ${decimals} decimals)`);
      return formattedBalance;
    } catch (error) {
      // Check if error is due to account not found
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        console.log("Token account not found or invalid owner, balance is 0");
        // If account doesn't exist, balance is 0
        return "0";
      }
      console.error("Error getting token account:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return "0";
  }
}

// Hook to use in React components
export function useJupiterTrade() {
  const { endpoint } = useContext(ModalContext);
  const wallet = useWallet();
  const { publicKey } = wallet;

  /**
   * Get swap token quote
   */
  const getQuote = async (
    outputMint: PublicKey,
    inputAmount: number, // decimal number
    inputMint: PublicKey = TOKENS.USDC,
    slippageBps: number = DEFAULT_OPTIONS.SLIPPAGE_BPS
  ) => {
    try {
      if (!inputAmount || inputAmount <= 0) throw new Error("Invalid token amount");
      if (inputMint.equals(outputMint)) throw new Error("Input and output tokens must be different");
  
      // Get decimals for input
      let inputDecimals = TOKEN_DECIMALS[inputMint.toString()] ?? 9;
      // Scale inputAmount to smallest unit and round down to avoid decimals
      const scaledAmount = Math.floor(inputAmount * Math.pow(10, inputDecimals));
      if (scaledAmount <= 0) throw new Error("Invalid token amount after conversion");
  
      // Call Jupiter API
      const quote = await fetchQuote(outputMint, scaledAmount, inputMint, slippageBps, false);
      if (!quote) throw new Error("Unable to get quote");
  
      // Get decimals for output
      let outputDecimals = TOKEN_DECIMALS[outputMint.toString()] ?? 9;
      // Format output (decimal number)
      const outAmount = quote.outAmount ? quote.outAmount : 0;
      const formattedOutAmount = formatAmount(outAmount, outputDecimals);
  
      // Calculate exchange rate
      const exchangeRate = inputAmount > 0 ? parseFloat(formattedOutAmount) / inputAmount : 0;
      const priceImpactPct = quote.priceImpactPct ? parseFloat(quote.priceImpactPct) : 0;
  
      return {
        outputAmount: formattedOutAmount,
        exchangeRate,
        priceImpactPct,
        routeInfo: quote.routePlan || null
      };
    } catch (error: any) {
      throw error;
    }
  };

  /**
   * Execute token swap transaction
   */
  const executeTrade = async (
    outputMint: PublicKey,
    inputAmount: number,
    inputMint: PublicKey = TOKENS.USDC,
    slippageBps: number = DEFAULT_OPTIONS.SLIPPAGE_BPS
  ) => {
    try {
      // Check if wallet is connected and has endpoint
      if (!publicKey || !endpoint) {
        console.error("publicKey or endpoint does not exist:", { publicKey, endpoint });
        throw new Error("Wallet not connected or endpoint not defined");
      }

      // Check input parameters
      console.log("Checking input parameters for trade:", {
        inputAmount,
        inputMintStr: inputMint.toString(),
        outputMintStr: outputMint.toString(),
        slippageBps,
        inputAmountType: typeof inputAmount
      });

      // Check if inputAmount is a positive number
      if (typeof inputAmount !== 'number' || isNaN(inputAmount) || inputAmount <= 0) {
        throw new Error(`Invalid token amount: ${inputAmount}`);
      }

      // Use wallet directly from useWallet hook
      console.log("Checking wallet details:", {
        connected: wallet?.connected,
        publicKey: publicKey?.toString(),
        hasSignTransaction: !!wallet?.signTransaction,
        signTransactionType: typeof wallet?.signTransaction
      });

      // Check if wallet supports signTransaction method
      if (!wallet || typeof wallet.signTransaction !== 'function') {
        throw new Error("Wallet does not support signTransaction method");
      }

      // Call trade function with full parameters
      console.log("Calling trade function with parameters:", {
        outputMint: outputMint.toString(),
        inputAmount,
        inputMint: inputMint.toString(),
        slippageBps,
        publicKey: publicKey.toString()
      });

      return await trade(
        outputMint,
        inputAmount,
        inputMint,
        slippageBps,
        publicKey.toString(),
        wallet,
        endpoint
      );
    } catch (error: any) {
      console.error("Error in executeTrade:", error);
      throw new Error(`Unable to execute trade: ${error.message}`);
    }
  };

  /**
   * Get balance for a token
   */
  const getBalance = async (
    tokenMint: PublicKey
  ): Promise<string> => {
    if (!publicKey || !endpoint) {
      console.log("getBalance: Wallet not connected or endpoint not defined");
      return "0";
    }
    
    console.log(`getBalance: Checking balance for token ${tokenMint.toString()}`);
    console.log(`getBalance: Using endpoint ${endpoint}`);
    console.log(`getBalance: Wallet address ${publicKey.toString()}`);
    
    // Create a promise with timeout to avoid hanging
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error("getBalance: Connection timeout after 10 seconds"));
      }, 10000); // 10 seconds timeout
    });
    
    try {
      // Race between API call and timeout
      return await Promise.race([
        (async () => {
          // Try using direct connection to Solana RPC
          try {
            console.log("getBalance: Creating direct connection to Solana RPC");
            
            // Create connection with optimized options
            const connection = new Connection(endpoint, {
              commitment: 'confirmed',
              confirmTransactionInitialTimeout: 10000,
              disableRetryOnRateLimit: false,
            });
            
            console.log("getBalance: Created connection object");
            
            // Skip connection check to avoid 403 error
            // Go straight to getting SOL balance
            
            // Special handling for SOL
            if (tokenMint.equals(TOKENS.SOL)) {
              console.log("getBalance: Getting SOL balance (special handling)");
              try {
                console.log(`getBalance: Getting SOL balance for wallet ${publicKey.toString()}`);
                
                // Use try-catch for each API call
                const rawBalance = await connection.getBalance(publicKey);
                console.log(`getBalance: Raw SOL balance in lamports: ${rawBalance}`);
                
                // Convert lamports to SOL directly
                const solBalance = rawBalance / 1000000000;
                console.log(`getBalance: SOL balance in SOL units: ${solBalance}`);
                
                // SPECIAL: Display small SOL with enough decimal places
                if (solBalance > 0) {
                  // Always display small SOL balance with fixed format, regardless of size
                  const formatted = solBalance.toFixed(6);
                  console.log(`getBalance: Formatted SOL balance for small amount: ${formatted}`);
                  return formatted;
                }
                
                if (solBalance === 0) {
                  return "0";
                }
                
                // Fallback: Use standard formatter
                const formattedBalance = formatAmount(rawBalance.toString(), 9);
                console.log(`getBalance: Formatted SOL balance: ${formattedBalance}`);
                return formattedBalance;
              } catch (error) {
                console.error("getBalance: Error getting SOL balance:", error);
                return "0";
              }
            }
            
            // For SPL tokens, try getting token account
            try {
              // Try simpler method for SPL token instead of using getTokenBalance
              const tokenAccount = await getAssociatedTokenAddress(
                tokenMint,
                publicKey
              );
              console.log(`Token account address: ${tokenAccount.toString()}`);
              
              try {
                // Get decimals from hardcoded values instead of querying blockchain
                const mintString = tokenMint.toString();
                let decimals = 9; // Default
                
                if (TOKEN_DECIMALS[mintString]) {
                  decimals = TOKEN_DECIMALS[mintString];
                  console.log(`Using hardcoded decimals: ${decimals}`);
                }
                
                // Get token account info
                const account = await getAccount(connection, tokenAccount);
                console.log(`Raw token amount: ${account.amount.toString()}`);
                
                // Format balance with correct decimals
                return formatAmount(account.amount.toString(), decimals);
              } catch (error) {
                // Handle case where token account does not exist
                if (error instanceof TokenAccountNotFoundError) {
                  console.log("Token account not found, balance is 0");
                  return "0";
                }
                console.error("Error getting token account:", error);
                return "0";
              }
            } catch (tokenError) {
              console.error("getBalance: Error setting up token account check:", tokenError);
              return "0";
            }
          } catch (connectionError) {
            console.error("getBalance: Could not establish connection:", connectionError);
            return "0";
          }
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("getBalance: Error getting balance:", error);
      return "0";
    }
  };

  return { executeTrade, getQuote, getBalance };
}