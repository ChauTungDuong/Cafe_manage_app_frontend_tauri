import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  UserPlus,
  Edit,
  Trash2,
  Search,
  Loader2,
  UserX,
  ImagePlus,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { usersApi } from "../lib/api";
import type { User } from "../types/api";

export function UserManagement() {
  // Data state
  const [users, setUsers] = useState<User[]>([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Loading & Error state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff" as "admin" | "staff",
    gender: "male" as "male" | "female",
    birthday: "",
    phone: "",
    address: "",
    isActive: true,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Không thể tải danh sách người dùng";
      setError(message);
      console.error("Load users error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      // Edit mode
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        confirmPassword: "",
        role: user.role,
        gender: (user.gender || "male") as "male" | "female",
        birthday: user.birthday
          ? new Date(user.birthday).toISOString().split("T")[0]
          : "",
        phone: user.phone || "",
        address: user.address || "",
        isActive: user.isActive !== false,
      });
      setAvatarPreview(user.avatar || "");
      setAvatarFile(null);
    } else {
      // Add mode
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "staff",
        gender: "male",
        birthday: "",
        phone: "",
        address: "",
        isActive: true,
      });
      setAvatarPreview("");
      setAvatarFile(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "staff",
      gender: "male",
      birthday: "",
      phone: "",
      address: "",
      isActive: true,
    });
    setAvatarFile(null);
    setAvatarPreview("");
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Mật khẩu phải có ít nhất 8 ký tự";
    }
    if (!/[A-Z]/.test(password)) {
      return "Mật khẩu phải có ít nhất 1 chữ hoa";
    }
    if (!/[a-z]/.test(password)) {
      return "Mật khẩu phải có ít nhất 1 chữ thường";
    }
    if (!/[0-9]/.test(password)) {
      return "Mật khẩu phải có ít nhất 1 số";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";
    }
    return null;
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên người dùng!");
      return;
    }

    if (!formData.email.trim()) {
      alert("Vui lòng nhập email!");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Email không hợp lệ!");
      return;
    }

    // Password validation for new users
    if (!editingUser) {
      if (!formData.password) {
        alert("Vui lòng nhập mật khẩu!");
        return;
      }

      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        alert(passwordError);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
      }
    }

    // Password validation for editing users (optional)
    if (editingUser && formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        alert(passwordError);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
      }
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingUser) {
        // Update existing user - use FormData for file upload
        const updateFormData = new FormData();
        updateFormData.append("name", formData.name);
        updateFormData.append("email", formData.email);
        updateFormData.append("role", formData.role);
        updateFormData.append("gender", formData.gender);
        updateFormData.append("isActive", String(formData.isActive));

        if (formData.birthday) {
          updateFormData.append("birthday", formData.birthday);
        }
        if (formData.phone) {
          updateFormData.append("phone", formData.phone);
        }
        if (formData.address) {
          updateFormData.append("address", formData.address);
        }

        // Only include password if it's provided
        if (formData.password) {
          updateFormData.append("password", formData.password);
        }

        // Only include avatar if a new file is selected
        if (avatarFile) {
          updateFormData.append("avatar", avatarFile);
        }

        await usersApi.update(editingUser.id, updateFormData);
        alert("Cập nhật người dùng thành công!");
      } else {
        // Create new user - use FormData for file upload
        const createFormData = new FormData();
        createFormData.append("name", formData.name);
        createFormData.append("email", formData.email);
        createFormData.append("password", formData.password);
        createFormData.append("role", formData.role);
        createFormData.append("gender", formData.gender);
        createFormData.append("isActive", String(formData.isActive));

        if (formData.birthday) {
          createFormData.append("birthday", formData.birthday);
        }
        if (formData.phone) {
          createFormData.append("phone", formData.phone);
        }
        if (formData.address) {
          createFormData.append("address", formData.address);
        }
        if (avatarFile) {
          createFormData.append("avatar", avatarFile);
        }

        await usersApi.create(createFormData);
        alert("Thêm người dùng thành công!");
      }

      // Reload data
      await loadUsers();
      handleCloseDialog();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể lưu thông tin người dùng. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Save user error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${name}"?`)) {
      return;
    }

    setError("");
    try {
      await usersApi.remove(id);
      alert("Xóa người dùng thành công!");
      await loadUsers();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Không thể xóa người dùng. Vui lòng thử lại!";
      setError(message);
      alert(message);
      console.error("Delete user error:", err);
    }
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
        Admin
      </Badge>
    ) : (
      <Badge className="bg-blue-100 text-blue-700 border-blue-300">Staff</Badge>
    );
  };

  const getStatusBadge = (isActive?: boolean) => {
    return isActive !== false ? (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        Hoạt động
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300">
        Không hoạt động
      </Badge>
    );
  };

  // Filter users by search term
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // Calculate statistics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const activeCount = users.filter((u) => u.isActive !== false).length;

  return (
    <div className="space-y-6">
      <style>{`
        @media (min-width: 768px) {
          .user-dialog-layout {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          .user-dialog-form {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
          .user-dialog-avatar {
            flex: 0 0 300px !important;
            width: 300px !important;
            max-width: 300px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-amber-900 mb-1">Quản lý người dùng</h2>
          <p className="text-amber-700/70">
            Quản lý tài khoản admin và nhân viên
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Thêm người dùng
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Cập nhật thông tin người dùng"
                  : "Nhập thông tin người dùng mới"}
              </DialogDescription>
            </DialogHeader>

            {/* 2-column layout */}
            <div className="flex flex-col md:flex-row gap-6 py-4 user-dialog-layout">
              {/* Left Column - Form Fields */}
              <div className="flex-1 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Họ và tên *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="user@example.com"
                  />
                </div>

                {/* Gender and Birthday - Same Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gender */}
                  <div className="space-y-2">
                    <Label>Giới tính *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value: "male" | "female") =>
                        setFormData({ ...formData, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">👨 Nam</SelectItem>
                        <SelectItem value="female">👩 Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Birthday */}
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Ngày sinh</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) =>
                        setFormData({ ...formData, birthday: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Phone and Role - Same Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="0912345678"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label>Vai trò *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "staff") =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">👑 Quản trị viên</SelectItem>
                        <SelectItem value="staff">👤 Nhân viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="123 Đường ABC, Quận XYZ"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Mật khẩu {editingUser ? "(Để trống nếu không đổi)" : "*"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-amber-600">
                    Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự
                    đặc biệt
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Xác nhận mật khẩu{" "}
                    {editingUser && !formData.password ? "" : "*"}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Right Column - Avatar & Role */}
              <div className="w-full md:w-[300px] md:flex-shrink-0 space-y-4 user-dialog-avatar">
                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>Ảnh đại diện</Label>

                  {/* Avatar Preview */}
                  <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-orange-200 bg-gray-50">
                    <img
                      src={
                        avatarPreview ||
                        (editingUser?.avatar
                          ? editingUser.avatar
                          : "/default/default-avatar.jpg")
                      }
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/default/default-avatar.jpg";
                      }}
                    />
                  </div>

                  {/* Upload Button */}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAvatarPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 border-dashed border-2 border-orange-200 hover:bg-orange-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4 text-amber-600" />
                      {editingUser ? "Thay ảnh" : "Thêm ảnh"}
                    </Button>

                    <p className="text-xs text-amber-600 text-center">
                      JPG, PNG (tối đa 5MB)
                    </p>
                  </div>
                </div>

                {/* Is Active */}
                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={formData.isActive ? "true" : "false"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isActive: value === "true" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">✅ Hoạt động</SelectItem>
                      <SelectItem value="false">❌ Không hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCloseDialog}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="flex flex-row gap-4">
        <Card className="flex-1 p-4 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-sm text-blue-700 mb-1">Tổng số</p>
          <p className="text-2xl font-bold text-blue-800">{totalUsers}</p>
        </Card>
        <Card className="flex-1 p-4 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-sm text-emerald-700 mb-1">Hoạt động</p>
          <p className="text-2xl font-bold text-emerald-800">{activeCount}</p>
        </Card>
        <Card className="flex-1 p-4 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-sm text-purple-700 mb-1">Quản trị viên</p>
          <p className="text-2xl font-bold text-purple-800">{adminCount}</p>
        </Card>
        <Card className="flex-1 p-4 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-sm text-amber-700 mb-1">Nhân viên</p>
          <p className="text-2xl font-bold text-amber-800">{staffCount}</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 border-2 border-orange-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 h-5 w-5" />
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>
      </Card>

      {/* Users List */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-amber-900">Đang tải người dùng...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="h-12 w-12 text-amber-600/30 mx-auto mb-3" />
            <p className="text-amber-600/50">Không tìm thấy người dùng</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="p-4 hover:shadow-lg transition-all border-2 border-orange-100 hover:border-orange-300 rounded-2xl"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={user.avatar || "/default/default-avatar.jpg"}
                      alt={user.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-orange-200"
                      onError={(e) => {
                        e.currentTarget.src = "/default/default-avatar.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-amber-900">
                          {user.name}
                        </h4>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.isActive)}
                      </div>
                      <p className="text-sm text-amber-600">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-amber-600">{user.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-200 hover:bg-orange-50"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:bg-red-50 text-red-600"
                      onClick={() => handleDelete(user.id, user.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
