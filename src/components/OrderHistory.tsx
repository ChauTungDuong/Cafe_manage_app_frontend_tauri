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
import {
  Receipt,
  Search,
  Eye,
  Loader2,
  XCircle,
  Package,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Separator } from "./ui/separator";
import { ordersApi, tablesApi, usersApi } from "../lib/api";
import type { Order } from "../types/api";
import type { User } from "../types/user";
import type { User as ApiUser, Table } from "../types/api";
import { formatDateTimeUTC7 } from "../lib/datetime";

interface OrderHistoryProps {
  currentUser?: User | null;
}

export function OrderHistory({ currentUser }: OrderHistoryProps) {
  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Loading & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const t = await tablesApi.list();
        setTables(t);
      } catch (e) {
        // ignore
      }

      if (currentUser?.role === "admin") {
        try {
          const u = await usersApi.list();
          setUsers(u);
        } catch (e) {
          // ignore
        }
      }
    };
    loadLookups();
  }, [currentUser?.role]);

  // Load orders on mount and when filter changes
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilter,
    tableFilter,
    paymentMethodFilter,
    createdByFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (tableFilter !== "all") params.tableId = tableFilter;
      if (paymentMethodFilter !== "all")
        params.paymentMethod = paymentMethodFilter;
      if (createdByFilter !== "all") params.createdBy = createdByFilter;
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;

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

  const handleDeleteOrder = async (orderId: string, orderCode: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng "${orderCode}"?\nThao tác này không thể hoàn tác!`
      )
    ) {
      return;
    }

    setError("");
    try {
      await ordersApi.remove(orderId);
      alert("Xóa đơn hàng thành công!");
      await loadOrders();
      setIsDetailDialogOpen(false);
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể xóa đơn hàng";
      setError(message);
      alert(message);
      console.error("Delete order error:", err);
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

  // Helper to format dates safely (UTC+7)
  const formatDateTime = (value?: string | null) => formatDateTimeUTC7(value);

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

  const totalIngredientCost = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, order) => sum + Number(order.ingredientCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">
            {currentUser?.role === "admin"
              ? `Quản lý hóa đơn (${orders.length})`
              : `Hóa đơn (${orders.length})`}
          </h2>
          <p className="text-amber-700/70">
            {currentUser?.role === "admin"
              ? "Quản lý các hóa đơn"
              : "Xem các hóa đơn đã tạo"}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 border-2 border-blue-200 bg-gradient-to-br from-blue-100 to-blue-200 shadow-lg hover:shadow-xl transition-shadow">
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

        <Card className="p-4 border-2 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-700 mb-1">Chi nguyên liệu</p>
          <p className="text-xl font-bold text-amber-800">
            {totalIngredientCost.toLocaleString("vi-VN")}đ
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

          {/* Table Filter */}
          <div className="w-[220px]">
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue placeholder="Lọc theo bàn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bàn</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment method filter */}
          <div className="w-[220px]">
            <Select
              value={paymentMethodFilter}
              onValueChange={setPaymentMethodFilter}
            >
              <SelectTrigger className="border-orange-200">
                <SelectValue placeholder="Phương thức TT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phương thức</SelectItem>
                <SelectItem value="cash">💵 Tiền mặt</SelectItem>
                <SelectItem value="QR">📱 QR Code</SelectItem>
                <SelectItem value="card">💳 Thẻ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Creator filter */}
          <div className="w-[240px]">
            <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
              <SelectTrigger className="border-orange-200">
                <SelectValue placeholder="Người tạo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả người tạo</SelectItem>
                {currentUser?.role === "admin" ? (
                  users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={currentUser?.id || "me"}>
                    Chỉ mình tạo
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <div className="w-[180px]">
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="border-orange-200 focus:border-orange-400"
              title="Từ ngày"
            />
          </div>
          <div className="w-[180px]">
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="border-orange-200 focus:border-orange-400"
              title="Đến ngày"
            />
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
                          <span className="text-amber-600">Chi NL: </span>
                          <span className="text-amber-900 font-medium">
                            {Number(order.ingredientCost || 0).toLocaleString(
                              "vi-VN"
                            )}
                            đ
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
                      {currentUser?.role === "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 text-red-600"
                          onClick={() =>
                            handleDeleteOrder(order.id, order.orderCode)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                        {formatDateTime(selectedOrder.createdAt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-amber-600">
                        Phương thức thanh toán:
                      </span>
                      <p className="font-semibold text-amber-900">
                        {selectedOrder.payments &&
                        selectedOrder.payments.length > 0
                          ? selectedOrder.payments
                              .map((p) => getPaymentMethodLabel(p.method))
                              .join(", ")
                          : "Chưa thanh toán"}
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
                              {td.percent}%)
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
                  <h4 className="font-semibold text-amber-900 mb-3">
                    Sản phẩm
                  </h4>
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
                {selectedOrder.payments &&
                  selectedOrder.payments.length > 0 && (
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
                                      : formatDateTime(
                                          selectedOrder?.createdAt
                                        )}
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
                                    className="w-[180px] h-[180px] border-2 border-green-300 rounded-lg"
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

                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700">Chi nguyên liệu:</span>
                      <span className="text-amber-900 font-medium">
                        {Number(
                          selectedOrder.ingredientCost || 0
                        ).toLocaleString("vi-VN")}
                        đ
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-amber-700">Lợi nhuận gộp:</span>
                      <span className="text-amber-900 font-semibold">
                        {(
                          Number(selectedOrder.totalAmount || 0) -
                          Number(selectedOrder.ingredientCost || 0)
                        ).toLocaleString("vi-VN")}
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
                          (subtotal * Number(tax.percent)) / 100;
                        return (
                          <div
                            key={tax.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-amber-700">
                              {tax.name} (+{tax.percent}%):
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
                              sum + (subtotal * Number(tax.percent)) / 100,
                            0
                          );
                        const subtotalWithTax = subtotal + totalTaxAmount;
                        const discountAmount =
                          (subtotalWithTax * Number(discount.percent)) / 100;
                        return (
                          <div
                            key={discount.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-amber-700">
                              {discount.name} (-{discount.percent}%):
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
                      handleCancelOrder(
                        selectedOrder.id,
                        selectedOrder.orderCode
                      )
                    }
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Hủy đơn hàng
                  </Button>
                )}

                {/* Delete Order Button (for admin only) */}
                {currentUser?.role === "admin" && (
                  <Button
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() =>
                      handleDeleteOrder(
                        selectedOrder.id,
                        selectedOrder.orderCode
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa đơn hàng vĩnh viễn
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
