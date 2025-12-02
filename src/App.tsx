import { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { SalesPOS } from "./components/SalesPOS";
import { MenuManagement } from "./components/MenuManagement";
import { TableManagement } from "./components/TableManagement";
import { RevenueDashboard } from "./components/RevenueDashboard";
import { UserManagement } from "./components/UserManagement";
import { OrderHistory } from "./components/OrderHistory";
import { SystemSettings } from "./components/SystemSettings";
import { Profile } from "./components/Profile";
import {
  Coffee,
  ShoppingCart,
  UtensilsCrossed,
  LayoutGrid,
  TrendingUp,
  Settings,
  LogOut,
  Users,
  Receipt,
  UserCircle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { UserRole, User } from "./types/user";
import { logout } from "./lib/api";

type AdminView =
  | "users"
  | "revenue"
  | "system-settings"
  | "menu"
  | "tables"
  | "orders"
  | "profile";
type StaffView = "sales" | "menu" | "tables" | "orders" | "profile";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("users");
  const [currentStaffView, setCurrentStaffView] = useState<StaffView>("sales");

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
    setCurrentUser(user);
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
      id: "system-settings",
      icon: Settings,
      label: "Cài đặt hệ thống",
      view: "system-settings" as AdminView,
    },
    {
      id: "menu",
      icon: UtensilsCrossed,
      label: "Quản lý menu",
      view: "menu" as AdminView,
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
      <aside className="w-72 bg-white border-r-2 border-orange-100 flex flex-col shadow-xl">
        {/* Logo */}
        <div className="p-6 border-b-2 border-orange-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
              <Coffee className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-amber-900">Cafe Management</h2>
              <p className="text-amber-700/70">
                {userRole === "admin" ? "Quản trị viên" : "Nhân viên bán hàng"}
              </p>
            </div>
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
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t-2 border-orange-100">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-orange-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Đăng xuất
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
              {currentAdminView === "system-settings" && <SystemSettings />}
              {currentAdminView === "menu" && <MenuManagement />}
              {currentAdminView === "tables" && <TableManagement />}
              {currentAdminView === "orders" && <OrderHistory />}
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
