import { useState, useEffect } from "react";
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
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  itemsApi,
  tablesApi,
  taxesApi,
  ordersApi,
  paymentsApi,
} from "../lib/api";
import type { Item, Table, Tax } from "../types/api";

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
  const [selectedTax, setSelectedTax] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
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

  // Load data on mount
  useEffect(() => {
    loadItems();
    loadTables();
    loadTaxes();
  }, []);

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
      // Auto-select first tax if available
      if (data.length > 0 && !selectedTax) {
        setSelectedTax(data[0].id);
      }
    } catch (err: any) {
      console.error("Load taxes error:", err);
    } finally {
      setIsLoadingTaxes(false);
    }
  };

  // Get unique categories from items
  const categories = [
    "all",
    ...Array.from(new Set(items.map((item) => item.category.name))),
  ];

  // Filter items by category
  const filteredItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.category.name === selectedCategory);

  const addToOrder = (item: Item) => {
    // Check stock
    const currentQuantity = order.find((o) => o.id === item.id)?.quantity || 0;
    if (currentQuantity >= item.amountLeft) {
      alert(`Không đủ hàng! Còn lại: ${item.amountLeft}`);
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
            alert(`Không đủ hàng! Còn lại: ${item.amountLeft}`);
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
  const subtotal = order.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount = (subtotal * discount) / 100;
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
  const selectedTaxData = taxes.find((t) => t.id === selectedTax);
  const taxAmount = selectedTaxData
    ? (subtotalAfterDiscount * selectedTaxData.percent) / 100
    : 0;
  const total = subtotalAfterDiscount + taxAmount;

  const handleCheckout = async () => {
    // Prevent duplicate calls
    if (isProcessing) {
      console.log("⚠️ Already processing, ignoring duplicate call");
      return;
    }

    if (!currentUser) {
      alert("Vui lòng đăng nhập để thực hiện thanh toán!");
      return;
    }

    if (order.length === 0) {
      alert("Vui lòng thêm sản phẩm vào đơn hàng!");
      return;
    }

    if (!selectedTable) {
      alert("Vui lòng chọn bàn!");
      return;
    }

    if (!selectedTax) {
      alert("Vui lòng chọn thuế!");
      return;
    }

    console.log("🚀 Starting checkout process...");
    setIsProcessing(true);
    setError("");

    try {
      // Create order
      const orderDto = {
        discount: discount, // Send as percentage
        createdBy: currentUser.id,
        taxId: selectedTax,
        tableId: selectedTable,
        orderItems: order.map((item) => ({
          itemId: item.id,
          amount: item.quantity,
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
      alert(message);
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
      } else {
        // Payment success
        alert(
          `Thanh toán thành công!\nMã đơn hàng: ${
            payment.orderCode
          }\nPhương thức: ${
            paymentMethod === "cash"
              ? "Tiền mặt"
              : paymentMethod === "card"
              ? "Thẻ"
              : "QR"
          }\nTổng tiền: ${total.toLocaleString("vi-VN")}đ`
        );

        // Reset form
        setOrder([]);
        setSelectedTable("");
        setDiscount(0);
        setShowPaymentDialog(false);
        setOrderCode("");
        setOrderId("");

        // Reload data
        await Promise.all([loadItems(), loadTables()]);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể thanh toán. Vui lòng thử lại!";
      setError(message);
      alert(message);
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

    alert(
      `Thanh toán QR thành công!\nMã đơn hàng: ${orderCode}\nTổng tiền: ${total.toLocaleString(
        "vi-VN"
      )}đ`
    );

    // Reset form
    setOrder([]);
    setSelectedTable("");
    setDiscount(0);
    setShowPaymentDialog(false);
    setOrderCode("");
    setOrderId("");
    setQrCode("");

    // Reload data
    await Promise.all([loadItems(), loadTables()]);

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
              {category === "all"
                ? "Tất cả"
                : category.charAt(0).toUpperCase() + category.slice(1)}
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
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl group"
                  onClick={() => addToOrder(item)}
                >
                  <div className="aspect-square relative bg-gradient-to-br from-orange-50 to-amber-50">
                    <ImageWithFallback
                      src={`https://images.unsplash.com/photo-1635090976010-d3f6dfbb1bac?w=400`}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-1 text-amber-900">{item.name}</h4>
                    <p className="text-orange-600 font-semibold">
                      {item.price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Còn: {item.amountLeft}
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

            {/* Tax Selection */}
            <div className="space-y-2 mb-3">
              <label className="text-sm text-amber-900">Thuế</label>
              <Select
                value={selectedTax}
                onValueChange={setSelectedTax}
                disabled={isLoadingTaxes}
              >
                <SelectTrigger className="h-11 rounded-xl border-orange-200">
                  <SelectValue
                    placeholder={
                      isLoadingTaxes ? "Đang tải..." : "Chọn thuế..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {taxes.map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} ({tax.percent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount Input */}
            <div className="space-y-2">
              <label className="text-sm text-amber-900">Giảm giá (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) =>
                  setDiscount(
                    Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                  )
                }
                className="h-11 rounded-xl border-orange-200"
                placeholder="0"
              />
            </div>
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
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Giảm giá ({discount}%):</span>
                <span>-{discountAmount.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-amber-900">
              <span>Thuế ({selectedTaxData?.percent || 0}%):</span>
              <span>{taxAmount.toLocaleString("vi-VN")}đ</span>
            </div>
            <Separator className="bg-orange-200" />
            <div className="flex justify-between text-lg font-semibold text-amber-900">
              <span>Tổng cộng:</span>
              <span className="text-orange-600">
                {total.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={
                order.length === 0 ||
                !selectedTable ||
                !selectedTax ||
                isProcessing
              }
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
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Thanh toán đơn hàng
            </DialogTitle>
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
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setQrCode("");
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
    </div>
  );
}
