import axios, { AxiosInstance, AxiosError } from "axios";
import { Store } from "@tauri-apps/plugin-store";

// Đọc backend URL từ biến môi trường
const BACKEND_URL =
  import.meta.env.VPS_BACKEND_DOMAIN || "http://localhost:3000";

const REFRESH_TOKEN_KEY_PREFIX = "refresh_token:";
const LAST_USER_ID_KEY = "last_user_id";

// Debug logging
console.log("🔧 API Config:");
console.log("- BACKEND_URL:", BACKEND_URL);
console.log("- VITE_BACKEND_DOMAIN:", import.meta.env.VITE_BACKEND_DOMAIN);
console.log(
  "- VITE_VPS_BACKEND_DOMAIN:",
  import.meta.env.VITE_VPS_BACKEND_DOMAIN
);
console.log("- VPS_BACKEND_DOMAIN:", import.meta.env.VPS_BACKEND_DOMAIN);

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

async function setLastUserId(userId: string) {
  if (!store) return;
  await store.set(LAST_USER_ID_KEY, userId);
  await store.save();
}

async function getLastUserId(): Promise<string | null> {
  if (!store) return null;
  const userId = await store.get<string>(LAST_USER_ID_KEY);
  return userId ?? null;
}

async function clearLastUserId() {
  if (!store) return;
  await store.delete(LAST_USER_ID_KEY);
  await store.save();
}

async function saveRefreshTokenForUser(userId: string, token: string) {
  if (!store) return;
  await store.set(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`, token);
  await setLastUserId(userId);
}

async function getRefreshTokenForUser(userId: string): Promise<string | null> {
  if (!store) return null;
  const token = await store.get<string>(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`);
  return token ?? null;
}

