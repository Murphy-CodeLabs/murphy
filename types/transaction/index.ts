export interface TransactionStatus {
  status: "idle" | "preparing" | "signing" | "sending" | "confirming" | "success" | "error"
  signature?: string
  error?: string
  step?: number
  totalSteps?: number
}

export interface TxnStep {
  id: string
  title: string
  description?: string
  status: "pending" | "active" | "completed" | "error"
}

export interface TxnFeedbackProps {
  status: TransactionStatus
  onRetry?: () => void
  onClose?: () => void
}
