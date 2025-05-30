# Changelog

All notable changes to Murphy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **SolExchangeForm Component** - New specialized form for exchanging SOL to custom tokens
- Comprehensive development infrastructure setup
- ESLint configuration with TypeScript support
- Prettier code formatting
- Jest testing framework with React Testing Library
- GitHub Actions CI/CD pipeline
- Issue and PR templates for better contribution workflow
- VS Code workspace settings for optimal development experience
- Enhanced README with detailed documentation and examples
- Component testing examples and patterns
- Development scripts for linting, testing, and formatting

### Enhanced
- Contributing guidelines with detailed component export instructions
- Package.json with comprehensive development scripts
- Project documentation structure

## 31-05-2025

### Added
- Initial Murphy SDK release
- Core Solana Web3 components
- Wallet integration components
- Token operation forms (send, swap, stake)
- NFT and compressed NFT support
- DeFi primitive components
- Documentation site with interactive examples
- TypeScript support throughout
- Comprehensive component library

### Components Added
- `ConnectWalletButton` - Wallet connection interface
- `SendTokenForm` - SPL token transfers
- `SwapForm` - Token swapping interface
- `SolExchangeForm` - Specialized SOL to custom token exchange
- `StakeForm` - Token staking functionality
- `TokenInput` - Token amount input component
- `TokenCombobox` - Token selection dropdown
- `TokenList` - Portfolio display component
- `MintNFT` - Standard NFT minting
- `MintCNFT` - Compressed NFT minting
- `GetNFT` - NFT data retrieval
- `BuildCurveAndCreateConfigForm` - Bonding curve creation
- `MintTokenForm` - Compressed token minting
- `ClaimTokenForm` - Token claiming interface
- `DistributeTokenForm` - Token distribution
- `PriceChart` - Token price visualization
- `Sparkline` - Compact price trend display
- `PriceChange` - Price change indicators
- `Avatar` - User avatar with wallet integration

### Integrations
- Metaplex NFT standards
- Jupiter DEX aggregation
- Solana wallet adapters
- ZK compression support
- Meteora bonding curves
- Multiple wallet providers (Phantom, Solflare, Backpack, etc.)

### Developer Experience
- shadcn/ui component architecture
- Next.js documentation framework
- MDX-based component documentation
- Auto-import system for components
- TypeScript type definitions
- Comprehensive examples and tutorials

---

## Contributing to the Changelog

When adding entries to the changelog, please follow these guidelines:

### Categories
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Format
```markdown
### Added
- Brief description of the feature [#PR-number]
- Another feature with link to [documentation](link)

### Fixed
- Bug fix description [#issue-number]
```

### Guidelines
- Keep entries concise but descriptive
- Reference PR/issue numbers when applicable
- Group related changes together
- Use consistent verb tense (past tense)
- Link to relevant documentation when helpful
- Highlight breaking changes prominently

### Breaking Changes
For breaking changes, use this format:

```markdown
### Changed
- **BREAKING**: Description of the breaking change and migration path [#PR-number]
```

Thank you for contributing to Murphy! 🚀