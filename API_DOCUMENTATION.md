# 📚 Cafe Management API Documentation

> **Base URL:** `http://localhost:3000` (hoặc URL production)
>
> **Version:** 1.0.0

---

## 📋 Mục Lục

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Categories](#3-categories)
4. [Items (Menu)](#4-items-menu)
5. [Tables](#5-tables)
6. [Taxes](#6-taxes)
7. [Orders](#7-orders)
8. [Payments](#8-payments)
9. [WebSocket - Real-time Payment](#9-websocket---real-time-payment)
10. [Luồng Sử Dụng Hoàn Chỉnh](#10-luồng-sử-dụng-hoàn-chỉnh)

---

## 🔐 Authentication Headers

Tất cả API (trừ những route có `@Public()`) đều yêu cầu:

```http
Authorization: Bearer <access_token>
```

---

## 1. Authentication

### 1.1 Đăng nhập

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "admin@cafe.com",
  "password": "Admin@123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@cafe.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

**React Usage:**

```typescript
const login = async (email: string, password: string) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();

  // Lưu token vào localStorage hoặc state management
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
};
```

---

### 1.2 Refresh Token

```http
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "accessToken": "new_access_token...",
  "refreshToken": "new_refresh_token..."
}
```

---

### 1.3 Lấy Profile

```http
GET /auth/profile
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid",
  "email": "staff@cafe.com",
  "name": "Nguyễn Văn A",
  "role": "staff",
  "gender": "male",
  "phone": "0901234567"
}
```

---

### 1.4 Cập nhật Profile

```http
PATCH /auth/profile
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Nguyễn Văn B",
  "phone": "0909876543"
}
```

---

## 2. Users

> ⚠️ **Role Required:** `ADMIN`

### 2.1 Tạo User

```http
POST /users
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "email": "newstaff@cafe.com",
  "name": "Nhân viên mới",
  "password": "Password@123",
  "gender": "female",
  "birthday": "1995-06-15",
  "role": "staff",
  "phone": "0901234567"
}
```

| Field    | Type   | Required | Description                                                     |
| -------- | ------ | -------- | --------------------------------------------------------------- |
| email    | string | ✅       | Email đăng nhập (min 5 chars)                                   |
| name     | string | ✅       | Họ tên (3-100 chars)                                            |
| password | string | ✅       | Mật khẩu (min 8, có uppercase, lowercase, number, special char) |
| gender   | string | ✅       | `"male"` hoặc `"female"`                                        |
| birthday | string | ❌       | Ngày sinh (YYYY-MM-DD)                                          |
| role     | string | ❌       | `"admin"` hoặc `"staff"` (default: staff)                       |
| phone    | string | ❌       | Số điện thoại                                                   |

---

### 2.2 Lấy danh sách Users

```http
GET /users
Authorization: Bearer <admin_token>
```

---

### 2.3 Lấy User theo ID

```http
GET /users/:id
Authorization: Bearer <admin_token>
```

---

### 2.4 Cập nhật User

```http
PATCH /users/:id
Authorization: Bearer <admin_token>
```

**Request Body:** (các field optional)

```json
{
  "name": "Tên mới",
  "role": "admin",
  "phone": "0909999999"
}
```

---

### 2.5 Xóa User

```http
DELETE /users/:id
Authorization: Bearer <admin_token>
```

---

## 3. Categories

### 3.1 Tạo Category

```http
POST /categories
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Cà phê"
}
```

---

### 3.2 Lấy tất cả Categories

```http
GET /categories
```

> 🌐 **Public API** - Không cần token

**Response:**

```json
[
  {
    "id": "uuid-1",
    "name": "Cà phê"
  },
  {
    "id": "uuid-2",
    "name": "Trà sữa"
  }
]
```

---

### 3.3 Lấy Category theo ID

```http
GET /categories/:id
Authorization: Bearer <token>
```

---

### 3.4 Cập nhật Category

```http
PATCH /categories/:id
Authorization: Bearer <token>
```

---

### 3.5 Xóa Category

```http
DELETE /categories/:id
Authorization: Bearer <token>
```

---

## 4. Items (Menu)

### 4.1 Tạo Item

```http
POST /items
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Tên món |
| category | JSON string | ✅ | `{"name": "Cà phê"}` |
| price | number | ✅ | Giá (VND) |
| amountLeft | number | ✅ | Số lượng còn |
| status | string | ✅ | `"available"`, `"out of stock"`, `"discontinued"` |
| description | string | ❌ | Mô tả |
| image | file | ❌ | Ảnh món (upload lên Cloudinary) |

**React Usage với FormData:**

```typescript
const createItem = async (itemData: any, imageFile?: File) => {
  const formData = new FormData();
  formData.append('name', itemData.name);
  formData.append('category', JSON.stringify({ name: itemData.categoryName }));
  formData.append('price', itemData.price.toString());
  formData.append('amountLeft', itemData.amountLeft.toString());
  formData.append('status', itemData.status);

  if (itemData.description) {
    formData.append('description', itemData.description);
  }

  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch('/items', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // KHÔNG set Content-Type, browser tự thêm boundary
    },
    body: formData,
  });

  return response.json();
};
```

---

### 4.2 Lấy tất cả Items

```http
GET /items
GET /items?status=available
GET /items?category=Cà phê
```

> 🌐 **Public API** - Không cần token

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Cà phê sữa đá",
    "price": 25000,
    "amountLeft": 100,
    "status": "available",
    "description": "Cà phê pha phin truyền thống",
    "image": "https://res.cloudinary.com/xxx/image.jpg",
    "category": {
      "id": "uuid",
      "name": "Cà phê"
    }
  }
]
```

---

### 4.3 Lấy Item theo ID

```http
GET /items/:id
Authorization: Bearer <token>
```

---

### 4.4 Cập nhật Item

```http
PATCH /items/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:** (các field optional)

```
name: Cà phê sữa đá (mới)
price: 30000
image: [file]
```

---

### 4.5 Xóa Item

```http
DELETE /items/:id
Authorization: Bearer <token>
```

---

### 4.6 Bulk Create Items

```http
POST /items/bulk
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "items": [
    {
      "name": "Espresso",
      "category": { "name": "Cà phê" },
      "price": 35000,
      "amountLeft": 50,
      "status": "available"
    },
    {
      "name": "Latte",
      "category": { "name": "Cà phê" },
      "price": 45000,
      "amountLeft": 50,
      "status": "available"
    }
  ]
}
```

---

## 5. Tables

### 5.1 Tạo Table

```http
POST /tables
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Bàn 01",
  "seat": 4,
  "status": "available"
}
```

| Field  | Type   | Required | Values                                    |
| ------ | ------ | -------- | ----------------------------------------- |
| name   | string | ✅       | Tên bàn                                   |
| seat   | number | ✅       | Số ghế                                    |
| status | string | ❌       | `"available"`, `"occupied"`, `"reserved"` |

---

### 5.2 Lấy tất cả Tables

```http
GET /tables
Authorization: Bearer <token>
```

---

### 5.3 Cập nhật Table

```http
PATCH /tables/:id
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "status": "occupied"
}
```

---

### 5.4 Xóa Table

```http
DELETE /tables/:id
Authorization: Bearer <token>
```

---

## 6. Taxes

### 6.1 Tạo Tax

```http
POST /taxes
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "VAT",
  "description": "Thuế giá trị gia tăng",
  "percent": 10
}
```

---

### 6.2 Lấy tất cả Taxes

```http
GET /taxes
Authorization: Bearer <token>
```

---

### 6.3 Cập nhật Tax

```http
PATCH /taxes/:id
Authorization: Bearer <token>
```

---

### 6.4 Xóa Tax

```http
DELETE /taxes/:id
Authorization: Bearer <token>
```

---

## 7. Orders

### 7.1 Tạo Order

```http
POST /orders
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "discount": 5,
  "createdBy": "user-uuid",
  "taxId": "tax-uuid",
  "tableId": "table-uuid",
  "orderItems": [
    {
      "itemId": "item-uuid-1",
      "amount": 2
    },
    {
      "itemId": "item-uuid-2",
      "amount": 1
    }
  ]
}
```

| Field      | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| discount   | number | ✅       | % giảm giá (0-100)      |
| createdBy  | string | ✅       | UUID của user tạo order |
| taxId      | string | ✅       | UUID của loại thuế      |
| tableId    | string | ✅       | UUID của bàn            |
| orderItems | array  | ✅       | Danh sách món           |

**Response:**

```json
{
  "id": "order-uuid",
  "orderCode": "ORD12345ABC",
  "totalAmount": 95000,
  "discount": 5,
  "status": "pending",
  "createdBy": { "id": "...", "name": "Staff A" },
  "tax": { "id": "...", "name": "VAT", "percent": 10 },
  "table": { "id": "...", "name": "Bàn 01" },
  "orderItems": [
    {
      "id": "...",
      "amount": 2,
      "item": { "id": "...", "name": "Cà phê sữa đá", "price": 25000 }
    }
  ],
  "payments": [],
  "createdAt": "2025-12-05T10:00:00.000Z"
}
```

---

### 7.2 Lấy tất cả Orders

```http
GET /orders
GET /orders?status=pending
Authorization: Bearer <token>
```

---

### 7.3 Lấy Order theo ID

```http
GET /orders/:id
Authorization: Bearer <token>
```

---

### 7.4 Cập nhật Order

```http
PATCH /orders/:id
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "status": "cancelled"
}
```

---

### 7.5 Xóa Order

```http
DELETE /orders/:id
Authorization: Bearer <token>
```

---

## 8. Payments

### 8.1 Tạo Payment (QR Code)

```http
POST /payments
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "method": "QR",
  "orderId": "order-uuid"
}
```

| Field   | Type   | Required | Values                     |
| ------- | ------ | -------- | -------------------------- |
| method  | string | ✅       | `"QR"`, `"cash"`, `"card"` |
| orderId | string | ✅       | UUID của order             |

**Response (method = QR):**

```json
{
  "id": "payment-uuid",
  "method": "QR",
  "amount": 95000,
  "orderCode": "ORD12345ABC",
  "qrCode": "https://res.cloudinary.com/xxx/qr-code.png"
}
```

> 💡 **Lưu ý:** `qrCode` là URL ảnh QR VietQR chuẩn EMVCo, có thể quét bằng app ngân hàng

---

### 8.2 Lấy tất cả Payments

```http
GET /payments
Authorization: Bearer <token>
```

---

### 8.3 Lấy Payment theo ID

```http
GET /payments/:id
Authorization: Bearer <token>
```

---

### 8.4 Kiểm tra trạng thái Payment (Polling)

```http
GET /payments/status/:orderCode
Authorization: Bearer <token>
```

**Response:**

```json
{
  "orderCode": "ORD12345ABC",
  "orderStatus": "paid",
  "isPaid": true,
  "payment": {
    "id": "payment-uuid",
    "method": "QR",
    "amount": 95000,
    "qrCode": "https://..."
  }
}
```

---

### 8.5 Webhook (SePay callback)

```http
POST /payments/hook
```

> 🌐 **Public API** - Không cần token (SePay gọi tự động)

**Request Body (từ SePay):**

```json
{
  "gateway": "MBBank",
  "transactionDate": "2025-12-05 10:30:00",
  "accountNumber": "0339473966",
  "subAccount": "VQRQAFMKU5854",
  "content": "KAFEIN ORD12345ABC",
  "transferType": "in",
  "transferAmount": 95000,
  "referenceCode": "FT25339123456789",
  "id": 12345678
}
```

---

### 8.6 Xóa Payment

```http
DELETE /payments/:id
Authorization: Bearer <token>
```

> ⚠️ **Lưu ý:** Xóa payment sẽ đặt lại order status về `"pending"`

---

## 9. WebSocket - Real-time Payment

### 9.1 Kết nối WebSocket

**Endpoint:** `ws://localhost:3000/payment`

