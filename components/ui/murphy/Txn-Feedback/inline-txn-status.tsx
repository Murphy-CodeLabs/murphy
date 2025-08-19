"use client";

import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TransactionStatus } from "@/types/transaction";

interface InlineTxnStatusProps {
  status: TransactionStatus["status"];
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function InlineTxnStatus({
  status,
  size = "md",
  showText = true,
  className,
}: InlineTxnStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: CheckCircle,
          text: "Success",
          variant: "default" as const,
          className:
            "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700",
        };
      case "error":
        return {
          icon: XCircle,
          text: "Failed",
          variant: "destructive" as const,
          className:
            "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700",
        };
      case "preparing":
      case "signing":
      case "sending":
      case "confirming":
        return {
          icon: Loader2,
          text: "Processing",
          variant: "secondary" as const,
          className:
            "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700",
          animate: true,
        };
      default:
        return {
          icon: Clock,
          text: "Pending",
          variant: "outline" as const,
          className:
            "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5",
        config.className,
        className
      )}
    >
      <Icon className={cn(iconSize, config.animate && "animate-spin")} />
      {showText && <span className={textSize}>{config.text}</span>}
    </Badge>
  );
}
