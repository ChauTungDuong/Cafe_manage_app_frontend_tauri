import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, RefreshCw, Calendar } from 'lucide-react';
import { ordersApi } from '../lib/api';
import { Order } from '../types/api';

interface DailySales {
  day: string;
  sales: number;
  count: number;
}

interface ProductSales {
  name: string;
  value: number;
  revenue: number;
  color: string;
}

const COLORS = ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'];

export function RevenueDashboard() {
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly'>('daily');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load paid orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ordersApi.list({ status: 'paid' });
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Calculate average order value
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Get date range for filtering
  const now = new Date();
  const getDateKey = (date: Date, type: 'daily' | 'monthly') => {
    if (type === 'daily') {
      // Get day of week: T2, T3, T4...
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return days[date.getDay()];
    } else {
      // Get month: T1, T2, T3...
      return `T${date.getMonth() + 1}`;
    }
  };

  // Calculate sales data based on time range
  const calculateSalesData = (): DailySales[] => {
    const salesMap = new Map<string, { sales: number; count: number }>();

    if (timeRange === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = getDateKey(date, 'daily');
        salesMap.set(key, { sales: 0, count: 0 });
      }

      // Aggregate orders from last 7 days
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          const key = getDateKey(orderDate, 'daily');
          const current = salesMap.get(key) || { sales: 0, count: 0 };
          salesMap.set(key, {
            sales: current.sales + order.totalAmount,
            count: current.count + 1
          });
        }
      });
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const key = getDateKey(date, 'monthly');
        salesMap.set(key, { sales: 0, count: 0 });
      }

      // Aggregate orders from last 6 months
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

        if (diffMonths <= 6) {
          const key = getDateKey(orderDate, 'monthly');
          const current = salesMap.get(key) || { sales: 0, count: 0 };
          salesMap.set(key, {
            sales: current.sales + order.totalAmount,
            count: current.count + 1
          });
        }
      });
    }

    return Array.from(salesMap.entries()).map(([day, data]) => ({
      day,
      sales: data.sales,
      count: data.count
    }));
  };

  // Calculate product sales
  const calculateProductSales = (): ProductSales[] => {
    const productMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach(order => {
      order.orderItems?.forEach(item => {
        const name = item.item.name;
        const current = productMap.get(name) || { count: 0, revenue: 0 };
        productMap.set(name, {
          count: current.count + item.amount,
          revenue: current.revenue + (item.item.price * item.amount)
        });
      });
    });

    // Sort by count and take top 8
    const sortedProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, data], index) => ({
        name,
        value: data.count,
        revenue: data.revenue,
        color: COLORS[index]
      }));

    return sortedProducts;
  };

  // Get top 3 products
  const getTopProducts = (): ProductSales[] => {
    return calculateProductSales().slice(0, 3);
  };

  const chartData = calculateSalesData();
  const productSalesData = calculateProductSales();
  const topProducts = getTopProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
        <Button
          onClick={loadOrders}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-amber-900 mb-1">Báo cáo doanh thu</h2>
          <p className="text-amber-700/70">Tổng quan hiệu suất kinh doanh</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setTimeRange('daily')}
            className={`h-11 px-6 rounded-xl transition-all ${
              timeRange === 'daily'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                : 'bg-white text-amber-900 border-2 border-orange-200'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Theo ngày
          </Button>
          <Button
            onClick={() => setTimeRange('monthly')}
            className={`h-11 px-6 rounded-xl transition-all ${
              timeRange === 'monthly'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                : 'bg-white text-amber-900 border-2 border-orange-200'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Theo tháng
          </Button>
          <Button
            onClick={loadOrders}
            className="h-11 px-6 rounded-xl bg-white text-amber-900 border-2 border-orange-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Tổng doanh thu</p>
              <p className="text-orange-600 mb-1">
                {totalRevenue.toLocaleString('vi-VN')}đ
              </p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Đã thanh toán</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Tổng đơn hàng</p>
              <p className="text-orange-600 mb-1">{orders.length}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Hoàn thành</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Giá trị TB/đơn</p>
              <p className="text-orange-600 mb-1">
                {avgOrderValue.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
              </p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Trung bình</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-orange-100 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700/70 mb-1">Sản phẩm đã bán</p>
              <p className="text-orange-600 mb-1">
                {productSalesData.reduce((sum, p) => sum + p.value, 0)}
              </p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Tổng số lượng</span>
              </div>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              <ShoppingBag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100">
          <div className="mb-4">
            <h3 className="text-amber-900 mb-1">
              {timeRange === 'daily' ? 'Doanh thu theo ngày' : 'Doanh thu theo tháng'}
            </h3>
            <p className="text-amber-700/70">
              {timeRange === 'daily' ? '7 ngày gần nhất' : '6 tháng gần nhất'}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
              <XAxis dataKey="day" stroke="#92400e" />
              <YAxis stroke="#92400e" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #fed7aa',
                  borderRadius: '12px'
                }}
                formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`}
              />
              <Bar dataKey="sales" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Distribution */}
        <Card className="p-6 rounded-2xl border-2 border-orange-100">
          <div className="mb-4">
            <h3 className="text-amber-900 mb-1">Sản phẩm bán chạy</h3>
            <p className="text-amber-700/70">Phân bố theo sản phẩm</p>
          </div>
          {productSalesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productSalesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value} sản phẩm`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-amber-700/70">
              Chưa có dữ liệu sản phẩm
            </div>
          )}
        </Card>
      </div>

      {/* Top Products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topProducts.length > 0 ? (
          topProducts.map((product, index) => (
            <Card key={index} className="p-6 rounded-2xl border-2 border-orange-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  index === 0 ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                  index === 1 ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                  'bg-gradient-to-br from-orange-300 to-amber-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-amber-900">{product.name}</h4>
                  <p className="text-amber-700/70">
                    {index === 0 ? 'Bán chạy nhất' : index === 1 ? 'Phổ biến' : 'Top 3'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-amber-900">
                  <span>Đã bán:</span>
                  <span>{product.value} sản phẩm</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Doanh thu:</span>
                  <span>{product.revenue.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 rounded-2xl border-2 border-orange-100 col-span-3">
            <p className="text-amber-700/70 text-center">Chưa có dữ liệu sản phẩm bán chạy</p>
          </Card>
        )}
      </div>
    </div>
  );
}
