"use client";

import { AlertTriangle, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface TxnErrorFallbackProps {
  error: string;
  signature?: string;
  onRetry?: () => void;
  onClose?: () => void;
  showLogs?: boolean;
  logs?: string[];
}

export function TxnErrorFallback({
  error,
  signature,
  onRetry,
  onClose,
  showLogs = false,
  logs = [],
}: TxnErrorFallbackProps) {
  const [copied, setCopied] = useState(false);

  const copyError = async () => {
    await navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle className="text-red-900 dark:text-red-300">
          Transaction Failed
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Your transaction could not be completed
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start justify-between">
            <p className="text-sm text-red-800 dark:text-red-300 flex-1 pr-2">
              {error}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyError}
              className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {copied && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Copied to clipboard
            </Badge>
          )}
        </div>

        {signature && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transaction Signature
              </p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-100">
                {signature.slice(0, 8)}...{signature.slice(-8)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(
                  `https://explorer.solana.com/tx/${signature}`,
                  "_blank"
                )
              }
              className="dark:border-gray-700"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}

        {showLogs && logs.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              View Transaction Logs
            </summary>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-32 overflow-y-auto">
              {logs.map((log, index) => (
                <p
                  key={index}
                  className="text-xs font-mono text-gray-600 dark:text-gray-300 mb-1"
                >
                  {log}
                </p>
              ))}
            </div>
          </details>
        )}
      </CardContent>

      <CardFooter className="flex space-x-2">
        {onRetry && (
          <Button onClick={onRetry} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 bg-transparent dark:border-gray-700"
        >
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}
