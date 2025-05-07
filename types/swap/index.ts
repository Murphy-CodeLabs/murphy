import { PublicKey, Connection } from "@solana/web3.js";

export interface Config {
    JUPITER_REFERRAL_ACCOUNT?: string;
    JUPITER_FEE_BPS?: number;
}
  
declare const _default: {
    Config: Config;
};


export default _default; 