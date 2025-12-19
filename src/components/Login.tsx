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

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "email" | "reset"
  >("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");

  const handleSendOtp = async () => {
    console.log("📧 Sending OTP to email:", forgotEmail);
    setForgotPasswordError("");
    setForgotPasswordSuccess("");
    setIsLoading(true);

    try {
      console.log("🔗 Calling authApi.forgotPassword...");
      const result = await authApi.forgotPassword(forgotEmail);
      console.log("✅ OTP sent successfully:", result);
      setForgotPasswordSuccess(
        "Mã OTP đã được gửi đến email của bạn (hiệu lực 5 phút)"
      );
      setForgotPasswordStep("reset");
    } catch (err: any) {
      console.error("❌ Send OTP error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setForgotPasswordError(
        err.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    console.log("🔑 Resetting password for:", forgotEmail);
    setForgotPasswordError("");
    setForgotPasswordSuccess("");

    if (!otp || !newPassword || !confirmPassword) {
      setForgotPasswordError("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordError("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔗 Calling authApi.resetPassword...");
      const result = await authApi.resetPassword(forgotEmail, otp, newPassword);
      console.log("✅ Password reset successfully:", result);
      setForgotPasswordSuccess(
        "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."
      );

      // Reset form and close dialog after 2 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setForgotEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setForgotPasswordError("");
        setForgotPasswordSuccess("");
      }, 2000);
    } catch (err: any) {
      console.error("❌ Reset password error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setForgotPasswordError(
        err.response?.data?.message ||
          "Không thể đặt lại mật khẩu. Vui lòng thử lại!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, retryCount = 0) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoadingMessage("Đang kết nối đến server...");

    console.log("🔐 Login attempt:", { email, retry: retryCount });

    // Timeout để hiển thị message cold start
    const coldStartTimer = setTimeout(() => {
      setLoadingMessage("Server đang khởi động (cold start), vui lòng đợi...");
    }, 5000);

    let shouldRetry = false;

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

      // Xử lý lỗi timeout với retry tự động
      if (err.code === "ECONNABORTED" && retryCount < 2) {
        shouldRetry = true;
        setLoadingMessage(`Timeout. Đang thử lại lần ${retryCount + 2}/3...`);
        console.log(`🔄 Retrying login (${retryCount + 1}/2)...`);

        // Đợi 2 giây rồi retry
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Retry với event giả
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        return handleSubmit(fakeEvent, retryCount + 1);
      } else if (err.code === "ECONNABORTED") {
        setError(
          "Không thể kết nối đến server sau 3 lần thử. Server có thể đang khởi động (cold start). Vui lòng thử lại sau 30 giây."
        );
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại!");
      }
    } finally {
      // Chỉ reset loading state nếu không retry
      if (!shouldRetry) {
        setIsLoading(false);
        setLoadingMessage("");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src="default/AppIcon.png" alt="Cafe" className="h-20 w-20" />
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-amber-600 hover:text-amber-700 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-amber-900 mb-6">
              {forgotPasswordStep === "email"
                ? "Quên mật khẩu"
                : "Đặt lại mật khẩu"}
            </h2>

            {forgotPasswordStep === "email" ? (
              // Step 1: Email input
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-amber-900">
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Nhập email của bạn"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                {forgotPasswordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                {forgotPasswordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                    {forgotPasswordSuccess}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmail("");
                      setForgotPasswordError("");
                      setForgotPasswordSuccess("");
                      setForgotPasswordStep("email");
                    }}
                    className="flex-1 h-12 border-amber-200 hover:bg-amber-50 rounded-xl"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading || !forgotEmail}
                    className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      "Xác nhận gửi OTP"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Step 2: Reset password
              <div className="space-y-5">
                <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-sm text-amber-800">
                  Email: <strong>{forgotEmail}</strong>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-amber-900">
                    Mã OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Nhập mã OTP (6 số)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-amber-900">
                    Mật khẩu mới
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-amber-900">
                    Xác nhận mật khẩu
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                {forgotPasswordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                {forgotPasswordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                    {forgotPasswordSuccess}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForgotPasswordStep("email");
                      setOtp("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setForgotPasswordError("");
                      setForgotPasswordSuccess("");
                    }}
                    className="flex-1 h-12 border-amber-200 hover:bg-amber-50 rounded-xl"
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      "Đặt lại mật khẩu"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
