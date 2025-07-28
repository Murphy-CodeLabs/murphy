"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { TransactionStatus } from "@/types/transaction";
import { TxnFeedbackToast } from "@/components/ui/murphy";

export default function TxnFeedbackToastPreview() {
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    status: "idle",
  });

  const showToast = (
    status: TransactionStatus["status"],
    error?: string,
    signature?: string
  ) => {
    setTxStatus({ status, error, signature });
  };

  const simulateTransaction = async () => {
    const statuses: TransactionStatus["status"][] = [
      "preparing",
      "signing",
      "sending",
      "confirming",
    ];

    for (const status of statuses) {
      setTxStatus({ status });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (Math.random() > 0.3) {
      setTxStatus({
        status: "success",
        signature:
          "5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n",
      });
    } else {
      setTxStatus({
        status: "error",
        error: "Transaction failed: Insufficient funds for transaction fees",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Controls */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["preparing", "signing", "sending", "confirming"].map((status) => (
            <Button
              key={status}
              onClick={() => showToast(status as TransactionStatus["status"])}
              variant="outline"
              size="sm"
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              showToast(
                "success",
                undefined,
                "5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n"
              )
            }
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            Success
          </Button>
          <Button
            onClick={() =>
              showToast("error", "Transaction failed: Insufficient funds")
            }
            variant="destructive"
            size="sm"
          >
            Error
          </Button>
        </div>

        <Button onClick={simulateTransaction} className="w-full">
          Simulate Full Transaction
        </Button>

        <Button
          onClick={() => setTxStatus({ status: "idle" })}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          Clear Toast
        </Button>
      </div>

      {/* Toast */}
      <TxnFeedbackToast
        status={txStatus}
        onRetry={simulateTransaction}
        onClose={() => setTxStatus({ status: "idle" })}
      />
    </div>
  );
}
