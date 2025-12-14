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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  Upload,
  Camera,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { ingredientsApi } from "../lib/api";
import type {
  Ingredient,
  CreateIngredientDto,
  MeasureUnit,
} from "../types/api";

const measureUnits: { value: MeasureUnit; label: string }[] = [
  { value: "g", label: "gram (g)" },
  { value: "kg", label: "kilogram (kg)" },
  { value: "l", label: "liter (l)" },
  { value: "ml", label: "milliliter (ml)" },
  { value: "pcs", label: "cái/miếng (pcs)" },
  { value: "tsp", label: "thìa cà phê (tsp)" },
  { value: "tbsp", label: "thìa canh (tbsp)" },
];

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
        measureUnit: ingredient.measureUnit,
      });
      setImagePreview(ingredient.image || "");
      setImageFile(null);
    } else {
      setEditingIngredient(null);
      setFormData({
        name: "",
        amountLeft: 0,
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
    setFormData({ name: "", amountLeft: 0, measureUnit: "g" });
    setImagePreview("");
    setImageFile(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên nguyên liệu!");
      return;
    }

    if (formData.amountLeft < 0) {
      alert("Số lượng phải >= 0!");
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
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append("image", imageFile);
          await ingredientsApi.update(editingIngredient.id, formDataWithImage);
        } else {
          await ingredientsApi.update(editingIngredient.id, formData);
        }
        alert("Cập nhật nguyên liệu thành công!");
      } else {
        // Create ingredient
        if (imageFile) {
          const formDataWithImage = new FormData();
          formDataWithImage.append("name", formData.name);
          formDataWithImage.append(
            "amountLeft",
            formData.amountLeft.toString()
          );
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append("image", imageFile);
          await ingredientsApi.create(formDataWithImage);
        } else {
          await ingredientsApi.create(formData);
        }
        alert("Thêm nguyên liệu thành công!");
      }

      await loadIngredients();
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể lưu nguyên liệu. Vui lòng thử lại!";
      setError(message);
      alert(message);
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
      alert("Xóa nguyên liệu thành công!");
      await loadIngredients();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể xóa nguyên liệu. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Delete ingredient error:", err);
    }
  };

  const getStockStatus = (amountLeft: number) => {
    if (amountLeft === 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          Hết hàng
        </Badge>
      );
    } else if (amountLeft < 100) {
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
  const lowStockCount = ingredients.filter((i) => i.amountLeft < 100).length;
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
          <DialogContent className="sm:max-w-[500px]">
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
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-orange-300 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
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
                    JPG, PNG (max 10MB)
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
                    <Label>Đơn vị đo *</Label>
                    <Select
                      value={formData.measureUnit}
                      onValueChange={(value: MeasureUnit) =>
                        setFormData({ ...formData, measureUnit: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {measureUnits.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          <div className="grid gap-4">
            {filteredIngredients.map((ingredient) => (
              <Card
                key={ingredient.id}
                className="p-4 hover:shadow-lg transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={ingredient.image || "/default/default-avatar.jpg"}
                      alt={ingredient.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-orange-200"
                      onError={(e) => {
                        e.currentTarget.src = "/default/default-avatar.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-amber-900">
                          {ingredient.name}
                        </h4>
                        {getStockStatus(ingredient.amountLeft)}
                      </div>
                      <p className="text-sm text-amber-600">
                        Còn lại:{" "}
                        <span className="font-semibold">
                          {ingredient.amountLeft}
                        </span>{" "}
                        {ingredient.measureUnit}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-200 hover:bg-orange-50"
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
