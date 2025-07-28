"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TxnErrorFallback } from "./ui/murphy";

export default function TxnErrorFallbackPreview() {
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState<
    "simple" | "with-signature" | "with-logs"
  >("simple");

  const errorExamples = {
    simple: {
      error: "Transaction failed: Insufficient funds for transaction fees",
    },
    "with-signature": {
      error: "Transaction failed: Program error occurred during execution",
      signature:
        "5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM7n",
    },
    "with-logs": {
      error: "Transaction failed: Custom program error: 0x1771",
      signature:
        "2B5VfYmGC9L8ty3D4HutfxndoKXGBwXJWKKvxgF7qQzqK8xMjU9v7Rw2sP3nT6hL4jK9mN8bC1dF2eG3hI5jK6lM",
      showLogs: true,
      logs: [
        "Program 11111111111111111111111111111111 invoke [1]",
        "Program log: Instruction: Transfer",
        "Program log: Error: custom program error: 0x1771",
        "Program 11111111111111111111111111111111 consumed 200000 of 200000 compute units",
        "Program 11111111111111111111111111111111 failed: custom program error: 0x1771",
      ],
    },
  };

  const handleRetry = () => {
    console.log("Retrying...");
    setShowError(false);
    setTimeout(() => {
      if (Math.random() > 0.5) {
        alert("Retry successful!");
      } else {
        setShowError(true);
      }
    }, 1500);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-gray-600 dark:text-gray-300">
          Simulate different transaction error scenarios
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => {
            setErrorType("simple");
            setShowError(true);
          }}
          variant="destructive"
          className="w-full"
        >
          Simple Error
        </Button>

        <Button
          onClick={() => {
            setErrorType("with-signature");
            setShowError(true);
          }}
          variant="destructive"
          className="w-full"
        >
          Error with Signature
        </Button>

        <Button
          onClick={() => {
            setErrorType("with-logs");
            setShowError(true);
          }}
          variant="destructive"
          className="w-full"
        >
          Error with Logs
        </Button>
      </div>

      {showError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <TxnErrorFallback
            {...errorExamples[errorType]}
            onRetry={handleRetry}
            onClose={() => setShowError(false)}
          />
        </div>
      )}
    </div>
  );
}
