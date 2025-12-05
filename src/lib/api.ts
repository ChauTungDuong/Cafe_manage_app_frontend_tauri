import axios, { AxiosInstance, AxiosError } from "axios";
import { Store } from "@tauri-apps/plugin-store";

// Đọc backend URL từ biến môi trường
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DOMAIN || "http://localhost:3000";
const REFRESH_TOKEN_KEY = "refresh_token";

// Debug logging
console.log("🔧 API Config:");
console.log("- BACKEND_URL:", BACKEND_URL);
console.log("- VITE_BACKEND_DOMAIN:", import.meta.env.VITE_BACKEND_DOMAIN);

// Khởi tạo Tauri Store để lưu refresh token an toàn
let store: Store | null = null;

// Khởi tạo store (gọi trong main app)
export async function initStore() {
  try {
    store = await Store.load("auth.json");
  } catch (error) {
    console.error("Failed to initialize store:", error);
  }
}

// Lưu refresh token vào store
async function saveRefreshToken(token: string) {
  if (store) {
    await store.set(REFRESH_TOKEN_KEY, token);
    await store.save();
  }
}

// Lấy refresh token từ store
async function getRefreshToken(): Promise<string | null> {
  if (store) {
    const token = await store.get<string>(REFRESH_TOKEN_KEY);
    return token ?? null;
  }
  return null;
}

// Xóa refresh token
async function clearRefreshToken() {
  if (store) {
    await store.delete(REFRESH_TOKEN_KEY);
    await store.save();
  }
}

// Access token trong memory (không lưu vào disk)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Tạo axios instance
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL, // Không thêm /api vì backend không có prefix này
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // Tăng lên 60s cho cold start của Render.com
});

