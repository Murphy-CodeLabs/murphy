import { PublicKey } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import millify from "millify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const shortAddress = (address: PublicKey | string) => {
  const key = typeof address === "string" ? address : address.toBase58();
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

export const formatUsd = (num: number): string => {
  return formatNumber(num, { style: "currency", currency: "USD" });
};

export const formatNumber = (
  num: number,
  options: Intl.NumberFormatOptions = {},
): string => {
  if (num === null || num === undefined) return "0";

  const absNum = Math.abs(num);
  let decimals = 2;

  if (absNum < 1) {
    decimals = Math.max(2, Math.min(20, Math.ceil(-Math.log10(absNum)) + 2));
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
    ...options,
  }).format(num);
};

export const formatNumberShort = (num: number): string => {
  if (num < 1000) return formatNumber(num);
  return millify(num, {
    precision: 2,
  });
};