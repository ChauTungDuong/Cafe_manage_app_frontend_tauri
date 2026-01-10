import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { logsApi } from "../lib/api";
import type { GetLogsResponse, LogEntry } from "../types/api";
import { toast } from "sonner";
import { formatDateTimeUTC7 } from "../lib/datetime";

export function SystemLogs() {
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState("");
  const [data, setData] = useState<GetLogsResponse | null>(null);

  const formatLogTime = (value?: string | null) => formatDateTimeUTC7(value);

  const rows = useMemo<LogEntry[]>(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = async (nextPage = page) => {
    setIsLoading(true);
    try {
      const response = await logsApi.list({
        page: nextPage,
        limit,
        q: q || undefined,
      });
      setData(response);
      setPage(response.page);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Không thể tải nhật ký hệ thống";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    load(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-amber-900 mb-1">Nhật ký hệ thống</h2>
          <p className="text-amber-700/70">
            Theo dõi người dùng, hành động và nội dung thao tác
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => load(page)}
          className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Làm mới
        </Button>
      </div>

      <Card className="p-4 border-2 border-orange-100 shadow-lg rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-amber-700/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="Tìm theo user, entity, nội dung..."
              className="pl-10 rounded-xl border-orange-200"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onSearch}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl"
              disabled={isLoading}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-2 border-orange-100 shadow-lg rounded-2xl overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-amber-900 text-center whitespace-nowrap w-[180px]">
                  Thời gian
                </TableHead>
                <TableHead className="text-amber-900 text-center whitespace-nowrap w-[220px]">
                  Người dùng
                </TableHead>
                <TableHead className="text-amber-900 text-center whitespace-nowrap w-[140px]">
                  Hành động
                </TableHead>
                <TableHead className="text-amber-900 whitespace-nowrap min-w-[360px]">
                  Thực hiện
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8">
                    <div className="flex items-center justify-center text-amber-700/70">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-amber-700/70"
                  >
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                rows.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center whitespace-nowrap w-[180px]">
                      {formatLogTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-center w-[220px]">
                      <div className="leading-tight">
                        <div className="text-amber-900">
                          {log.userName || log.userId}
                        </div>
                        <div className="text-xs text-amber-700/70">
                          {log.userRole || ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-amber-900 font-medium w-[140px] whitespace-nowrap">
                      {log.action}
                    </TableCell>
                    <TableCell className="min-w-[360px]">
                      <div className="leading-tight">
                        <div className="text-amber-900">
                          {log.entityType}
                          {log.entityName ? `: ${log.entityName}` : ""}
                        </div>
                        <div className="text-sm text-amber-700/70">
                          {log.message || ""}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-orange-100 flex items-center justify-between">
          <div className="text-sm text-amber-700/70">
            Tổng: <span className="text-amber-900">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
              onClick={() => load(Math.max(1, page - 1))}
              disabled={isLoading || page <= 1}
            >
              Trước
            </Button>
            <div className="text-sm text-amber-900">
              Trang {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
              onClick={() => load(Math.min(totalPages, page + 1))}
              disabled={isLoading || page >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