**React với Socket.IO:**

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

const usePaymentSocket = (orderCode: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'pending' | 'paid' | 'failed'
  >('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    // Kết nối WebSocket
    socketRef.current = io('http://localhost:3000/payment', {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to payment socket');
      // Subscribe theo orderCode
      socket.emit('subscribe', orderCode);
    });

    // Lắng nghe thanh toán thành công
    socket.on('paymentSuccess', (data) => {
      console.log('Payment success:', data);
      setPaymentStatus('paid');
      setPaymentData(data);
    });

    // Lắng nghe thanh toán thất bại
    socket.on('paymentFailed', (data) => {
      console.log('Payment failed:', data);
      setPaymentStatus('failed');
      setPaymentData(data);
    });

    // Cleanup khi unmount
    return () => {
      socket.emit('unsubscribe', orderCode);
      socket.disconnect();
    };
  }, [orderCode]);

  return { paymentStatus, paymentData };
};
```

### 9.2 Events

| Event            | Direction       | Description                |
| ---------------- | --------------- | -------------------------- |
| `subscribe`      | Client → Server | Đăng ký theo dõi orderCode |
| `unsubscribe`    | Client → Server | Hủy theo dõi orderCode     |
| `paymentSuccess` | Server → Client | Thanh toán thành công      |
| `paymentFailed`  | Server → Client | Thanh toán thất bại        |

**Event `paymentSuccess` data:**

```json
{
  "orderCode": "ORD12345ABC",
  "status": "paid",
  "message": "Payment confirmed successfully",
  "amount": 95000,
  "transactionDate": "2025-12-05 10:30:00",
  "referenceCode": "FT25339123456789"
}
```

---

## 10. Luồng Sử Dụng Hoàn Chỉnh

### 🛒 Luồng Đặt Hàng & Thanh Toán QR

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌─────────┐            ┌─────────────┐           ┌───────────┐
│ Step 1  │            │   Step 2    │           │  Step 3   │
│ Chọn món│   ───►     │ Tạo Order   │   ───►    │ Tạo QR    │
└─────────┘            └─────────────┘           └───────────┘
                              │                         │
                              ▼                         ▼
                    POST /orders              POST /payments
                              │                         │
                              ▼                         ▼
                    {orderCode: "ORD..."}    {qrCode: "https://..."}
                                                        │
                                                        ▼
                                              ┌───────────────────┐
                                              │     Step 4        │
                                              │  Hiển thị QR +    │
                                              │  Connect Socket   │
                                              └───────────────────┘
                                                        │
    ┌───────────────────────────────────────────────────┤
    │                                                   │
    ▼                                                   ▼
┌──────────────────┐                          ┌──────────────────┐
│    Polling       │                          │    WebSocket     │
│ (backup option)  │                          │  (real-time)     │
└──────────────────┘                          └──────────────────┘
    │                                                   │
    │ GET /payments/status/:orderCode                   │ socket.on('paymentSuccess')
    │ (mỗi 3 giây)                                      │
    │                                                   │
    └───────────────────────┬───────────────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │      Step 5       │
                  │  Khách quét QR    │
                  │  & chuyển tiền    │
                  └───────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ SePay Webhook     │
                  │ POST /payments/hook│
                  └───────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │      Step 6       │
                  │ Order status =    │
                  │     "paid"        │
                  └───────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │      Step 7       │
                  │ Emit WebSocket    │
                  │ 'paymentSuccess'  │
                  └───────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │      Step 8       │
                  │ Frontend nhận     │
                  │ & hiển thị        │
                  │ "Thanh toán       │
                  │  thành công! 🎉"  │
                  └───────────────────┘
```

