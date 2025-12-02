# ☕ Cafe Management App

A modern desktop application for managing cafe operations, built with React, TypeScript, Tauri, and integrated with a NestJS backend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🛒 Point of Sale (POS)

- Real-time product selection with category filtering
- Shopping cart management with quantity controls
- Stock validation before adding items
- Table selection for dine-in orders
- Tax calculation with configurable tax rates
- Percentage-based discount system
- Multiple payment methods:
  - 💵 Cash
  - 💳 Card
  - 🔲 QR Code (with auto-generated QR display)

### 📦 Menu Management

- Full CRUD operations for menu items
- Category management
- Stock tracking (amountLeft)
- Item status management:
  - ✅ Available
  - ⚠️ Out of Stock
  - 🚫 Discontinued
- Search and filter by category
- Image support with fallback

### 🪑 Table Management

- Table CRUD operations
- Seat count configuration
- Real-time status tracking:
  - 🟢 Available
  - 🔴 Occupied
  - 🟡 Reserved
- Quick status change dropdown
- Statistics dashboard

### 📜 Order History

- View all orders with status filters:
  - All orders
  - Pending
  - Paid
  - Cancelled
- Order detail view with:
  - Order items breakdown
  - Payment information
  - QR code display for QR payments
- Order cancellation for pending orders
- Search by order code or table name
- Revenue statistics

### 👥 User Management (Admin Only)

- User CRUD operations
- Role-based access control (Admin/Staff)
- Password validation:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
- Email format validation
- User status management (Active/Inactive)
- Optional password update on edit

### 📊 Revenue Dashboard

- KPI metrics:
  - Total revenue
  - Total orders
  - Average order value
  - Total products sold
- Time-based filtering:
  - Daily view (last 7 days)
  - Monthly view (last 6 months)
- Interactive charts:
  - Bar chart for sales trends
  - Pie chart for product distribution
- Top 3 best-selling products

## 🛠 Tech Stack

### Frontend

- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Vite 7.0.4** - Build tool
- **Tauri 2.x** - Desktop application framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend Integration

- **NestJS** REST API
- **PostgreSQL** database
- **JWT** authentication
- **TypeORM** ORM

## 📋 Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn**
- **Rust** (for Tauri)
- **Git**

### Installing Rust (if not installed)

```bash
# Windows
https://rustup.rs/

# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 📥 Installation

1. **Clone the repository**

```bash
git clone https://github.com/ChauTungDuong/cafe-management-frontend-tauri-app.git
cd cafe-management-frontend-tauri-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Install Tauri CLI**

```bash
npm install --save-dev @tauri-apps/cli
```

## ⚙️ Configuration

1. **Create environment file**

Create a `.env` file in the root directory:

```env
VITE_BACKEND_DOMAIN=https://cafe-management-app-backend.onrender.com
```

Or for local development:

```env
VITE_BACKEND_DOMAIN=http://localhost:3000
```

2. **Backend Configuration**

The application connects to a NestJS backend. Make sure the backend is running and accessible at the URL specified in `.env`.

**Backend Features:**

- Authentication (JWT)
- User management
- Category management
- Item management
- Table management
- Tax management
- Order management
- Payment management with QR code generation

## 🚀 Running the Application

### Development Mode

```bash
npm run tauri dev
```

This will:

1. Start Vite development server
2. Launch Tauri desktop application
3. Enable hot-reload for frontend changes

### Web-only Development (without Tauri)

```bash
npm run dev
```

Access at `http://localhost:5173`

## 📦 Building for Production

### Build the application

```bash
npm run tauri build
```

This will create platform-specific installers in `src-tauri/target/release/bundle/`:

- **Windows**: `.msi`, `.exe`
- **macOS**: `.dmg`, `.app`
- **Linux**: `.deb`, `.AppImage`

## 📁 Project Structure

```
cafe_manage_app/
├── src/
│   ├── components/           # React components
│   │   ├── Login.tsx        # Authentication
│   │   ├── SalesPOS.tsx     # Point of Sale
│   │   ├── MenuManagement.tsx
│   │   ├── TableManagement.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── UserManagement.tsx
│   │   ├── RevenueDashboard.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   └── api.ts           # API client with Axios
│   ├── types/
│   │   └── api.ts           # TypeScript interfaces
│   ├── styles/
│   │   └── globals.css      # Global styles
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/               # Tauri configuration
│   ├── src/
│   │   └── main.rs          # Rust entry point
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── public/                  # Static assets
├── .env                     # Environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🔌 API Integration

### API Client (`src/lib/api.ts`)

The application uses Axios with interceptors for:

- Automatic token attachment
- Token refresh on 401 errors
- Request/response logging
- Error handling

### Available API Modules

```typescript
import {
  authApi,
  usersApi,
  categoriesApi,
  itemsApi,
  tablesApi,
  taxesApi,
  ordersApi,
  paymentsApi,
} from "./lib/api";
```

### Authentication Flow

1. Login with credentials → receive access_token & refresh_token
2. Tokens stored in Tauri Store (secure storage)
3. Access token attached to all requests via interceptor
4. Auto-refresh on 401 (token expired)
5. Logout → clear tokens & redirect to login

### API Endpoints

| Module     | Endpoints                                                        | Description        |
| ---------- | ---------------------------------------------------------------- | ------------------ |
| Auth       | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` | Authentication     |
| Users      | `/users`                                                         | User CRUD          |
| Categories | `/categories`                                                    | Category CRUD      |
| Items      | `/items`                                                         | Menu item CRUD     |
| Tables     | `/tables`                                                        | Table CRUD         |
| Taxes      | `/taxes`                                                         | Tax CRUD           |
| Orders     | `/orders`, `/orders/:id/cancel`                                  | Order management   |
| Payments   | `/payments`                                                      | Payment processing |

## 🖼️ Screenshots

### Login Screen

Authentication with role-based access control

### POS System

Real-time order creation with QR payment support

### Menu Management

Comprehensive item and category management

### Order History

Complete order tracking with payment details

### Revenue Dashboard

Interactive charts and KPI metrics

## 🔒 Security Features

- JWT-based authentication
- Secure token storage (Tauri Store)
- Password validation with strong requirements
- Role-based access control
- CORS configuration
- Input validation

## 🐛 Known Issues & Limitations

- Backend cold start: First API call may take 30-50s
- Requires active internet connection for API calls
- QR code payment requires backend support

## 📝 Development Notes

### Adding New Components

1. Create component in `src/components/`
2. Define types in `src/types/api.ts`
3. Add API calls in `src/lib/api.ts`
4. Import and use in `App.tsx`

### Styling Guidelines

- Use Tailwind utility classes
- Follow existing color scheme (orange/amber palette)
- Use shadcn/ui components for consistency
- Maintain responsive design

### State Management

- React hooks for local state
- No global state management (keep it simple)
- API state managed per component

## 👥 Authors

- **ChauTungDuong** - [GitHub Profile](https://github.com/ChauTungDuong)

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop application framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Recharts](https://recharts.org/) - Chart library
- [Lucide](https://lucide.dev/) - Icon library
- Backend API at [Render.com](https://render.com/)

## 📞 Support

For support, email tungduong.forwork@gmail.com or create an issue in the repository.

---
