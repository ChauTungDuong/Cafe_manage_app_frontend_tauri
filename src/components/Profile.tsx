import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// Default avatar served from public/default
const defaultAvatar = "/default/default-avatar.jpg";
import { Badge } from "./ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Loader2,
  Upload,
  Camera,
} from "lucide-react";
import { User as UserType } from "../types/user";
import { authApi } from "../lib/api";

interface ProfileProps {
  user: UserType;
  onUpdate?: (user: UserType) => void;
}

export function Profile({ user, onUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
  });

  // Image upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    });
    setAvatarPreview(user.avatar || "");
  }, [user]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn file ảnh hợp lệ");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      let updatedUser;

      // Nếu có avatar mới, dùng FormData
      if (avatarFile) {
        const formDataToSend = new FormData();
        formDataToSend.append("avatar", avatarFile);

        // Thêm các trường text
        if (formData.name) formDataToSend.append("name", formData.name);
        if (formData.phone) formDataToSend.append("phone", formData.phone);
        if (formData.address)
          formDataToSend.append("address", formData.address);

        updatedUser = await authApi.updateProfile(formDataToSend);
      } else {
        // Không có avatar, chỉ gửi JSON
        updatedUser = await authApi.updateProfile(formData);
      } // Cập nhật user trong localStorage
      // Normalize API response to match local User type (ensure phone is a string)
      const normalizedUser: UserType = {
        ...(updatedUser as any),
        phone: (updatedUser as any)?.phone ?? "",
      };
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      // Gọi callback onUpdate nếu có
      if (onUpdate) {
        onUpdate(normalizedUser);
      }

      alert("Cập nhật thông tin thành công!");
      setIsEditing(false);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể cập nhật thông tin. Vui lòng thử lại!";
      setError(Array.isArray(message) ? message.join(", ") : message);
      alert(message);
      console.error("Update profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    });
    setAvatarFile(null);
    setAvatarPreview(user.avatar || "");
    setError("");
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case "male":
        return "Nam";
      case "female":
        return "Nữ";
      case "other":
        return "Khác";
      default:
        return "Chưa cập nhật";
    }
  };

  const getRoleText = (role: string) => {
    return role === "admin" ? "Quản trị viên" : "Nhân viên";
  };

  const getRoleBadgeClass = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media (min-width: 768px) {
          .profile-avatar-card {
            width: 400px !important;
            max-width: 400px !important;
            flex-shrink: 0 !important;
          }
          .profile-container {
            display: flex !important;
            flex-direction: row !important;
          }
          .profile-avatar-image {
            width: 296px !important;
            height: 296px !important;
            max-width: 296px !important;
            max-height: 296px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-amber-900 mb-1">Thông tin cá nhân</h2>
          <p className="text-amber-700/70">
            Quản lý thông tin tài khoản của bạn
          </p>
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg"
          >
            <Edit className="h-4 w-4 mr-2" />
            Chỉnh sửa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="h-11 px-6 rounded-xl border-orange-200"
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              className="h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 profile-container">
        {/* Avatar & Basic Info */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100 profile-avatar-card md:flex-shrink-0">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto profile-avatar-image">
              <Avatar className="h-24 w-24 border-4 border-orange-100 profile-avatar-image">
                <AvatarImage
                  src={avatarPreview || user.avatar || defaultAvatar}
                  alt={user.name}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-2xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {isEditing && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    style={{ display: "none" }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 p-0 rounded-full bg-white border-2 border-orange-300 hover:bg-orange-50 shadow-lg"
                    title="Thay đổi ảnh đại diện"
                  >
                    <Camera className="h-5 w-5 text-orange-600" />
                  </Button>
                </>
              )}
            </div>

            {/* Show file size limit when editing */}
            {isEditing && (
              <p className="text-xs text-amber-600/70 text-center px-2">
                {avatarFile
                  ? `📷 ${avatarFile.name}`
                  : "Max 10MB, JPEG/PNG/JPG/WEBP"}
              </p>
            )}

            <div className="w-full">
              <h3 className="text-amber-900 mb-2">{user.name}</h3>
              <Badge className={`mb-3 ${getRoleBadgeClass(user.role)}`}>
                {getRoleText(user.role)}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-amber-700/70">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>

                {user.isActive !== undefined && (
                  <Badge
                    className={
                      user.isActive
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }
                  >
                    {user.isActive ? "Đang hoạt động" : "Không hoạt động"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Detailed Information */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100 w-full md:flex-1">
          <h3 className="text-amber-900 mb-6">Chi tiết thông tin</h3>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-amber-900 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Họ và tên
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-11 rounded-xl border-orange-200"
                />
              ) : (
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {user.name}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-amber-900 flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-11 rounded-xl border-orange-200"
                />
              ) : (
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {user.email}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-amber-900 flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Số điện thoại
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-11 rounded-xl border-orange-200"
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {user.phone || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label
                htmlFor="address"
                className="text-amber-900 flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Địa chỉ
              </Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="h-11 rounded-xl border-orange-200"
                  placeholder="Nhập địa chỉ"
                />
              ) : (
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {user.address || "Chưa cập nhật"}
                </div>
              )}
            </div>

            {/* Gender & Birthday (Read-only) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-amber-900">Giới tính</Label>
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {getGenderText(user.gender)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ngày sinh
                </Label>
                <div className="h-11 px-4 flex items-center rounded-xl bg-orange-50 text-amber-900">
                  {formatDate(user.birthday)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
