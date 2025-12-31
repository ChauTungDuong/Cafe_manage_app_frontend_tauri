import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { ingredientsApi } from "../lib/api";
import type {
  Ingredient,
  CreateIngredientDto,
  MeasureUnit,
} from "../types/api";
import { toast } from "sonner";
import type { User } from "../types/user";

interface InventoryManagementProps {
  currentUser?: User | null;
}

export function InventoryManagement({ currentUser }: InventoryManagementProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [exportSearch, setExportSearch] = useState("");
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStockSaving, setIsStockSaving] = useState<
    "import" | "export" | null
  >(null);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState<CreateIngredientDto>({
    name: "",
    measureUnit: "g",
    pricePerUnit: { price: 0, unit: "g" },
    minAmount: 0,
  });

  const [importRows, setImportRows] = useState<
    Record<
      string,
      {
        selected: boolean;
        amount: string;
        pricePerUnit: string;
        unit: MeasureUnit;
      }
    >
  >({});

  const [exportRows, setExportRows] = useState<
    Record<string, { selected: boolean; amount: string }>
  >({});

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
        minAmount: ingredient.minAmount || 0,
        measureUnit: ingredient.measureUnit,
        pricePerUnit: {
          price: ingredient.pricePerUnit?.price ?? 0,
          unit: ingredient.pricePerUnit?.unit ?? ingredient.measureUnit,
        },
      });
      setImagePreview(ingredient.image || "");
      setImageFile(null);
    } else {
      setEditingIngredient(null);
      setFormData({
        name: "",
        measureUnit: "g",
        pricePerUnit: { price: 0, unit: "g" },
        minAmount: 0,
      });
      setImagePreview("");
      setImageFile(null);
    }
    setIsDialogOpen(true);
  };

  const handleOpenImport = () => {
    setImportSearch("");
    const next: typeof importRows = {};
    for (const ing of ingredients) {
      next[ing.id] = {
        selected: false,
        amount: "",
        pricePerUnit: "",
        unit: ing.measureUnit,
      };
    }
    setImportRows(next);
    setIsImportOpen(true);
  };

  const handleOpenExport = () => {
    setExportSearch("");
    const next: typeof exportRows = {};
    for (const ing of ingredients) {
      next[ing.id] = {
        selected: false,
        amount: "",
      };
    }
    setExportRows(next);
    setIsExportOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIngredient(null);
    setFormData({
      name: "",
      measureUnit: "g",
      pricePerUnit: { price: 0, unit: "g" },
      minAmount: 0,
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
      (formData.minAmount && formData.minAmount < 0) ||
      formData.pricePerUnit.price < 0
    ) {
      toast.error("Số lượng phải >= 0!");
      return;
    }

    if (!Number.isFinite(Number(formData.pricePerUnit.price))) {
      toast.error("Giá/đơn vị không hợp lệ!");
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
            "minAmount",
            (formData.minAmount || 0).toString()
          );
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append(
            "pricePerUnit",
            JSON.stringify(formData.pricePerUnit)
          );
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
            "minAmount",
            (formData.minAmount || 0).toString()
          );
          formDataWithImage.append("measureUnit", formData.measureUnit);
          formDataWithImage.append(
            "pricePerUnit",
            JSON.stringify(formData.pricePerUnit)
          );
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

  const handleImportStock = async () => {
    const items = Object.entries(importRows)
      .filter(([, v]) => v.selected)
      .map(([ingredientId, v]) => {
        const amount = Number(v.amount);
        const pricePerUnit =
          v.pricePerUnit === "" ? undefined : Number(v.pricePerUnit);
        return {
          ingredientId,
          amount,
          ...(pricePerUnit !== undefined
            ? {
                pricePerUnit,
                unit: v.unit,
              }
            : {}),
        };
      });

    if (items.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nguyên liệu để nhập kho");
      return;
    }

    for (const item of items) {
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        toast.error("Lượng nhập phải là số dương");
        return;
      }
      if (
        (item as any).pricePerUnit !== undefined &&
        (!Number.isFinite((item as any).pricePerUnit) ||
          (item as any).pricePerUnit < 0)
      ) {
        toast.error("Giá/đơn vị phải >= 0");
        return;
      }
    }

    setIsStockSaving("import");
    try {
      await ingredientsApi.importStock({ ingredients: items as any });
      toast.success("Nhập kho thành công!");
      setIsImportOpen(false);
      await loadIngredients();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể nhập kho. Vui lòng thử lại!";
      toast.error(message);
    } finally {
      setIsStockSaving(null);
    }
  };

  const handleExportStock = async () => {
    const items = Object.entries(exportRows)
      .filter(([, v]) => v.selected)
      .map(([ingredientId, v]) => ({
        ingredientId,
        amount: Number(v.amount),
      }));

    if (items.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nguyên liệu để xuất kho");
      return;
    }

    for (const item of items) {
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        toast.error("Lượng xuất phải là số dương");
        return;
      }
    }

    setIsStockSaving("export");
    try {
      await ingredientsApi.exportStock({ ingredients: items });
      toast.success("Xuất kho thành công!");
      setIsExportOpen(false);
      await loadIngredients();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể xuất kho. Vui lòng thử lại!";
      toast.error(message);
    } finally {
      setIsStockSaving(null);
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
          <h2 className="text-amber-900 mb-1">
            {currentUser?.role === "admin"
              ? `Quản lý kho nguyên liệu (${totalIngredients})`
              : `Danh sách nguyên liệu (${totalIngredients})`}
          </h2>
          <p className="text-amber-700/70">
            {currentUser?.role === "admin"
              ? "Theo dõi và quản lý nguyên liệu trong kho"
              : "Theo dõi nguyên liệu trong kho"}
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenImport}
                  variant="outline"
                  className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                  disabled={isLoading || ingredients.length === 0}
                >
                  <ArrowDownToLine className="h-5 w-5 mr-2" />
                  Nhập kho
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] sm:w-[58vw] max-w-[760px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nhập kho nguyên liệu</DialogTitle>
                  <DialogDescription>
                    Chọn nhiều nguyên liệu và nhập số lượng (có thể cập nhật
                    giá/đơn vị)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="h-4 w-4 text-amber-700/60 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                      placeholder="Tìm nguyên liệu theo tên..."
                      className="pl-14 rounded-xl border-orange-200"
                      disabled={isStockSaving === "import"}
                    />
                  </div>

                  {importSearch.trim() !== "" && (
                    <div className="border rounded-xl border-orange-100 overflow-x-auto">
                      <Table className="min-w-[460px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên</TableHead>
                            <TableHead className="w-[110px]">Tồn</TableHead>
                            <TableHead className="w-[110px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingredients
                            .filter((ing) =>
                              ing.name
                                .toLowerCase()
                                .includes(importSearch.toLowerCase())
                            )
                            .slice(0, 8)
                            .map((ing) => {
                              const selected = importRows[ing.id]?.selected;
                              return (
                                <TableRow key={ing.id}>
                                  <TableCell className="text-amber-900">
                                    {ing.name}
                                  </TableCell>
                                  <TableCell className="text-amber-900">
                                    {ing.amountLeft} {ing.measureUnit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                                      disabled={
                                        Boolean(selected) ||
                                        isStockSaving === "import"
                                      }
                                      onClick={() => {
                                        setImportRows((prev) => ({
                                          ...prev,
                                          [ing.id]: {
                                            ...(prev[ing.id] ?? {
                                              selected: false,
                                              amount: "",
                                              pricePerUnit: "",
                                              unit: ing.measureUnit,
                                            }),
                                            selected: true,
                                            unit:
                                              (prev[ing.id]
                                                ?.unit as MeasureUnit) ??
                                              ing.measureUnit,
                                          },
                                        }));
                                        setImportSearch("");
                                      }}
                                    >
                                      {selected ? "Đã chọn" : "Chọn"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}

                          {ingredients.filter((ing) =>
                            ing.name
                              .toLowerCase()
                              .includes(importSearch.toLowerCase())
                          ).length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-6 text-center text-amber-700/70"
                              >
                                Không tìm thấy nguyên liệu
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="border rounded-xl border-orange-100 overflow-x-auto">
                    <Table className="min-w-[660px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên</TableHead>
                          <TableHead className="w-[130px]">Tồn</TableHead>
                          <TableHead className="w-[150px]">
                            Lượng nhập *
                          </TableHead>
                          <TableHead className="w-[170px]">
                            Giá/đơn vị
                          </TableHead>
                          <TableHead className="w-[130px]">
                            Đơn vị giá
                          </TableHead>
                          <TableHead className="w-[90px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredients
                          .filter((ing) => importRows[ing.id]?.selected)
                          .map((ing) => {
                            const row = importRows[ing.id];
                            return (
                              <TableRow key={ing.id}>
                                <TableCell className="text-amber-900">
                                  {ing.name}
                                </TableCell>
                                <TableCell className="text-amber-900">
                                  {ing.amountLeft} {ing.measureUnit}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row?.amount ?? ""}
                                    onChange={(e) =>
                                      setImportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                            pricePerUnit: "",
                                            unit: ing.measureUnit,
                                          }),
                                          amount: e.target.value,
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "import"}
                                    placeholder="0"
                                    className="rounded-xl"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row?.pricePerUnit ?? ""}
                                    onChange={(e) =>
                                      setImportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                            pricePerUnit: "",
                                            unit: ing.measureUnit,
                                          }),
                                          pricePerUnit: e.target.value,
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "import"}
                                    placeholder="(tuỳ chọn)"
                                    className="rounded-xl"
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    value={
                                      (row?.unit as any) ?? ing.measureUnit
                                    }
                                    onChange={(e) =>
                                      setImportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                            pricePerUnit: "",
                                            unit: ing.measureUnit,
                                          }),
                                          unit: e.target.value as MeasureUnit,
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "import"}
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                  >
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                    <option value="l">l</option>
                                    <option value="ml">ml</option>
                                    <option value="pcs">pcs</option>
                                    <option value="tsp">tsp</option>
                                    <option value="tbsp">tbsp</option>
                                  </select>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                                    onClick={() =>
                                      setImportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                            pricePerUnit: "",
                                            unit: ing.measureUnit,
                                          }),
                                          selected: false,
                                          amount: "",
                                          pricePerUnit: "",
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "import"}
                                  >
                                    Bỏ
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                        {ingredients.filter(
                          (ing) => importRows[ing.id]?.selected
                        ).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-10 text-center text-amber-700/70"
                            >
                              Danh sách nhập kho đang trống
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsImportOpen(false)}
                    disabled={isStockSaving === "import"}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-600"
                    onClick={handleImportStock}
                    disabled={isStockSaving === "import"}
                  >
                    {isStockSaving === "import" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      "Xác nhận nhập kho"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenExport}
                  variant="outline"
                  className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                  disabled={isLoading || ingredients.length === 0}
                >
                  <ArrowUpFromLine className="h-5 w-5 mr-2" />
                  Xuất kho
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] sm:w-[58vw] max-w-[720px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Xuất kho nguyên liệu</DialogTitle>
                  <DialogDescription>
                    Chọn nhiều nguyên liệu và nhập số lượng cần xuất
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="h-4 w-4 text-amber-700/60 absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      value={exportSearch}
                      onChange={(e) => setExportSearch(e.target.value)}
                      placeholder="Tìm nguyên liệu theo tên..."
                      className="pl-14 rounded-xl border-orange-200"
                      disabled={isStockSaving === "export"}
                    />
                  </div>

                  {exportSearch.trim() !== "" && (
                    <div className="border rounded-xl border-orange-100 overflow-x-auto">
                      <Table className="min-w-[460px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên</TableHead>
                            <TableHead className="w-[110px]">Tồn</TableHead>
                            <TableHead className="w-[110px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingredients
                            .filter((ing) =>
                              ing.name
                                .toLowerCase()
                                .includes(exportSearch.toLowerCase())
                            )
                            .slice(0, 8)
                            .map((ing) => {
                              const selected = exportRows[ing.id]?.selected;
                              return (
                                <TableRow key={ing.id}>
                                  <TableCell className="text-amber-900">
                                    {ing.name}
                                  </TableCell>
                                  <TableCell className="text-amber-900">
                                    {ing.amountLeft} {ing.measureUnit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                                      disabled={
                                        Boolean(selected) ||
                                        isStockSaving === "export"
                                      }
                                      onClick={() => {
                                        setExportRows((prev) => ({
                                          ...prev,
                                          [ing.id]: {
                                            ...(prev[ing.id] ?? {
                                              selected: false,
                                              amount: "",
                                            }),
                                            selected: true,
                                          },
                                        }));
                                        setExportSearch("");
                                      }}
                                    >
                                      {selected ? "Đã chọn" : "Chọn"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}

                          {ingredients.filter((ing) =>
                            ing.name
                              .toLowerCase()
                              .includes(exportSearch.toLowerCase())
                          ).length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-6 text-center text-amber-700/70"
                              >
                                Không tìm thấy nguyên liệu
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="border rounded-xl border-orange-100 overflow-x-auto">
                    <Table className="min-w-[560px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên</TableHead>
                          <TableHead className="w-[130px]">Tồn</TableHead>
                          <TableHead className="w-[160px]">
                            Lượng xuất *
                          </TableHead>
                          <TableHead className="w-[90px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredients
                          .filter((ing) => exportRows[ing.id]?.selected)
                          .map((ing) => {
                            const row = exportRows[ing.id];
                            return (
                              <TableRow key={ing.id}>
                                <TableCell className="text-amber-900">
                                  {ing.name}
                                </TableCell>
                                <TableCell className="text-amber-900">
                                  {ing.amountLeft} {ing.measureUnit}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row?.amount ?? ""}
                                    onChange={(e) =>
                                      setExportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                          }),
                                          amount: e.target.value,
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "export"}
                                    placeholder="0"
                                    className="rounded-xl"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-2 border-orange-200 hover:bg-orange-50"
                                    onClick={() =>
                                      setExportRows((prev) => ({
                                        ...prev,
                                        [ing.id]: {
                                          ...(prev[ing.id] ?? {
                                            selected: true,
                                            amount: "",
                                          }),
                                          selected: false,
                                          amount: "",
                                        },
                                      }))
                                    }
                                    disabled={isStockSaving === "export"}
                                  >
                                    Bỏ
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                        {ingredients.filter(
                          (ing) => exportRows[ing.id]?.selected
                        ).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="py-10 text-center text-amber-700/70"
                            >
                              Danh sách xuất kho đang trống
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsExportOpen(false)}
                    disabled={isStockSaving === "export"}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-600"
                    onClick={handleExportStock}
                    disabled={isStockSaving === "export"}
                  >
                    {isStockSaving === "export" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      "Xác nhận xuất kho"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
              <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
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
                              pricePerUnit: {
                                ...formData.pricePerUnit,
                                unit: (formData.pricePerUnit?.unit ??
                                  (e.target
                                    .value as MeasureUnit)) as MeasureUnit,
                              },
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="price">Giá/đơn vị *</Label>
                          <Input
                            id="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.pricePerUnit.price}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pricePerUnit: {
                                  ...formData.pricePerUnit,
                                  price: Number(e.target.value),
                                },
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priceUnit">Đơn vị giá *</Label>
                          <select
                            id="priceUnit"
                            value={formData.pricePerUnit.unit}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pricePerUnit: {
                                  ...formData.pricePerUnit,
                                  unit: e.target.value as MeasureUnit,
                                },
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="l">l</option>
                            <option value="ml">ml</option>
                            <option value="pcs">pcs</option>
                            <option value="tsp">tsp</option>
                            <option value="tbsp">tbsp</option>
                          </select>
                        </div>
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
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="flex flex-row gap-4">
        <Card className="flex-1 p-4 border-2 border-blue-200 bg-blue-50">
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
        <Card className="flex-1 p-4 border-2 border-yellow-200 bg-yellow-50">
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
        <Card className="flex-1 p-4 border-2 border-red-200 bg-red-50">
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
                style={{ height: "430px" }}
              >
                <div
                  className="relative bg-gradient-to-br from-orange-50 to-amber-50 flex-shrink-0"
                  style={{ height: "250px" }}
                >
                  <img
                    src={ingredient.image || "/default/default-avatar.jpg"}
                    alt={ingredient.name}
                    className="w-full h-full object-contain"
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

                  {currentUser?.role === "admin" && (
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
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
