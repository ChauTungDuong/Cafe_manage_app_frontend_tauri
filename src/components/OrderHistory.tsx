import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Receipt, Search, Eye, Loader2, XCircle, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Separator } from "./ui/separator";
import { ordersApi } from "../lib/api";
import type { Order } from "../types/api";

export function OrderHistory() {
  // Data state
  const [orders, setOrders] = useState<Order[]>([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Loading & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Load orders on mount and when filter changes
  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params =
        statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await ordersApi.list(params);
      setOrders(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách đơn hàng";
      setError(message);
      console.error("Load orders error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  const handleCancelOrder = async (orderId: string, orderCode: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng "${orderCode}"?`)) {
      return;
    }

    setError("");
    try {
      await ordersApi.update(orderId, { status: "cancelled" });
      alert("Hủy đơn hàng thành công!");
      await loadOrders();
      setIsDetailDialogOpen(false);
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể hủy đơn hàng";
      setError(message);
      alert(message);
      console.error("Cancel order error:", err);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Chờ thanh toán",
          color: "bg-yellow-100 text-yellow-700 border-yellow-300",
        };
      case "paid":
        return {
          label: "Đã thanh toán",
          color: "bg-green-100 text-green-700 border-green-300",
        };
      case "cancelled":
        return {
          label: "Đã hủy",
          color: "bg-red-100 text-red-700 border-red-300",
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-700 border-gray-300",
        };
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "💵 Tiền mặt";
      case "QR":
        return "📱 QR Code";
      case "card":
        return "💳 Thẻ";
      default:
        return method;
    }
  };

  // Helper to format dates safely
  const formatDateTime = (value?: string | null) => {
    try {
      const d = value ? new Date(value) : null;
      if (d && !isNaN(d.getTime())) return d.toLocaleString("vi-VN");
    } catch (e) {
      /* ignore */
    }
    return "-";
  };

  // Filter orders by search term
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate statistics
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">Lịch sử đơn hàng</h2>
          <p className="text-amber-700/70">Xem và quản lý đơn hàng</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700 mb-1">Tổng đơn</p>
          <p className="text-2xl font-bold text-blue-800">{totalOrders}</p>
        </Card>
        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <p className="text-sm text-green-700 mb-1">Đã thanh toán</p>
          <p className="text-2xl font-bold text-green-800">{paidOrders}</p>
        </Card>
        <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-700 mb-1">Chờ thanh toán</p>
          <p className="text-2xl font-bold text-yellow-800">{pendingOrders}</p>
        </Card>
        <Card className="p-4 border-2 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 mb-1">Đã hủy</p>
          <p className="text-2xl font-bold text-red-800">{cancelledOrders}</p>
        </Card>
        <Card className="p-4 border-2 border-orange-200 bg-orange-50">
          <p className="text-sm text-orange-700 mb-1">Doanh thu</p>
          <p className="text-xl font-bold text-orange-800">
            {totalRevenue.toLocaleString("vi-VN")}đ
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 border-2 border-orange-100">
        <div className="flex gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
              <Input
                placeholder="Tìm kiếm theo mã đơn, bàn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-orange-200 focus:border-orange-400"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ thanh toán</SelectItem>
                <SelectItem value="paid">Đã thanh toán</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-amber-900">Đang tải đơn hàng...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
            <p className="text-amber-600/50">Không tìm thấy đơn hàng</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              return (
                <Card
                  key={order.id}
                  className="p-4 hover:shadow-lg transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Receipt className="h-5 w-5 text-orange-500" />
                        <h4 className="font-bold text-amber-900">
                          {order.orderCode}
                        </h4>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-amber-600">Bàn: </span>
                          <span className="text-amber-900 font-medium">
                            {order.table?.name || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-amber-600">Tổng tiền: </span>
                          <span className="text-orange-600 font-semibold">
                            {order.totalAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div>
                          <span className="text-amber-600">Ngày: </span>
                          <span className="text-amber-900">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-200 hover:bg-orange-50"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent
          className="mx-auto p-0 overflow-hidden"
          style={{
            width: "min(700px, 90vw)",
            maxWidth: "700px",
            height: "80vh",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              Chi tiết đơn hàng
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && `Mã đơn hàng: ${selectedOrder.orderCode}`}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              <div className="space-y-4">
              {/* Order Info */}
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-amber-600">Mã đơn:</span>
                    <p className="font-semibold text-amber-900">
                      {selectedOrder.orderCode}
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-600">Trạng thái:</span>
                    <p>
                      <Badge
                        className={getStatusInfo(selectedOrder.status).color}
                      >
                        {getStatusInfo(selectedOrder.status).label}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-600">Bàn:</span>
                    <p className="font-semibold text-amber-900">
                      {selectedOrder.table?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-600">Ngày tạo:</span>
                    <p className="font-semibold text-amber-900">
                      {new Date(selectedOrder.createdAt).toLocaleString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-600">Thuế & Giảm giá:</span>
                    <div className="space-y-1 mt-1">
                      {selectedOrder.taxesAndDiscounts.length > 0 ? (
                        selectedOrder.taxesAndDiscounts.map((td) => (
                          <p
                            key={td.id}
                            className="font-semibold text-amber-900"
                          >
                            {td.name} ({td.type === "tax" ? "+" : "-"}
                            {parseFloat(td.percent)}%)
                          </p>
                        ))
                      ) : (
                        <p className="text-amber-700/50">Không có</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-amber-900 mb-3">Sản phẩm</h4>
                <div className="space-y-2">
                  {selectedOrder.orderItems.map((item) => (
                    <Card key={item.id} className="p-3 border-orange-100">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-medium text-amber-900">
                            {item.item.name}
                          </p>
                          <p className="text-sm text-amber-600">
                            {item.item.price.toLocaleString("vi-VN")}đ x{" "}
                            {item.amount}
                          </p>
                        </div>
                        <p className="font-semibold text-orange-600">
                          {(item.item.price * item.amount).toLocaleString(
                            "vi-VN"
                          )}
                          đ
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Payments */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-900 mb-3">
                    Thanh toán
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.payments.map((payment) => (
                      <Card
                        key={payment.id}
                        className="p-4 border-green-200 bg-green-50"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-green-800">
                                {getPaymentMethodLabel(payment.method)}
                              </p>
                              <p className="text-sm text-green-600">
                                {formatDateTime(payment.createdAt) !== "-"
                                  ? formatDateTime(payment.createdAt)
                                  : formatDateTime(selectedOrder?.createdAt)}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-green-800">
                              {payment.amount.toLocaleString("vi-VN")}đ
                            </p>
                          </div>

                          {/* Display QR Code if available */}
                          {payment.qrCode && (
                            <div className="mt-3 flex justify-center">
                              <img
                                src={payment.qrCode}
                                alt="QR Code"
                                className="w-[138px] h-[138px] border-2 border-green-300 rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Tạm tính:</span>
                    <span className="text-amber-900 font-medium">
                      {(() => {
                        // Calculate subtotal from order items
                        const subtotal = selectedOrder.orderItems.reduce(
                          (sum, item) => sum + item.item.price * item.amount,
                          0
                        );
                        return subtotal.toLocaleString("vi-VN");
                      })()}
                      đ
                    </span>
                  </div>

                  {/* Display all taxes */}
                  {selectedOrder.taxesAndDiscounts
                    .filter((td) => td.type === "tax")
                    .map((tax) => {
                      const subtotal = selectedOrder.orderItems.reduce(
                        (sum, item) => sum + item.item.price * item.amount,
                        0
                      );
                      const taxAmount =
                        (subtotal * parseFloat(tax.percent)) / 100;
                      return (
                        <div
                          key={tax.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-amber-700">
                            {tax.name} (+{parseFloat(tax.percent)}%):
                          </span>
                          <span className="text-amber-900 font-medium">
                            +{taxAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    })}

                  {/* Display all discounts */}
                  {selectedOrder.taxesAndDiscounts
                    .filter((td) => td.type === "discount")
                    .map((discount) => {
                      const subtotal = selectedOrder.orderItems.reduce(
                        (sum, item) => sum + item.item.price * item.amount,
                        0
                      );
                      // Calculate taxes first
                      const totalTaxAmount = selectedOrder.taxesAndDiscounts
                        .filter((td) => td.type === "tax")
                        .reduce(
                          (sum, tax) =>
                            sum + (subtotal * parseFloat(tax.percent)) / 100,
                          0
                        );
                      const subtotalWithTax = subtotal + totalTaxAmount;
                      const discountAmount =
                        (subtotalWithTax * parseFloat(discount.percent)) / 100;
                      return (
                        <div
                          key={discount.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-amber-700">
                            {discount.name} (-{parseFloat(discount.percent)}%):
                          </span>
                          <span className="text-green-600 font-medium">
                            -{discountAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    })}
                  <Separator className="bg-orange-300" />
                  <div className="flex justify-between text-lg">
                    <span className="text-amber-900 font-semibold">
                      Tổng cộng:
                    </span>
                    <span className="text-orange-600 font-bold">
                      {selectedOrder.totalAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              </Card>

              {/* Cancel Order Button (for pending orders) */}
              {selectedOrder.status === "pending" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() =>
                    handleCancelOrder(selectedOrder.id, selectedOrder.orderCode)
                  }
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy đơn hàng
                </Button>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
