import { PublicKey, Connection } from "@solana/web3.js";

export interface Config {
    JUPITER_REFERRAL_ACCOUNT?: string;
    JUPITER_FEE_BPS?: number;
}
  
declare const _default: {
    Config: Config;
};

export type SolAsset = {
  mint: PublicKey;
  name: string;
  symbol: string;
  image: string;
  decimals: number;
  price: number;
  userTokenAccount?: {
    address: PublicKey;
    amount: number;
  };
};

export default _default; 