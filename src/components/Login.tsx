import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import { UserRole, User } from "../types/user";
import { authApi } from "../lib/api";

interface LoginProps {
  onLogin: (role: UserRole, user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoadingMessage("Đang kết nối đến server...");

    console.log("🔐 Login attempt:", { email });

    // Timeout để hiển thị message cold start
    const coldStartTimer = setTimeout(() => {
      setLoadingMessage("Server đang khởi động, vui lòng đợi...");
    }, 3000);

    try {
      // Gọi API đăng nhập thực
      const response = await authApi.login({
        email, // Backend nhận "email"
        password,
      });

      clearTimeout(coldStartTimer);

      // Đăng nhập thành công
      console.log("✅ Login successful:", response.user);
      onLogin(response.user.role, response.user);
    } catch (err: any) {
      clearTimeout(coldStartTimer);
      console.error("❌ Login error:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response,
        stack: err.stack,
      });

      // Xử lý lỗi
      if (err.code === "ECONNABORTED") {
        setError(
          "Server đang khởi động (cold start). Vui lòng thử lại sau 10 giây."
        );
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại!");
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg">
              <img src="/default/AppIcon.png" alt="Cafe" className="h-16 w-16" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-amber-900 mb-2">Cafe Management</h1>
            <p className="text-amber-700/70">Hệ thống quản lý quán cafe</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-900">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-900">
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Đang đăng nhập...
                  </div>
                  {loadingMessage && (
                    <span className="text-xs opacity-80">{loadingMessage}</span>
                  )}
                </div>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-amber-700/60">
          © 2024 Cafe Manager System
        </p>
      </div>
    </div>
  );
}
