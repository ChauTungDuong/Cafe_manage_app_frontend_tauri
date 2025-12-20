import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  Calendar,
  FileText,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { statisticsApi } from "../lib/api";
import { Statistic } from "../types/api";

interface ChartData {
  day: string;
  sales: number;
  count: number;
}

const COLORS = [
  "#92400e",
  "#b45309",
  "#d97706",
  "#f59e0b",
  "#fbbf24",
  "#fcd34d",
  "#fde68a",
  "#fef3c7",
];

export function RevenueDashboard() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showReportsList, setShowReportsList] = useState(false);

  // Date range for filtering display
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Date range for generating reports
  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");

  // Load statistics with optional date filter
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError("");
      const params: any = { period };

      // Add date filter if set
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      console.log("📊 Loading statistics with params:", params);
      const data = await statisticsApi.list(params);
      console.log("✅ Statistics loaded:", data);
      console.log("📈 Total items:", data.length);

      setStatistics(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu");
      console.error("❌ Error loading statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [period, filterStartDate, filterEndDate]);

  // Generate last 30 days statistics
  const handleGenerateLastMonth = async () => {
    try {
      setGenerating(true);
      setError("");
      const result = await statisticsApi.generateLastMonth();
      alert(
        `Đã tạo thống kê cho ${result.processed} ngày thành công!\nTừ ${result.startDate} đến ${result.endDate}`
      );
      await loadStatistics();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tạo báo cáo");
      console.error("Error generating statistics:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Generate custom date range statistics
  const handleGenerateRange = async () => {
    if (!generateStartDate || !generateEndDate) {
      alert("Vui lòng chọn khoảng thời gian!");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      const result = await statisticsApi.generateRange(
        generateStartDate,
        generateEndDate
      );
      alert(
        `Đã tạo thống kê thành công!\n` +
          `Daily: ${result.dailyStats.processed} ngày\n` +
          `Monthly: ${result.monthlyStats.processed} tháng\n` +
          `Từ ${result.startDate} đến ${result.endDate}`
      );
      setShowGenerateDialog(false);
      await loadStatistics();
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tạo báo cáo");
      console.error("Error generating statistics:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Clear date filter
  const handleClearFilter = () => {
    setFilterStartDate("");
    setFilterEndDate("");
  };

  // Calculate aggregated totals from statistics
  const totalRevenue = statistics.reduce(
    (sum, stat) => sum + (stat.totalRevenue || 0),
    0
  );
  const totalOrders = statistics.reduce(
    (sum, stat) => sum + (stat.totalOrders || 0),
    0
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalProductsSold = statistics.reduce(
    (sum, stat) => sum + (stat.totalProductsSold || 0),
    0
  );

  // Log calculations for debugging
  console.log("💰 Calculations:", {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalProductsSold,
    statisticsCount: statistics.length,
  });

  // Prepare chart data - always show full week (Mon-Sun) or full year (12 months)
  const chartData: ChartData[] = (() => {
    if (period === "daily") {
      // Show full week Monday to Sunday
      const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      const weekData: ChartData[] = days.map((dayLabel, index) => ({
        day: dayLabel,
        sales: 0,
        count: 0,
      }));

      // Map statistics to correct day of week
      statistics.forEach((stat) => {
        const date = new Date(stat.date);
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert to Monday=0, Tuesday=1, ..., Sunday=6
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        weekData[dayIndex] = {
          day: days[dayIndex],
          sales: (weekData[dayIndex].sales || 0) + stat.totalRevenue,
          count: (weekData[dayIndex].count || 0) + stat.totalOrders,
        };
      });

      return weekData;
    } else {
      // Show full 12 months
      const monthData: ChartData[] = Array.from({ length: 12 }, (_, i) => ({
        day: `T${i + 1}`,
        sales: 0,
        count: 0,
      }));

      // Map statistics to correct month
      statistics.forEach((stat) => {
        const date = new Date(stat.date);
        const monthIndex = date.getMonth(); // 0-11

        monthData[monthIndex] = {
          day: `T${monthIndex + 1}`,
          sales: (monthData[monthIndex].sales || 0) + stat.totalRevenue,
          count: (monthData[monthIndex].count || 0) + stat.totalOrders,
        };
      });

      return monthData;
    }
  })();

  // Aggregate top products across all statistics
  const getTopProducts = () => {
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    statistics.forEach((stat) => {
      stat.topProducts.forEach((product) => {
        const existing = productMap.get(product.itemId);
        if (existing) {
          existing.quantity += product.totalQuantity;
          existing.revenue += product.totalRevenue;
        } else {
          productMap.set(product.itemId, {
            name: product.itemName,
            quantity: product.totalQuantity,
            revenue: product.totalRevenue,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)
      .map((product, index) => ({
        name: product.name,
        value: product.quantity,
        revenue: product.revenue,
        color: COLORS[index],
      }));
  };

  const topProducts = getTopProducts();
  const top3Products = topProducts.slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
        <Button
          onClick={loadStatistics}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-amber-900 mb-1">Báo cáo doanh thu</h2>
          <p className="text-amber-700/70">Tổng quan hiệu suất kinh doanh</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setPeriod("daily")}
            className={`h-11 px-6 rounded-xl transition-all ${
              period === "daily"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white"
                : "bg-white text-amber-900 border-2 border-orange-200"
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Theo ngày
          </Button>
          <Button
            onClick={() => setPeriod("monthly")}
            className={`h-11 px-6 rounded-xl transition-all ${
              period === "monthly"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white"
                : "bg-white text-amber-900 border-2 border-orange-200"
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Theo tháng
          </Button>
          {/* Reports Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700">
                <FileText className="h-4 w-4 mr-2" />
                Báo cáo
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-2 border-orange-100">
              <DropdownMenuItem
                onClick={handleGenerateLastMonth}
                disabled={generating}
                className="cursor-pointer focus:bg-orange-50 hover:bg-orange-50 transition-colors"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                <span>Tạo 30 ngày gần nhất</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowGenerateDialog(true)}
                className="cursor-pointer focus:bg-orange-50 hover:bg-orange-50 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>Tạo báo cáo tùy chỉnh</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-orange-100" />
              <DropdownMenuItem
                onClick={() => setShowReportsList(true)}
                className="cursor-pointer focus:bg-orange-50 hover:bg-orange-50 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>Xem danh sách báo cáo</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            onClick={loadStatistics}
            className="h-11 px-6 rounded-xl bg-white text-amber-900 border-2 border-orange-200 hover:bg-orange-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Generate Custom Report Dialog */}
      <Dialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-900">
              Tạo báo cáo theo khoảng thời gian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="generateStartDate" className="text-amber-900">
                Ngày bắt đầu
              </Label>
              <Input
                id="generateStartDate"
                type="date"
                value={generateStartDate}
                onChange={(e) => setGenerateStartDate(e.target.value)}
                className="mt-1 border-orange-200 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="generateEndDate" className="text-amber-900">
                Ngày kết thúc
              </Label>
              <Input
                id="generateEndDate"
                type="date"
                value={generateEndDate}
                onChange={(e) => setGenerateEndDate(e.target.value)}
                className="mt-1 border-orange-200 rounded-xl"
              />
            </div>
            <Button
              onClick={handleGenerateRange}
              disabled={generating}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Tạo báo cáo
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Reports Dialog */}
      <Dialog open={showReportsList} onOpenChange={setShowReportsList}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-900">
              Danh sách báo cáo đã tạo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
                {statistics.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
                    <p className="text-amber-600">Chưa có báo cáo nào</p>
                    <p className="text-amber-700/70 text-sm mt-2">
                      Sử dụng các nút "Tạo 30 ngày" hoặc "Tạo báo cáo" để tạo
                      báo cáo mới
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-amber-900 font-medium">
                        Tổng số báo cáo: {statistics.length}{" "}
                        {period === "daily" ? "ngày" : "tháng"}
                      </p>
                      {filterStartDate && filterEndDate && (
                        <p className="text-amber-700 text-sm mt-1">
                          Từ {filterStartDate} đến {filterEndDate}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4">
                      {statistics.map((stat) => (
                        <Card
                          key={stat.id}
                          className="p-4 border-2 border-orange-100 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-orange-600" />
                                <span className="font-semibold text-amber-900">
                                  {new Date(stat.date).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </span>
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  {stat.period === "daily" ? "Ngày" : "Tháng"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                <div>
                                  <p className="text-xs text-amber-700/70">
                                    Doanh thu
                                  </p>
                                  <p className="font-semibold text-orange-600">
                                    {stat.totalRevenue.toLocaleString("vi-VN")}đ
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-amber-700/70">
                                    Đơn hàng
                                  </p>
                                  <p className="font-semibold text-orange-600">
                                    {stat.totalOrders}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-amber-700/70">
                                    TB/đơn
                                  </p>
                                  <p className="font-semibold text-orange-600">
                                    {stat.averageOrderValue.toLocaleString(
                                      "vi-VN",
                                      {
                                        maximumFractionDigits: 0,
                                      }
                                    )}
                                    đ
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-amber-700/70">
                                    SP đã bán
                                  </p>
                                  <p className="font-semibold text-orange-600">
                                    {stat.totalProductsSold}
                                  </p>
                                </div>
                              </div>
                              {stat.topProducts &&
                                stat.topProducts.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-orange-100">
                                    <p className="text-xs text-amber-700/70 mb-2">
                                      Top sản phẩm:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {stat.topProducts
                                        .slice(0, 3)
                                        .map((product, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-1 bg-amber-50 text-amber-800 text-xs rounded-lg"
                                          >
                                            {product.itemName} (
                                            {product.totalQuantity})
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Filter */}
      <Card className="p-4 rounded-2xl border-2 border-orange-100">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filterStartDate" className="text-amber-900">
              Từ ngày
            </Label>
            <Input
              id="filterStartDate"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="mt-1 border-orange-200 rounded-xl"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filterEndDate" className="text-amber-900">
              Đến ngày
            </Label>
            <Input
              id="filterEndDate"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="mt-1 border-orange-200 rounded-xl"
            />
          </div>
          <Button
            onClick={handleClearFilter}
            variant="outline"
            className="h-11 px-6 rounded-xl border-2 border-orange-200 text-amber-900"
          >
            Xóa lọc
          </Button>
          <div className="text-sm text-amber-700/70">
            {statistics.length > 0 && (
              <span>
                Hiển thị {statistics.length}{" "}
                {period === "daily" ? "ngày" : "tháng"}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Tổng doanh thu</p>
              <p className="text-orange-600 mb-1">
                {totalRevenue.toLocaleString("vi-VN")}đ
              </p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Đã thanh toán</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Tổng đơn hàng</p>
              <p className="text-orange-600 mb-1">{totalOrders}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Hoàn thành</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Giá trị TB/đơn</p>
              <p className="text-orange-600 mb-1">
                {avgOrderValue.toLocaleString("vi-VN", {
                  maximumFractionDigits: 0,
                })}
                đ
              </p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Trung bình</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Sản phẩm đã bán</p>
              <p className="text-orange-600 mb-1">{totalProductsSold}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Tổng số lượng</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100">
          <div className="mb-4">
            <h3 className="text-amber-900 mb-1">
              {period === "daily"
                ? "Doanh thu theo ngày"
                : "Doanh thu theo tháng"}
            </h3>
            <p className="text-amber-700/70">
              {period === "daily" ? "7 ngày gần nhất" : "6 tháng gần nhất"}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="day" stroke="#92400e" />
              <YAxis stroke="#92400e" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "2px solid #fed7aa",
                  borderRadius: "12px",
                }}
                formatter={(value: number) =>
                  `${value.toLocaleString("vi-VN")}đ`
                }
              />
              <Bar
                dataKey="sales"
                fill="url(#colorGradient)"
                radius={[8, 8, 0, 0]}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Distribution */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100">
          <div className="mb-4">
            <h3 className="text-amber-900 mb-1">Sản phẩm bán chạy</h3>
            <p className="text-amber-700/70">Phân bố theo sản phẩm</p>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} sản phẩm`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-amber-700/70">
              Chưa có dữ liệu sản phẩm
            </div>
          )}
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3Products.length > 0 ? (
          top3Products.map((product, index) => (
            <Card
              key={index}
              className="p-6 rounded-2xl border-2 border-orange-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    index === 0
                      ? "bg-gradient-to-br from-orange-500 to-amber-600"
                      : index === 1
                      ? "bg-gradient-to-br from-orange-400 to-amber-500"
                      : "bg-gradient-to-br from-orange-300 to-amber-400"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-amber-900">{product.name}</h4>
                  <p className="text-amber-700/70">
                    {index === 0
                      ? "Bán chạy nhất"
                      : index === 1
                      ? "Phổ biến"
                      : "Top 3"}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-amber-900">
                  <span>Đã bán:</span>
                  <span>{product.value} sản phẩm</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Doanh thu:</span>
                  <span>{product.revenue.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 rounded-2xl border-2 border-orange-100 col-span-3">
            <p className="text-amber-700/70 text-center">
              Chưa có dữ liệu sản phẩm bán chạy
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}