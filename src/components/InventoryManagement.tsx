import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Camera,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { ingredientsApi } from "../lib/api";
import type {
  Ingredient,
  CreateIngredientDto,
  MeasureUnit,
} from "../types/api";
import { toast } from "sonner";

export function InventoryManagement() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<CreateIngredientDto>({
    name: "",
    amountLeft: 0,
    minAmount: 0,
    measureUnit: "g",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await ingredientsApi.list();
      console.log("Loaded ingredients:", data);
      setIngredients(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách nguyên liệu";
      setError(message);
      console.error("Load ingredients error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh!");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 10MB!");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        amountLeft: ingredient.amountLeft,
        minAmount: ingredient.minAmount || 0,
        measureUnit: ingredient.measureUnit,
      });
      setImagePreview(ingredient.image || "");
      setImageFile(null);
    } else {
      setEditingIngredient(null);
      setFormData({
        name: "",
        amountLeft: 0,
        minAmount: 0,
        measureUnit: "g",
      });
      setImagePreview("");
      setImageFile(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIngredient(null);
    setFormData({
      name: "",
      amountLeft: 0,
      minAmount: 0,
      measureUnit: "g",
    });
    setImagePreview("");
    setImageFile(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên nguyên liệu!");
      return;
    }

    if (
      formData.amountLeft < 0 ||
      (formData.minAmount && formData.minAmount < 0)
    ) {
      toast.error("Số lượng phải >= 0!");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingIngredient) {
        // Update ingredient
        if (imageFile) {
          const formDataWithImage = new FormData();
          formDataWithImage.append("name", formData.name);
          formDataWithImage.append(
            "amountLeft",
            formData.amountLeft.toString()
          );
          formDataWithImage.append(
            "minAmount",
            (formData.minAmount || 0).toString()
          );
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append("image", imageFile);
          await ingredientsApi.update(editingIngredient.id, formDataWithImage);
        } else {
          await ingredientsApi.update(editingIngredient.id, formData);
        }
        toast.success("Cập nhật nguyên liệu thành công!");
      } else {
        // Create ingredient
        if (imageFile) {
          const formDataWithImage = new FormData();
          formDataWithImage.append("name", formData.name);
          formDataWithImage.append(
            "amountLeft",
            formData.amountLeft.toString()
          );
          formDataWithImage.append(
            "minAmount",
            (formData.minAmount || 0).toString()
          );
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append("image", imageFile);
          await ingredientsApi.create(formDataWithImage);
        } else {
          await ingredientsApi.create(formData);
        }
        toast.success("Thêm nguyên liệu thành công!");
      }

      await loadIngredients();
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể lưu nguyên liệu. Vui lòng thử lại!";
      setError(message);
      toast.error(message);
      console.error("Save ingredient error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nguyên liệu "${name}"?`)) {
      return;
    }

    setError("");
    try {
      await ingredientsApi.remove(id);
      toast.success("Xóa nguyên liệu thành công!");
      await loadIngredients();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể xóa nguyên liệu. Vui lòng thử lại!";
      setError(message);
      toast.error(message);
      console.error("Delete ingredient error:", err);
    }
  };

  const getStockStatus = (amountLeft: number, minAmount: number) => {
    if (amountLeft === 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          Hết hàng
        </Badge>
      );
    } else if (amountLeft > 0 && amountLeft <= minAmount) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          Sắp hết
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        Còn hàng
      </Badge>
    );
  };

  const filteredIngredients = ingredients.filter((ing) => {
    const searchLower = searchTerm.toLowerCase();
    return ing.name.toLowerCase().includes(searchLower);
  });

  const totalIngredients = ingredients.length;
  const lowStockCount = ingredients.filter(
    (i) => i.amountLeft > 0 && i.amountLeft <= i.minAmount
  ).length;
  const outOfStockCount = ingredients.filter((i) => i.amountLeft === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">Quản lý kho nguyên liệu</h2>
          <p className="text-amber-700/70">
            Theo dõi và quản lý nguyên liệu trong kho
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              Thêm nguyên liệu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingIngredient
                  ? "Chỉnh sửa nguyên liệu"
                  : "Thêm nguyên liệu mới"}
              </DialogTitle>
              <DialogDescription>
                {editingIngredient
                  ? "Cập nhật thông tin nguyên liệu"
                  : "Nhập thông tin nguyên liệu mới"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Image Upload */}
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 border-2 border-dashed border-orange-300 rounded-lg overflow-hidden bg-orange-50 flex items-center justify-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-12 w-12 mb-2" />
                        <span className="text-xs">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    style={{ display: "none" }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-2 flex items-center justify-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Chọn ảnh
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    JPG, PNG, GIF (max 10MB)
                  </p>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên nguyên liệu *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Sữa tươi, Đường trắng, Trà xanh..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amountLeft">Số lượng hiện có *</Label>
                    <Input
                      id="amountLeft"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amountLeft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amountLeft: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minAmount">Số lượng tối thiểu *</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minAmount || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minAmount: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="measureUnit">Đơn vị đo *</Label>
                    <select
                      id="measureUnit"
                      value={formData.measureUnit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          measureUnit: e.target.value as MeasureUnit,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="g">g (gram)</option>
                      <option value="kg">kg (kilogram)</option>
                      <option value="l">l (liter)</option>
                      <option value="ml">ml (milliliter)</option>
                      <option value="pcs">pcs (pieces)</option>
                      <option value="tsp">tsp (teaspoon)</option>
                      <option value="tbsp">tbsp (tablespoon)</option>
                    </select>
                  </div>
                </div>
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
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 mb-1">Tổng nguyên liệu</p>
              <p className="text-2xl font-bold text-blue-800">
                {totalIngredients}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-700 mb-1">Sắp hết hàng</p>
              <p className="text-2xl font-bold text-yellow-800">
                {lowStockCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-2 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-red-700 mb-1">Hết hàng</p>
              <p className="text-2xl font-bold text-red-800">
                {outOfStockCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 border-2 border-orange-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
          <Input
            placeholder="Tìm kiếm nguyên liệu theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>
      </Card>

      {/* Ingredients List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-amber-900">Đang tải dữ liệu...</span>
          </div>
        ) : filteredIngredients.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
            <p className="text-amber-600/50">Không tìm thấy nguyên liệu</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredIngredients.map((ingredient) => (
              <Card
                key={ingredient.id}
                className="overflow-hidden hover:shadow-xl transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl flex flex-col"
                style={{ height: "380px" }}
              >
                <div
                  className="relative bg-gradient-to-br from-orange-50 to-amber-50 flex-shrink-0"
                  style={{ height: "200px" }}
                >
                  <img
                    src={ingredient.image || "/default/default-avatar.jpg"}
                    alt={ingredient.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/default/default-avatar.jpg";
                    }}
                  />
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {getStockStatus(
                      ingredient.amountLeft,
                      ingredient.minAmount
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col" style={{ height: "180px" }}>
                  <div className="flex-grow">
                    <h4
                      className="font-medium text-amber-900 mb-1 truncate"
                      style={{ height: "24px", lineHeight: "24px" }}
                    >
                      {ingredient.name}
                    </h4>
                    <p
                      className="text-sm text-orange-600 mb-2"
                      style={{ height: "20px", lineHeight: "20px" }}
                    >
                      Còn lại:{" "}
                      <span className="font-semibold">
                        {ingredient.amountLeft}
                      </span>{" "}
                      {ingredient.measureUnit}
                    </p>
                    <p
                      className="text-xs text-amber-600 mb-3"
                      style={{ height: "16px", lineHeight: "16px" }}
                    >
                      Tối thiểu: {ingredient.minAmount} {ingredient.measureUnit}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-orange-200 hover:bg-orange-50"
                      onClick={() => handleOpenDialog(ingredient)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:bg-red-50 text-red-600"
                      onClick={() =>
                        handleDelete(ingredient.id, ingredient.name)
                      }
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
