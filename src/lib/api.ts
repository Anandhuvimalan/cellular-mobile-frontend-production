import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type {
  User, Category, Brand, Variant, Color, Product, GSTSlab,
  Condition, Source, Supplier, PurchaseInvoice, PurchasePayment,
  StockBatch, Shop, SubStock, StockRequest, Notification,
  StockTransfer, Customer, Sale, SaleItem, SalePayment, CompanyProfile,
  DashboardStats, LoginRequest, LoginResponse, RegisterRequest,
  IMEINumber, DeadStockBatch, StockAdjustment
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const LIST_CACHE_TTL_MS = 15000;
const listCache = new Map<string, { timestamp: number; response: AxiosResponse<unknown> }>();

const buildCacheKey = (url: string, config?: AxiosRequestConfig) => {
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${url}|${params}`;
};

const clearListCache = () => {
  listCache.clear();
};

const cachedGet = async <T>(url: string, config?: AxiosRequestConfig, ttlMs = LIST_CACHE_TTL_MS) => {
  const key = buildCacheKey(url, config);
  const cached = listCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.response as AxiosResponse<T>;
  }

  const response = await api.get<T>(url, config);
  listCache.set(key, { timestamp: Date.now(), response });
  return response;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if ((config.method || 'get').toLowerCase() !== 'get') {
      clearListCache();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to normalize paginated responses and handle token refresh
api.interceptors.response.use(
  (response) => {
    const data = response.data;

    // Flatten DRF paginated responses so callers always get arrays
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'results' in data &&
      Array.isArray((data as any).results)
    ) {
      const paginated = data as {
        results: unknown[];
        count?: number;
        next?: string | null;
        previous?: string | null;
      };

      (response as any).pagination = {
        count: paginated.count,
        next: paginated.next,
        previous: paginated.previous,
      };
      response.data = paginated.results;
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login/', data),
  register: (data: RegisterRequest) => api.post<LoginResponse>('/auth/register/', data),
  me: () => api.get<User>('/auth/me/'),
};

// Users API
export const usersAPI = {
  list: (search?: string) => cachedGet<User[]>('/users/', { params: { search } }),
  get: (id: number) => api.get<User>(`/users/${id}/`),
  create: (data: Partial<User>) => api.post<User>('/users/', data),
  update: (id: number, data: Partial<User>) => api.patch<User>(`/users/${id}/`, data),
  delete: (id: number) => api.delete(`/users/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/users/bulk_delete/', { ids }),
};

// Categories API
export const categoriesAPI = {
  list: (search?: string) => cachedGet<Category[]>('/categories/', { params: { search } }),
  get: (id: number) => api.get<Category>(`/categories/${id}/`),
  create: (data: Partial<Category>) => api.post<Category>('/categories/', data),
  update: (id: number, data: Partial<Category>) => api.patch<Category>(`/categories/${id}/`, data),
  delete: (id: number) => api.delete(`/categories/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/categories/bulk_delete/', { ids }),
};

// Brands API
export const brandsAPI = {
  list: (search?: string) => cachedGet<Brand[]>('/brands/', { params: { search } }),
  get: (id: number) => api.get<Brand>(`/brands/${id}/`),
  create: (data: Partial<Brand>) => api.post<Brand>('/brands/', data),
  update: (id: number, data: Partial<Brand>) => api.patch<Brand>(`/brands/${id}/`, data),
  delete: (id: number) => api.delete(`/brands/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/brands/bulk_delete/', { ids }),
};

// Variants API
export const variantsAPI = {
  list: (search?: string) => cachedGet<Variant[]>('/variants/', { params: { search } }),
  get: (id: number) => api.get<Variant>(`/variants/${id}/`),
  create: (data: Partial<Variant>) => api.post<Variant>('/variants/', data),
  update: (id: number, data: Partial<Variant>) => api.patch<Variant>(`/variants/${id}/`, data),
  delete: (id: number) => api.delete(`/variants/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/variants/bulk_delete/', { ids }),
};

// Colors API
export const colorsAPI = {
  list: (search?: string) => cachedGet<Color[]>('/colors/', { params: { search } }),
  get: (id: number) => api.get<Color>(`/colors/${id}/`),
  create: (data: Partial<Color>) => api.post<Color>('/colors/', data),
  update: (id: number, data: Partial<Color>) => api.patch<Color>(`/colors/${id}/`, data),
  delete: (id: number) => api.delete(`/colors/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/colors/bulk_delete/', { ids }),
};

// Conditions API
export const conditionsAPI = {
  list: (search?: string) => cachedGet<Condition[]>('/conditions/', { params: { search } }),
  get: (id: number) => api.get<Condition>(`/conditions/${id}/`),
  create: (data: Partial<Condition>) => api.post<Condition>('/conditions/', data),
  update: (id: number, data: Partial<Condition>) => api.patch<Condition>(`/conditions/${id}/`, data),
  delete: (id: number) => api.delete(`/conditions/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/conditions/bulk_delete/', { ids }),
};

// Sources API
export const sourcesAPI = {
  list: (search?: string) => cachedGet<Source[]>('/sources/', { params: { search } }),
  get: (id: number) => api.get<Source>(`/sources/${id}/`),
  create: (data: Partial<Source>) => api.post<Source>('/sources/', data),
  update: (id: number, data: Partial<Source>) => api.patch<Source>(`/sources/${id}/`, data),
  delete: (id: number) => api.delete(`/sources/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/sources/bulk_delete/', { ids }),
};

// Suppliers API
export const suppliersAPI = {
  list: (search?: string) => cachedGet<Supplier[]>('/suppliers/', { params: { search } }),
  get: (id: number) => api.get<Supplier>(`/suppliers/${id}/`),
  create: (data: Partial<Supplier>) => api.post<Supplier>('/suppliers/', data),
  update: (id: number, data: Partial<Supplier>) => api.patch<Supplier>(`/suppliers/${id}/`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/suppliers/bulk_delete/', { ids }),
};

// Purchase Invoices API
export const purchaseInvoicesAPI = {
  list: (search?: string) => cachedGet<PurchaseInvoice[]>('/purchase-invoices/', { params: { search } }),
  get: (id: number) => api.get<PurchaseInvoice>(`/purchase-invoices/${id}/`),
  create: (data: Partial<PurchaseInvoice>) => api.post<PurchaseInvoice>('/purchase-invoices/', data),
  update: (id: number, data: Partial<PurchaseInvoice>) => api.patch<PurchaseInvoice>(`/purchase-invoices/${id}/`, data),
  delete: (id: number) => api.delete(`/purchase-invoices/${id}/`),
};

// Purchase Payments API
export const purchasePaymentsAPI = {
  list: (search?: string) => cachedGet<PurchasePayment[]>('/purchase-payments/', { params: { search } }),
  get: (id: number) => api.get<PurchasePayment>(`/purchase-payments/${id}/`),
  create: (data: Partial<PurchasePayment>) => api.post<PurchasePayment>('/purchase-payments/', data),
  delete: (id: number) => api.delete(`/purchase-payments/${id}/`),
};

// Products API
export const productsAPI = {
  list: (search?: string) => cachedGet<Product[]>('/products/', { params: { search } }),
  get: (id: number) => api.get<Product>(`/products/${id}/`, {
    params: { _: Date.now() }  // Cache-buster
  }),
  create: (data: Partial<Product>) => api.post<Product>('/products/', data),
  update: (id: number, data: Partial<Product>) => api.patch<Product>(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/products/bulk_delete/', { ids }),
  bulkUpload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// GST Slabs API
export const gstSlabsAPI = {
  list: () => cachedGet<GSTSlab[]>('/gst-slabs/'),
  get: (id: number) => api.get<GSTSlab>(`/gst-slabs/${id}/`),
  create: (data: Partial<GSTSlab>) => api.post<GSTSlab>('/gst-slabs/', data),
};

// Stock Batches API
export const stockBatchesAPI = {
  list: (search?: string) => cachedGet<StockBatch[]>('/stock-batches/', { params: { search } }),
  get: (id: number) => api.get<StockBatch>(`/stock-batches/${id}/`),
  create: (data: any) => api.post<StockBatch>('/stock-batches/', data),
  update: (id: number, data: Partial<StockBatch>) => api.patch<StockBatch>(`/stock-batches/${id}/`, data),
  delete: (id: number) => api.delete(`/stock-batches/${id}/`),
  lowStock: () => api.get<StockBatch[]>('/stock-batches/low_stock/'),
  deadStock: (params?: { days?: number; hours?: number; minutes?: number; shop?: number }) =>
    api.get<DeadStockBatch[]>('/stock-batches/dead_stock/', { params }),
  markDead: (id: number) => api.post(`/stock-batches/${id}/mark_dead/`),
  setClearance: (id: number, data: { selling_price: string | number }) =>
    api.post(`/stock-batches/${id}/set_clearance/`, data),
  writeOff: (id: number, data: { quantity?: number; shop?: number; notes?: string; imei_list?: string[] }) =>
    api.post(`/stock-batches/${id}/write_off/`, data),
  bulkDelete: (ids: number[]) => api.post('/stock-batches/bulk_delete/', { ids }),
  bulkUpload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/stock-batches/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getIMEINumbers: (id: number, params?: { shop?: number; location?: 'main' | 'shop' }) =>
    api.get<IMEINumber[]>(`/stock-batches/${id}/imei_numbers/`, { params }),
};

// Shops API
export const shopsAPI = {
  list: (search?: string) => cachedGet<Shop[]>('/shops/', { params: { search } }),
  get: (id: number) => api.get<Shop>(`/shops/${id}/`),
  create: (data: Partial<Shop>) => api.post<Shop>('/shops/', data),
  update: (id: number, data: Partial<Shop>) => api.patch<Shop>(`/shops/${id}/`, data),
  delete: (id: number) => api.delete(`/shops/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/shops/bulk_delete/', { ids }),
};

// Sub Stocks API
export const subStocksAPI = {
  list: () => cachedGet<SubStock[]>('/sub-stocks/'),
  get: (id: number) => api.get<SubStock>(`/sub-stocks/${id}/`),
  delete: (id: number) => api.delete(`/sub-stocks/${id}/`),
  lowStock: () => api.get<SubStock[]>('/sub-stocks/low_stock/'),
  bulkDelete: (ids: number[]) => api.post('/sub-stocks/bulk_delete/', { ids }),
};

// Stock Requests API
export const stockRequestsAPI = {
  list: () => cachedGet<StockRequest[]>('/stock-requests/'),
  get: (id: number) => api.get<StockRequest>(`/stock-requests/${id}/`),
  create: (data: Partial<StockRequest>) => api.post<StockRequest>('/stock-requests/', data),
  approve: (id: number, data: { approved: boolean; rejection_reason?: string }) =>
    api.post(`/stock-requests/${id}/approve/`, data),
  delete: (id: number) => api.delete(`/stock-requests/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/stock-requests/bulk_delete/', { ids }),
};

// Notifications API
export const notificationsAPI = {
  list: () => cachedGet<Notification[]>('/notifications/'),
  markRead: (id: number) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread_count/'),
};

// Stock Transfers API
export const stockTransfersAPI = {
  list: () => cachedGet<StockTransfer[]>('/stock-transfers/'),
  get: (id: number) => api.get<StockTransfer>(`/stock-transfers/${id}/`),
};

// Stock Adjustments API
export const stockAdjustmentsAPI = {
  list: (search?: string) => cachedGet<StockAdjustment[]>('/stock-adjustments/', { params: { search } }),
  get: (id: number) => api.get<StockAdjustment>(`/stock-adjustments/${id}/`),
  create: (data: Partial<StockAdjustment>) => api.post<StockAdjustment>('/stock-adjustments/', data),
  delete: (id: number) => api.delete(`/stock-adjustments/${id}/`),
};

// Customers API
export const customersAPI = {
  list: (search?: string) => cachedGet<Customer[]>('/customers/', { params: { search } }),
  get: (id: number) => api.get<Customer>(`/customers/${id}/`),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers/', data),
  update: (id: number, data: Partial<Customer>) => api.patch<Customer>(`/customers/${id}/`, data),
  delete: (id: number) => api.delete(`/customers/${id}/`),
  bulkDelete: (ids: number[]) => api.post('/customers/bulk_delete/', { ids }),
  searchByPhone: (phone: string) => api.get<Customer>('/customers/search_by_phone/', { params: { phone } }),
};

// Sales API
export const salesAPI = {
  list: (search?: string) => cachedGet<Sale[]>('/sales/', { params: { search } }),
  get: (id: number) => api.get<Sale>(`/sales/${id}/`),
  create: (data: {
    shop: number;
    customer_name: string;
    customer_phone?: string;
    customer?: number;
    state_code?: string;
    items: Array<{
      stock_batch: number;
      quantity: number;
      imei?: string;
    }>;
    payment_method: string;
    payment_reference?: string;
    discount?: string;
    reverse_charge?: boolean;
    vehicle_no?: string;
    place_of_supply?: string;
    consignee_name?: string;
    consignee_address?: string;
    notes?: string;
  }) => api.post<Sale>('/sales/', data),
  invoice: (id: number) => api.get<Sale>(`/sales/${id}/invoice/`),
  todaySales: () => api.get<{
    date: string;
    sales_count: number;
    total_amount: string;
    total_profit: string;
    sales: Sale[];
  }>('/sales/today_sales/'),
  salesReport: (params: {
    start_date?: string;
    end_date?: string;
    shop?: number;
  }) => api.get<{
    start_date: string;
    end_date: string;
    total_sales: number;
    total_revenue: string;
    total_profit: string;
    daily_breakdown: Array<{
      date: string;
      sales_count: number;
      revenue: string;
      profit: string;
    }>;
    top_products: Array<{
      product_id: number;
      product_name: string;
      quantity_sold: number;
      revenue: string;
    }>;
  }>('/sales/sales_report/', { params }),
};

export const companyProfileAPI = {
  get: () => api.get<CompanyProfile>('/company-profile/'),
  update: (data: FormData) => api.patch<CompanyProfile>('/company-profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Dashboard API
export const dashboardAPI = {
  stats: () => api.get<DashboardStats>('/dashboard/stats/'),
  analytics: (params?: { period?: string; shop_id?: string; start_date?: string; end_date?: string }) =>
    api.get('/dashboard/analytics/', { params }),
  advancedAnalytics: (params?: {
    period?: string;
    shop_id?: number | string;
    category_id?: number | string;
    brand_id?: number | string;
    condition?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get('/dashboard/advanced-analytics/', { params }),
  charts: (params?: { period?: string; shop_id?: string; start_date?: string; end_date?: string }) =>
    api.get<{ charts: Record<string, string>; period: string; start_date: string; end_date: string }>('/dashboard/charts/', { params }),
};

const safePrefetch = (promise: Promise<unknown>) => promise.catch(() => null);

export const warmDashboardLists = async (options: { role?: User['role']; hasShop?: boolean } = {}) => {
  const { role, hasShop } = options;
  const tasks: Array<Promise<unknown>> = [];

  const allow = (roles?: User['role'][], requiresShop = false) => {
    if (!role) return true;
    if (roles && !roles.includes(role)) return false;
    if (requiresShop && !hasShop) return false;
    return true;
  };

  const queue = (condition: boolean, promise: Promise<unknown>) => {
    if (!condition) return;
    tasks.push(safePrefetch(promise));
  };

  queue(allow(), cachedGet('/products/'));
  queue(allow(), cachedGet('/categories/'));
  queue(allow(), cachedGet('/brands/'));
  queue(allow(), cachedGet('/variants/'));
  queue(allow(), cachedGet('/colors/'));
  queue(allow(), cachedGet('/conditions/'));
  queue(allow(), cachedGet('/sources/'));
  queue(allow(['super_admin']), cachedGet('/shops/'));
  queue(allow(['super_admin', 'main_inventory_manager']), cachedGet('/stock-batches/'));
  queue(allow(['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager'], true), cachedGet('/sub-stocks/'));
  queue(allow(['super_admin', 'admin', 'main_inventory_manager', 'sub_stock_manager']), cachedGet('/customers/'));

  if (tasks.length === 0) return;
  await Promise.allSettled(tasks);
};

export default api;
