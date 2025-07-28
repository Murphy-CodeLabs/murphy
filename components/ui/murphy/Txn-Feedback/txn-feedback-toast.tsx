"use client";

import { useEffect, useState } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Clock,
  FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TransactionStatus } from "@/types/transaction";

interface TxnFeedbackToastProps {
  status: TransactionStatus;
  onRetry?: () => void;
  onClose: () => void;
}

export function TxnFeedbackToast({
  status,
  onRetry,
  onClose,
}: TxnFeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status.status !== "idle") {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [status.status]);

  if (!isVisible || status.status === "idle") {
    return null;
  }

  const getStatusConfig = () => {
    switch (status.status) {
      case "preparing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />,
          title: "Preparing Transaction",
          description: "Setting up your transaction...",
          bgColor: "bg-blue-50 dark:bg-blue-950",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-900 dark:text-blue-100",
        };
      case "signing":
        return {
          icon: <FileSignature className="h-4 w-4 flex-shrink-0" />,
          title: "Signing Transaction",
          description: "Please sign the transaction in your wallet...",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          textColor: "text-yellow-900 dark:text-yellow-100",
        };
      case "sending":
        return {
          icon: <Send className="h-4 w-4 flex-shrink-0" />,
          title: "Sending Transaction",
          description: "Broadcasting to the network...",
          bgColor: "bg-purple-50 dark:bg-purple-950",
          borderColor: "border-purple-200 dark:border-purple-800",
          textColor: "text-purple-900 dark:text-purple-100",
        };
      case "confirming":
        return {
          icon: <Clock className="h-4 w-4 flex-shrink-0" />,
          title: "Confirming Transaction",
          description: "Waiting for network confirmation...",
          bgColor: "bg-orange-50 dark:bg-orange-950",
          borderColor: "border-orange-200 dark:border-orange-800",
          textColor: "text-orange-900 dark:text-orange-100",
        };
      case "success":
        return {
          icon: (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ),
          title: "Transaction Successful",
          description: status.signature
            ? `Signature: ${status.signature.slice(
                0,
                8
              )}...${status.signature.slice(-8)}`
            : "Your transaction has been completed successfully.",
          bgColor: "bg-green-50 dark:bg-green-950",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-900 dark:text-green-100",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />,
          title: "Transaction Failed",
          description:
            status.error ||
            "An error occurred while processing your transaction.",
          bgColor: "bg-red-50 dark:bg-red-950",
          borderColor: "border-red-200 dark:border-red-800",
          textColor: "text-red-900 dark:text-red-100",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div
        className={`
        max-w-sm w-full rounded-lg border p-4 shadow-lg
        ${config.bgColor} ${config.borderColor}
      `}
      >
        <div className="flex items-start gap-3">
          {/* Icon container with proper alignment */}
          <div className="flex items-center justify-center mt-0.5">
            {config.icon}
          </div>

          {/* Content container */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm ${config.textColor}`}>
              {config.title}
            </div>
            <div
              className={`text-xs mt-1 ${config.textColor} opacity-80 break-words`}
            >
              {config.description}
            </div>

            {/* Action buttons */}
            {status.status === "error" && onRetry && (
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs bg-transparent"
                >
                  Retry
                </Button>
              </div>
            )}

            {status.status === "success" && status.signature && (
              <div className="mt-3">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(status.signature!);
                  }}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                >
                  Copy Signature
                </Button>
              </div>
            )}
          </div>

          {/* Close button with proper alignment */}
          <div className="flex items-center justify-center">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
