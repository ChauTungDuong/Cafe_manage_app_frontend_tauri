import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Settings,
  Save,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { Separator } from "./ui/separator";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    cafeName: "Cafe Manager",
    address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    phone: "0901234567",
    email: "contact@cafemanager.com",
    taxCode: "0123456789",
    openTime: "07:00",
    closeTime: "22:00",
    currency: "VND",
    language: "vi",
    timezone: "GMT+7",
    description: "Quán cafe chuyên phục vụ các loại thức uống chất lượng cao",
  });

  const handleSave = () => {
    // TODO: Save settings to backend
    alert("Đã lưu cài đặt thành công!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-amber-900 mb-1">
          Cài đặt hệ thống
        </h2>
        <p className="text-amber-700/70">
          Quản lý thông tin và cấu hình hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Info */}
          <Card className="p-6 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-amber-900">
                Thông tin quán
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cafeName" className="text-amber-900">
                  Tên quán *
                </Label>
                <Input
                  id="cafeName"
                  value={settings.cafeName}
                  onChange={(e) =>
                    setSettings({ ...settings, cafeName: e.target.value })
                  }
                  className="rounded-xl border-orange-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-amber-900">
                  Địa chỉ *
                </Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  className="rounded-xl border-orange-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-amber-900">
                    Số điện thoại *
                  </Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) =>
                      setSettings({ ...settings, phone: e.target.value })
                    }
                    className="rounded-xl border-orange-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-amber-900">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) =>
                      setSettings({ ...settings, email: e.target.value })
                    }
                    className="rounded-xl border-orange-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxCode" className="text-amber-900">
                  Mã số thuế
                </Label>
                <Input
                  id="taxCode"
                  value={settings.taxCode}
                  onChange={(e) =>
                    setSettings({ ...settings, taxCode: e.target.value })
                  }
                  className="rounded-xl border-orange-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-amber-900">
                  Mô tả
                </Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) =>
                    setSettings({ ...settings, description: e.target.value })
                  }
                  className="rounded-xl border-orange-200 min-h-[100px]"
                />
              </div>
            </div>
          </Card>

          {/* Operating Hours */}
          <Card className="p-6 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-amber-900">
                Giờ hoạt động
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openTime" className="text-amber-900">
                  Giờ mở cửa
                </Label>
                <Input
                  id="openTime"
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                  className="rounded-xl border-orange-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeTime" className="text-amber-900">
                  Giờ đóng cửa
                </Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                  className="rounded-xl border-orange-200"
                />
              </div>
            </div>
          </Card>

          {/* System Config */}
          <Card className="p-6 border-2 border-orange-100 shadow-lg rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-amber-900">
                Cấu hình hệ thống
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-amber-900">
                    Đơn vị tiền tệ
                  </Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) =>
                      setSettings({ ...settings, currency: e.target.value })
                    }
                    className="rounded-xl border-orange-200"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-amber-900">
                    Ngôn ngữ
                  </Label>
                  <Input
                    id="language"
                    value="Tiếng Việt"
                    className="rounded-xl border-orange-200"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-amber-900">
                    Múi giờ
                  </Label>
                  <Input
                    id="timezone"
                    value={settings.timezone}
                    className="rounded-xl border-orange-200"
                    disabled
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Info Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 border-2 border-orange-100 shadow-lg rounded-2xl">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">
              Thông tin hiện tại
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-amber-700/70">Tên quán</p>
                  <p className="font-medium text-amber-900">
                    {settings.cafeName}
                  </p>
                </div>
              </div>
              <Separator className="bg-orange-100" />
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-amber-700/70">Địa chỉ</p>
                  <p className="font-medium text-amber-900">
                    {settings.address}
                  </p>
                </div>
              </div>
              <Separator className="bg-orange-100" />
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-amber-700/70">Điện thoại</p>
                  <p className="font-medium text-amber-900">{settings.phone}</p>
                </div>
              </div>
              <Separator className="bg-orange-100" />
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-amber-700/70">Email</p>
                  <p className="font-medium text-amber-900">{settings.email}</p>
                </div>
              </div>
              <Separator className="bg-orange-100" />
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <p className="text-sm text-amber-700/70">Giờ mở cửa</p>
                  <p className="font-medium text-amber-900">
                    {settings.openTime} - {settings.closeTime}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSave}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
