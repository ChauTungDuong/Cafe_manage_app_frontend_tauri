import { useState, useEffect } from "react";

// Assets moved to `public/default` — reference via absolute public paths
const defaultAvatar = "/default/default-avatar.jpg";
import { Login } from "./components/Login";
import { SalesPOS } from "./components/SalesPOS";
import { MenuManagement } from "./components/MenuManagement";
import { TableManagement } from "./components/TableManagement";
import { RevenueDashboard } from "./components/RevenueDashboard";
import { UserManagement } from "./components/UserManagement";
import { OrderHistory } from "./components/OrderHistory";
import { SystemSettings } from "./components/SystemSettings";
import { Profile } from "./components/Profile";
import { InventoryManagement } from "./components/InventoryManagement";
import { TaxManagement } from "./components/TaxManagement";
import {
  ShoppingCart,
  UtensilsCrossed,
  LayoutGrid,
  TrendingUp,
  Settings,
  LogOut,
  Users,
  Receipt,
  UserCircle,
  Package,
  Percent,
  Menu,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { UserRole, User } from "./types/user";
import { logout, authApi } from "./lib/api";

type AdminView =
  | "users"
  | "revenue"
  | "system-settings"
  | "menu"
  | "tables"
  | "orders"
  | "profile"
  | "inventory"
  | "taxes";
type StaffView =
  | "sales"
  | "menu"
  | "tables"
  | "orders"
  | "profile"
  | "inventory";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("users");
  const [currentStaffView, setCurrentStaffView] = useState<StaffView>("sales");
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Khôi phục session khi app khởi động
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log("🔄 Attempting to restore session...");
        // Thử refresh token để lấy access token mới
        await authApi.refresh();

        // Nếu refresh thành công, lấy thông tin user qua /auth/profile
        const userData = await authApi.me();
        console.log("✅ Session restored:", userData);

        // Đăng nhập tự động
        handleLogin(userData.role, userData);
      } catch (error) {
        console.log("ℹ️ No valid session to restore");
        // Không có session hợp lệ, giữ ở màn hình login
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  // Lắng nghe event logout từ API interceptor
  useEffect(() => {
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setUserRole(null);
      setCurrentUser(null);
      setCurrentAdminView("users");
      setCurrentStaffView("sales");
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  const handleLogin = (role: UserRole, user: User) => {
    setIsLoggedIn(true);
    setUserRole(role);
    // Ensure user has an avatar; fall back to bundled default avatar
    const userWithAvatar = { ...user, avatar: user.avatar || defaultAvatar };
    setCurrentUser(userWithAvatar);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggedIn(false);
      setUserRole(null);
      setCurrentUser(null);
      setCurrentAdminView("users");
      setCurrentStaffView("sales");
    }
  };

  // Hiển thị loading khi đang khôi phục session
  if (isRestoringSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-amber-900">Đang khôi phục phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Admin Menu Items
  const adminMenuItems = [
    {
      id: "users",
      icon: Users,
      label: "Quản lý người dùng",
      view: "users" as AdminView,
    },
    {
      id: "revenue",
      icon: TrendingUp,
      label: "Doanh thu",
      view: "revenue" as AdminView,
    },
    {
      id: "menu",
      icon: UtensilsCrossed,
      label: "Quản lý menu",
      view: "menu" as AdminView,
    },
    {
      id: "inventory",
      icon: Package,
      label: "Quản lý kho",
      view: "inventory" as AdminView,
    },
    {
      id: "taxes",
      icon: Percent,
      label: "Quản lý thuế",
      view: "taxes" as AdminView,
    },
    {
      id: "tables",
      icon: LayoutGrid,
      label: "Quản lý bàn",
      view: "tables" as AdminView,
    },
    {
      id: "orders",
      icon: Receipt,
      label: "Quản lý hóa đơn",
      view: "orders" as AdminView,
    },
    {
      id: "system-settings",
      icon: Settings,
      label: "Cài đặt hệ thống",
      view: "system-settings" as AdminView,
    },
    {
      id: "profile",
      icon: UserCircle,
      label: "Cá nhân",
      view: "profile" as AdminView,
    },
  ];

  // Staff Menu Items
  const staffMenuItems = [
    {
      id: "sales",
      icon: ShoppingCart,
      label: "Bán hàng",
      view: "sales" as StaffView,
    },
    {
      id: "menu",
      icon: UtensilsCrossed,
      label: "Thực đơn",
      view: "menu" as StaffView,
    },
    {
      id: "inventory",
      icon: Package,
      label: "Quản lý kho",
      view: "inventory" as StaffView,
    },
    {
      id: "tables",
      icon: LayoutGrid,
      label: "Quản lý bàn",
      view: "tables" as StaffView,
    },
    {
      id: "orders",
      icon: Receipt,
      label: "Hóa đơn",
      view: "orders" as StaffView,
    },
    {
      id: "profile",
      icon: UserCircle,
      label: "Cá nhân",
      view: "profile" as StaffView,
    },
  ];

  const menuItems = userRole === "admin" ? adminMenuItems : staffMenuItems;
  const currentView =
    userRole === "admin" ? currentAdminView : currentStaffView;
  const setCurrentView =
    userRole === "admin"
      ? (view: string) => setCurrentAdminView(view as AdminView)
      : (view: string) => setCurrentStaffView(view as StaffView);

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r-2 border-orange-100 flex flex-col shadow-xl transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo & Toggle */}
        <div className="p-6 border-b-2 border-orange-100">
          <div className="flex items-center justify-between gap-3">
            {!isSidebarCollapsed && (
              <>
                <img
                  src="default/AppIcon.png"
                  alt="Cafe"
                  className="h-10 w-10"
                />
                <div className="flex-1">
                  <h2 className="text-amber-900">Cafe Management</h2>
                  <p className="text-amber-700/70 text-sm">
                    {userRole === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </p>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="h-8 w-8 hover:bg-orange-100"
            >
              {isSidebarCollapsed ? (
                <Menu className="h-5 w-5 text-amber-900" />
              ) : (
                <X className="h-5 w-5 text-amber-900" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg"
                    : "text-amber-900 hover:bg-orange-50"
                } ${isSidebarCollapsed ? "justify-center" : ""}`}
                title={isSidebarCollapsed ? item.label : ""}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t-2 border-orange-100">
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full h-12 rounded-xl border-2 border-orange-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all ${
              isSidebarCollapsed ? "justify-center px-0" : ""
            }`}
            title={isSidebarCollapsed ? "Đăng xuất" : ""}
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
            {!isSidebarCollapsed && <span className="ml-2">Đăng xuất</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Admin Views */}
          {userRole === "admin" && (
            <>
              {currentAdminView === "users" && <UserManagement />}
              {currentAdminView === "revenue" && <RevenueDashboard />}
              {currentAdminView === "menu" && <MenuManagement />}
              {currentAdminView === "inventory" && <InventoryManagement />}
              {currentAdminView === "taxes" && <TaxManagement />}
              {currentAdminView === "tables" && <TableManagement />}
              {currentAdminView === "orders" && <OrderHistory />}
              {currentAdminView === "system-settings" && <SystemSettings />}
              {currentAdminView === "profile" && currentUser && (
                <Profile user={currentUser} />
              )}
            </>
          )}

          {/* Staff Views */}
          {userRole === "staff" && (
            <>
              {currentStaffView === "sales" && (
                <SalesPOS currentUser={currentUser || undefined} />
              )}
              {currentStaffView === "menu" && <MenuManagement />}
              {currentStaffView === "inventory" && <InventoryManagement />}
              {/* {currentStaffView === "taxes" && <TaxManagement />} */}
              {currentStaffView === "tables" && <TableManagement />}
              {currentStaffView === "orders" && <OrderHistory />}
              {currentStaffView === "profile" && currentUser && (
                <Profile user={currentUser} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
