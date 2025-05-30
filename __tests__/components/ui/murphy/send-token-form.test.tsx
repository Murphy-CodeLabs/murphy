import { SendTokenForm } from '@/components/ui/murphy/send-token-form'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the wallet hook
const mockSendTransaction = jest.fn()
jest.mock('@/hook/murphy/use-walletModal', () => ({
    useWallet: () => ({
        connected: true,
        publicKey: { toString: () => 'mock-public-key' },
        sendTransaction: mockSendTransaction,
    }),
}))

describe('SendTokenForm', () => {
    const mockOnSuccess = jest.fn()
    const mockOnError = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders form fields correctly', () => {
        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('shows wallet connection requirement when not connected', () => {
        // Override the mock for this test
        jest.mocked(require('@/hook/murphy/use-walletModal').useWallet).mockReturnValue({
            connected: false,
            publicKey: null,
            sendTransaction: mockSendTransaction,
        })

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        expect(screen.getByText(/connect wallet/i)).toBeInTheDocument()
    })

    it('validates required fields', async () => {
        const user = userEvent.setup()

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/recipient is required/i)).toBeInTheDocument()
            expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
        })
    })

    it('validates Solana address format', async () => {
        const user = userEvent.setup()

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const recipientInput = screen.getByLabelText(/recipient/i)
        await user.type(recipientInput, 'invalid-address')

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/invalid solana address/i)).toBeInTheDocument()
        })
    })

    it('validates positive amount', async () => {
        const user = userEvent.setup()

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const amountInput = screen.getByLabelText(/amount/i)
        await user.type(amountInput, '-1')

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
        })
    })

    it('handles successful transaction', async () => {
        const user = userEvent.setup()
        const mockSignature = 'mock-transaction-signature'

        mockSendTransaction.mockResolvedValue(mockSignature)

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const recipientInput = screen.getByLabelText(/recipient/i)
        const amountInput = screen.getByLabelText(/amount/i)

        await user.type(recipientInput, '11111111111111111111111111111112')
        await user.type(amountInput, '1.5')

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledWith(mockSignature)
        })
    })

    it('handles transaction errors', async () => {
        const user = userEvent.setup()
        const mockError = new Error('Transaction failed')

        mockSendTransaction.mockRejectedValue(mockError)

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const recipientInput = screen.getByLabelText(/recipient/i)
        const amountInput = screen.getByLabelText(/amount/i)

        await user.type(recipientInput, '11111111111111111111111111111112')
        await user.type(amountInput, '1.5')

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith(mockError)
        })
    })

    it('shows loading state during transaction', async () => {
        const user = userEvent.setup()

        // Make the transaction hang
        mockSendTransaction.mockImplementation(() => new Promise(() => { }))

        render(
            <SendTokenForm
                onSuccess={mockOnSuccess}
                onError={mockOnError}
            />
        )

        const recipientInput = screen.getByLabelText(/recipient/i)
        const amountInput = screen.getByLabelText(/amount/i)

        await user.type(recipientInput, '11111111111111111111111111111112')
        await user.type(amountInput, '1.5')

        const sendButton = screen.getByRole('button', { name: /send/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()
        })
    })
})