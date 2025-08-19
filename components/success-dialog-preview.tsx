"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SuccessDialog } from "./ui/murphy";

export default function SuccessDialogPreview() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Button
        onClick={() => setOpen(true)}
        className="w-64 bg-white text-black border border-neutral-300 hover:bg-neutral-100 dark:bg-[#171717] dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Show Success Dialog
      </Button>
      <SuccessDialog
        open={open}
        onOpenChange={setOpen}
        title="Transaction Successful! 🎉"
        description="Your transaction has been confirmed on the blockchain"
        signature="5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n"
        amount="100"
        token="USDC"
        recipient="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onViewExplorer={() =>
          window.open(
            "https://explorer.solana.com/tx/5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n",
            "_blank"
          )
        }
      />
    </div>
  );
}
