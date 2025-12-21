import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Edit, Trash2, Users, Loader2, TableIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { tablesApi } from "../lib/api";
import type { Table, CreateTableDto } from "../types/api";
import type { User } from "../types/user";

interface TableManagementProps {
  currentUser?: User | null;
}

export function TableManagement({ currentUser }: TableManagementProps) {
  // Data state
  const [tables, setTables] = useState<Table[]>([]);

  // UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Loading & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    seat: "2",
    status: "available" as "available" | "occupied" | "reserved",
  });

  // Load data on mount
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await tablesApi.list();
      setTables(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách bàn";
      setError(message);
      console.error("Load tables error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // getStatusInfo removed from this component because status badge is no longer displayed here

  const handleOpenDialog = (table?: Table) => {
    if (table) {
      // Edit mode
      setEditingTable(table);
      setFormData({
        name: table.name,
        seat: table.seat.toString(),
        status: table.status as any,
      });
    } else {
      // Add mode
      setEditingTable(null);
      setFormData({ name: "", seat: "2", status: "available" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTable(null);
    setFormData({ name: "", seat: "2", status: "available" });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên bàn!");
      return;
    }

    const seatCount = parseInt(formData.seat);
    if (!seatCount || seatCount < 1) {
      alert("Vui lòng nhập số ghế hợp lệ!");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingTable) {
        // Update existing table
        const updateDto = {
          name: formData.name,
          seat: seatCount,
        };

        await tablesApi.update(editingTable.id, updateDto);
        alert("Cập nhật bàn thành công!");
      } else {
        // Create new table
        const createDto: CreateTableDto = {
          name: formData.name,
          seat: seatCount,
          status: formData.status,
        };

        await tablesApi.create(createDto);
        alert("Thêm bàn thành công!");
      }

      // Reload data
      await loadTables();
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể lưu thông tin bàn. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Save table error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bàn "${name}"?`)) {
      return;
    }

    setError("");
    try {
      await tablesApi.remove(id);
      alert("Xóa bàn thành công!");
      await loadTables();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể xóa bàn. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Delete table error:", err);
    }
  };

  const handleStatusChange = async (
    table: Table,
    newStatus: "available" | "occupied" | "reserved"
  ) => {
    setError("");
    try {
      await tablesApi.update(table.id, { status: newStatus });
      await loadTables();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể cập nhật trạng thái bàn";
      setError(message);
      alert(message);
      console.error("Update status error:", err);
    }
  };

  // Group tables by status
  const availableTables = tables.filter((t) => t.status === "available");
  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const reservedTables = tables.filter((t) => t.status === "reserved");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">
            {currentUser?.role === "admin"
              ? `Quản lý bàn (${tables.length})`
              : `Cập nhật bàn (${tables.length})`}
          </h2>
          <p className="text-amber-700/70">
            {currentUser?.role === "admin"
              ? "Quản lý các bàn trong quán"
              : "Cập nhật trạng thái bàn trong quán"}
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Thêm bàn
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTable ? "Chỉnh sửa bàn" : "Thêm bàn mới"}
                </DialogTitle>
                <DialogDescription>
                  {editingTable
                    ? "Cập nhật thông tin bàn"
                    : "Nhập thông tin bàn mới"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Tên bàn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="VD: Bàn 1, VIP 1"
                  />
                </div>

                {/* Seats */}
                <div className="space-y-2">
                  <Label htmlFor="seat">Số ghế *</Label>
                  <Input
                    id="seat"
                    type="number"
                    min="1"
                    value={formData.seat}
                    onChange={(e) =>
                      setFormData({ ...formData, seat: e.target.value })
                    }
                    placeholder="4"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseDialog}
                  disabled={isSaving}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="flex flex-row gap-4">
        <Card className="flex-1 p-4 border-2 border-green-200 bg-green-50">
          <p className="text-sm text-green-700 mb-1">Bàn trống</p>
          <p className="text-2xl font-bold text-green-800">
            {availableTables.length}
          </p>
        </Card>
        <Card className="flex-1 p-4 border-2 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 mb-1">Đang dùng</p>
          <p className="text-2xl font-bold text-red-800">
            {occupiedTables.length}
          </p>
        </Card>
        <Card className="flex-1 p-4 border-2 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-700 mb-1">Đã đặt</p>
          <p className="text-2xl font-bold text-yellow-800">
            {reservedTables.length}
          </p>
        </Card>
      </div>

      {/* Tables Grid */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-amber-900">
              Đang tải danh sách bàn...
            </span>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-12">
            <TableIcon className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
            <p className="text-amber-600/50">Chưa có bàn nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tables.map((table) => {
              return (
                <Card
                  key={table.id}
                  className="p-4 hover:shadow-lg transition-all border-2 border-orange-100 hover:border-orange-300 rounded-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Table Name */}
                    <div className="flex flex-col items-center text-center">
                      <h4 className="text-xl font-bold text-amber-900">
                        {table.name}
                      </h4>
                    </div>

                    {/* Seats */}
                    <div className="flex items-center justify-center gap-2 text-amber-700">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {table.seat} ghế
                      </span>
                    </div>

                    {/* Status Change */}
                    <Select
                      value={table.status}
                      onValueChange={(value: any) =>
                        handleStatusChange(table, value)
                      }
                    >
                      <SelectTrigger className="h-9 border-orange-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">○ Trống</SelectItem>
                        <SelectItem value="occupied">● Đang dùng</SelectItem>
                        <SelectItem value="reserved">◐ Đã đặt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    {/* Actions */}
                    {currentUser?.role === "admin" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleOpenDialog(table)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 hover:bg-red-50 text-red-600"
                          onClick={() => handleDelete(table.id, table.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
