import { useState, useEffect } from "react";
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
import { UserPlus, Edit, Trash2, Search, Loader2, UserX } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { usersApi } from "../lib/api";
import type { User, CreateUserDto } from "../types/api";

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
  });

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
      });
    } else {
      // Add mode
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "staff",
      });
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
    });
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
        // Update existing user
        const updateDto: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };

        // Only include password if it's provided
        if (formData.password) {
          updateDto.password = formData.password;
        }

        await usersApi.update(editingUser.id, updateDto);
        alert("Cập nhật người dùng thành công!");
      } else {
        // Create new user
        const createDto: CreateUserDto = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        };

        await usersApi.create(createDto);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-amber-900">
            Quản lý người dùng
          </h2>
          <p className="text-amber-600">Quản lý tài khoản admin và nhân viên</p>
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
          <DialogContent className="sm:max-w-[500px]">
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

            <div className="space-y-4 py-4">
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

              {/* Role */}
              <div className="space-y-2">
                <Label>Vai trò</Label>
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
                    <SelectItem value="admin">👑 Admin</SelectItem>
                    <SelectItem value="staff">👤 Staff</SelectItem>
                  </SelectContent>
                </Select>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700 mb-1">Tổng số</p>
          <p className="text-2xl font-bold text-blue-800">{totalUsers}</p>
        </Card>
        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <p className="text-sm text-purple-700 mb-1">Admin</p>
          <p className="text-2xl font-bold text-purple-800">{adminCount}</p>
        </Card>
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700 mb-1">Staff</p>
          <p className="text-2xl font-bold text-blue-800">{staffCount}</p>
        </Card>
        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <p className="text-sm text-green-700 mb-1">Hoạt động</p>
          <p className="text-2xl font-bold text-green-800">{activeCount}</p>
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
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
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
