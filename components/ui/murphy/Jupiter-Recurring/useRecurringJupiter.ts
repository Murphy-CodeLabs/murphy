import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface RecurringOrder {
  id: string;
  inputMint: string;
  outputMint: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // ... các trường khác tuỳ API trả về
  [key: string]: any;
}

export type RecurringType = "time" | "price" | "all";
export type OrderStatus = "active" | "history";

export function useRecurringJupiter(
  initialType: RecurringType = "time",
  initialStatus: OrderStatus = "active",
  initialIncludeFailedTx: boolean = false
) {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecurringOrder[] | null>(null);
  const [recurringType, setRecurringType] = useState<RecurringType>(initialType);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(initialStatus);
  const [includeFailedTx, setIncludeFailedTx] = useState<boolean>(initialIncludeFailedTx);

  const fetchOrders = useCallback(
    async (
      type?: RecurringType,
      status?: OrderStatus,
      includeFailed?: boolean
    ) => {
      const useType = type || recurringType;
      const useStatus = status || orderStatus;
      const useIncludeFailed =
        typeof includeFailed === "boolean" ? includeFailed : includeFailedTx;
      if (!publicKey) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(
          `https://lite-api.jup.ag/recurring/v1/getRecurringOrders?user=${publicKey.toString()}&recurringType=${useType}&orderStatus=${useStatus}&includeFailedTx=${useIncludeFailed}`
        );
        let result: any = null;
        let text = await resp.text();
        try {
          result = JSON.parse(text);
        } catch (e) {
          throw new Error(text || "Invalid response from Jupiter API");
        }
        if (!resp.ok || !Array.isArray(result.orders)) {
          throw new Error(result.error || text || "Failed to fetch recurring orders");
        }
        setData(result.orders);
      } catch (e: any) {
        setError(e.message || "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, recurringType, orderStatus, includeFailedTx]
  );

  // Đổi loại recurringType, orderStatus, includeFailedTx và refetch
  const setTypeStatusFailedAndRefetch = (
    type: RecurringType,
    status?: OrderStatus,
    includeFailed?: boolean
  ) => {
    setRecurringType(type);
    if (status) setOrderStatus(status);
    if (typeof includeFailed === "boolean") setIncludeFailedTx(includeFailed);
    fetchOrders(type, status, includeFailed);
  };

  // Đổi orderStatus và refetch
  const setStatusAndRefetch = (status: OrderStatus) => {
    setOrderStatus(status);
    fetchOrders(undefined, status);
  };

  // Đổi includeFailedTx và refetch
  const setIncludeFailedTxAndRefetch = (val: boolean) => {
    setIncludeFailedTx(val);
    fetchOrders(undefined, undefined, val);
  };

  return {
    loading,
    error,
    data,
    recurringType,
    orderStatus,
    includeFailedTx,
    setRecurringType: setTypeStatusFailedAndRefetch,
    setOrderStatus: setStatusAndRefetch,
    setIncludeFailedTx: setIncludeFailedTxAndRefetch,
    refetch: fetchOrders,
  };
}

export default useRecurringJupiter; 