async function clearRefreshTokenForUser(userId: string) {
  if (!store) return;
  await store.delete(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`);
  const lastUserId = await getLastUserId();
  if (lastUserId === userId) {
    await clearLastUserId();
  } else {
    await store.save();
  }
}

// Access token trong memory (không lưu vào disk)
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Token refresh proactively 5 minutes before expiry (access token có thời hạn 1 tiếng)
const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 phút

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (token) {
    // Access token có thời hạn 1 tiếng, refresh sau 55 phút
    tokenExpiryTime = Date.now() + 60 * 60 * 1000; // 1 giờ
    scheduleTokenRefresh();
  } else {
    tokenExpiryTime = null;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Lên lịch refresh token tự động
function scheduleTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  if (!tokenExpiryTime) return;

  const timeUntilRefresh = tokenExpiryTime - Date.now() - REFRESH_BEFORE_EXPIRY;

  if (timeUntilRefresh > 0) {
    console.log(
      `🔄 Token refresh scheduled in ${Math.round(
        timeUntilRefresh / 1000 / 60
      )} minutes`
    );
    refreshTimer = setTimeout(async () => {
      try {
        console.log("🔄 Proactively refreshing access token...");
        await authApi.refresh();
        console.log("✅ Token refreshed successfully");
      } catch (error) {
        console.error("❌ Auto-refresh failed:", error);
        // Nếu refresh thất bại, logout
        await logout();
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
    }, timeUntilRefresh);
  }
}

// Tạo axios instance
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL, // Không thêm /api vì backend không có prefix này
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // 120s cho cold start của Render.com free tier
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

    // Skip refresh token logic for auth endpoints (login, register, forgot-password, etc.)
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/forgot-password") ||
      originalRequest.url?.includes("/auth/reset-password");

    // Nếu lỗi 401 và chưa retry và KHÔNG phải auth endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
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
        const lastUserId = await getLastUserId();
        if (!lastUserId) {
          console.log("No last user found - redirecting to login");
          processQueue(new Error("No last user"), null);
          await logout();
          window.dispatchEvent(new CustomEvent("auth:logout"));
          return Promise.reject(
            new Error("No user to restore - please login again")
          );
        }

        const refreshToken = await getRefreshTokenForUser(lastUserId);
        if (!refreshToken) {
          // Không có refresh token, logout và emit event để redirect về login
          console.log("No refresh token found - redirecting to login");
          processQueue(new Error("No refresh token"), null);
          await logout();
          window.dispatchEvent(new CustomEvent("auth:logout"));
          return Promise.reject(
            new Error("No refresh token - please login again")
          );
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
          await saveRefreshTokenForUser(lastUserId, newRefreshToken);
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
    const { access_token, refresh_token, user } = response.data; // Backend trả về snake_case

    // Lưu tokens
    setAccessToken(access_token);
    await saveRefreshTokenForUser(user.id, refresh_token);

    return response.data;
  },

  // Refresh token
  async refresh(options?: {
    timeoutMs?: number;
    userId?: string;
  }): Promise<{ access_token: string; refresh_token?: string }> {
    const userId = options?.userId ?? (await getLastUserId());
    if (!userId) {
      console.log("No last user found - cannot refresh");
      throw new Error("No user - please login again");
    }

    const refreshToken = await getRefreshTokenForUser(userId);
    if (!refreshToken) {
      console.log("No refresh token found - cannot refresh");
      throw new Error("No refresh token - please login again");
    }

    const response = await axios.post(
      `${BACKEND_URL}/auth/refresh`,
      {
        refreshToken: refreshToken,
      },
      {
        timeout: options?.timeoutMs,
      }
    );

    const { access_token, refresh_token: newRefreshToken } = response.data;

    setAccessToken(access_token);
    if (newRefreshToken) {
      await saveRefreshTokenForUser(userId, newRefreshToken);
    }

    return response.data;
  },

  // Đăng xuất
  async logout(userId?: string): Promise<void> {
    try {
      await api.post("/auth/logout");
      console.log("✅ Logout successful - token invalidated on server");
    } catch (error) {
      console.error("❌ Logout API error:", error);
    } finally {
      const resolvedUserId = userId ?? (await getLastUserId());
      if (resolvedUserId) {
        await clearRefreshTokenForUser(resolvedUserId);
      } else {
        await clearLastUserId();
      }
      setAccessToken(null);
    }
  },

  // Quên mật khẩu - Gửi OTP
  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message: string; expiresIn: string }> {
    const response = await axios.post(`${BACKEND_URL}/auth/forgot-password`, {
      email,
    });
    return response.data;
  },

  // Xác thực OTP (Optional)
  async verifyOtp(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
      email,
      otp,
    });
    return response.data;
  },

  // Đặt lại mật khẩu
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${BACKEND_URL}/auth/reset-password`, {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },

  // Lấy thông tin user hiện tại (GET /auth/profile)
  async me(options?: { timeoutMs?: number }) {
    const response = await api.get("/auth/profile", {
      timeout: options?.timeoutMs,
    });
    return response.data;
  },

  // Cập nhật thông tin profile (PATCH /auth/profile)
  // Supports both JSON and FormData (for avatar upload)
  async updateProfile(data: Partial<User> | FormData): Promise<User> {
    const config =
      data instanceof FormData
        ? {
            headers: { "Content-Type": "multipart/form-data" },
          }
        : {};

    const response = await api.patch("/auth/profile", data, config);
    return response.data;
  },
};

// Helper logout function
export async function logout(userId?: string) {
  await authApi.logout(userId);
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
  Statistic,
  CreateReportResponse,
  CreateManualReportRequest,
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
  // Accepts either JSON DTO or FormData for avatar upload
  create: async (dto: CreateUserDto | FormData): Promise<User> => {
    const config =
      dto instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const response = await api.post("/users", dto as any, config);
    return response.data;
  },

  // Update user (ADMIN only)
  // Accepts either partial JSON DTO or FormData for avatar upload
  update: async (
    id: string,
    dto: Partial<CreateUserDto> | FormData
  ): Promise<User> => {
    const config =
      dto instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const response = await api.patch(`/users/${id}`, dto as any, config);
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
export interface CategoryWithItems {
  category: Category;
  totalItems: number;
}

export interface CategoriesResponse {
  data: CategoryWithItems[];
  totalCategory: number;
}

export const categoriesApi = {
  // Get all categories (Public)
  list: async (): Promise<CategoriesResponse> => {
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

  // Get active taxes/discounts list (ADMIN, STAFF)
  listActive: async (): Promise<Tax[]> => {
    const response = await api.get("/taxes/active/list");
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
  list: async (params?: {
    status?: string;
    tableId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: "cash" | "QR" | "card";
    createdBy?: string;
  }): Promise<Order[]> => {
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
    dto: Partial<{ status: string }>
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

// ============ INGREDIENTS API ============
import type {
  Ingredient,
  CreateIngredientDto,
  BulkCreateIngredientsDto,
  ImportIngredientDto,
  ExportIngredientDto,
  GetLogsResponse,
} from "../types/api";

export const logsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    q?: string;
    from?: string;
    to?: string;
  }): Promise<GetLogsResponse> => {
    const response = await api.get("/logs", { params });
    return response.data;
  },
};

export const ingredientsApi = {
  // Get all ingredients
  list: async (): Promise<Ingredient[]> => {
    const response = await api.get("/ingredients");
    return response.data;
  },

  // Get ingredient by ID
  getById: async (id: string): Promise<Ingredient> => {
    const response = await api.get(`/ingredients/${id}`);
    return response.data;
  },

  // Create ingredient
  create: async (dto: CreateIngredientDto | FormData): Promise<Ingredient> => {
    const config =
      dto instanceof FormData
        ? {
            headers: { "Content-Type": "multipart/form-data" },
          }
        : {};
    const response = await api.post("/ingredients", dto, config);
    return response.data;
  },

  // Bulk create ingredients
  bulkCreate: async (
    dto: BulkCreateIngredientsDto
  ): Promise<{ message: string; count: number; ingredients: Ingredient[] }> => {
    const response = await api.post("/ingredients/bulk", dto);
    return response.data;
  },

  // Update ingredient
  update: async (
    id: string,
    dto: Partial<CreateIngredientDto> | FormData
  ): Promise<Ingredient> => {
    const config =
      dto instanceof FormData
        ? {
            headers: { "Content-Type": "multipart/form-data" },
          }
        : {};
    const response = await api.patch(`/ingredients/${id}`, dto, config);
    return response.data;
  },

  // Import ingredient stock (ADMIN)
  importStock: async (
    dto: ImportIngredientDto
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post("/ingredients/import", dto);
    return response.data;
  },

  // Export ingredient stock (ADMIN)
  exportStock: async (
    dto: ExportIngredientDto
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post("/ingredients/export", dto);
    return response.data;
  },

  // Delete ingredient
  remove: async (id: string): Promise<void> => {
    await api.delete(`/ingredients/${id}`);
  },
};

// ============ RECIPES API ============
import type { Recipe, CreateRecipeDto, UpdateRecipeDto } from "../types/api";

export const recipesApi = {
  // Get all recipes
  list: async (params?: { search?: string }): Promise<any> => {
    const response = await api.get("/recipes", { params });
    return response.data;
  },

  // Get recipe by ID
  getById: async (id: string): Promise<Recipe> => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
  },

  // Get recipes by item ID
  getByItemId: async (itemId: string): Promise<Recipe[]> => {
    const response = await api.get(`/recipes/by-item/${itemId}`);
    return response.data;
  },

  // Create recipe
  create: async (dto: CreateRecipeDto): Promise<Recipe> => {
    const response = await api.post("/recipes", dto);
    return response.data;
  },

  // Update recipe
  update: async (id: string, dto: UpdateRecipeDto): Promise<Recipe> => {
    const response = await api.patch(`/recipes/${id}`, dto);
    return response.data;
  },

  // Delete recipe
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/recipes/${id}`);
    return response.data;
  },
};

// ============ LEGACY ALIASES (for backward compatibility) ============
export const menuApi = itemsApi; // Alias for items

// ============ STATISTICS API ============
export const statisticsApi = {
  // Get all statistics reports with optional filters
  list: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: "daily" | "weekly" | "monthly" | "custom";
  }): Promise<Statistic[]> => {
    const response = await api.get("/statistics", { params });
    return response.data;
  },

  // Get latest report by period (daily/weekly/monthly/custom)
  getLatest: async (
    period: "daily" | "weekly" | "monthly" | "custom"
  ): Promise<Statistic> => {
    const response = await api.get("/statistics/latest", {
      params: { period },
    });
    return response.data;
  },

  // Get report by ID
  getById: async (id: string): Promise<Statistic> => {
    const response = await api.get(`/statistics/${id}`);
    return response.data;
  },

  // Create manual (custom) report by date range
  createManualReport: async (
    startDate: string,
    endDate: string
  ): Promise<CreateReportResponse> => {
    const payload: CreateManualReportRequest = { startDate, endDate };
    const response = await api.post("/statistics", payload);
    return response.data;
  },

  // Download excel for a report by id
  downloadExcel: async (id: string): Promise<Blob> => {
    const response = await api.get(`/statistics/${id}/excel`, {
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

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
