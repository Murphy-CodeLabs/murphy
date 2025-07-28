"use client";

import { useState } from "react";
import { TxnFeedbackToast, TxnRetryButton } from "./ui/murphy";
import type { TransactionStatus } from "@/types/transaction";

export default function TxnRetryButtonPreview() {
  const [toastStatus, setToastStatus] = useState<TransactionStatus>({
    status: "idle",
  });

  const simulateTransaction = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const success = Math.random() < 0.6;

    if (success) {
      setToastStatus({
        status: "success",
      });
    } else {
      setToastStatus({
        status: "error",
      });
      throw new Error("Simulated transaction failure");
    }
  };

  const closeToast = () => {
    setToastStatus({ status: "idle" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 space-y-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100">
            Standard Retry (3 attempts)
          </h4>
          <TxnRetryButton
            onRetry={simulateTransaction}
            maxRetries={3}
            retryDelay={1000}
            className="w-full"
          >
            Retry Transaction
          </TxnRetryButton>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100">
            Quick Retry (5 attempts, 500ms delay)
          </h4>
          <TxnRetryButton
            onRetry={simulateTransaction}
            maxRetries={5}
            retryDelay={500}
            variant="outline"
            className="w-full"
          >
            Quick Retry
          </TxnRetryButton>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-lg text-gray-900 dark:text-gray-100">
            Single Retry (1 attempt)
          </h4>
          <TxnRetryButton
            onRetry={simulateTransaction}
            maxRetries={1}
            retryDelay={2000}
            variant="secondary"
            className="w-full"
          >
            Single Retry
          </TxnRetryButton>
        </div>
      </div>

      <TxnFeedbackToast status={toastStatus} onClose={closeToast} />
    </div>
  );
}
