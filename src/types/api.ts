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
  percent: number;
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
  discount: number;
  status: "pending" | "paid" | "cancelled";
  createdBy: string;
  tax: Tax;
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

export interface CreateTaxDto {
  name: string;
  description?: string;
  percent: number;
}

export interface CreateOrderDto {
  discount: number;
  createdBy: string;
  taxId: string;
  tableId: string;
  orderItems: Array<{
    itemId: string;
    amount: number;
  }>;
}

export interface CreatePaymentDto {
  orderId: string;
  method: "cash" | "QR" | "card";
}
