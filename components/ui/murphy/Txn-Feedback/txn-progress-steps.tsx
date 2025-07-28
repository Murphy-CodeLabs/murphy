"use client"

import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TxnStep } from "@/types/transaction"

interface TxnProgressStepsProps {
  steps: TxnStep[]
  orientation?: "horizontal" | "vertical"
  className?: string
}

export function TxnProgressSteps({ steps, orientation = "horizontal", className }: TxnProgressStepsProps) {
  const isVertical = orientation === "vertical"

  return (
    <div className={cn("flex", isVertical ? "flex-col space-y-4" : "items-center space-x-4", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className={cn("flex items-center", isVertical ? "w-full" : "flex-col text-center")}>
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
              step.status === "completed" && "bg-green-500 border-green-500 text-white",
              step.status === "active" && "bg-blue-500 border-blue-500 text-white",
              step.status === "error" && "bg-red-500 border-red-500 text-white",
              step.status === "pending" && "border-gray-300 text-gray-400",
            )}
          >
            {step.status === "completed" && <Check className="w-4 h-4" />}
            {step.status === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
            {step.status === "error" && <X className="w-4 h-4" />}
            {step.status === "pending" && <span className="text-sm font-medium">{index + 1}</span>}
          </div>

          <div className={cn("ml-3", !isVertical && "ml-0 mt-2")}>
            <div
              className={cn(
                "text-sm font-medium",
                step.status === "completed" && "text-green-600",
                step.status === "active" && "text-blue-600",
                step.status === "error" && "text-red-600",
                step.status === "pending" && "text-gray-500",
              )}
            >
              {step.title}
            </div>
            {step.description && <div className="text-xs text-gray-500 mt-1">{step.description}</div>}
          </div>

          {!isVertical && index < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-4" />}
        </div>
      ))}
    </div>
  )
}
