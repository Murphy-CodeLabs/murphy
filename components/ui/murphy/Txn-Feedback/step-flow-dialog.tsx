"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TxnProgressSteps } from "./txn-progress-steps"
import type { TxnStep } from "@/types/transaction"

interface StepFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  steps: TxnStep[]
  currentStep: number
  onNext?: () => Promise<void> | void
  onPrevious?: () => void
  onCancel?: () => void
  nextButtonText?: string
  previousButtonText?: string
  cancelButtonText?: string
  isLoading?: boolean
  canGoNext?: boolean
  canGoPrevious?: boolean
  showCancel?: boolean
}

export function StepFlowDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  currentStep,
  onNext,
  onPrevious,
  onCancel,
  nextButtonText = "Next",
  previousButtonText = "Previous",
  cancelButtonText = "Cancel",
  isLoading = false,
  canGoNext = true,
  canGoPrevious = true,
  showCancel = true,
}: StepFlowDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleNext = async () => {
    if (!onNext || isProcessing) return
    setIsProcessing(true)
    try {
      await onNext()
    } catch (error) {
      console.error("Step failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-6">
          <TxnProgressSteps
            steps={steps}
            orientation="vertical"
            className="mb-6"
          />

          {steps[currentStep] && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-foreground mb-2">
                {steps[currentStep].title}
              </h4>
              {steps[currentStep].description && (
                <p className="text-sm text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex space-x-2">
            {showCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isProcessing || isLoading}
              >
                {cancelButtonText}
              </Button>
            )}
            {!isFirstStep && canGoPrevious && (
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isProcessing || isLoading}
              >
                {previousButtonText}
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {!isLastStep && (
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isProcessing || isLoading}
              >
                {isProcessing || isLoading ? "Processing..." : nextButtonText}
              </Button>
            )}
            {isLastStep && (
              <Button
                onClick={() => onOpenChange(false)}
                disabled={isProcessing || isLoading}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
