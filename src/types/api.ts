// API Types based on backend documentation

export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  gender?: "male" | "female" | "other";
  birthday?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  price: number;
  description?: string;
  image?: string;
  imagePublicId?: string;
  status: "available" | "out of stock" | "discontinued";
  createdAt?: string;
  updatedAt?: string;
}

export interface Table {
  id: string;
  name: string;
  seat: number;
  status: "available" | "occupied" | "reserved";
  createdAt?: string;
}

export interface Tax {
  id: string;
  name: string;
  description?: string;
  percent: number;
  type: "tax" | "discount";
  isActive?: boolean;
  applyFrom?: string;
  applyTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  amount: number;
  item: Item;
}

export interface Order {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: "pending" | "paid" | "cancelled";
  createdBy: User;
  taxesAndDiscounts: Tax[];
  table: Table;
  orderItems: OrderItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  method: "cash" | "QR" | "card";
  amount: number;
  qrCode?: string;
  qrCodePublicId?: string;
  orderCode?: string;
  createdAt: string;
  updatedAt?: string;
}

// Ingredient & Recipe types
export type MeasureUnit = "g" | "kg" | "l" | "ml" | "pcs" | "tsp" | "tbsp";

export interface Ingredient {
  id: string;
  name: string;
  measureUnit: MeasureUnit;
  amountLeft: number;
  minAmount: number;
  image?: string;
  imagePublicId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeIngredient {
  id: string;
  amount: number;
  ingredient: Ingredient;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  item: Item;
  recipeIngredients: RecipeIngredient[];
  createdAt?: string;
  updatedAt?: string;
}

// Request DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface CreateItemDto {
  name: string;
  category: {
    name: string;
  };
  price: number;
  description?: string;
  status: "available" | "out of stock" | "discontinued";
}

export interface BulkCreateItemsDto {
  items: CreateItemDto[];
}

export interface CreateTableDto {
  name: string;
  seat: number;
  status: "available" | "occupied" | "reserved";
}

export interface CreateIngredientDto {
  name: string;
  amountLeft: number;
  measureUnit: MeasureUnit;
  minAmount?: number;
  image?: string;
  imagePublicId?: string;
}

export interface BulkCreateIngredientsDto {
  ingredients: Array<{
    name: string;
    amountLeft: number;
    measureUnit: MeasureUnit;
  }>;
}

export interface CreateRecipeIngredientDto {
  ingredientId: string;
  amount: number;
}

export interface CreateRecipeDto {
  name: string;
  description?: string;
  itemId: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface UpdateRecipeDto {
  name?: string;
  description?: string;
  ingredients?: CreateRecipeIngredientDto[];
}

export interface CreateTaxDto {
  name: string;
  description?: string;
  percent: number;
  type: "tax" | "discount";
  isActive?: boolean;
  applyFrom?: string;
  applyTo?: string;
}

export interface CreateOrderDto {
  createdBy: string;
  taxDiscountIds?: string[];
  tableId: string;
  orderItems: Array<{
    amount: number;
    itemId: string;
  }>;
}

export interface CreatePaymentDto {
  orderId: string;
  method: "cash" | "QR" | "card";
}

export interface UpdateIngredientDto {
  name?: string;
  amountLeft?: number;
  measureUnit?: MeasureUnit;
  minAmount?: number;
  image?: string;
  imagePublicId?: string;
}

// ============ STATISTICS TYPES ============
export interface TopProduct {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface DailyBreakdown {
  date: string; // "2024-12-16" (YYYY-MM-DD)
  dayOfWeek: number; // 0=Chủ nhật, 1=Thứ hai, ..., 6=Thứ bảy
  dayName: string; // "Thứ hai", "Thứ ba", etc.
  revenue: number; // Doanh thu ngày đó
  orders: number; // Số đơn hàng
  productsSold: number; // Số sản phẩm bán ra
}

export interface Statistic {
  id: string;
  date: string;
  period: "daily" | "weekly" | "monthly" | "custom";
  startDate?: string;
  endDate?: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProductsSold: number;
  topProducts: TopProduct[];
  dailyBreakdown?: DailyBreakdown[]; // Available for weekly/monthly reports only
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportResponse {
  success: boolean;
  message: string;
  data: Statistic;
}

export interface CreateManualReportRequest {
  startDate: string;
  endDate: string;
}
