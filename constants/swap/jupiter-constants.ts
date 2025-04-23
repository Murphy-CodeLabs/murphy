import { PublicKey } from "@solana/web3.js";

export const JUP_API = "https://quote-api.jup.ag/v6";
export const JUP_REFERRAL_ADDRESS = "JUPTRFXx5qe2wMFBtC7c7s6DvS3weDgAZu7Lr4ZKtoQ";

export const DEFAULT_OPTIONS = {
  SLIPPAGE_BPS: 50, // 0.5%
};

export const TOKENS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
};