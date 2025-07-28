"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { TxnPendingIndicator } from "./ui/murphy";

interface PendingTransaction {
  id: string;
  signature?: string;
  description: string;
  startTime: number;
}

export default function TxnPendingIndicatorPreview() {
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [position, setPosition] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("bottom-right");

  const addTransaction = (description: string) => {
    const newTransaction: PendingTransaction = {
      id: Date.now().toString(),
      description,
      startTime: Date.now(),
    };
    setPendingTransactions((prev) => [...prev, newTransaction]);

    setTimeout(() => {
      setPendingTransactions((prev) =>
        prev.filter((txn) => txn.id !== newTransaction.id)
      );
    }, 15000);
  };

  const removeTransaction = (id: string) => {
    setPendingTransactions((prev) => prev.filter((txn) => txn.id !== id));
  };

  const clearAllTransactions = () => {
    setPendingTransactions([]);
  };

  const addBatchTransactions = () => {
    const batchTransactions = [
      "Transfer to Alice",
      "Transfer to Bob",
      "Transfer to Charlie",
    ].map((desc, index) => ({
      id: `batch_${Date.now()}_${index}`,
      description: desc,
      startTime: Date.now(),
    }));

    setPendingTransactions((prev) => [...prev, ...batchTransactions]);

    setTimeout(() => {
      batchTransactions.forEach((txn) => {
        setPendingTransactions((prev) => prev.filter((t) => t.id !== txn.id));
      });
    }, 20000);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="grid gap-6">
        <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-100">
              Example Usage
            </CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Add transactions to see the pending indicator appear. It will show
              in the <span className="font-medium">{position}</span> corner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                onClick={() =>
                  addTransaction(
                    "Mint NFT #" + Math.floor(Math.random() * 1000)
                  )
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add NFT Mint
              </Button>
              <Button
                onClick={() =>
                  addTransaction(
                    "Transfer " + Math.floor(Math.random() * 100) + " USDC"
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Token Transfer
              </Button>
              <Button
                onClick={() => addTransaction("Swap SOL → USDC")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Token Swap
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={addBatchTransactions} variant="outline">
                Add Batch (3 transactions)
              </Button>
              <Button onClick={clearAllTransactions} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Current pending:
              </span>
              <Badge variant="secondary">{pendingTransactions.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-900 dark:text-zinc-100">
              Position Options
            </CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400">
              Change the position of the pending indicator on screen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(
                [
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                ] as const
              ).map((pos) => (
                <Button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  variant={position === pos ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {pos}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <TxnPendingIndicator
        transactions={pendingTransactions}
        onCancel={removeTransaction}
        position={position}
      />
    </div>
  );
}
