import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { statisticsApi } from "../lib/api";
import type { Statistic } from "../types/api";

interface ChartData {
  day: string;
  sales: number;
  cost: number;
  profit: number;
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
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");
  const [autoPeriod, setAutoPeriod] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );

  const [autoReport, setAutoReport] = useState<Statistic | null>(null);
  const [manualReport, setManualReport] = useState<Statistic | null>(null);

  const [loadingAuto, setLoadingAuto] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [error, setError] = useState<string>("");

  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");

  const formatCurrency = (value: number) =>
    `${Number(value || 0).toLocaleString("vi-VN")}đ`;

  const loadLatestAuto = async (period: "daily" | "weekly" | "monthly") => {
    try {
      setLoadingAuto(true);
      setError("");
      const report = await statisticsApi.getLatest(period);
      setAutoReport(report);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setAutoReport(null);
        setError(err.response?.data?.message || "Chưa có báo cáo cho kỳ này");
      } else {
        setAutoReport(null);
        setError(err.response?.data?.message || "Không thể tải báo cáo");
      }
    } finally {
      setLoadingAuto(false);
    }
  };

  const loadLatestManual = async () => {
    try {
      setLoadingManual(true);
      setError("");
      const report = await statisticsApi.getLatest("custom");
      setManualReport(report);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setManualReport(null);
      } else {
        setManualReport(null);
        setError(
          err.response?.data?.message || "Không thể tải báo cáo thủ công"
        );
      }
    } finally {
      setLoadingManual(false);
    }
  };

  useEffect(() => {
    loadLatestAuto(autoPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPeriod]);

  useEffect(() => {
    if (activeTab === "manual") {
      loadLatestManual();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateManualReport = async () => {
    if (!manualStartDate || !manualEndDate) {
      setError("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
      return;
    }

    try {
      setCreatingManual(true);
      setError("");
      const result = await statisticsApi.createManualReport(
        manualStartDate,
        manualEndDate
      );
      setManualReport(result.data);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError(err.response?.data?.message || "Báo cáo đã tồn tại");
      } else {
        setError(err.response?.data?.message || "Không thể tạo báo cáo");
      }
    } finally {
      setCreatingManual(false);
    }
  };

  const handleExportExcel = async (report: Statistic | null) => {
    if (!report?.id) return;
    try {
      setError("");
      const blob = await statisticsApi.downloadExcel(report.id);

      const fileName = `Bao_cao_${report.id}.xlsx`;
      const isTauri = Boolean(
        (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__
      );

      if (isTauri) {
        // This project uses Tauri v2 plugins (not @tauri-apps/api/dialog or /fs).
        const [{ save }, { writeFile }] = await Promise.all([
          import("@tauri-apps/plugin-dialog"),
          import("@tauri-apps/plugin-fs"),
        ]);

        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: "Excel", extensions: ["xlsx"] }],
        });

        if (!filePath) return;

        const buffer = await blob.arrayBuffer();
        try {
          await writeFile(filePath, new Uint8Array(buffer));
        } catch (writeErr) {
          console.error("Failed to write file via Tauri fs:", writeErr);
          throw writeErr;
        }

        return;
      }

      // Browser fallback
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể xuất file Excel");
    }
  };

  const reportToShow = activeTab === "auto" ? autoReport : manualReport;

  const summary = useMemo(() => {
    if (!reportToShow) {
      return {
        totalRevenue: 0,
        totalIngredientCost: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalProductsSold: 0,
      };
    }
    return {
      totalRevenue: Number(reportToShow.totalRevenue || 0),
      totalIngredientCost: Number(
        (reportToShow as any).totalIngredientCost || 0
      ),
      grossProfit: Number((reportToShow as any).grossProfit || 0),
      grossMarginPercent: Number((reportToShow as any).grossMarginPercent || 0),
      totalOrders: Number(reportToShow.totalOrders || 0),
      averageOrderValue: Number(reportToShow.averageOrderValue || 0),
      totalProductsSold: Number(reportToShow.totalProductsSold || 0),
    };
  }, [reportToShow]);

  const chartData: ChartData[] = useMemo(() => {
    const breakdown = reportToShow?.dailyBreakdown || [];
    const weekdayLabel: Record<number, string> = {
      1: "T2",
      2: "T3",
      3: "T4",
      4: "T5",
      5: "T6",
      6: "T7",
      0: "CN",
    };

    const sorted = [...breakdown].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((d) => ({
      day:
        reportToShow?.period === "weekly"
          ? weekdayLabel[d.dayOfWeek] ?? d.dayName ?? d.date
          : d.date,
      sales: Number(d.revenue || 0),
      cost: Number((d as any).ingredientCost || 0),
      profit: Number((d as any).grossProfit || 0),
      count: Number(d.orders || 0),
    }));
  }, [reportToShow]);

  const topProductsList = useMemo(() => {
    const items = reportToShow?.topProducts || [];
    const sorted = [...items].sort(
      (a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0)
    );
    const maxRevenue = Math.max(
      1,
      ...sorted.map((p) => Number(p.totalRevenue || 0))
    );

    return sorted.map((p) => ({
      ...p,
      percent: Math.round((Number(p.totalRevenue || 0) / maxRevenue) * 100),
    }));
  }, [reportToShow]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-amber-900 mb-1">Báo cáo thống kê</h2>
        <p className="text-amber-700/70">
          Cho admin xem báo cáo theo ngày/tuần/tháng (hiển thị gần nhất), tạo
          báo cáo thủ công theo khoảng thời gian.
        </p>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <style>{`
          .revenue-period-tabs [data-slot="tabs-trigger"][data-state="active"] {
            background-color: rgb(249 115 22) !important;
            color: white !important;
            border-color: transparent !important;
            font-weight: 600 !important;
          }
          .revenue-period-tabs [data-slot="tabs-trigger"][data-state="inactive"] {
            background-color: white !important;
            color: rgb(120 53 15) !important;
          }
        `}</style>

        <TabsList className="revenue-period-tabs bg-orange-50 text-amber-900 border border-orange-100 rounded-xl">
          <TabsTrigger
            value="auto"
            className="border-2 border-orange-200 bg-white text-amber-900 hover:bg-orange-50"
          >
            Theo kỳ
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="border-2 border-orange-200 bg-white text-amber-900 hover:bg-orange-50"
          >
            Thủ công
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setAutoPeriod("daily")}
                className={
                  autoPeriod === "daily"
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-transparent"
                    : "border-2 border-orange-200 hover:bg-orange-50 text-amber-900"
                }
              >
                Ngày
              </Button>
              <Button
                variant="outline"
                onClick={() => setAutoPeriod("weekly")}
                className={
                  autoPeriod === "weekly"
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-transparent"
                    : "border-2 border-orange-200 hover:bg-orange-50 text-amber-900"
                }
              >
                Tuần
              </Button>
              <Button
                variant="outline"
                onClick={() => setAutoPeriod("monthly")}
                className={
                  autoPeriod === "monthly"
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-transparent"
                    : "border-2 border-orange-200 hover:bg-orange-50 text-amber-900"
                }
              >
                Tháng
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => loadLatestAuto(autoPeriod)}
                disabled={loadingAuto}
                className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingAuto ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                onClick={() => handleExportExcel(autoReport)}
                disabled={!autoReport?.id || loadingAuto}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </div>
          </div>

          {loadingAuto ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải báo cáo...
            </div>
          ) : null}

          {autoReport ? (
            <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Báo cáo đang hiển thị
                  </div>
                  <div className="font-medium">
                    {(autoReport.startDate || "-") +
                      " → " +
                      (autoReport.endDate || "-")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {autoReport.id}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Ngày tạo: {autoReport.date}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
              <div className="text-sm text-muted-foreground">
                Chưa có báo cáo cho kỳ này.
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="space-y-3">
              <div className="font-medium">Tạo báo cáo thủ công</div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="manualStart">Ngày bắt đầu</Label>
                  <Input
                    id="manualStart"
                    type="date"
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manualEnd">Ngày kết thúc</Label>
                  <Input
                    id="manualEnd"
                    type="date"
                    value={manualEndDate}
                    onChange={(e) => setManualEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreateManualReport}
                  disabled={creatingManual}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  {creatingManual ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Tạo báo cáo
                </Button>
                <Button
                  onClick={() => handleExportExcel(manualReport)}
                  disabled={
                    !manualReport?.id || loadingManual || creatingManual
                  }
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Xuất Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={loadLatestManual}
                  disabled={loadingManual}
                  className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingManual ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </Card>

          {loadingManual ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải báo cáo thủ công...
            </div>
          ) : null}

          {manualReport ? (
            <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Báo cáo thủ công gần nhất
                </div>
                <div className="font-medium">
                  {(manualReport.startDate || "-") +
                    " → " +
                    (manualReport.endDate || "-")}
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: {manualReport.id}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
              <div className="text-sm text-muted-foreground">
                Chưa có báo cáo thủ công.
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {reportToShow ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chi nguyên liệu</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalIngredientCost)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.grossProfit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Biên LN gộp:{" "}
                  {Number(summary.grossMarginPercent || 0).toFixed(2)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng số đơn</p>
                <p className="text-2xl font-bold">{summary.totalOrders}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Giá trị đơn TB</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.averageOrderValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sản phẩm bán ra</p>
                <p className="text-2xl font-bold">
                  {summary.totalProductsSold}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      ) : null}

      {reportToShow ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="mb-3 font-medium">Doanh thu theo ngày</div>
            {chartData.length ? (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        if (name === "sales")
                          return [formatCurrency(value), "Doanh thu"];
                        if (name === "cost")
                          return [formatCurrency(value), "Chi nguyên liệu"];
                        if (name === "profit")
                          return [formatCurrency(value), "Lợi nhuận gộp"];
                        return [value, "Số đơn"];
                      }}
                    />
                    <Bar dataKey="sales" fill={COLORS[2]} />
                    <Bar dataKey="cost" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Không có dữ liệu chi tiết theo ngày
              </div>
            )}
          </Card>

          <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="mb-3 font-medium">Top sản phẩm</div>
            {topProductsList.length ? (
              <div className="space-y-4">
                {topProductsList.map((p, idx) => (
                  <div key={p.itemId} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-amber-900 font-semibold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {p.itemName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Đã bán: {p.totalQuantity}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold flex-shrink-0">
                        {formatCurrency(Number(p.totalRevenue || 0))}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Không có dữ liệu sản phẩm
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