---

### 💻 React Code Hoàn Chỉnh

```typescript
// hooks/useOrder.ts
import { useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3000';

interface OrderItem {
  itemId: string;
  amount: number;
}

interface PaymentResult {
  id: string;
  qrCode: string;
  orderCode: string;
  amount: number;
}

export const useOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('accessToken');

  // Step 1: Tạo Order
  const createOrder = async (data: {
    discount: number;
    createdBy: string;
    taxId: string;
    tableId: string;
    orderItems: OrderItem[];
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create order');
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Tạo Payment với QR
  const createPayment = async (orderId: string): Promise<PaymentResult> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          method: 'QR',
          orderId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment');
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Polling check status (backup)
  const checkPaymentStatus = async (orderCode: string) => {
    const response = await fetch(`${API_BASE}/payments/status/${orderCode}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return await response.json();
  };

  return {
    loading,
    error,
    createOrder,
    createPayment,
    checkPaymentStatus,
  };
};
```

```tsx
// components/PaymentQRModal.tsx
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useOrder } from '../hooks/useOrder';

interface Props {
  orderCode: string;
  qrCodeUrl: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export const PaymentQRModal: React.FC<Props> = ({
  orderCode,
  qrCodeUrl,
  amount,
  onSuccess,
  onClose,
}) => {
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>(
    'pending',
  );
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { checkPaymentStatus } = useOrder();

  useEffect(() => {
    // ===== WebSocket Connection =====
    socketRef.current = io('http://localhost:3000/payment', {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
      socketRef.current?.emit('subscribe', orderCode);
    });

    socketRef.current.on('paymentSuccess', (data) => {
      console.log('✅ Payment success via WebSocket:', data);
      setStatus('paid');
      // Clear polling nếu WebSocket nhận được
      if (pollingRef.current) clearInterval(pollingRef.current);
      setTimeout(onSuccess, 2000); // Delay để hiển thị animation
    });

    socketRef.current.on('paymentFailed', (data) => {
      console.log('❌ Payment failed:', data);
      setStatus('failed');
    });

    // ===== Polling (Backup) =====
    pollingRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(orderCode);
        if (result.isPaid) {
          console.log('✅ Payment success via Polling');
          setStatus('paid');
          clearInterval(pollingRef.current!);
          setTimeout(onSuccess, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Check mỗi 3 giây

    // ===== Cleanup =====
    return () => {
      socketRef.current?.emit('unsubscribe', orderCode);
      socketRef.current?.disconnect();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderCode]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {status === 'pending' && (
          <>
            <h2>Quét mã QR để thanh toán</h2>
            <img src={qrCodeUrl} alt="QR Code" className="qr-image" />
            <p className="amount">
              Số tiền: {amount.toLocaleString('vi-VN')} VND
            </p>
            <p className="order-code">Mã đơn: {orderCode}</p>
            <p className="waiting">⏳ Đang chờ thanh toán...</p>
            <button onClick={onClose}>Hủy</button>
          </>
        )}

        {status === 'paid' && (
          <div className="success">
            <span className="icon">✅</span>
            <h2>Thanh toán thành công!</h2>
            <p>Cảm ơn quý khách</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="failed">
            <span className="icon">❌</span>
            <h2>Thanh toán thất bại</h2>
            <button onClick={onClose}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
};
```

```tsx
// pages/OrderPage.tsx
import { useState } from 'react';
import { useOrder } from '../hooks/useOrder';
import { PaymentQRModal } from '../components/PaymentQRModal';

export const OrderPage = () => {
  const { createOrder, createPayment, loading } = useOrder();
  const [showQR, setShowQR] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // Giả sử có state cho giỏ hàng
  const [cart, setCart] = useState<Array<{ itemId: string; amount: number }>>(
    [],
  );
  const userId = 'current-user-id'; // Từ auth context
  const tableId = 'selected-table-id';
  const taxId = 'default-tax-id';

  const handleCheckout = async () => {
    try {
      // Step 1: Tạo Order
      const order = await createOrder({
        discount: 0,
        createdBy: userId,
        taxId,
        tableId,
        orderItems: cart,
      });

      console.log('Order created:', order);

      // Step 2: Tạo Payment QR
      const payment = await createPayment(order.id);

      console.log('Payment created:', payment);

      // Step 3: Hiển thị QR Modal
      setPaymentInfo({
        orderCode: payment.orderCode,
        qrCodeUrl: payment.qrCode,
        amount: payment.amount,
      });
      setShowQR(true);
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handlePaymentSuccess = () => {
    setShowQR(false);
    setCart([]);
    alert('🎉 Đơn hàng đã được thanh toán thành công!');
    // Navigate to order history hoặc reset page
  };

  return (
    <div>
      <h1>Đặt hàng</h1>

      {/* Cart UI here */}

      <button onClick={handleCheckout} disabled={loading || cart.length === 0}>
        {loading ? 'Đang xử lý...' : 'Thanh toán QR'}
      </button>

      {showQR && paymentInfo && (
        <PaymentQRModal
          orderCode={paymentInfo.orderCode}
          qrCodeUrl={paymentInfo.qrCodeUrl}
          amount={paymentInfo.amount}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
```

---

## 📦 Cài đặt Dependencies cho Frontend

```bash
npm install socket.io-client
# hoặc
yarn add socket.io-client
```

---

## 🔒 Error Codes

| Status | Message        | Description                    |
| ------ | -------------- | ------------------------------ |
| 400    | Bad Request    | Dữ liệu không hợp lệ           |
| 401    | Unauthorized   | Chưa đăng nhập / Token hết hạn |
| 403    | Forbidden      | Không có quyền truy cập        |
| 404    | Not Found      | Không tìm thấy resource        |
| 406    | Not Acceptable | Webhook xử lý thất bại         |

---

## 📝 Notes

1. **Token Refresh:** Khi nhận 401, gọi `/auth/refresh` để lấy token mới
2. **WebSocket Reconnect:** Socket.IO tự động reconnect, nhưng cần re-subscribe orderCode
3. **QR Code Timeout:** Nên set timeout ~5 phút cho việc chờ thanh toán
4. **Polling Interval:** 3-5 giây là hợp lý, tránh spam server

---

_Last updated: December 5, 2025_
