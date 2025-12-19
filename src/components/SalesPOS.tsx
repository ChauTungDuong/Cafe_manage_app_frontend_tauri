import { useState, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  QrCode,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  itemsApi,
  tablesApi,
  taxesApi,
  ordersApi,
  paymentsApi,
} from "../lib/api";
import { usePaymentWebSocket } from "../lib/usePaymentWebSocket";
import type { Item, Table, Tax } from "../types/api";
import { toast } from "sonner";

interface OrderItem extends Item {
  quantity: number;
}

interface SalesPOSProps {
  currentUser?: {
    id: string;
    name: string;
    role: "admin" | "staff";
  };
}

export function SalesPOS({ currentUser }: SalesPOSProps) {
  // Data state
  const [items, setItems] = useState<Item[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [order, setOrder] = useState<OrderItem[]>([]);

  // Loading & Error state
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "QR" | "card">(
    "cash"
  );
  const [qrCode, setQrCode] = useState<string>("");
  const [orderCode, setOrderCode] = useState<string>("");
  const [orderId, setOrderId] = useState<string>(""); // Store order ID for payment

  // Payment result dialog state
  const [showPaymentResultDialog, setShowPaymentResultDialog] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    message: string;
    orderCode: string;
    total: number;
  } | null>(null);

  // WebSocket enabled when showing QR payment
  const [wsEnabled, setWsEnabled] = useState(false);

  // Reset form helper
  const resetForm = useCallback(async () => {
    setOrder([]);
    setSelectedTable("");
    setSelectedTaxes([]);
    setSelectedDiscounts([]);
    setShowPaymentDialog(false);
    setOrderCode("");
    setOrderId("");
    setQrCode("");
    setWsEnabled(false);
    // Reload data
    await Promise.all([loadItems(), loadTables()]);
  }, []);

  // Payment WebSocket hook - handles real-time payment notifications
  const { checkStatusManually } = usePaymentWebSocket({
    orderCode: orderCode,
    enabled: wsEnabled && paymentMethod === "QR" && !!qrCode,
    onPaymentSuccess: async (data) => {
      console.log("🎉 Payment success from WebSocket!", data);
      setWsEnabled(false);
      setPaymentResult({
        success: true,
        message: "Thanh toán thành công!",
        orderCode: data.orderCode,
        total: total,
      });
      setShowPaymentDialog(false);
      setShowPaymentResultDialog(true);
      await resetForm();
    },
    onPaymentFailed: (data) => {
      console.log("❌ Payment failed from WebSocket", data);
      setWsEnabled(false);
      setPaymentResult({
        success: false,
        message: data.message || "Thanh toán thất bại!",
        orderCode: data.orderCode,
        total: total,
      });
      setShowPaymentDialog(false);
      setShowPaymentResultDialog(true);
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  const loadItems = async () => {
    setIsLoadingItems(true);
    setError("");
    try {
      const data = await itemsApi.list({ status: "available" });
      setItems(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách sản phẩm";
      setError(message);
      console.error("Load items error:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const data = await tablesApi.list();
      setTables(data);
    } catch (err: any) {
      console.error("Load tables error:", err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadTaxes = async () => {
    setIsLoadingTaxes(true);
    try {
      const data = await taxesApi.list();
      setTaxes(data);
    } catch (err: any) {
      console.error("Load taxes error:", err);
    } finally {
      setIsLoadingTaxes(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadItems();
    loadTables();
    loadTaxes();
  }, []);

  // Get unique categories from items
  const categories = [
    "all",
    ...Array.from(new Set(items.map((item) => item.category.name))),
  ];

  // Translate category names to Vietnamese
  const translateCategory = (categoryName: string | undefined): string => {
    if (!categoryName) return "N/A";

    const translations: Record<string, string> = {
      coffee: "Cà phê",
      "milk tea": "Trà sữa",
      tea: "Trà",
      smoothie: "Sinh tố",
      juice: "Nước ép",
      soda: "Soda",
      yogurt: "Sữa chua",
      "soft drinks": "Thức uống có ga",
      dessert: "Tráng miệng",
      cake: "Bánh ngọt",
      pastry: "Bánh mì",
      snack: "Đồ ăn vặt",
      food: "Đồ ăn",
      breakfast: "Bữa sáng",
    };

    return translations[categoryName.toLowerCase()] || categoryName;
  };

  // Filter items by category
  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.category.name === selectedCategory);

  const addToOrder = (item: Item) => {
    // Check stock
    const currentQuantity = order.find((o) => o.id === item.id)?.quantity || 0;
    if (currentQuantity >= item.amountLeft) {
      toast.error(`Không đủ hàng! Còn lại: ${item.amountLeft}`);
      return;
    }

    const existing = order.find((orderItem) => orderItem.id === item.id);
    if (existing) {
      setOrder(
        order.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setOrder([...order, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrder(
      order.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          // Check stock limit
          if (newQuantity > item.amountLeft) {
            toast.error(`Không đủ hàng! Còn lại: ${item.amountLeft}`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setOrder(order.filter((item) => item.id !== id));
  };

  // Calculate totals
  // Logic: Tính thuế và giảm giá dựa trên nhiều lựa chọn
  const subtotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Tính tổng thuế từ các thuế được chọn
  const selectedTaxData = taxes.filter((t) => selectedTaxes.includes(t.id));
  const totalTaxAmount = selectedTaxData.reduce((sum, tax) => {
    return sum + (subtotal * Math.abs(parseFloat(String(tax.percent)))) / 100;
  }, 0);

  // Tính tổng giảm giá từ các giảm giá được chọn (tính trên subtotal theo yêu cầu)
  const selectedDiscountData = taxes.filter((t) =>
    selectedDiscounts.includes(t.id)
  );
  const totalDiscountAmount = selectedDiscountData.reduce((sum, discount) => {
    return (
      sum + (subtotal * Math.abs(parseFloat(String(discount.percent)))) / 100
    );
  }, 0);

  // Tổng cuối cùng = subtotal + tổng thuế - tổng giảm giá
  const total = Math.max(0, subtotal + totalTaxAmount - totalDiscountAmount);

  const handleCheckout = async () => {
    // Prevent duplicate calls
    if (isProcessing) {
      console.log("⚠️ Already processing, ignoring duplicate call");
      return;
    }

    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để thực hiện thanh toán!");
      return;
    }

    if (order.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào đơn hàng!");
      return;
    }

    if (!selectedTable) {
      toast.error("Vui lòng chọn bàn!");
      return;
    }

    console.log("🚀 Starting checkout process...");
    setIsProcessing(true);
    setError("");

    try {
      // Create order
      const orderDto = {
        createdBy: currentUser.id,
        tableId: selectedTable,
        taxDiscountIds: [...selectedTaxes, ...selectedDiscounts], // Combine taxes and discounts
        orderItems: order.map((item) => ({
          amount: item.quantity,
          itemId: item.id,
        })),
      };

      console.log("📦 Creating order:", orderDto);
      const createdOrder = await ordersApi.create(orderDto);
      console.log("✅ Order created:", createdOrder);
      setOrderId(createdOrder.id); // Store order ID for payment
      setOrderCode(createdOrder.orderCode); // Store orderCode for display

      // Show payment dialog
      setShowPaymentDialog(true);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể tạo đơn hàng. Vui lòng thử lại!";
      setError(message);
      toast.error(message);
      console.error("❌ Create order error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    // Prevent duplicate calls
    if (isProcessing) {
      console.log("⚠️ Already processing payment, ignoring duplicate call");
      return;
    }

    if (!orderId) {
      console.error("❌ No orderId available");
      return;
    }

    console.log("💳 Starting payment process...");
    setIsProcessing(true);
    setError("");

    try {
      const paymentDto = {
        orderId: orderId, // Use order ID, not orderCode
        method: paymentMethod,
      };

      console.log("💰 Creating payment:", paymentDto);
      const payment = await paymentsApi.create(paymentDto);
      console.log("✅ Payment created:", payment);

      if (paymentMethod === "QR" && payment.qrCode) {
        setQrCode(payment.qrCode);
        // Enable WebSocket for real-time payment notification
        setWsEnabled(true);
        console.log("🔌 WebSocket enabled for QR payment monitoring");
      } else {
        // Payment success for cash/card
        // Show success dialog for cash/card payments
        setPaymentResult({
          success: true,
          message: "Thanh toán thành công!",
          orderCode: payment.orderCode || orderCode,
          total: total,
        });
        setShowPaymentDialog(false);
        setShowPaymentResultDialog(true);

        // Reset form
        await resetForm();
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể thanh toán. Vui lòng thử lại!";
      setError(message);
      toast.error(message);
      console.error("Payment error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteQRPayment = async () => {
    // Prevent duplicate calls
    if (isProcessing) {
      console.log(
        "⚠️ Already processing QR payment completion, ignoring duplicate call"
      );
      return;
    }

    setIsProcessing(true);

    // Check payment status first
    try {
      const isPaid = await checkStatusManually();
      if (isPaid) {
        // WebSocket callback will handle success
        setIsProcessing(false);
        return;
      }

      // Manual confirmation - show success
      setPaymentResult({
        success: true,
        message: "Thanh toán QR thành công!",
        orderCode: orderCode,
        total: total,
      });
      setShowPaymentDialog(false);
      setShowPaymentResultDialog(true);

      // Reset form
      await resetForm();
    } catch (err) {
      console.error("Error checking payment status:", err);
      // Still allow manual confirmation
      setPaymentResult({
        success: true,
        message: "Thanh toán QR thành công!",
        orderCode: orderCode,
        total: total,
      });
      setShowPaymentDialog(false);
      setShowPaymentResultDialog(true);
      await resetForm();
    }

    setIsProcessing(false);
  };

  const availableTables = tables.filter((t) => t.status === "available");

  return (
    <div className="flex gap-6 h-full">
      {/* Products Section */}
      <div className="flex-1">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              disabled={isLoadingItems}
              className={`h-14 px-6 rounded-2xl transition-all ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                  : "bg-white text-amber-900 hover:bg-orange-50 border-2 border-orange-200"
              }`}
            >
              {category === "all" ? "Tất cả" : translateCategory(category)}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <ScrollArea className="h-[calc(100vh-220px)]">
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <span className="ml-3 text-amber-900">Đang tải sản phẩm...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-amber-600/50">
              Không có sản phẩm
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl group flex flex-col"
                  onClick={() => addToOrder(item)}
                  style={{ height: "360px" }}
                >
                  <div
                    className="relative bg-gradient-to-br from-orange-50 to-amber-50 flex-shrink-0"
                    style={{ height: "200px" }}
                  >
                    <ImageWithFallback
                      src={
                        item.image ||
                        `https://images.unsplash.com/photo-1635090976010-d3f6dfbb1bac?w=400`
                      }
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div
                    className="p-4 flex flex-col"
                    style={{ height: "160px" }}
                  >
                    <h4
                      className="mb-1 text-amber-900 truncate font-medium"
                      style={{ height: "24px", lineHeight: "24px" }}
                    >
                      {item.name}
                    </h4>
                    <p
                      className="text-orange-600 font-semibold text-lg mt-3"
                      style={{ height: "28px", lineHeight: "98px" }}
                    >
                      {item.price.toLocaleString("vi-VN")}đ
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Order Section */}
      <div className="w-[420px]">
        <Card className="h-full bg-white rounded-2xl shadow-xl border-2 border-orange-100">
          <div className="p-6 border-b border-orange-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-amber-900">Đơn hàng</h3>
            </div>

            {/* Table Selection */}
            <div className="space-y-2 mb-3">
              <label className="text-sm text-amber-900">Chọn bàn</label>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={isLoadingTables}
              >
                <SelectTrigger className="h-11 rounded-xl border-orange-200">
                  <SelectValue
                    placeholder={
                      isLoadingTables ? "Đang tải..." : "Chọn bàn..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.seat} chỗ)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax Selection - Collapsible */}
            <Collapsible
              open={isTaxOpen}
              onOpenChange={setIsTaxOpen}
              className="mb-3"
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                <span className="text-sm text-amber-900 font-medium">
                  Thuế {selectedTaxes.length > 0 && `(${selectedTaxes.length})`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-amber-700 transition-transform ${
                    isTaxOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 max-h-32 overflow-y-auto border border-orange-200 rounded-xl p-3">
                  {isLoadingTaxes ? (
                    <div className="text-sm text-amber-600">Đang tải...</div>
                  ) : taxes.filter((t) => t.type === "tax").length === 0 ? (
                    <div className="text-sm text-amber-600/50">
                      Không có thuế
                    </div>
                  ) : (
                    taxes
                      .filter((t) => t.type === "tax")
                      .map((tax) => (
                        <label
                          key={tax.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTaxes.includes(tax.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTaxes([...selectedTaxes, tax.id]);
                              } else {
                                setSelectedTaxes(
                                  selectedTaxes.filter((id) => id !== tax.id)
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-amber-900">
                            {tax.name} (+
                            {Math.abs(parseFloat(String(tax.percent)))}%)
                          </span>
                        </label>
                      ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Discount Selection - Collapsible */}
            <Collapsible open={isDiscountOpen} onOpenChange={setIsDiscountOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                <span className="text-sm text-amber-900 font-medium">
                  Giảm giá{" "}
                  {selectedDiscounts.length > 0 &&
                    `(${selectedDiscounts.length})`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-amber-700 transition-transform ${
                    isDiscountOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2 max-h-32 overflow-y-auto border border-orange-200 rounded-xl p-3">
                  {isLoadingTaxes ? (
                    <div className="text-sm text-amber-600">Đang tải...</div>
                  ) : taxes.filter((t) => t.type === "discount").length ===
                    0 ? (
                    <div className="text-sm text-amber-600/50">
                      Không có giảm giá
                    </div>
                  ) : (
                    taxes
                      .filter((t) => t.type === "discount")
                      .map((discount) => (
                        <label
                          key={discount.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-orange-50 p-2 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDiscounts.includes(discount.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDiscounts([
                                  ...selectedDiscounts,
                                  discount.id,
                                ]);
                              } else {
                                setSelectedDiscounts(
                                  selectedDiscounts.filter(
                                    (id) => id !== discount.id
                                  )
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-amber-900">
                            {discount.name} (-
                            {Math.abs(parseFloat(String(discount.percent)))}%)
                          </span>
                        </label>
                      ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Order Items */}
          <ScrollArea className="h-[calc(100vh-600px)] p-6">
            {order.length === 0 ? (
              <div className="text-center py-12 text-amber-600/50">
                Chưa có sản phẩm
              </div>
            ) : (
              <div className="space-y-3">
                {order.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm text-amber-900">{item.name}</h4>
                      <p className="text-sm text-orange-600">
                        {item.price.toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-orange-200"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center text-sm text-amber-900">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-orange-200"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          updateQuantity(item.id, 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Summary */}
          <div className="p-6 border-t border-orange-100 space-y-3">
            <div className="flex justify-between text-sm text-amber-900">
              <span>Tạm tính:</span>
              <span>{subtotal.toLocaleString("vi-VN")}đ</span>
            </div>
            {selectedTaxData.length > 0 && (
              <>
                {selectedTaxData.map((tax) => (
                  <div
                    key={tax.id}
                    className="flex justify-between text-sm text-blue-600"
                  >
                    <span>
                      {tax.name} (+{Math.abs(parseFloat(String(tax.percent)))}
                      %):
                    </span>
                    <span>
                      +
                      {(
                        (subtotal * Math.abs(parseFloat(String(tax.percent)))) /
                        100
                      ).toLocaleString("vi-VN")}
                      đ
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium text-blue-700">
                  <span>Tổng thuế:</span>
                  <span>+{totalTaxAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </>
            )}
            {selectedDiscountData.length > 0 && (
              <>
                {selectedDiscountData.map((discount) => (
                  <div
                    key={discount.id}
                    className="flex justify-between text-sm text-green-600"
                  >
                    <span>
                      {discount.name} (-
                      {Math.abs(parseFloat(String(discount.percent)))}%):
                    </span>
                    <span>
                      -
                      {(
                        (subtotal *
                          Math.abs(parseFloat(String(discount.percent)))) /
                        100
                      ).toLocaleString("vi-VN")}
                      đ
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium text-green-700">
                  <span>Tổng giảm giá:</span>
                  <span>-{totalDiscountAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </>
            )}
            <Separator className="bg-orange-200" />
            <div className="flex justify-between text-lg font-semibold text-amber-900">
              <span>Tổng cộng:</span>
              <span className="text-orange-600">
                {total.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={order.length === 0 || !selectedTable || isProcessing}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Thanh toán"
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          // Chỉ cho phép đóng nếu không đang hiển thị QR hoặc click vào nút Hủy
          if (!open && qrCode) {
            // Đang hiển thị QR - không cho đóng bằng click outside
            return;
          }
          setShowPaymentDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Thanh toán đơn hàng
            </DialogTitle>
            <DialogDescription className="sr-only">
              Chọn phương thức thanh toán cho đơn hàng
            </DialogDescription>
          </DialogHeader>

          {qrCode ? (
            // QR Code Display
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Quét mã QR để thanh toán
                </p>
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                  />
                </div>
                <p className="text-lg font-semibold text-orange-600 mt-4">
                  {total.toLocaleString("vi-VN")}đ
                </p>
                <p className="text-sm text-gray-500">
                  Mã đơn hàng: {orderCode}
                </p>

                {/* Warning message */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium">
                    ⚠️ Quý khách vui lòng không thay đổi nội dung chuyển khoản
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setQrCode("");
                    setWsEnabled(false);
                    setShowPaymentDialog(false);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600"
                  onClick={handleCompleteQRPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận đã thanh toán"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Payment Method Selection
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Chọn phương thức thanh toán
                </label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Tiền mặt</SelectItem>
                    <SelectItem value="QR">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        QR Code
                      </div>
                    </SelectItem>
                    <SelectItem value="card">💳 Thẻ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Mã đơn hàng:</span>
                  <span className="text-sm font-medium">{orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tổng tiền:</span>
                  <span className="text-lg font-semibold text-orange-600">
                    {total.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessing}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận thanh toán"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Result Dialog */}
      <Dialog
        open={showPaymentResultDialog}
        onOpenChange={setShowPaymentResultDialog}
      >
        <DialogContent className="w-[90vw] max-w-[360px] max-h-[420px] p-4 rounded-2xl flex items-center justify-center">
          {/* Hidden title and description for accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>
              {paymentResult?.success
                ? "Thanh toán thành công"
                : "Thanh toán thất bại"}
            </DialogTitle>
            <DialogDescription>
              {paymentResult?.success
                ? "Đơn hàng đã được thanh toán thành công"
                : paymentResult?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full">
            {paymentResult?.success ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Thanh toán thành công!
                </h3>
                <p className="text-sm text-gray-500">
                  Đơn hàng đã được thanh toán
                </p>
                <div className="bg-gray-50 rounded-lg p-3 w-full text-center">
                  <p className="text-xs text-gray-500">Mã đơn hàng</p>
                  <p className="text-sm font-medium text-gray-700">
                    {paymentResult.orderCode}
                  </p>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    {paymentResult.total.toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  onClick={() => {
                    setShowPaymentResultDialog(false);
                    setPaymentResult(null);
                  }}
                >
                  Hoàn tất
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Thanh toán thất bại
                </h3>
                <p className="text-sm text-gray-500">
                  {paymentResult?.message}
                </p>
                <p className="text-xs text-gray-400">
                  Mã đơn hàng: {paymentResult?.orderCode}
                </p>
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                  onClick={() => {
                    setShowPaymentResultDialog(false);
                    setPaymentResult(null);
                  }}
                >
                  Đóng
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
