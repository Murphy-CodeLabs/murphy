"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TxnStep } from "@/types/transaction";
import { TxnProgressSteps } from "./ui/murphy";

export default function TxnProgressStepsPreview() {
  const initialSteps: TxnStep[] = [
    {
      id: "1",
      title: "Connect Wallet",
      description: "Connect your Solana wallet",
      status: "completed",
    },
    {
      id: "2",
      title: "Prepare Transaction",
      description: "Preparing transaction data",
      status: "completed",
    },
    {
      id: "3",
      title: "Sign Transaction",
      description: "Sign with your wallet",
      status: "active",
    },
    {
      id: "4",
      title: "Submit to Network",
      description: "Broadcasting to Solana",
      status: "pending",
    },
    {
      id: "5",
      title: "Confirmation",
      description: "Waiting for confirmation",
      status: "pending",
    },
  ];

  const [currentSteps, setCurrentSteps] = useState<TxnStep[]>(initialSteps);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateSteps = (
    stepIndex: number,
    status: TxnStep["status"]
  ): TxnStep[] => {
    return initialSteps.map((step, index) => {
      if (index < stepIndex) return { ...step, status: "completed" };
      if (index === stepIndex) return { ...step, status };
      return { ...step, status: "pending" };
    });
  };

  const simulateProgress = () => {
    if (intervalRef.current) return; // prevent multiple intervals

    let step = 0;
    intervalRef.current = setInterval(() => {
      if (step < initialSteps.length) {
        setCurrentSteps(updateSteps(step, "active"));
        step++;
      } else {
        setCurrentSteps(updateSteps(initialSteps.length - 1, "completed"));
        clearStimulate();
      }
    }, 1500);
  };

  const simulateError = () => {
    const activeIndex = currentSteps.findIndex(
      (step) => step.status === "active"
    );
    if (activeIndex === -1) return;

    // Stop progression
    clearStimulate();

    // Set error step
    setCurrentSteps((prev) =>
      prev.map((step, index) =>
        index === activeIndex ? { ...step, status: "error" } : step
      )
    );
  };

  const clearStimulate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    clearStimulate();
    setCurrentSteps(initialSteps);
  };

  return (
    <div className="space-y-10">
      {/* Horizontal */}
      <Card className="bg-white dark:bg-neutral-900 border dark:border-neutral-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Horizontal Layout</CardTitle>
          <CardDescription className="dark:text-neutral-400">
            Perfect for desktop interfaces and wide layouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TxnProgressSteps
            steps={currentSteps}
            orientation="horizontal"
            className="dark:text-white"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={simulateProgress} size="sm">
              Simulate Progress
            </Button>
            <Button onClick={simulateError} variant="destructive" size="sm">
              Simulate Error
            </Button>
            <Button onClick={reset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vertical */}
      <Card className="bg-white dark:bg-neutral-900 border dark:border-neutral-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Vertical Layout</CardTitle>
          <CardDescription className="dark:text-neutral-400">
            Ideal for mobile interfaces and detailed descriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TxnProgressSteps
            steps={currentSteps}
            orientation="vertical"
            className="dark:text-white"
          />
        </CardContent>
      </Card>

      {/* Step States */}
      <Card className="bg-white dark:bg-neutral-900 border dark:border-neutral-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Step States</CardTitle>
          <CardDescription className="dark:text-neutral-400">
            Different visual states for transaction steps
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3 dark:text-white">Success Flow</h4>
            <TxnProgressSteps
              steps={[
                { id: "1", title: "Connect", status: "completed" },
                { id: "2", title: "Sign", status: "completed" },
                { id: "3", title: "Submit", status: "completed" },
                { id: "4", title: "Confirm", status: "completed" },
              ]}
              orientation="horizontal"
              className="dark:text-white"
            />
          </div>
          <div>
            <h4 className="font-medium mb-3 dark:text-white">Error Flow</h4>
            <TxnProgressSteps
              steps={[
                { id: "1", title: "Connect", status: "completed" },
                { id: "2", title: "Sign", status: "completed" },
                { id: "3", title: "Submit", status: "error" },
                { id: "4", title: "Confirm", status: "pending" },
              ]}
              orientation="horizontal"
              className="dark:text-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
