import { SolExchangeForm } from '@/components/ui/murphy/sol-exchange-form'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the wallet hook
const mockExecuteTrade = jest.fn()
const mockGetQuote = jest.fn()
const mockGetBalance = jest.fn()

jest.mock('@/hook/murphy/use-JupiterTrade', () => ({
    useJupiterTrade: () => ({
        executeTrade: mockExecuteTrade,
        getQuote: mockGetQuote,
        getBalance: mockGetBalance,
    }),
}))

jest.mock('@solana/wallet-adapter-react', () => ({
    useWallet: () => ({
        connected: true,
        publicKey: { toString: () => 'mock-public-key' },
        wallet: { signTransaction: jest.fn() },
    }),
    useConnection: () => ({
        connection: {
            getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
        },
    }),
}))

jest.mock('@/components/providers/wallet-provider', () => ({
    ModalContext: {
        Provider: ({ children }: any) => children,
    },
}))

describe('SolExchangeForm', () => {
    const mockOnExchange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders form fields correctly', () => {
        render(<SolExchangeForm onExchange={mockOnExchange} />)

        expect(screen.getByLabelText(/sol amount/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/custom token mint address/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /exchange sol/i })).toBeInTheDocument()
    })

    it('shows SOL balance when wallet is connected', async () => {
        render(<SolExchangeForm onExchange={mockOnExchange} />)

        await waitFor(() => {
            expect(screen.getByText(/balance: 1 sol/i)).toBeInTheDocument()
        })
    })

    it('validates required fields', async () => {
        const user = userEvent.setup()

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(screen.getByText(/sol amount is required/i)).toBeInTheDocument()
            expect(screen.getByText(/token mint address is required/i)).toBeInTheDocument()
        })
    })

    it('validates minimum SOL amount', async () => {
        const user = userEvent.setup()

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        await user.type(solInput, '0.005')

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(screen.getByText(/minimum sol amount is 0.01/i)).toBeInTheDocument()
        })
    })

    it('validates token mint address format', async () => {
        const user = userEvent.setup()

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'invalid-mint-address')

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(screen.getByText(/invalid solana token mint address/i)).toBeInTheDocument()
        })
    })

    it('handles MAX button correctly', async () => {
        const user = userEvent.setup()

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        await waitFor(() => {
            const maxButton = screen.getByText(/max/i)
            expect(maxButton).toBeInTheDocument()
        })

        const maxButton = screen.getByText(/max/i)
        await user.click(maxButton)

        const solInput = screen.getByLabelText(/sol amount/i)
        await waitFor(() => {
            expect(solInput).toHaveValue(0.95) // 1 SOL - 0.05 fee reserve
        })
    })

    it('fetches quote when valid inputs are provided', async () => {
        const user = userEvent.setup()
        const mockQuote = {
            outputAmount: '1000.5',
            exchangeRate: 1000.5,
            priceImpactPct: 0.1,
        }

        mockGetQuote.mockResolvedValue(mockQuote)

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

        // Wait for debounced quote fetch
        await waitFor(() => {
            expect(mockGetQuote).toHaveBeenCalledWith(
                expect.any(Object), // PublicKey
                0.1,
                expect.any(Object), // SOL PublicKey
                100 // 1% slippage in bps
            )
        }, { timeout: 1000 })

        await waitFor(() => {
            expect(screen.getByText(/you will receive: 1000.5 tokens/i)).toBeInTheDocument()
        })
    })

    it('handles successful exchange', async () => {
        const user = userEvent.setup()
        const mockSignature = 'mock-transaction-signature'

        mockExecuteTrade.mockResolvedValue({ success: true, txid: mockSignature })
        mockGetQuote.mockResolvedValue({
            outputAmount: '1000',
            exchangeRate: 1000,
            priceImpactPct: 0.1,
        })

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

        // Wait for quote
        await waitFor(() => {
            expect(screen.getByText(/you will receive/i)).toBeInTheDocument()
        }, { timeout: 1000 })

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(mockExecuteTrade).toHaveBeenCalledWith(
                expect.any(Object), // output mint
                0.1, // SOL amount
                expect.any(Object), // SOL mint
                100 // slippage bps
            )
        })

        await waitFor(() => {
            expect(mockOnExchange).toHaveBeenCalledWith({
                solAmount: 0.1,
                customTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                slippage: 1.0,
                signature: mockSignature
            })
        })
    })

    it('handles exchange errors', async () => {
        const user = userEvent.setup()
        const mockError = new Error('Exchange failed')

        mockExecuteTrade.mockRejectedValue(mockError)
        mockGetQuote.mockResolvedValue({
            outputAmount: '1000',
            exchangeRate: 1000,
            priceImpactPct: 0.1,
        })

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

        // Wait for quote
        await waitFor(() => {
            expect(screen.getByText(/you will receive/i)).toBeInTheDocument()
        }, { timeout: 1000 })

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(mockExecuteTrade).toHaveBeenCalled()
        })

        // onExchange should not be called on error
        expect(mockOnExchange).not.toHaveBeenCalled()
    })

    it('shows loading state during exchange', async () => {
        const user = userEvent.setup()

        // Make the trade hang
        mockExecuteTrade.mockImplementation(() => new Promise(() => { }))
        mockGetQuote.mockResolvedValue({
            outputAmount: '1000',
            exchangeRate: 1000,
            priceImpactPct: 0.1,
        })

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

        // Wait for quote
        await waitFor(() => {
            expect(screen.getByText(/you will receive/i)).toBeInTheDocument()
        }, { timeout: 1000 })

        const exchangeButton = screen.getByRole('button', { name: /exchange sol/i })
        await user.click(exchangeButton)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /exchanging/i })).toBeDisabled()
        })
    })

    it('shows price impact warning for high impact trades', async () => {
        const user = userEvent.setup()
        const mockQuote = {
            outputAmount: '1000',
            exchangeRate: 1000,
            priceImpactPct: 5.2, // High price impact
        }

        mockGetQuote.mockResolvedValue(mockQuote)

        render(<SolExchangeForm onExchange={mockOnExchange} />)

        const solInput = screen.getByLabelText(/sol amount/i)
        const mintInput = screen.getByLabelText(/custom token mint address/i)

        await user.type(solInput, '0.1')
        await user.type(mintInput, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

        await waitFor(() => {
            expect(screen.getByText(/price impact: 5.20%/i)).toBeInTheDocument()
        }, { timeout: 1000 })
    })
})