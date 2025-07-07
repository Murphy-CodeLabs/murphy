"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecurringSetupForm } from "@/components/ui/murphy/Jupiter-Recurring/RecurringSetupForm"
import { RecurringOrderWidget } from "@/components/ui/murphy/Jupiter-Recurring/RecurringOrderWidget"
import { CancelRecurringOrder } from "@/components/ui/murphy/Jupiter-Recurring/CancelRecurringOrder"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { toast } from "sonner"

// Murphy DashboardLayout: grid, responsive, customizable with shadcn theming
function DashboardLayout({
  header,
  overview,
  top,
  bottom,
  footer,
  className = "",
  ...props
}: {
  header?: React.ReactNode
  overview?: React.ReactNode
  top?: React.ReactNode
  bottom?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  [key: string]: any
}) {
  return (
    <div
      className={`min-h-screen w-full bg-gradient-to-br from-background via-muted/50 to-muted flex flex-col ${className}`}
      {...props}
    >
      {header}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8">
        {overview}
        {/* 2-top-1-bottom layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">{top}</div>
        <div className="w-full flex flex-col">{bottom}</div>
      </main>
      {footer}
    </div>
  )
}

// Murphy OverviewStats: wallet, active orders, total DCA, etc.
function OverviewStats({
  wallet,
  activeOrders = 0,
  totalVolume = 0,
  completedOrders = 0,
  className = "",
  ...props
}: {
  wallet?: string
  activeOrders?: number
  totalVolume?: number
  completedOrders?: number
  className?: string
  [key: string]: any
}) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 w-full ${className}`} {...props}>
      <Card className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Wallet</span>
          <span className="text-foreground font-semibold truncate w-full text-center" title={wallet}>
            {wallet ? wallet : "Not connected"}
          </span>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Active Orders</span>
          <span className="text-xl font-bold text-primary">{activeOrders}</span>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Total DCA Volume</span>
          <span className="text-xl font-bold text-primary">{totalVolume} USDC</span>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="p-4 flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-1">Completed Orders</span>
          <span className="text-xl font-bold text-primary">{completedOrders}</span>
        </CardContent>
      </Card>
    </div>
  )
}

// Murphy OrderTable: professional table/list layout, filter/search/sort bar, empty state
function OrderTable({
  className = "",
  ...props
}: {
  className?: string
  [key: string]: any
}) {
  // TODO: Replace with real table, filter, sort, paging, etc.
  // For now, use RecurringOrderWidget as a placeholder
  return (
    <Card className={`w-full min-h-[400px] shadow-lg ${className}`} {...props}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Your Recurring Orders</CardTitle>
        {/* Dev: add filter/search/sort actions here if needed */}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <RecurringOrderWidget className="w-full bg-transparent border-none shadow-none p-0 h-full" />
        {/* Dev: replace above with real table/list, show empty state illustration if no orders */}
      </CardContent>
    </Card>
  )
}

export default function JupiterDashboardPage() {
  const { connected, publicKey } = useWallet()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Placeholder stats (dev can fetch real data and pass as props)
  const stats = useMemo(
    () => ({
      wallet: publicKey?.toBase58() || "Not connected",
      activeOrders: 0, // TODO: fetch real count
      totalVolume: 0, // TODO: fetch real volume
      completedOrders: 0, // TODO: fetch real count
    }),
    [publicKey],
  )

  const handleOrderCreated = (orderId: string) => {
    toast.success("Recurring order created!", {
      description: `Order ID: ${orderId}`,
    })
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleOrderCancelled = (orderId: string) => {
    toast.success("Order cancelled successfully!", {
      description: `Order ID: ${orderId}`,
    })
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <DashboardLayout
      header={
        <header className="w-full border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-foreground tracking-tight">Murphy DCA Dashboard</span>
              <Badge variant="secondary" className="font-semibold">
                MAINNET
              </Badge>
            </div>
            <WalletMultiButton className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md transition" />
          </div>
        </header>
      }
      overview={<OverviewStats {...stats} />}
      top={[
        <Card key="create" className="w-full h-full min-h-[400px] shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Create Recurring Order</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <RecurringSetupForm
              onOrderCreated={handleOrderCreated}
              className="w-full bg-transparent border-none shadow-none p-0"
            />
          </CardContent>
        </Card>,
        <Card key="cancel" className="w-full h-full min-h-[400px] shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cancel Recurring Order</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <CancelRecurringOrder className="w-full bg-transparent border-none shadow-none p-0" />
          </CardContent>
        </Card>,
      ]}
      bottom={<OrderTable />}
      footer={
        <footer className="w-full max-w-7xl mx-auto text-center mt-10 py-6 text-muted-foreground text-xs tracking-wide border-t opacity-80">
          Built with <span className="text-primary font-semibold">Murphy SDK</span> • Powered by{" "}
          <span className="text-primary font-semibold">Jupiter Recurring API</span> • Deploy on Vercel
        </footer>
      }
    />
  )
}