// Request interceptor - tự động thêm access token vào header
api.interceptors.request.use(
  (config) => {
    console.log("📤 Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    });

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý refresh token khi access token hết hạn
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    console.log("✅ Response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error: AxiosError) => {
    console.error("❌ Response Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      responseData: error.response?.data,
    });

    const originalRequest = error.config as any;

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đang refresh, đợi trong queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Gọi API refresh token (gửi qua body)
        const response = await axios.post(`${BACKEND_URL}/auth/refresh`, {
          refreshToken: refreshToken, // Backend nhận camelCase
        });

        const { access_token: newAccessToken, refresh_token: newRefreshToken } =
          response.data; // Backend trả về snake_case

        // Lưu token mới
        setAccessToken(newAccessToken);
        if (newRefreshToken) {
          await saveRefreshToken(newRefreshToken);
        }

        // Cập nhật header và retry request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Refresh thất bại, logout
        await logout();

        // Redirect về login hoặc emit event
        window.dispatchEvent(new CustomEvent("auth:logout"));

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============ AUTH API ============
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "staff";
    phone: string;
    address: string;
    avatar: string;
    gender?: string;
    birthday?: string;
    isActive: boolean;
  };
}

export const authApi = {
  // Đăng nhập
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    const { access_token, refresh_token } = response.data; // Backend trả về snake_case

    // Lưu tokens
    setAccessToken(access_token);
    await saveRefreshToken(refresh_token);

    return response.data;
  },

  // Refresh token
  async refresh(): Promise<{ access_token: string; refresh_token?: string }> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }

    const response = await axios.post(`${BACKEND_URL}/auth/refresh`, {
      refreshToken: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;

    setAccessToken(access_token);
    if (newRefreshToken) {
      await saveRefreshToken(newRefreshToken);
    }

    return response.data;
  },

  // Đăng xuất (tạm ẩn API call vì backend chưa có endpoint)
  async logout(): Promise<void> {
    try {
      // TODO: Bật lại khi backend có API logout
      // await api.post("/auth/logout");
      console.log(
        "Logout - clearing local tokens (API endpoint not available yet)"
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await clearRefreshToken();
      setAccessToken(null);
    }
  },

  // Kiểm tra auth
  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

// Helper logout function
export async function logout() {
  await authApi.logout();
}

// ============ USERS API ============
import type {
  User,
  CreateUserDto,
  Category,
  CreateCategoryDto,
  Item,
  CreateItemDto,
  BulkCreateItemsDto,
  Table,
  CreateTableDto,
  Tax,
  CreateTaxDto,
  Order,
  CreateOrderDto,
  Payment,
  CreatePaymentDto,
} from "../types/api";

export const usersApi = {
  // Get all users (ADMIN only)
  list: async (): Promise<User[]> => {
    const response = await api.get("/users");
    return response.data;
  },

  // Get user by ID (ADMIN only)
  get: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Create user (ADMIN only)
  create: async (dto: CreateUserDto): Promise<User> => {
    const response = await api.post("/users", dto);
    return response.data;
  },

  // Update user (ADMIN only)
  update: async (id: string, dto: Partial<CreateUserDto>): Promise<User> => {
    const response = await api.patch(`/users/${id}`, dto);
    return response.data;
  },

  // Delete user (ADMIN only)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  // Get current user profile
  profile: async (): Promise<User> => {
    const response = await api.get("/auth/profile");
    return response.data;
  },
};

// ============ CATEGORIES API ============
export const categoriesApi = {
  // Get all categories (Public)
  list: async (): Promise<Category[]> => {
    const response = await api.get("/categories");
    return response.data;
  },

  // Get category by ID (Public)
  get: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Create category (ADMIN, STAFF)
  create: async (dto: CreateCategoryDto): Promise<Category> => {
    const response = await api.post("/categories", dto);
    return response.data;
  },

  // Update category (ADMIN)
  update: async (
    id: string,
    dto: Partial<CreateCategoryDto>
  ): Promise<Category> => {
    const response = await api.patch(`/categories/${id}`, dto);
    return response.data;
  },

  // Delete category (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// ============ ITEMS (MENU) API ============
export const itemsApi = {
  // Get all items (Public)
  list: async (params?: {
    status?: string;
    category?: string;
  }): Promise<Item[]> => {
    const response = await api.get("/items", { params });
    return response.data;
  },

  // Get item by ID (Public)
  get: async (id: string): Promise<Item> => {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },

  // Create single item with FormData (ADMIN, STAFF)
  create: async (dto: CreateItemDto, imageFile?: File): Promise<Item> => {
    const formData = new FormData();
    formData.append("name", dto.name);
    formData.append("category", JSON.stringify(dto.category));
    formData.append("price", dto.price.toString());
    formData.append("amountLeft", dto.amountLeft.toString());
    formData.append("status", dto.status);

    if (dto.description) {
      formData.append("description", dto.description);
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await api.post("/items", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Bulk create items (ADMIN only)
  bulkCreate: async (
    dto: BulkCreateItemsDto
  ): Promise<{ success: Item[]; failed: any[] }> => {
    const response = await api.post("/items/bulk", dto);
    return response.data;
  },

  // Update item with FormData (ADMIN, STAFF)
  update: async (
    id: string,
    dto: Partial<CreateItemDto>,
    imageFile?: File
  ): Promise<Item> => {
    const formData = new FormData();

    if (dto.name) formData.append("name", dto.name);
    if (dto.price !== undefined) formData.append("price", dto.price.toString());
    if (dto.amountLeft !== undefined)
      formData.append("amountLeft", dto.amountLeft.toString());
    if (dto.status) formData.append("status", dto.status);
    if (dto.description !== undefined)
      formData.append("description", dto.description);
    if (dto.category) formData.append("category", JSON.stringify(dto.category));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await api.patch(`/items/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Delete item (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/items/${id}`);
  },
};

// ============ TABLES API ============
export const tablesApi = {
  // Get all tables (ADMIN, STAFF)
  list: async (): Promise<Table[]> => {
    const response = await api.get("/tables");
    return response.data;
  },

  // Get table by ID (ADMIN, STAFF)
  get: async (id: string): Promise<Table> => {
    const response = await api.get(`/tables/${id}`);
    return response.data;
  },

  // Create table (ADMIN)
  create: async (dto: CreateTableDto): Promise<Table> => {
    const response = await api.post("/tables", dto);
    return response.data;
  },

  // Update table (ADMIN, STAFF)
  update: async (id: string, dto: Partial<CreateTableDto>): Promise<Table> => {
    const response = await api.patch(`/tables/${id}`, dto);
    return response.data;
  },

  // Delete table (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/tables/${id}`);
  },
};

// ============ TAXES API ============
export const taxesApi = {
  // Get all taxes (ADMIN, STAFF)
  list: async (): Promise<Tax[]> => {
    const response = await api.get("/taxes");
    return response.data;
  },

  // Get tax by ID (ADMIN, STAFF)
  get: async (id: string): Promise<Tax> => {
    const response = await api.get(`/taxes/${id}`);
    return response.data;
  },

  // Create tax (ADMIN)
  create: async (dto: CreateTaxDto): Promise<Tax> => {
    const response = await api.post("/taxes", dto);
    return response.data;
  },

  // Update tax (ADMIN)
  update: async (id: string, dto: Partial<CreateTaxDto>): Promise<Tax> => {
    const response = await api.patch(`/taxes/${id}`, dto);
    return response.data;
  },

  // Delete tax (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/taxes/${id}`);
  },
};

// ============ ORDERS API ============
export const ordersApi = {
  // Get all orders (ADMIN, STAFF)
  list: async (params?: { status?: string }): Promise<Order[]> => {
    const response = await api.get("/orders", { params });
    return response.data;
  },

  // Get order by ID (ADMIN, STAFF)
  get: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Create order (ADMIN, STAFF)
  create: async (dto: CreateOrderDto): Promise<Order> => {
    const response = await api.post("/orders", dto);
    return response.data;
  },

  // Update order (ADMIN)
  update: async (
    id: string,
    dto: Partial<{ status: string; discount: number }>
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}`, dto);
    return response.data;
  },

  // Delete order (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },
};

// ============ PAYMENTS API ============
export const paymentsApi = {
  // Get all payments (ADMIN, STAFF)
  list: async (): Promise<Payment[]> => {
    const response = await api.get("/payments");
    return response.data;
  },

  // Get payment by ID (ADMIN, STAFF)
  get: async (id: string): Promise<Payment> => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  // Create payment (ADMIN, STAFF)
  create: async (dto: CreatePaymentDto): Promise<Payment> => {
    const response = await api.post("/payments", dto);
    return response.data;
  },

  // Check payment status by orderCode (ADMIN, STAFF)
  checkStatus: async (
    orderCode: string
  ): Promise<{
    orderCode: string;
    orderStatus: string;
    isPaid: boolean;
    payment?: Payment;
  }> => {
    const response = await api.get(`/payments/status/${orderCode}`);
    return response.data;
  },

  // Update payment (ADMIN)
  update: async (
    id: string,
    dto: Partial<{ method: string }>
  ): Promise<Payment> => {
    const response = await api.patch(`/payments/${id}`, dto);
    return response.data;
  },

  // Delete payment (ADMIN)
  remove: async (id: string): Promise<void> => {
    await api.delete(`/payments/${id}`);
  },
};

// ============ LEGACY ALIASES (for backward compatibility) ============
export const menuApi = itemsApi; // Alias for items

// ============ REPORTS API (Admin) ============
export const reportsApi = {
  summary: (params?: any) =>
    api.get("/reports/revenue", { params }).then((r) => r.data),
};

// ============ SYSTEM SETTINGS API (Admin) ============
export const settingsApi = {
  get: () => api.get("/system").then((r) => r.data),
  update: (payload: any) => api.put("/system", payload).then((r) => r.data),
};

export default api;
