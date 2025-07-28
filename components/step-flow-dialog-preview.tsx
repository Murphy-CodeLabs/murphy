"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TxnStep } from "@/types/transaction";
import { StepFlowDialog } from "./ui/murphy";

export default function StepFlowDialogPreview() {
  const [showDialog, setShowDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dialogType, setDialogType] = useState<
    "nft-mint" | "token-swap" | "staking"
  >("nft-mint");

  const workflows = {
    "nft-mint": {
      title: "Mint NFT Process",
      description: "Complete the following steps to mint your NFT",
      steps: [
        {
          id: "1",
          title: "Upload Metadata",
          description: "Upload image and metadata to IPFS",
          status: "pending" as const,
        },
        {
          id: "2",
          title: "Create Mint Account",
          description: "Create NFT mint account on Solana",
          status: "pending" as const,
        },
        {
          id: "3",
          title: "Mint Token",
          description: "Mint NFT to your wallet",
          status: "pending" as const,
        },
        {
          id: "4",
          title: "Verify Ownership",
          description: "Verify NFT in your wallet",
          status: "pending" as const,
        },
      ],
    },
    "token-swap": {
      title: "Token Swap Process",
      description: "Swap your tokens through the following steps",
      steps: [
        {
          id: "1",
          title: "Get Quote",
          description: "Calculate swap rates and fees",
          status: "pending" as const,
        },
        {
          id: "2",
          title: "Approve Spending",
          description: "Approve token spending limit",
          status: "pending" as const,
        },
        {
          id: "3",
          title: "Execute Swap",
          description: "Perform the token exchange",
          status: "pending" as const,
        },
      ],
    },
    staking: {
      title: "Staking Process",
      description: "Stake your tokens to earn rewards",
      steps: [
        {
          id: "1",
          title: "Select Validator",
          description: "Choose a validator to stake with",
          status: "pending" as const,
        },
        {
          id: "2",
          title: "Create Stake Account",
          description: "Create a new stake account",
          status: "pending" as const,
        },
        {
          id: "3",
          title: "Delegate Stake",
          description: "Delegate tokens to validator",
          status: "pending" as const,
        },
        {
          id: "4",
          title: "Activate Stake",
          description: "Wait for stake activation",
          status: "pending" as const,
        },
      ],
    },
  };

  const updateStepStatus = (stepIndex: number, status: TxnStep["status"]) => {
    const currentWorkflow = workflows[dialogType];
    return currentWorkflow.steps.map((step, index) => {
      if (index < stepIndex) return { ...step, status: "completed" as const };
      if (index === stepIndex) return { ...step, status };
      return { ...step, status: "pending" as const };
    });
  };

  const [currentSteps, setCurrentSteps] = useState<TxnStep[]>(
    workflows["nft-mint"].steps
  );

  const openDialog = (type: keyof typeof workflows) => {
    setDialogType(type);
    setCurrentStep(0);
    setCurrentSteps(workflows[type].steps);
    setShowDialog(true);
  };

  const handleNext = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const nextStep = currentStep + 1;
    setCurrentSteps(updateStepStatus(currentStep, "completed"));

    if (nextStep < workflows[dialogType].steps.length) {
      setCurrentStep(nextStep);
      setCurrentSteps(updateStepStatus(nextStep, "active"));
    }
  };

  const handlePrevious = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    setCurrentSteps(updateStepStatus(prevStep, "active"));
  };

  const handleCancel = () => {
    setShowDialog(false);
    setCurrentStep(0);
    setCurrentSteps(workflows[dialogType].steps);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 bg-background text-foreground rounded-lg">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Choose a workflow to simulate
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
        <Button
          onClick={() => openDialog("nft-mint")}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          NFT Minting
        </Button>
        <Button
          onClick={() => openDialog("token-swap")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Token Swap
        </Button>
        <Button
          onClick={() => openDialog("staking")}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Staking
        </Button>
      </div>

      <StepFlowDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={workflows[dialogType].title}
        description={workflows[dialogType].description}
        steps={currentSteps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onCancel={handleCancel}
        canGoPrevious={currentStep > 0}
        canGoNext={currentStep < workflows[dialogType].steps.length - 1}
      />
    </div>
  );
}
