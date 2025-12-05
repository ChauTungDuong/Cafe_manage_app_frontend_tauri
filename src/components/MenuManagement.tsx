import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  Package,
  Upload,
  X,
} from "lucide-react";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { itemsApi, categoriesApi } from "../lib/api";
import type { Item, Category, CreateItemDto } from "../types/api";

export function MenuManagement() {
  // Data state
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Loading & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [renderError, setRenderError] = useState<Error | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    categoryName: "",
    price: "",
    amountLeft: "",
    description: "",
    status: "available" as "available" | "out of stock" | "discontinued",
  });

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    console.log("🚀 MenuManagement mounted");
    loadItems();
    loadCategories();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      console.log("📦 Loading items...");
      const data = await itemsApi.list();
      console.log("✅ Items loaded:", data);
      setItems(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách sản phẩm";
      setError(message);
      console.error("❌ Load items error:", err);
      console.error("Error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      console.log("📂 Loading categories...");
      const data = await categoriesApi.list();
      console.log("✅ Categories loaded:", data);
      setCategories(data);
    } catch (err: any) {
      console.error("❌ Load categories error:", err);
      console.error("Error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleOpenDialog = (item?: Item) => {
    if (item) {
      // Edit mode
      setEditingItem(item);
      setFormData({
        name: item.name,
        categoryId: item.category?.id || "",
        categoryName: item.category?.name || "",
        price: item.price.toString(),
        amountLeft: item.amountLeft.toString(),
        description: item.description || "",
        status: item.status,
      });
      // Set existing image preview
      if (item.image) {
        setImagePreview(item.image);
      }
    } else {
      // Add mode
      setEditingItem(null);
      setFormData({
        name: "",
        categoryId: "",
        categoryName: "",
        price: "",
        amountLeft: "",
        description: "",
        status: "available",
      });
      setImagePreview("");
    }
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: "",
      categoryId: "",
      categoryName: "",
      price: "",
      amountLeft: "",
      description: "",
      status: "available",
    });
    setImageFile(null);
    setImagePreview("");
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chọn file ảnh!");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước ảnh không được vượt quá 5MB!");
        return;
      }
      setImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(editingItem?.image || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm!");
      return;
    }

    if (!formData.categoryName.trim() && !formData.categoryId) {
      alert("Vui lòng chọn hoặc nhập danh mục!");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert("Vui lòng nhập giá hợp lệ!");
      return;
    }

    if (!formData.amountLeft || parseInt(formData.amountLeft) < 0) {
      alert("Vui lòng nhập số lượng hợp lệ!");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingItem) {
        // Update existing item
        const updateDto = {
          name: formData.name,
          category: {
            name: formData.categoryName || editingItem.category?.name || "",
          },
          price: parseFloat(formData.price),
          amountLeft: parseInt(formData.amountLeft),
          description: formData.description,
          status: formData.status,
        };

        // Pass imageFile if selected (optional)
        await itemsApi.update(
          editingItem.id,
          updateDto,
          imageFile || undefined
        );
        alert("Cập nhật sản phẩm thành công!");
      } else {
        // Create new item
        const createDto: CreateItemDto = {
          name: formData.name,
          category: {
            name: formData.categoryName || formData.categoryId, // Use categoryName for new categories
          },
          price: parseFloat(formData.price),
          amountLeft: parseInt(formData.amountLeft),
          description: formData.description,
          status: formData.status,
        };

        // Pass imageFile if selected (optional)
        await itemsApi.create(createDto, imageFile || undefined);
        alert("Thêm sản phẩm thành công!");
      }

      // Reload data
      await Promise.all([loadItems(), loadCategories()]);
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể lưu sản phẩm. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Save item error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`)) {
      return;
    }

    setError("");
    try {
      await itemsApi.remove(id);
      alert("Xóa sản phẩm thành công!");
      await loadItems();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể xóa sản phẩm. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Delete item error:", err);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from items
  const itemCategories = Array.from(
    new Set(items.map((item) => item.category?.name).filter(Boolean))
  );

  // Error boundary
  if (renderError) {
    return (
      <div className="space-y-4 p-6">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <h3 className="text-red-600 font-bold mb-2">Lỗi hiển thị</h3>
          <p className="text-red-600">{renderError.message}</p>
          <pre className="text-xs mt-2 text-red-500 overflow-auto">
            {renderError.stack}
          </pre>
        </div>
        <Button
          onClick={() => {
            setRenderError(null);
            loadItems();
            loadCategories();
          }}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white"
        >
          Thử lại
        </Button>
      </div>
    );
  }

  try {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-amber-900">
              Quản lý thực đơn
            </h2>
            <p className="text-amber-600">Quản lý sản phẩm và danh mục</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Thêm sản phẩm
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Cập nhật thông tin sản phẩm"
                    : "Nhập thông tin sản phẩm mới"}
                </DialogDescription>
              </DialogHeader>

              {/* 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên sản phẩm *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="VD: Cappuccino"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Danh mục *</Label>
                    {editingItem ? (
                      // Edit mode: show current category (read-only)
                      <Input
                        value={editingItem.category?.name || "N/A"}
                        disabled
                        className="bg-gray-50"
                      />
                    ) : (
                      // Add mode: select existing or enter new
                      <div className="space-y-2">
                        <Select
                          value={formData.categoryId}
                          onValueChange={(value: string) =>
                            setFormData({
                              ...formData,
                              categoryId: value,
                              categoryName: "",
                            })
                          }
                          disabled={isLoadingCategories}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingCategories
                                  ? "Đang tải..."
                                  : "Chọn danh mục có sẵn"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">
                          Hoặc nhập tên danh mục mới:
                        </p>
                        <Input
                          value={formData.categoryName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              categoryName: e.target.value,
                              categoryId: "",
                            })
                          }
                          placeholder="VD: coffee, tea, pastry"
                          disabled={!!formData.categoryId}
                        />
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá (VND) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="45000"
                    />
                  </div>

                  {/* Stock */}
                  <div className="space-y-2">
                    <Label htmlFor="amountLeft">Số lượng tồn kho *</Label>
                    <Input
                      id="amountLeft"
                      type="number"
                      min="0"
                      value={formData.amountLeft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amountLeft: e.target.value,
                        })
                      }
                      placeholder="100"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">✅ Còn hàng</SelectItem>
                        <SelectItem value="out of stock">
                          ⚠️ Hết hàng
                        </SelectItem>
                        <SelectItem value="discontinued">
                          🚫 Ngừng bán
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Mô tả sản phẩm..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Right Column - Image Upload */}
                <div className="space-y-4">
                  <Label>Ảnh sản phẩm</Label>

                  {/* Image Preview */}
                  <div className="relative aspect-square w-full max-w-[180px] mx-auto rounded-xl overflow-hidden border-2 border-orange-200 bg-gray-50">
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-12 w-12 mb-2" />
                        <span className="text-sm">Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  {/* File Input */}
                  <div className="flex flex-col items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {imageFile
                        ? "Đổi ảnh"
                        : imagePreview
                        ? "Thay ảnh"
                        : "Chọn ảnh"}
                    </Button>
                    {imageFile && (
                      <span className="text-xs text-gray-500 truncate max-w-[150px] text-center">
                        {imageFile.name}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 text-center">
                      JPG, PNG, GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
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

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card className="p-6 border-2 border-orange-100">
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-orange-200 focus:border-orange-400"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-[200px]">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="border-orange-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {itemCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Items Grid */}
        <ScrollArea className="h-[calc(100vh-320px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
              <div className="text-center">
                <p className="text-amber-900 font-medium mb-2">
                  Đang tải sản phẩm...
                </p>
                <p className="text-amber-600 text-sm">
                  Backend đang khởi động (30-50s nếu lần đầu)
                </p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
              <p className="text-amber-600/50">Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-xl transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl"
                >
                  <div className="aspect-square relative bg-gradient-to-br from-orange-50 to-amber-50">
                    <ImageWithFallback
                      src={
                        item.image ||
                        `https://images.unsplash.com/photo-1635090976010-d3f6dfbb1bac?w=400`
                      }
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      {item.status === "available" && (
                        <Badge className="bg-green-500">Còn hàng</Badge>
                      )}
                      {item.status === "out of stock" && (
                        <Badge className="bg-yellow-500">Hết hàng</Badge>
                      )}
                      {item.status === "discontinued" && (
                        <Badge className="bg-red-500">Ngừng bán</Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-amber-900 mb-1">
                      {item.name}
                    </h4>
                    <p className="text-sm text-orange-600 mb-2">
                      {item.category?.name || "N/A"}
                    </p>
                    <p className="text-lg font-semibold text-orange-600 mb-2">
                      {item.price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-xs text-amber-600 mb-3">
                      Tồn kho: {item.amountLeft}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-orange-200 hover:bg-orange-50"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 text-red-600"
                        onClick={() => handleDelete(item.id, item.name)}
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
  } catch (err) {
    console.error("❌ Render error in MenuManagement:", err);
    if (err instanceof Error) {
      setRenderError(err);
    }
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-red-600">Có lỗi xảy ra khi hiển thị trang</p>
        </div>
      </div>
    );
  }
}
