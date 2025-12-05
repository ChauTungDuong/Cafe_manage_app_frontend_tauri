import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { paymentsApi } from "./api";

const WS_URL = "https://cafe-management-app-backend.onrender.com";
const WS_NAMESPACE = "/payment"; // Payment WebSocket namespace

interface PaymentWebSocketOptions {
  orderCode: string;
  onPaymentSuccess?: (data: { orderCode: string; message: string }) => void;
  onPaymentFailed?: (data: { orderCode: string; message: string }) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number; // Milliseconds for polling fallback
  enabled?: boolean;
}

interface UsePaymentWebSocketReturn {
  isConnected: boolean;
  isPolling: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  checkStatusManually: () => Promise<boolean>;
}

export function usePaymentWebSocket({
  orderCode,
  onPaymentSuccess,
  onPaymentFailed,
  onError,
  pollingInterval = 3000, // Default 3 seconds for faster response
  enabled = true,
}: PaymentWebSocketOptions): UsePaymentWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to store callbacks to avoid stale closures
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  const onPaymentFailedRef = useRef(onPaymentFailed);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onPaymentSuccessRef.current = onPaymentSuccess;
    onPaymentFailedRef.current = onPaymentFailed;
    onErrorRef.current = onError;
  }, [onPaymentSuccess, onPaymentFailed, onError]);
  const [isPolling, setIsPolling] = useState(false);

  // Check payment status via API (polling fallback)
  const checkStatusManually = useCallback(async (): Promise<boolean> => {
    if (!orderCode) return false;

    try {
      console.log("🔄 Polling payment status for:", orderCode);
      const status = await paymentsApi.checkStatus(orderCode);
      console.log("📊 Payment status:", status);

      if (status.isPaid) {
        console.log(
          "✅ Payment confirmed via polling! Calling success callback..."
        );
        // Use ref to ensure we call the latest callback
        onPaymentSuccessRef.current?.({
          orderCode: status.orderCode,
          message: "Thanh toán thành công!",
        });
        return true;
      }

      if (
        status.orderStatus === "failed" ||
        status.orderStatus === "cancelled"
      ) {
        console.log("❌ Payment failed via polling");
        onPaymentFailedRef.current?.({
          orderCode: status.orderCode,
          message: "Thanh toán thất bại!",
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("❌ Polling error:", err);
      return false;
    }
  }, [orderCode]);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // Already polling

    console.log("📡 Starting polling fallback...");
    setIsPolling(true);

    pollingRef.current = setInterval(async () => {
      const completed = await checkStatusManually();
      if (completed && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    }, pollingInterval);
  }, [checkStatusManually, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      console.log("🛑 Stopping polling");
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setIsPolling(false);
    }
  }, []);

  // Subscribe to payment updates
  const subscribe = useCallback(() => {
    if (!orderCode) return;

    if (socketRef.current?.connected) {
      console.log("📢 Subscribing to payment updates for:", orderCode);
      socketRef.current.emit("subscribe", { orderCode });
    }

    // Also start polling as fallback
    startPolling();
  }, [orderCode, startPolling]);

  // Unsubscribe from payment updates
  const unsubscribe = useCallback(() => {
    if (!orderCode) return;

    if (socketRef.current?.connected) {
      console.log("📢 Unsubscribing from payment updates for:", orderCode);
      socketRef.current.emit("unsubscribe", { orderCode });
    }

    stopPolling();
  }, [orderCode, stopPolling]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enabled || !orderCode) return;

    console.log("🔌 Connecting to WebSocket:", WS_URL + WS_NAMESPACE);

    // Connect to the /payment namespace
    const socket = io(WS_URL + WS_NAMESPACE, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Debug: Listen to all events
    socket.onAny((eventName, ...args) => {
      console.log("📨 Received event:", eventName, args);
    });

    // Connection events
    socket.on("connect", () => {
      console.log("✅ WebSocket connected:", socket.id);
      setIsConnected(true);

      // Auto-subscribe when connected
      if (orderCode) {
        console.log("📢 Auto-subscribing to order:", orderCode);
        socket.emit("subscribe", { orderCode });
      }

      // Always start polling as backup even when WebSocket is connected
      startPolling();
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      onErrorRef.current?.(error);

      // Fallback to polling on connection error
      startPolling();
    });

    // Payment events - use refs to avoid stale closures
    // Listen to multiple possible event names
    const handlePaymentSuccess = (data: any) => {
      console.log("✅ Payment success event received:", data);
      const receivedOrderCode =
        data?.orderCode || data?.order_code || data?.orderId;
      if (receivedOrderCode === orderCode) {
        console.log("🎉 Matched orderCode! Calling success callback...");
        stopPolling();
        onPaymentSuccessRef.current?.({
          orderCode: receivedOrderCode,
          message: data?.message || "Thanh toán thành công!",
        });
      }
    };

    // Listen to various possible event names from backend
    socket.on("paymentSuccess", handlePaymentSuccess);
    socket.on("payment_success", handlePaymentSuccess);
    socket.on("payment-success", handlePaymentSuccess);
    socket.on("success", handlePaymentSuccess);

    const handlePaymentFailed = (data: any) => {
      console.log("❌ Payment failed event received:", data);
      const receivedOrderCode =
        data?.orderCode || data?.order_code || data?.orderId;
      if (receivedOrderCode === orderCode) {
        stopPolling();
        onPaymentFailedRef.current?.({
          orderCode: receivedOrderCode,
          message: data?.message || "Thanh toán thất bại!",
        });
      }
    };

    socket.on("paymentFailed", handlePaymentFailed);
    socket.on("payment_failed", handlePaymentFailed);
    socket.on("payment-failed", handlePaymentFailed);
    socket.on("failed", handlePaymentFailed);

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up WebSocket...");
      stopPolling();
      if (socket.connected) {
        socket.emit("unsubscribe", { orderCode });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [enabled, orderCode, startPolling, stopPolling]);

  return {
    isConnected,
    isPolling,
    subscribe,
    unsubscribe,
    checkStatusManually,
  };
}
