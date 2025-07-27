"use client";

import { CheckCircle, ExternalLink, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  signature?: string;
  amount?: string;
  token?: string;
  recipient?: string;
  onViewExplorer?: () => void;
  onClose?: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  title = "Transaction Successful! 🎉",
  description = "Your transaction has been confirmed on the blockchain",
  signature,
  amount,
  token,
  recipient,
  onViewExplorer,
  onClose,
}: SuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  const copySignature = async () => {
    if (!signature) return;
    await navigator.clipboard.writeText(signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 text-black dark:text-white">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-green-900 dark:text-green-400">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-700 dark:text-gray-300">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(amount || token) && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {amount} {token}
                </p>
                {recipient && (
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Sent to {recipient.slice(0, 8)}...{recipient.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          )}

          {signature && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Transaction Signature
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {signature.slice(0, 12)}...{signature.slice(-12)}
                  </p>
                </div>
                <div className="flex space-x-1 z-10">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copySignature}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  {onViewExplorer && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onViewExplorer}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {copied && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  Copied!
                </Badge>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
