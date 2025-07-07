# Jupiter Recurring DCA Dashboard Demo

A complete demonstration of Murphy SDK's Jupiter Recurring DCA components, showcasing automated Dollar-Cost Averaging functionality on Solana.

## 🚀 Features

### ✅ Complete DCA Workflow
- **Order Creation**: Set up recurring DCA orders with time-based or price-based triggers
- **Order Monitoring**: Real-time tracking of active and historical orders
- **Order Management**: Cancel orders with proper transaction signing
- **Wallet Integration**: Seamless connection with Phantom and other Solana wallets

### ✅ Environment Support
- **Mainnet/Devnet Toggle**: Switch between production and testing environments
- **Real API Integration**: Uses Jupiter's official Recurring API
- **No Mock Data**: All components fetch real on-chain data

### ✅ UI Components Showcase
1. **RecurringSetupForm** - Complete order creation form
2. **RecurringOrderWidget** - Dashboard widget with filtering
3. **RecurringActiveOrders** - Active orders only view
4. **RecurringHistoryList** - Historical order tracking
5. **CancelRecurringOrder** - Order cancellation interface
6. **RecurringOrderCard** - Standalone order display

## 🛠️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Wallet**: @solana/wallet-adapter-react
- **Notifications**: Sonner toast
- **State Management**: React Context (Cluster Provider)

## 📦 Components Used

### Core Components
- `RecurringSetupForm` - Order creation with validation
- `RecurringOrderWidget` - Main dashboard widget
- `RecurringActiveOrders` - Active orders view
- `RecurringHistoryList` - Order history
- `CancelRecurringOrder` - Order cancellation
- `RecurringOrderCard` - Individual order display

### Custom Hooks
- `useRecurringJupiter` - Data fetching and management
- `useCluster` - Environment switching

### Providers
- `ClusterProvider` - Mainnet/devnet context
- `WalletProvider` - Solana wallet integration

## 🔧 Setup Instructions

### 1. Environment Variables Setup

**Option A: Copy from example file (Recommended)**
```bash
# Copy the example environment file
cp env.example .env.local

# Edit the file with your preferred settings
nano .env.local
```

**Option B: Create manually**
Create a `.env.local` file in the project root:

```bash
# Cluster Configuration
NEXT_PUBLIC_CLUSTER=mainnet

# Jupiter API
NEXT_PUBLIC_JUP_API=https://lite-api.jup.ag

# Solana RPC URLs
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com

# Use Mainnet by default
NEXT_PUBLIC_USE_MAINNET=true

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

### 4. Visit Demo
Navigate to `http://localhost:3000/jupiter-dashboard`

## 🎯 Usage Guide

### For Developers
1. **Connect Wallet**: Use the wallet button in the header
2. **Switch Environment**: Toggle between mainnet and devnet
3. **Create Orders**: Use the setup form to create recurring DCA orders
4. **Monitor Orders**: View active and historical orders
5. **Cancel Orders**: Use the cancellation interface

### For Testing
- **Devnet**: Use for testing with devnet tokens
- **Mainnet**: Use for production testing with real tokens
- **Wallet**: Connect Phantom or other Solana wallets

## 🔗 API Integration

### Jupiter Recurring API Endpoints
- **Create Order**: `POST /recurring/v1/createOrder`
- **Get Orders**: `GET /recurring/v1/orders`
- **Cancel Order**: `POST /recurring/v1/cancelOrder`

### Supported Tokens
- **SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## 🎨 Design System

### Murphy SDK Principles
- **Atomic**: Each component is self-contained
- **Composable**: Mix and match components
- **Real Data**: No mocks or test data
- **TypeScript**: Full type safety

### UI Components
- **shadcn/ui**: Consistent design system
- **Tailwind CSS**: Utility-first styling
- **Responsive**: Works on all devices
- **Dark Mode**: Automatic theme switching

## 🚀 Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy to `https://your-project.vercel.app/jupiter-dashboard`

### Environment Variables for Production
```bash
NEXT_PUBLIC_CLUSTER=mainnet
NEXT_PUBLIC_JUP_API=https://lite-api.jup.ag
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com
NEXT_PUBLIC_USE_MAINNET=true
NEXT_PUBLIC_BASE_URL=https://your-project.vercel.app
```

## 📱 Mobile Support

The demo is fully responsive and works on:
- **Desktop**: Full feature set with side-by-side layouts
- **Tablet**: Adaptive layouts with touch-friendly controls
- **Mobile**: Stacked layouts with optimized touch targets

## 🔒 Security

- **Wallet Integration**: Secure wallet connection handling
- **Transaction Signing**: Proper transaction signing flow
- **API Security**: Uses official Jupiter API endpoints
- **No Private Keys**: Never stores or transmits private keys

## 🤝 Contributing

This demo showcases Murphy SDK components. To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Built with Murphy SDK • Powered by Jupiter Recurring API • Deploy on Vercel 