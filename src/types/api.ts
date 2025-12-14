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
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  price: number;
  amountLeft: number;
  description?: string;
  image?: string;
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
  percent: string;
  type: "tax" | "discount";
  createdAt?: string;
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
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  taxesAndDiscounts: Tax[];
  table: Table;
  orderItems: OrderItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: "cash" | "QR" | "card";
  amount: number;
  qrCode?: string;
  orderCode: string;
  createdAt: string;
}

// Ingredient & Recipe types
export type MeasureUnit = "g" | "kg" | "l" | "ml" | "pcs" | "tsp" | "tbsp";

export interface Ingredient {
  id: string;
  name: string;
  amountLeft: number;
  measureUnit: MeasureUnit;
  image?: string;
  imagePublicId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeIngredient {
  id: string;
  ingredient: Ingredient;
  amount: number;
}

export interface Recipe {
  id: string;
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
  amountLeft: number;
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
}

export interface BulkCreateIngredientsDto {
  ingredients: CreateIngredientDto[];
}

export interface CreateRecipeIngredientDto {
  ingredientId: string;
  amount: number;
}

export interface CreateRecipeDto {
  itemId: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface CreateTaxDto {
  name: string;
  description?: string;
  percent: number;
}

export interface CreateTaxDto {
  name: string;
  description?: string;
  percent: number;
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

// ============ STATISTICS TYPES ============
export interface TopProduct {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface Statistic {
  id: string;
  date: string;
  period: "daily" | "monthly";
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProductsSold: number;
  topProducts: TopProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateStatsResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  startDate: string;
  endDate: string;
}

export interface GenerateRangeResponse {
  success: boolean;
  message: string;
  dailyStats: {
    processed: number;
    failed: number;
  };
  monthlyStats: {
    processed: number;
  };
  startDate: string;
  endDate: string;
}
