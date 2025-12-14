import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Percent, Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { taxesApi } from "../lib/api";
import type { CreateTaxDto, Tax } from "../types/api";

export function TaxManagement() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<CreateTaxDto>({
    name: "",
    percent: 0,
    description: "",
  });

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await taxesApi.list();
      setTaxes(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách thuế";
      setError(message);
      console.error("Load taxes error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({
        name: tax.name,
        percent: Number(tax.percent),
        description: tax.description || "",
      });
    } else {
      setEditingTax(null);
      setFormData({
        name: "",
        percent: 0,
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTax(null);
    setFormData({ name: "", percent: 0, description: "" });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên thuế!");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingTax) {
        await taxesApi.update(editingTax.id, formData);
        alert("Cập nhật thuế thành công!");
      } else {
        await taxesApi.create(formData);
        alert("Thêm thuế thành công!");
      }

      await loadTaxes();
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể lưu thuế. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Save tax error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thuế "${name}"?`)) {
      return;
    }

    setError("");
    try {
      await taxesApi.remove(id);
      alert("Xóa thuế thành công!");
      await loadTaxes();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể xóa thuế. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Delete tax error:", err);
    }
  };

  const getTaxBadge = (tax: Tax) => {
    if (tax.type === "discount") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          Giảm giá
        </Badge>
      );
    } else if (tax.type === "tax") {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          Thuế
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300">Khác</Badge>
    );
  };

  const filteredTaxes = taxes.filter((tax) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tax.name.toLowerCase().includes(searchLower) ||
      tax.description?.toLowerCase().includes(searchLower)
    );
  });

  const totalTaxes = taxes.length;
  const positiveTaxes = taxes.filter((t) => Number(t.percent) > 0).length;
  const discounts = taxes.filter((t) => Number(t.percent) < 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">Quản lý thuế & giảm giá</h2>
          <p className="text-amber-700/70">
            Cấu hình các loại thuế và giảm giá áp dụng cho đơn hàng
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Thêm thuế & giảm giá
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTax
                  ? "Chỉnh sửa thuế & giảm giá"
                  : "Thêm thuế & giảm giá mới"}
              </DialogTitle>
              <DialogDescription>
                {editingTax
                  ? "Cập nhật thông tin thuế & giảm giá"
                  : "Nhập thông tin thuế & giảm giá mới"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên thuế & giảm giá *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VAT, Phí phục vụ, Giảm giá khách hàng thường xuyên..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percent">Phần trăm (%) *</Label>
                <Input
                  id="percent"
                  type="number"
                  step="0.01"
                  value={formData.percent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      percent: Number(e.target.value),
                    })
                  }
                  placeholder="Nhập số dương cho thuế, số âm cho giảm giá"
                />
                <p className="text-xs text-amber-600">
                  Ví dụ: 10 = +10% (thuế), -15 = -15% (giảm giá)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả (tùy chọn)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả chi tiết về thuế/phí này..."
                  rows={3}
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
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <Percent className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 mb-1">Tổng số thuế</p>
              <p className="text-2xl font-bold text-blue-800">{totalTaxes}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <div className="flex items-center gap-3">
            <Percent className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 mb-1">Thuế/Phí</p>
              <p className="text-2xl font-bold text-purple-800">
                {positiveTaxes}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <Percent className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700 mb-1">Giảm giá</p>
              <p className="text-2xl font-bold text-green-800">{discounts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 border-2 border-orange-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
          <Input
            placeholder="Tìm kiếm thuế theo tên hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>
      </Card>

      {/* Taxes List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-amber-900">Đang tải dữ liệu...</span>
          </div>
        ) : filteredTaxes.length === 0 ? (
          <div className="text-center py-12">
            <Percent className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
            <p className="text-amber-600/50">Không tìm thấy thuế</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTaxes.map((tax) => (
              <Card
                key={tax.id}
                className="p-4 hover:shadow-lg transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                      <Percent className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-amber-900">{tax.name}</h4>
                        {getTaxBadge(tax)}
                      </div>
                      <p className="text-sm text-amber-600 mb-1">
                        <span
                          className={`font-semibold text-lg ${
                            Number(tax.percent) > 0
                              ? "text-blue-600"
                              : Number(tax.percent) < 0
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        >
                          {Number(tax.percent) > 0 ? "+" : ""}
                          {tax.percent}%
                        </span>
                      </p>
                      {tax.description && (
                        <p className="text-xs text-amber-500">
                          {tax.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-200 hover:bg-orange-50"
                      onClick={() => handleOpenDialog(tax)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:bg-red-50 text-red-600"
                      onClick={() => handleDelete(tax.id, tax.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
