"use client";

import React, {
  DetailedHTMLProps,
  FC,
  ImgHTMLAttributes,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWallet, Wallet } from "@solana/wallet-adapter-react";
import { WalletName, WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletMultiButton } from "@/hook/murphis/use-walletMultiButton";
import { Button, type buttonVariants } from "../button";
import type { VariantProps } from "class-variance-authority";
import { ModalContext } from "@/components/providers/wallet-provider";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

// ----- Label Constants -----
const LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting ...",
  "copy-address": "Copy address",
  copied: "Copied",
  disconnect: "Disconnect",
  "has-wallet": "Connect Wallet",
  "no-wallet": "Select Wallet",
} as const;

// ----- Props -----
type WalletButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    labels?: Partial<typeof LABELS>;
    asChild?: boolean;
  };

type Props = WalletButtonProps;

export interface WalletIconProps
  extends DetailedHTMLProps<
    ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  > {
  wallet: { adapter: Pick<Wallet["adapter"], "icon" | "name"> } | null;
}

export interface WalletListItemProps {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  tabIndex?: number;
  wallet: Wallet;
}

// ----- Wallet List Item -----
export const WalletListItem: FC<WalletListItemProps> = ({
  handleClick,
  tabIndex,
  wallet,
}) => (
  <Button
    onClick={handleClick}
    tabIndex={tabIndex}
    variant="outline"
    className="justify-start w-full"
  >
    {wallet.adapter.icon && (
      <img
        src={wallet.adapter.icon}
        alt={`${wallet.adapter.name} icon`}
        className="mr-2 h-5 w-5"
      />
    )}
    {wallet.adapter.name}
    {wallet.readyState === WalletReadyState.Installed && (
      <span className="ml-auto text-xs text-green-500">Detected</span>
    )}
  </Button>
);

// ----- Wallet Modal Component -----
export const WalletModal: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const { wallets, select } = useWallet();
  const [expanded, setExpanded] = useState(false);

  // Access the modal context to get network information
  const modalContext = React.useContext(ModalContext);
  const isMainnet = modalContext?.isMainnet ?? true;

  const [listedWallets, collapsedWallets] = useMemo(() => {
    const installed = wallets.filter(
      (w) => w.readyState === WalletReadyState.Installed
    );
    const notInstalled = wallets.filter(
      (w) => w.readyState !== WalletReadyState.Installed
    );
    return installed.length ? [installed, notInstalled] : [notInstalled, []];
  }, [wallets]);

  const handleWalletClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, walletName: WalletName) => {
      event.preventDefault();
      select(walletName);
      onOpenChange(false);
    },
    [select, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {listedWallets.length
              ? "Connect a wallet on Solana to continue"
              : "You'll need a wallet on Solana to continue"}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Network:{" "}
            <span className={isMainnet ? "text-green-500" : "text-yellow-500"}>
              {isMainnet ? "Mainnet" : "Testnet"}
            </span>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-4">
          {listedWallets.map((wallet) => (
            <WalletListItem
              key={wallet.adapter.name}
              wallet={wallet}
              handleClick={(e) => handleWalletClick(e, wallet.adapter.name)}
            />
          ))}

          {collapsedWallets.length > 0 && (
            <Collapsible
              open={expanded}
              onOpenChange={setExpanded}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  {expanded ? "Less" : "More"} options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {collapsedWallets.map((wallet) => (
                  <WalletListItem
                    key={wallet.adapter.name}
                    wallet={wallet}
                    handleClick={(e) =>
                      handleWalletClick(e, wallet.adapter.name)
                    }
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-2">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

// ----- Base Wallet Button -----
export function BaseWalletConnectionButton({
  walletIcon,
  walletName,
  className,
  children,
  ...props
}: WalletButtonProps & {
  walletIcon?: string | null;
  walletName?: string | null;
}) {
  return (
    <Button {...props} className={className}>
      {children}
    </Button>
  );
}

// ----- Wallet Multi Button -----
export function BaseWalletMultiButton({
  children,
  labels = LABELS,
  ...props
}: Props) {
  const {
    buttonState,
    onConnect,
    onDisconnect,
    publicKey,
    walletIcon,
    walletName,
  } = useWalletMultiButton({
    onSelectWallet() {
      setWalletModalOpen(true);
    },
  });
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // This effect runs only on the client after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const content = useMemo(() => {
    // Before component is mounted, always use "Select Wallet" to match SSR
    if (!mounted) {
      return labels["no-wallet"];
    }

    // When connected, always show the wallet address
    if (publicKey) {
      const base58 = publicKey.toBase58();
      return base58.slice(0, 4) + ".." + base58.slice(-4);
    }

    // When not connected, prioritize custom children text
    if (children) {
      return children;
    } else if (buttonState === "connecting") {
      return labels["connecting"];
    } else {
      return labels["has-wallet"]; // Use consistent label from LABELS
    }
  }, [buttonState, children, labels, publicKey, mounted]);

  // If not connected, show a simple button that opens the wallet modal
  if (!publicKey) {
    return (
      <>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
        <Button
          {...props}
          onClick={() => {
            if (buttonState === "has-wallet" && onConnect) {
              onConnect();
            } else {
              setWalletModalOpen(true);
            }
          }}
        >
          {content}
        </Button>
      </>
    );
  }

  // If connected, show the dropdown menu
  return (
    <>
      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button {...props}>
            {walletIcon && (
              <img
                src={walletIcon}
                alt="Wallet icon"
                className="mr-2 h-4 w-4"
              />
            )}
            {content}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {publicKey && (
            <DropdownMenuItem
              onClick={async () => {
                await navigator.clipboard.writeText(publicKey.toBase58());
                setCopied(true);
                setTimeout(() => setCopied(false), 400);
              }}
            >
              {copied ? labels["copied"] : labels["copy-address"]}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              setWalletModalOpen(true);
              setMenuOpen(false);
            }}
          >
            {labels["change-wallet"]}
          </DropdownMenuItem>
          {onDisconnect && (
            <DropdownMenuItem
              onClick={() => {
                onDisconnect();
                setMenuOpen(false);
              }}
            >
              {labels["disconnect"]}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ----- Public Exported Button -----
export function ConnetWalletButton(props: WalletButtonProps) {
  return <BaseWalletMultiButton {...props} />;
}
