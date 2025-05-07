import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SolAsset, FetchAssetsArgs } from "@/types/assets";

const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);

const fetchAssets = async ({
  addresses,
  owner,
  connection,
}: FetchAssetsArgs): Promise<SolAsset[]> => {
  const fetchedAssets: SolAsset[] = [];
  const addressList = addresses.map((a) => a.toString()).join(",");
  const headers = {
    "x-api-key": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY!,
  };

  try {
    // Fetch metadata, prices, and balances (if owner provided) in parallel
    const fetchPromises = [
      fetch(
        `https://public-api.birdeye.so/defi/v3/token/meta-data/multiple?list_address=${addressList}`,
        {
          headers,
        },
      ),
      fetch(
        `https://public-api.birdeye.so/defi/multi_price?list_address=${addressList}`,
        {
          headers,
        },
      ),
    ];

    if (owner) {
      addresses.forEach((address) => {
        fetchPromises.push(
          fetch(
            `https://public-api.birdeye.so/v1/wallet/token_balance?wallet=${owner.toString()}&token_address=${address.toString()}`,
            {
              headers,
            },
          ),
        );
      });
    }

    const responses = await Promise.all(fetchPromises);
    const [metadataRes, pricesRes, ...balanceResponses] = await Promise.all(
      responses.map((res) => res.json()),
    );

    const metadata = metadataRes.data;
    const prices = pricesRes.data;

    // If owner and connection are provided, fetch native SOL balance
    let nativeSolBalance = 0;
    if (
      owner &&
      connection &&
      addresses.some((addr) => addr.equals(WSOL_MINT))
    ) {
      try {
        nativeSolBalance = await connection.getBalance(owner);
        nativeSolBalance = nativeSolBalance / LAMPORTS_PER_SOL;
      } catch (error) {
        console.error("Error fetching native SOL balance:", error);
      }
    }

    for (let i = 0; i < addresses.length; i++) {
      const addressStr = addresses[i].toString();
      const tokenData = metadata[addressStr];
      const priceData = prices[addressStr];
      const balanceData = owner ? balanceResponses[i]?.data : undefined;

      if (tokenData) {
        const asset: SolAsset = {
          mint: new PublicKey(tokenData.address),
          name: tokenData.name,
          symbol: tokenData.symbol,
          image: tokenData.logo_uri,
          price: priceData?.value || null,
          decimals: tokenData.decimals,
          userTokenAccount: balanceData
            ? {
                address: new PublicKey(balanceData.address),
                amount: balanceData.uiAmount,
              }
            : undefined,
        };

        // If this is WSOL and we have a native SOL balance, add it to the WSOL balance
        if (addresses[i].equals(WSOL_MINT) && nativeSolBalance > 0) {
          if (asset.userTokenAccount) {
            asset.userTokenAccount.amount += nativeSolBalance;
          } else {
            asset.userTokenAccount = {
              address: WSOL_MINT,
              amount: nativeSolBalance,
            };
          }
        }

        fetchedAssets.push(asset);
      }
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }

  return fetchedAssets;
};

export { fetchAssets };
