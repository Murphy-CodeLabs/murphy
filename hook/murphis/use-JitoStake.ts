// @ts-nocheck
import { PublicKey, Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useContext } from "react";
import { ModalContext } from "@/components/providers/wallet-provider";
import { toast } from "sonner";

/**
 * Hook to handle staking Jito SOL on the Solana blockchain
 */
export function useJitoStake() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { endpoint } = useContext(ModalContext);

  /**
   * Function to stake Jito SOL
   * @param amount The amount of SOL to stake (in decimal format)
   * @param period The staking period (in days)
   * @returns Object containing the staking result information
   */
  const stakeJito = async (amount: number, period: number = 30) => {
    try {
      // Check if the wallet is connected
      if (!publicKey) {
        throw new Error("Wallet is not connected");
      }

      // Check if the RPC endpoint is defined
      if (!endpoint) {
        throw new Error("RPC endpoint is not defined");
      }

      // Check the staking amount
      if (!amount || amount <= 0) {
        throw new Error("Invalid staking amount");
      }

      // Check if the transaction signing method is supported
      if (!signTransaction) {
        throw new Error("Wallet does not support transaction signing");
      }

      // Log staking information for debugging
      console.log("=== Jito Staking Information ===");
      console.log("Endpoint:", endpoint);
      console.log("Staking Amount:", amount, "SOL");
      console.log("Staking Period:", period, "days");
      console.log("PublicKey:", publicKey.toString());
      console.log("===========================");

      // Call Solayer or Jito API to get transaction data
      const response = await fetch(
        `https://app.solayer.org/api/action/restake/ssol?amount=${amount}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account: publicKey.toString(),
          }),
        }
      );

      // Check API response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Staking request failed");
      }

      // Get transaction data from API
      const data = await response.json();
      
      // Check transaction data
      if (!data.transaction) {
        throw new Error("Invalid transaction data");
      }

      // Create Solana connection
      const connection = new Connection(endpoint, "confirmed");

      // Create transaction from received data
      const txData = Buffer.from(data.transaction, "base64");
      const transaction = Transaction.from(txData);

      // Sign transaction with wallet
      console.log("Signing transaction...");
      const signedTransaction = await signTransaction(transaction);

      // Send signed transaction to blockchain
      console.log("Sending transaction to blockchain...");
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction(signature, "confirmed");

      // Check confirmation result
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmation error: ${confirmation.value.err}`);
      }

      console.log("Staking transaction successful:", signature);
      
      return {
        success: true,
        signature,
        amount,
        period
      };

    } catch (error) {
      console.error("Error during Jito staking:", error);
      toast.error("Jito staking failed", {
        description: error.message || "An error occurred during staking"
      });
      return {
        success: false,
        error: error.message || "An error occurred during staking"
      };
    }
  };

  /**
   * Function to get the current APR for Jito staking
   * @returns The current APR for Jito staking
   */
  const getJitoAPR = async () => {
    try {
      // Call API to get current APR
      const response = await fetch("https://app.solayer.org/api/jito/apr", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to retrieve APR information");
      }

      const data = await response.json();
      return data.apr || 6.5; // Default value if data retrieval fails
    } catch (error) {
      console.error("Error retrieving Jito APR:", error);
      return 6.5; // Default APR value
    }
  };

  return { stakeJito, getJitoAPR };
} 