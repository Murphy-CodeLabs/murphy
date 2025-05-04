import React, { useState, useMemo, createContext, useCallback } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  WalletProvider as SolanaWalletProvider,
  ConnectionProvider as SolanaConnectionProvider,
  ConnectionProviderProps,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { TxnSettingsProvider } from "../ui/murphy";
// Create wrapper components
// @ts-ignore - Ignore React 19 compatibility error
const ConnectionProviderWrapper = (props: ConnectionProviderProps) => (
  <SolanaConnectionProvider {...props} />
);
// @ts-ignore - Ignore React 19 compatibility error
const WalletProviderWrapper = (props: any) => (
  <SolanaWalletProvider {...props} />
);

interface WalletProviderProps {
  children: React.ReactNode;
  network?: WalletAdapterNetwork;
  endpoint?: string;
  wallets?: Adapter[];
  autoConnect?: boolean;
}

interface ModalContextState {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  endpoint?: string;
  switchToNextEndpoint: () => void;
  availableEndpoints: string[];
  currentEndpointIndex: number;
  isMainnet: boolean;
}

export const ModalContext = createContext<ModalContextState>({
  isOpen: false,
  setIsOpen: () => null,
  endpoint: undefined,
  switchToNextEndpoint: () => null,
  availableEndpoints: [],
  currentEndpointIndex: 0,
  isMainnet: true,
});

export const WalletProvider = ({ children, ...props }: WalletProviderProps) => {
  // Add state to store endpoints and current endpoint
  const [currentEndpointIndex, setCurrentEndpointIndex] = useState(0);

  // Determine if we're using mainnet or devnet based on environment variable
  const isMainnet = useMemo(() => {
    const mainnetEnv = process.env.NEXT_PUBLIC_USE_MAINNET;
    return mainnetEnv === undefined ? true : mainnetEnv === "true";
  }, []);

  // Network type based on the environment variable
  const networkType = useMemo(
    () =>
      isMainnet ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    [isMainnet]
  );

  // List of public RPC endpoints based on network type
  const publicRPCs = useMemo(
    () => [
      isMainnet
        ? (process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string)
        : (process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET as string),
    ],
    [isMainnet]
  );

  const defaultNetwork = useMemo(
    () => props.network || networkType,
    [props.network, networkType]
  );

  // Provided endpoint will be prioritized, otherwise use the current endpoint from the list
  const endpoint = useMemo(() => {
    if (props.endpoint) {
      return props.endpoint;
    }
    return publicRPCs[currentEndpointIndex];
  }, [props.endpoint, publicRPCs, currentEndpointIndex]);

  // Function to switch to the next endpoint when an error occurs
  const switchToNextEndpoint = useCallback(() => {
    setCurrentEndpointIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % publicRPCs.length;
      console.log(
        `Switching RPC endpoint from ${publicRPCs[prevIndex]} to ${publicRPCs[nextIndex]}`
      );
      return nextIndex;
    });
  }, [publicRPCs]);

  const wallets = useMemo(
    () => props.wallets || [new PhantomWalletAdapter()],
    [props.wallets]
  );
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        setIsOpen,
        endpoint,
        switchToNextEndpoint,
        availableEndpoints: publicRPCs,
        currentEndpointIndex,
        isMainnet,
      }}
    >
      <ConnectionProviderWrapper endpoint={endpoint}>
        <WalletProviderWrapper wallets={wallets} autoConnect>
          <TxnSettingsProvider>{children}</TxnSettingsProvider>
        </WalletProviderWrapper>
      </ConnectionProviderWrapper>
    </ModalContext.Provider>
  );
};
