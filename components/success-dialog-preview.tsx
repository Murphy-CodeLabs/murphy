"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SuccessDialog } from "./ui/murphy";

export default function SuccessDialogPreview() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<
    "basic" | "token-transfer" | "nft-mint" | "staking"
  >("basic");

  const dialogExamples = {
    basic: {
      title: "Transaction Successful! 🎉",
      description: "Your transaction has been confirmed on the blockchain",
      signature:
        "5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n",
    },
    "token-transfer": {
      title: "Tokens Sent Successfully! 💸",
      description: "Your tokens have been transferred to the recipient",
      signature:
        "2B5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
      amount: "100",
      token: "USDC",
      recipient: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    },
    "nft-mint": {
      title: "NFT Minted Successfully! 🎨",
      description: "Your NFT has been minted and added to your wallet",
      signature:
        "3C6VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
      amount: "1",
      token: "NFT",
    },
    staking: {
      title: "Staking Successful! 🚀",
      description: "Your tokens have been staked and are now earning rewards",
      signature:
        "4D7VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
      amount: "500",
      token: "SOL",
    },
  };

  const openDialog = (type: keyof typeof dialogExamples) => {
    setDialogType(type);
    setShowDialog(true);
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4  text-black dark:text-white space-y-4">
      <Button
        onClick={() => openDialog("basic")}
        className="w-64 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Basic Success Dialog
      </Button>
      <Button
        onClick={() => openDialog("token-transfer")}
        className="w-64 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Token Transfer Success
      </Button>
      <Button
        onClick={() => openDialog("nft-mint")}
        className="w-64 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
      >
        NFT Mint Success
      </Button>
      <Button
        onClick={() => openDialog("staking")}
        className="w-64 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
      >
        Staking Success
      </Button>

      <SuccessDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        {...dialogExamples[dialogType]}
        onViewExplorer={() =>
          window.open(
            `https://explorer.solana.com/tx/${dialogExamples[dialogType].signature}`,
            "_blank"
          )
        }
        onClose={() => setShowDialog(false)}
      />
    </div>
  );
}
