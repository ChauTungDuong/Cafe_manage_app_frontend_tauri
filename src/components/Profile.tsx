import { useState, useEffect } from "react";
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
} from "lucide-react";
import { User as UserType } from "../types/user";

interface ProfileProps {
  user: UserType;
  onUpdate?: (user: UserType) => void;
}

export function Profile({ user, onUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    });
  }, [user]);

  const handleSave = () => {
    // TODO: Gọi API để update user info
    if (onUpdate) {
      onUpdate({
        ...user,
        ...formData,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    });
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
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              className="h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Lưu
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar & Basic Info */}
        <Card className="md:col-span-1 p-6 rounded-2xl border-2 border-orange-100">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-orange-100">
              <AvatarImage src={user.avatar || defaultAvatar} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-3xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

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
        <Card className="md:col-span-2 p-6 rounded-2xl border-2 border-orange-100">
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
