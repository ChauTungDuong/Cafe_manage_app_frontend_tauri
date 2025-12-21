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
  ChefHat,
  Info,
  Refrigerator,
  Save,
} from "lucide-react";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { itemsApi, categoriesApi, recipesApi } from "../lib/api";
import type {
  Item,
  Category,
  CreateItemDto,
  Recipe,
  Ingredient,
  CreateRecipeIngredientDto,
} from "../types/api";
import { toast } from "sonner";
import type { User } from "../types/user";

interface MenuManagementProps {
  currentUser?: User | null;
}

export function MenuManagement({ currentUser }: MenuManagementProps) {
  // Data state
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Normalize categories in case backend returns { data: [{ category, totalItems }] }
  const normalizedCategories: Category[] = ((categories as any[]) || []).map(
    (c) => (c && (c as any).category ? (c as any).category : c)
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [isRecipeFormDialogOpen, setIsRecipeFormDialogOpen] = useState(false);
  const [selectedItemForRecipe, setSelectedItemForRecipe] =
    useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "recipes"
  >("products");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);

  // State for viewing category items
  const [isCategoryItemsDialogOpen, setIsCategoryItemsDialogOpen] =
    useState(false);
  const [selectedCategoryForItems, setSelectedCategoryForItems] = useState<{
    category: Category;
    totalItems: number;
  } | null>(null);
  const [categoryItemsList, setCategoryItemsList] = useState<Item[]>([]);

  // State for Recipes Tab (all recipes)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoadingAllRecipes, setIsLoadingAllRecipes] = useState(false);
  const [isRecipeTabFormOpen, setIsRecipeTabFormOpen] = useState(false);
  const [editingRecipeInTab, setEditingRecipeInTab] = useState<Recipe | null>(
    null
  );
  const [recipeTabFormData, setRecipeTabFormData] = useState({
    name: "",
    description: "",
    itemId: "",
    ingredients: [] as CreateRecipeIngredientDto[],
  });

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
    description: "",
    status: "available" as "available" | "out of stock" | "discontinued",
  });

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recipe form state
  const [recipeFormData, setRecipeFormData] = useState({
    name: "",
    description: "",
    ingredients: [] as CreateRecipeIngredientDto[],
  });

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
  });

  // Load data on mount
  useEffect(() => {
    console.log("🚀 MenuManagement mounted");
    loadItems();
    loadCategories();
    loadAllRecipes(); // Load recipes on mount
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setError("");
    try {
      console.log("📦 Loading items...");
      const response: any = await itemsApi.list();
      console.log("✅ Items loaded:", response);
      // Handle both array and object with data property
      const itemsData = Array.isArray(response)
        ? response
        : response?.data || response || [];
      setItems(itemsData as Item[]);
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
      const response: any = await categoriesApi.list();
      console.log("✅ Categories loaded:", response);
      // New API returns { data: CategoryWithItems[], totalCategory: number }
      // Extract just the categories for the categories state
      if (response && response.data) {
        const categoriesOnly = response.data.map((item: any) => item.category);
        setCategories(categoriesOnly as Category[]);
      } else {
        // Fallback for old format
        const categoriesData = Array.isArray(response)
          ? response
          : response?.data || response || [];
        setCategories(categoriesData as Category[]);
      }
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

  // Load ingredients when opening recipe form
  const loadIngredients = async () => {
    try {
      console.log("🥬 Loading ingredients...");
      // Import ingredientsApi dynamically only when needed
      const { ingredientsApi } = await import("../lib/api");
      const response: any = await ingredientsApi.list();
      console.log("✅ Ingredients loaded:", response);
      // Handle both array and object with data property
      const ingredientsData = Array.isArray(response)
        ? response
        : response?.data || response || [];
      setIngredients(ingredientsData as Ingredient[]);
    } catch (err: any) {
      console.error("❌ Load ingredients error:", err);
    }
  };

  // Load all recipes for Recipes tab
  const loadAllRecipes = async () => {
    setIsLoadingAllRecipes(true);
    try {
      console.log("📋 Loading all recipes...");
      const response: any = await recipesApi.list();
      console.log("✅ All recipes loaded:", response);
      // Handle both array and object with data property
      const recipesData = Array.isArray(response)
        ? response
        : response?.data || response || [];
      setAllRecipes(recipesData as Recipe[]);
    } catch (err: any) {
      console.error("❌ Load all recipes error:", err);
    } finally {
      setIsLoadingAllRecipes(false);
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
        toast.error("Vui lòng chọn file ảnh!");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 10MB!");
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

  const handleViewRecipe = async (item: Item) => {
    setSelectedItemForRecipe(item);
    setIsRecipeDialogOpen(true);
    setIsLoadingRecipes(true);
    setError("");

    try {
      const data = await recipesApi.getByItemId(item.id);
      setRecipes(data);
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể tải công thức";
      setError(message);
      console.error("Load recipes error:", err);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleCloseRecipeDialog = () => {
    setIsRecipeDialogOpen(false);
    setSelectedItemForRecipe(null);
    setRecipes([]);
  };

  // Recipe Management Functions
  // Recipe Management Functions
  // (removed unused `handleOpenRecipeForm` to avoid TS6133 - function wasn't referenced)

  const handleCloseRecipeForm = () => {
    setIsRecipeFormDialogOpen(false);
    setEditingRecipe(null);
    setRecipeFormData({
      name: "",
      description: "",
      ingredients: [],
    });
  };

  const handleAddRecipeIngredient = () => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: [
        ...recipeFormData.ingredients,
        { ingredientId: "", amount: 0 },
      ],
    });
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: recipeFormData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleUpdateRecipeIngredient = (
    index: number,
    field: keyof CreateRecipeIngredientDto,
    value: any
  ) => {
    const newIngredients = [...recipeFormData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setRecipeFormData({
      ...recipeFormData,
      ingredients: newIngredients,
    });
  };

  const handleSaveRecipe = async () => {
    if (!selectedItemForRecipe) return;

    // Validation
    if (!recipeFormData.name.trim()) {
      alert("Vui lòng nhập tên công thức!");
      return;
    }

    if (recipeFormData.ingredients.length === 0) {
      alert("Vui lòng thêm ít nhất một nguyên liệu!");
      return;
    }

    // Validate all ingredients
    for (let i = 0; i < recipeFormData.ingredients.length; i++) {
      const ing = recipeFormData.ingredients[i];
      if (!ing.ingredientId) {
        alert(`Vui lòng chọn nguyên liệu cho dòng ${i + 1}!`);
        return;
      }
      if (!ing.amount || ing.amount <= 0) {
        alert(`Vui lòng nhập số lượng hợp lệ cho dòng ${i + 1}!`);
        return;
      }
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingRecipe) {
        // Update existing recipe
        await recipesApi.update(editingRecipe.id, {
          name: recipeFormData.name,
          description: recipeFormData.description,
          ingredients: recipeFormData.ingredients,
        });
        alert("Cập nhật công thức thành công!");
      } else {
        // Create new recipe
        await recipesApi.create({
          name: recipeFormData.name,
          description: recipeFormData.description,
          itemId: selectedItemForRecipe.id,
          ingredients: recipeFormData.ingredients,
        });
        alert("Tạo công thức mới thành công!");
      }

      handleCloseRecipeForm();
      // Reload recipes
      const updatedRecipes = await recipesApi.getByItemId(
        selectedItemForRecipe.id
      );
      setRecipes(updatedRecipes);
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể lưu công thức";
      setError(message);
      alert(message);
      console.error("Save recipe error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string, recipeName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa công thức "${recipeName}"?`)) {
      return;
    }

    try {
      await recipesApi.delete(recipeId);
      alert("Xóa công thức thành công!");
      // Reload recipes
      if (selectedItemForRecipe) {
        const updatedRecipes = await recipesApi.getByItemId(
          selectedItemForRecipe.id
        );
        setRecipes(updatedRecipes);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể xóa công thức";
      alert(message);
      console.error("Delete recipe error:", err);
    }
  };

  // Category Management Functions
  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      // Edit mode
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
      });
    } else {
      // Add mode
      setEditingCategory(null);
      setCategoryFormData({
        name: "",
      });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setEditingCategory(null);
    setCategoryFormData({
      name: "",
    });
    setIsCategoryDialogOpen(false);
  };

  const handleSaveCategory = async () => {
    // Validation
    if (!categoryFormData.name.trim()) {
      toast.error("Vui lòng nhập tên danh mục!");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        // Update existing category
        await categoriesApi.update(editingCategory.id, categoryFormData);
        toast.success("Cập nhật danh mục thành công!");
      } else {
        // Create new category
        await categoriesApi.create(categoryFormData);
        toast.success("Thêm danh mục thành công!");
      }
      await loadCategories();
      handleCloseCategoryDialog();
    } catch (err: any) {
      const message = err.response?.data?.message || "Không thể lưu danh mục";
      toast.error(message);
      console.error("Save category error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (
    categoryId: string,
    categoryName: string
  ) => {
    if (
      !confirm(
        `Bạn có chắc muốn xóa danh mục "${categoryName}"?\nLưu ý: Không thể xóa danh mục đang có sản phẩm.`
      )
    ) {
      return;
    }

    try {
      await categoriesApi.remove(categoryId);
      alert("Xóa danh mục thành công!");
      // Reload categories
      await loadCategories();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể xóa danh mục. Có thể danh mục đang được sử dụng.";
      alert(message);
      console.error("Delete category error:", err);
    }
  };

  // View items in a category
  const handleViewCategoryItems = async (category: any) => {
    try {
      // Use items from backend category response
      const categoryItems = category.items || [];
      setSelectedCategoryForItems({
        category: { id: category.id, name: category.name },
        totalItems: categoryItems.length,
      });
      setCategoryItemsList(categoryItems);
      setIsCategoryItemsDialogOpen(true);
    } catch (err: any) {
      console.error("Error loading category items:", err);
      alert("Không thể tải danh sách sản phẩm của danh mục");
    }
  };

  // Translate category names to Vietnamese
  const translateCategory = (categoryName: string | undefined): string => {
    if (!categoryName) return "N/A";

    const translations: Record<string, string> = {
      coffee: "Cà phê",
      "milk tea": "Trà sữa",
      tea: "Trà",
      smoothie: "Sinh tố",
      juice: "Nước ép",
      soda: "Soda",
      yogurt: "Sữa chua",
      "soft drinks": "Thức uống có ga",
      dessert: "Tráng miệng",
      cake: "Bánh ngọt",
      pastry: "Bánh mì",
      snack: "Đồ ăn vặt",
      food: "Đồ ăn",
      breakfast: "Bữa sáng",
    };

    return translations[categoryName.toLowerCase()] || categoryName;
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
        {/* Custom styles for tabs */}
        <style>{`
          [data-slot="tabs-trigger"][data-state="active"] {
            background: linear-gradient(to right, #ff6a00, #ff7a20) !important;
            color: white !important;
            font-weight: 600 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
          }
          [data-slot="tabs-trigger"][data-state="inactive"] {
            background-color: white;
            color: rgb(75 85 99);
          }
          [data-slot="tabs-trigger"][data-state="inactive"]:hover {
            background-color: rgb(255 247 237);
            color: rgb(234 88 12);
          }
        `}</style>

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-amber-900 mb-1">
              {currentUser?.role === "admin"
                ? "Quản lý menu"
                : "Xem menu, danh mục và công thức"}
            </h2>
            <p className="text-amber-700/70">
              {currentUser?.role === "admin"
                ? "Quản lý sản phẩm, danh mục và công thức"
                : ""}
            </p>
          </div>
        </div>

        {/* Tabs - Browser Style */}
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value as "products" | "categories" | "recipes");
            if (value === "recipes" && allRecipes.length === 0) {
              loadAllRecipes();
            }
          }}
        >
          <TabsList className="inline-flex h-auto items-center justify-center bg-orange-50/50 p-2 gap-2 w-full rounded-xl border-2 border-orange-100">
            <TabsTrigger
              value="products"
              className="flex-1 h-11 px-6 text-sm font-medium rounded-lg transition-all duration-200 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-orange-50 hover:text-orange-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Sản phẩm
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="flex-1 h-11 px-6 text-sm font-medium rounded-lg transition-all duration-200 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-orange-50 hover:text-orange-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:shadow-sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Danh mục
            </TabsTrigger>
            <TabsTrigger
              value="recipes"
              className="flex-1 h-11 px-6 text-sm font-medium rounded-lg transition-all duration-200 data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 hover:bg-orange-50 hover:text-orange-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:font-semibold data-[state=active]:shadow-sm"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Công thức
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent
            value="products"
            className="mt-0 bg-white p-6 border-2 border-t-0 border-orange-200 rounded-b-lg space-y-6"
          >
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-amber-900">
                  {currentUser?.role === "admin"
                    ? `Quản lý sản phẩm (${items.length})`
                    : `Danh sách sản phẩm (${items.length})`}
                </h3>
                <p className="text-sm text-amber-700/70">
                  {currentUser?.role === "admin"
                    ? "Tạo và quản lý các sản phẩm trong menu"
                    : "Xem danh sách sản phẩm trong menu"}
                </p>
              </div>
              {currentUser?.role === "admin" && (
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Thêm sản phẩm
                </Button>
              )}
            </div>

            {/* Add/Edit Item Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                              {normalizedCategories
                                .filter((cat) => cat && cat.id && cat.name)
                                .map((cat) => (
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
                        <SelectItem key={String(cat)} value={String(cat)}>
                          {translateCategory(String(cat))}
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
                      className="overflow-hidden hover:shadow-xl transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl flex flex-col"
                      style={{ height: "490px" }}
                    >
                      <div
                        className="relative bg-gradient-to-br from-orange-50 to-amber-50 flex-shrink-0"
                        style={{ height: "270px" }}
                      >
                        <ImageWithFallback
                          src={
                            item.image ||
                            `https://images.unsplash.com/photo-1635090976010-d3f6dfbb1bac?w=400`
                          }
                          alt={item.name}
                          className="w-full h-full object-contain"
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
                      <div
                        className="px-4 pb-4 pt-2 flex flex-col"
                        style={{ height: "220px" }}
                      >
                        <div className="flex-grow">
                          <h4
                            className="font-medium text-amber-900 mb-2 truncate"
                            style={{ height: "24px", lineHeight: "24px" }}
                          >
                            {item.name}
                          </h4>
                          <p
                            className="text-sm text-orange-600 mb-3 truncate"
                            style={{ height: "20px", lineHeight: "20px" }}
                          >
                            {translateCategory(item.category?.name)}
                          </p>
                          <p
                            className="text-lg font-semibold text-orange-600 mb-4"
                            style={{ height: "28px", lineHeight: "28px" }}
                          >
                            {item.price.toLocaleString("vi-VN")}đ
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {currentUser?.role === "admin" && (
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
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-amber-200 hover:bg-amber-50"
                            onClick={() => handleViewRecipe(item)}
                          >
                            <ChefHat className="h-4 w-4 mr-1" />
                            Xem công thức
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent
            value="categories"
            className="mt-0 bg-white p-6 border-2 border-t-0 border-orange-200 rounded-b-lg space-y-6"
          >
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-amber-900">
                  {currentUser?.role === "admin"
                    ? `Quản lý danh mục (${categories.length})`
                    : `Danh sách danh mục (${categories.length})`}
                </h3>
                <p className="text-sm text-amber-700/70">
                  {currentUser?.role === "admin"
                    ? "Tạo và quản lý các danh mục sản phẩm"
                    : "Xem danh sách danh mục sản phẩm"}
                </p>
              </div>
              {currentUser?.role === "admin" && (
                <Button
                  onClick={() => handleOpenCategoryDialog()}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Thêm danh mục
                </Button>
              )}
            </div>

            {/* Category Dialog */}
            <Dialog
              open={isCategoryDialogOpen}
              onOpenChange={setIsCategoryDialogOpen}
            >
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory
                      ? "Chỉnh sửa danh mục"
                      : "Thêm danh mục mới"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? "Cập nhật thông tin danh mục"
                      : "Nhập thông tin danh mục mới"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Tên danh mục *</Label>
                    <Input
                      id="categoryName"
                      value={categoryFormData.name}
                      onChange={(e) =>
                        setCategoryFormData({
                          ...categoryFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder="VD: Cà phê, Trà sữa, Smoothie..."
                      className="border-purple-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCloseCategoryDialog}
                    disabled={isSaving}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSaveCategory}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang lưu...
                      </>
                    ) : editingCategory ? (
                      "Cập nhật"
                    ) : (
                      "Thêm"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Categories List */}
            <div>
              <h3 className="font-semibold text-amber-900 mb-3">
                Danh sách danh mục ({categories.length})
              </h3>
              {isLoadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="ml-3 text-amber-900">Đang tải...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
                  <p className="text-amber-600">Chưa có danh mục nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {normalizedCategories
                    .filter(
                      (category) => category && category.id && category.name
                    )
                    .map((category) => {
                      const itemCount =
                        (category as any).items?.length ||
                        items.filter(
                          (item) => item.category?.id === category.id
                        ).length;

                      return (
                        <Card
                          key={category.id}
                          className="p-4 border-2 border-purple-100 hover:shadow-lg transition-all cursor-pointer"
                          onClick={() => handleViewCategoryItems(category)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-amber-900 mb-1">
                                {category.name}
                              </h4>
                              {category.description && (
                                <p className="text-sm text-amber-600 mb-2">
                                  {category.description}
                                </p>
                              )}
                              <p className="text-xs text-amber-700/70">
                                {itemCount} sản phẩm
                              </p>
                            </div>
                            {currentUser?.role === "admin" && (
                              <div
                                className="flex gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenCategoryDialog(category)
                                  }
                                  className="border-purple-200 hover:bg-purple-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.name
                                    )
                                  }
                                  className="border-red-200 hover:bg-red-50 text-red-600"
                                  disabled={itemCount > 0}
                                  title={
                                    itemCount > 0
                                      ? "Không thể xóa danh mục đang có sản phẩm"
                                      : "Xóa danh mục"
                                  }
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
            </div>
          </TabsContent>

          {/* Category Items Dialog */}
          <Dialog
            open={isCategoryItemsDialogOpen}
            onOpenChange={setIsCategoryItemsDialogOpen}
          >
            <DialogContent className="w-[90vw] max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  Sản phẩm trong danh mục:{" "}
                  {selectedCategoryForItems?.category?.name}
                </DialogTitle>
                <DialogDescription>
                  Tổng {selectedCategoryForItems?.totalItems || 0} sản phẩm
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                {categoryItemsList.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
                    <p className="text-amber-600">
                      Danh mục này chưa có sản phẩm nào
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {categoryItemsList.map((item) => (
                      <Card
                        key={item.id}
                        className="p-4 border-2 border-purple-100 hover:shadow-lg transition-all"
                      >
                        <div className="flex gap-4">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-amber-900 mb-1">
                              {item.name}
                            </h4>
                            <p className="text-sm text-amber-600 mb-2">
                              {item.price.toLocaleString("vi-VN")}đ
                            </p>
                            <Badge
                              className={
                                item.status === "available"
                                  ? "bg-green-100 text-green-700 border-green-300"
                                  : item.status === "out of stock"
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                  : "bg-red-100 text-red-700 border-red-300"
                              }
                            >
                              {item.status === "available"
                                ? "Còn hàng"
                                : item.status === "out of stock"
                                ? "Hết hàng"
                                : "Ngừng bán"}
                            </Badge>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-xs text-amber-600/70 mt-2">
                            {item.description}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryItemsDialogOpen(false)}
                >
                  Đóng
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Recipes Tab */}
          <TabsContent
            value="recipes"
            className="mt-0 bg-white p-6 border-2 border-t-0 border-orange-200 rounded-b-lg space-y-6"
          >
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-amber-900">
                  {currentUser?.role === "admin"
                    ? `Quản lý công thức pha chế (${allRecipes.length})`
                    : `Danh sách công thức pha chế (${allRecipes.length})`}
                </h3>
                <p className="text-sm text-amber-700/70">
                  {currentUser?.role === "admin"
                    ? "Tạo và quản lý các công thức pha chế cho sản phẩm"
                    : "Xem danh sách công thức pha chế cho sản phẩm"}
                </p>
              </div>
              {currentUser?.role === "admin" && (
                <Button
                  onClick={() => {
                    setEditingRecipeInTab(null);
                    setRecipeTabFormData({
                      name: "",
                      description: "",
                      itemId: "",
                      ingredients: [],
                    });
                    loadIngredients(); // Load ingredients when opening form
                    setIsRecipeTabFormOpen(true);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm công thức
                </Button>
              )}
            </div>

            {/* Recipes List */}
            {isLoadingAllRecipes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-3 text-amber-900">
                  Đang tải công thức...
                </span>
              </div>
            ) : allRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="h-16 w-16 text-amber-600/30 mx-auto mb-4" />
                <p className="text-amber-600 mb-2">Chưa có công thức nào</p>
                <p className="text-sm text-amber-600/70">
                  Nhấn "Thêm công thức" để tạo công thức mới
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {allRecipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    className="p-4 border-2 border-orange-100 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <ChefHat className="h-5 w-5 text-orange-500" />
                          <div>
                            <h4 className="font-semibold text-amber-900">
                              Công thức: {recipe.item?.name || "N/A"}
                            </h4>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-amber-800">
                            Nguyên liệu ({recipe.recipeIngredients?.length || 0}
                            ):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {recipe.recipeIngredients?.map((ri) => (
                              <Badge
                                key={ri.id}
                                variant="outline"
                                className="bg-orange-50 border-orange-200 text-amber-800"
                              >
                                {ri.ingredient.name}: {ri.amount}{" "}
                                {ri.ingredient.measureUnit}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      {currentUser?.role === "admin" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setEditingRecipeInTab(recipe);
                              setRecipeTabFormData({
                                name: "",
                                description: "",
                                itemId: recipe.item?.id || "",
                                ingredients: recipe.recipeIngredients.map(
                                  (ri) => ({
                                    ingredientId: ri.ingredient.id,
                                    amount: ri.amount,
                                  })
                                ),
                              });
                              await loadIngredients();
                              setIsRecipeTabFormOpen(true);
                            }}
                            className="border-orange-200 hover:bg-orange-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Bạn có chắc muốn xóa công thức của món "${recipe.item?.name}"?`
                                )
                              ) {
                                try {
                                  await recipesApi.delete(recipe.id);
                                  await loadAllRecipes();
                                } catch (err: any) {
                                  alert(
                                    err.response?.data?.message ||
                                      "Không thể xóa công thức!"
                                  );
                                }
                              }
                            }}
                            className="border-red-200 hover:bg-red-50 text-red-600"
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
          </TabsContent>
        </Tabs>

        {/* Recipe Tab Form Dialog */}
        <Dialog
          open={isRecipeTabFormOpen}
          onOpenChange={setIsRecipeTabFormOpen}
        >
          <DialogContent
            className="w-[95vw] max-w-[900px] p-0"
            style={{
              display: "flex",
              flexDirection: "column",
              height: "600px",
              maxHeight: "600px",
            }}
          >
            <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
              <DialogTitle>
                {editingRecipeInTab
                  ? "Chỉnh sửa công thức"
                  : "Thêm công thức mới"}
              </DialogTitle>
              <DialogDescription>
                {editingRecipeInTab
                  ? "Cập nhật thông tin và nguyên liệu cho công thức"
                  : `Tạo công thức pha chế cho món: ${
                      items.find((i) => i.id === recipeTabFormData.itemId)
                        ?.name || "Chưa chọn món"
                    }`}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-hidden px-6">
              <ScrollArea className="h-full">
                <div className="space-y-6 py-4">
                  {/* Item Selection */}
                  <div className="space-y-2">
                    <Label>
                      Chọn món <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={recipeTabFormData.itemId}
                      onValueChange={(value) =>
                        setRecipeTabFormData({
                          ...recipeTabFormData,
                          itemId: value,
                        })
                      }
                      disabled={!!editingRecipeInTab}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn món" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ingredients Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Nguyên liệu thành phần (
                        {recipeTabFormData.ingredients.length})
                      </Label>
                      <Button
                        onClick={() =>
                          setRecipeTabFormData({
                            ...recipeTabFormData,
                            ingredients: [
                              ...recipeTabFormData.ingredients,
                              { ingredientId: "", amount: 0 },
                            ],
                          })
                        }
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm nguyên liệu
                      </Button>
                    </div>

                    {/* Fixed height container for ingredients */}
                    <div className="space-y-3 min-h-[200px]">
                      {recipeTabFormData.ingredients.length > 0 ? (
                        recipeTabFormData.ingredients.map((ing, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg space-y-3 relative group"
                          >
                            <button
                              onClick={() => {
                                const newIngredients = [
                                  ...recipeTabFormData.ingredients,
                                ];
                                newIngredients.splice(index, 1);
                                setRecipeTabFormData({
                                  ...recipeTabFormData,
                                  ingredients: newIngredients,
                                });
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Nguyên liệu</Label>
                                <Select
                                  value={ing.ingredientId}
                                  onValueChange={(value) => {
                                    const newIngredients = [
                                      ...recipeTabFormData.ingredients,
                                    ];
                                    newIngredients[index].ingredientId = value;
                                    setRecipeTabFormData({
                                      ...recipeTabFormData,
                                      ingredients: newIngredients,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn nguyên liệu" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ingredients.map((i) => (
                                      <SelectItem key={i.id} value={i.id}>
                                        {i.name} ({i.measureUnit})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">
                                  Số lượng{" "}
                                  {ingredients.find(
                                    (i) => i.id === ing.ingredientId
                                  )?.measureUnit && (
                                    <span className="text-gray-500">
                                      (
                                      {
                                        ingredients.find(
                                          (i) => i.id === ing.ingredientId
                                        )?.measureUnit
                                      }
                                      )
                                    </span>
                                  )}
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={ing.amount}
                                  onChange={(e) => {
                                    const newIngredients = [
                                      ...recipeTabFormData.ingredients,
                                    ];
                                    newIngredients[index].amount = Number(
                                      e.target.value
                                    );
                                    setRecipeTabFormData({
                                      ...recipeTabFormData,
                                      ingredients: newIngredients,
                                    });
                                  }}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg text-gray-500 bg-gray-50">
                          <div className="text-center py-8">
                            <Refrigerator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Chưa có nguyên liệu nào</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div className="flex gap-3 pt-4 border-t flex-shrink-0 px-6 pb-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsRecipeTabFormOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600"
                onClick={async () => {
                  if (!recipeTabFormData.itemId) {
                    alert("Vui lòng chọn món!");
                    return;
                  }

                  setIsSaving(true);
                  try {
                    if (editingRecipeInTab) {
                      await recipesApi.update(editingRecipeInTab.id, {
                        ingredients: recipeTabFormData.ingredients,
                      });
                      alert("Cập nhật công thức thành công!");
                    } else {
                      await recipesApi.create({
                        name: recipeTabFormData.name || "",
                        itemId: recipeTabFormData.itemId,
                        ingredients: recipeTabFormData.ingredients,
                      });
                      alert("Thêm công thức thành công!");
                    }
                    await loadAllRecipes();
                    setIsRecipeTabFormOpen(false);
                    setEditingRecipeInTab(null);
                    setRecipeTabFormData({
                      name: "",
                      description: "",
                      itemId: "",
                      ingredients: [],
                    });
                  } catch (err: any) {
                    alert(
                      err.response?.data?.message || "Không thể lưu công thức!"
                    );
                  } finally {
                    setIsSaving(false);
                  }
                }}
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

        {/* Recipe Dialog */}
        <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
          <DialogContent className="max-w-3xl w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-orange-500" />
                Công thức: {selectedItemForRecipe?.name}
              </DialogTitle>
              <DialogDescription>
                Quản lý công thức pha chế cho món này
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              {isLoadingRecipes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <span className="ml-3 text-amber-900">
                    Đang tải công thức...
                  </span>
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
                  <p className="text-amber-600 mb-4">
                    Món này chưa có công thức
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {recipes.map((recipe) => (
                    <Card
                      key={recipe.id}
                      className="p-4 border-2 border-orange-100"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-amber-900 text-lg">
                            Công thức: {selectedItemForRecipe?.name}
                          </h4>
                        </div>
                        {currentUser?.role === "admin" && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setEditingRecipeInTab(recipe);
                                setRecipeTabFormData({
                                  name: "",
                                  description: "",
                                  itemId:
                                    recipe.item?.id ||
                                    selectedItemForRecipe?.id ||
                                    "",
                                  ingredients: recipe.recipeIngredients.map(
                                    (ri) => ({
                                      ingredientId: ri.ingredient.id,
                                      amount: ri.amount,
                                    })
                                  ),
                                });
                                await loadIngredients();
                                setIsRecipeTabFormOpen(true);
                              }}
                              className="border-orange-200 hover:bg-orange-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteRecipe(
                                  recipe.id,
                                  selectedItemForRecipe?.name || "công thức này"
                                )
                              }
                              className="border-red-200 hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {recipe.recipeIngredients.map((recipeIng) => (
                          <div
                            key={recipeIng.id}
                            className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-amber-900">
                                  {recipeIng.ingredient.name}
                                </p>
                                <p className="text-sm text-amber-600">
                                  {recipeIng.amount}{" "}
                                  {recipeIng.ingredient.measureUnit}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCloseRecipeDialog}
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recipe Form Dialog */}
        <Dialog
          open={isRecipeFormDialogOpen}
          onOpenChange={setIsRecipeFormDialogOpen}
        >
          <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] !bg-white p-0 overflow-hidden rounded-2xl border-2 border-orange-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b-2 border-orange-200 bg-white flex-shrink-0">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-amber-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                    <ChefHat className="h-6 w-6 text-white" />
                  </div>
                  {editingRecipe ? "Chỉnh sửa công thức" : "Thêm công thức mới"}
                </DialogTitle>
                <DialogDescription className="text-base text-amber-700/80 mt-2 ml-14">
                  {editingRecipe
                    ? "Cập nhật thông tin và nguyên liệu cho công thức"
                    : `Tạo công thức pha chế cho món: `}
                  <span className="font-semibold text-orange-600">
                    {selectedItemForRecipe?.name}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Body - 2 Column Layout */}
            <div className="flex-1 overflow-y-auto p-8 !bg-orange-50/20 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column - Recipe Info (2 parts) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-orange-100">
                    <h4 className="font-bold text-lg text-amber-900 mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5 text-orange-500" />
                      Thông tin cơ bản
                    </h4>
                    <div className="space-y-5">
                      {/* Recipe Name */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="recipeName"
                          className="text-sm font-semibold text-amber-800"
                        >
                          Tên công thức *
                        </Label>
                        <Input
                          id="recipeName"
                          value={recipeFormData.name}
                          onChange={(e) =>
                            setRecipeFormData({
                              ...recipeFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="VD: Công thức Cappuccino truyền thống"
                          className="bg-orange-50/40 border-orange-200 focus:border-orange-500 focus:ring-orange-500/20 h-11"
                        />
                      </div>

                      {/* Recipe Description */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="recipeDescription"
                          className="text-sm font-semibold text-amber-800"
                        >
                          Mô tả công thức
                        </Label>
                        <Textarea
                          id="recipeDescription"
                          value={recipeFormData.description}
                          onChange={(e) =>
                            setRecipeFormData({
                              ...recipeFormData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Mô tả chi tiết về công thức, cách pha chế, lưu ý đặc biệt..."
                          rows={6}
                          className="bg-orange-50/40 border-orange-200 focus:border-orange-500 focus:ring-orange-500/20 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Card */}
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Refrigerator className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-lg">
                        Tổng quan nguyên liệu
                      </h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl">
                        <span className="text-sm font-medium">
                          Số lượng nguyên liệu:
                        </span>
                        <span className="text-2xl font-bold">
                          {recipeFormData.ingredients.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl">
                        <span className="text-sm font-medium">
                          Đã chọn đầy đủ:
                        </span>
                        <span className="text-lg font-semibold">
                          {
                            recipeFormData.ingredients.filter(
                              (ing) => ing.ingredientId && ing.amount > 0
                            ).length
                          }{" "}
                          / {recipeFormData.ingredients.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Ingredients List (3 parts) */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                  <div className="flex items-center justify-between sticky top-0 !bg-orange-50/20 pb-4 z-10">
                    <h4 className="font-bold text-lg text-amber-900 flex items-center gap-2">
                      <Refrigerator className="h-5 w-5 text-orange-500" />
                      Danh sách nguyên liệu
                      <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                        {recipeFormData.ingredients.length} items
                      </span>
                    </h4>
                    <Button
                      onClick={handleAddRecipeIngredient}
                      className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm nguyên liệu
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 pr-4 min-h-0">
                    <div className="space-y-3">
                      {recipeFormData.ingredients.map((ing, index) => {
                        const selectedIngredient = ingredients.find(
                          (i) => i.id === ing.ingredientId
                        );
                        return (
                          <Card
                            key={index}
                            className="p-5 border-2 border-orange-100 hover:border-orange-300 hover:shadow-lg transition-all bg-white rounded-xl group"
                          >
                            <div className="flex items-start gap-4">
                              {/* Number Badge */}
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                                {index + 1}
                              </div>

                              {/* Form Fields */}
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                {/* Ingredient Select */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                                    Nguyên liệu *
                                  </Label>
                                  <Select
                                    value={ing.ingredientId}
                                    onValueChange={(value) =>
                                      handleUpdateRecipeIngredient(
                                        index,
                                        "ingredientId",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="bg-orange-50/40 border-orange-200 focus:border-orange-500 h-11">
                                      <SelectValue placeholder="Chọn nguyên liệu">
                                        {selectedIngredient ? (
                                          <div className="flex items-center gap-2">
                                            <Refrigerator className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium">
                                              {selectedIngredient.name}
                                            </span>
                                          </div>
                                        ) : (
                                          "Chọn nguyên liệu"
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ingredients.map((ingredient) => (
                                        <SelectItem
                                          key={ingredient.id}
                                          value={ingredient.id}
                                        >
                                          <div className="flex items-center justify-between w-full gap-3">
                                            <span className="font-medium">
                                              {ingredient.name}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              ({ingredient.measureUnit})
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                                    Số lượng * (
                                    {selectedIngredient?.measureUnit ||
                                      "đơn vị"}
                                    )
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={ing.amount || ""}
                                    onChange={(e) =>
                                      handleUpdateRecipeIngredient(
                                        index,
                                        "amount",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0.00"
                                    className="bg-orange-50/40 border-orange-200 focus:border-orange-500 h-11"
                                  />
                                </div>
                              </div>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveRecipeIngredient(index)
                                }
                                className="flex-shrink-0 h-10 w-10 p-0 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>

                            {/* Stock Info */}
                            {selectedIngredient && (
                              <div className="mt-3 pt-3 border-t border-orange-100 flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-2 text-amber-700">
                                  <Package className="h-4 w-4" />
                                  <span className="font-medium">Tồn kho:</span>
                                  <span className="font-bold text-orange-600">
                                    {selectedIngredient.amountLeft}{" "}
                                    {selectedIngredient.measureUnit}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}

                      {/* Empty State or Add More Button */}
                      {recipeFormData.ingredients.length === 0 ? (
                        <div className="text-center py-16 bg-white border-2 border-dashed border-orange-200 rounded-2xl">
                          <div className="p-4 bg-orange-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <Refrigerator className="h-10 w-10 text-orange-400" />
                          </div>
                          <p className="text-amber-600 font-medium mb-2">
                            Chưa có nguyên liệu nào
                          </p>
                          <p className="text-sm text-amber-600/70 mb-4">
                            Nhấn "Thêm nguyên liệu" để bắt đầu
                          </p>
                          <Button
                            onClick={handleAddRecipeIngredient}
                            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm nguyên liệu đầu tiên
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={handleAddRecipeIngredient}
                          className="w-full bg-white border-2 border-dashed border-orange-200 p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50/30 transition-all group"
                        >
                          <div className="p-3 bg-orange-100 group-hover:bg-orange-200 rounded-full transition-colors">
                            <Plus className="h-6 w-6 text-orange-600" />
                          </div>
                          <span className="text-sm font-semibold text-amber-700 group-hover:text-orange-600 transition-colors">
                            Thêm nguyên liệu khác
                          </span>
                        </button>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t-2 border-orange-200 bg-white flex justify-between items-center gap-4 flex-shrink-0">
              {error && (
                <div className="flex-1 p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <Button
                  variant="outline"
                  onClick={handleCloseRecipeForm}
                  disabled={isSaving}
                  className="px-8 py-2.5 rounded-xl border-2 border-gray-200 hover:bg-gray-50 font-semibold h-auto"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSaveRecipe}
                  disabled={isSaving}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all h-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Lưu công thức
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
