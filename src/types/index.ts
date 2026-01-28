export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'main_inventory_manager' | 'sub_stock_manager';
  phone?: string;
  shop?: number;
  shop_name?: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Color {
  id: number;
  name: string;
  hex_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Condition {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchasePayment {
  id: number;
  purchase_invoice: number;
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer';
  amount: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  invoice_number?: string;
  supplier_name?: string;
}

export interface PurchaseInvoice {
  id: number;
  supplier?: number | null;
  supplier_name?: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: 'paid' | 'partial' | 'pending';
  notes?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  payments?: PurchasePayment[];
}

export interface Product {
  id: number;
  name: string;
  hsn_code: string;
  is_imei_tracked: boolean;
  category?: number;
  brand?: number;
  variant?: number;
  color?: number;
  category_name?: string;
  brand_name?: string;
  variant_name?: string;
  color_name?: string;
  description?: string;
  total_stock?: number;
  stock_by_condition?: Array<{
    condition: string;
    quantity: number;
    main_stock: number;
    shop_stock: number;
    shops: Array<{
      shop_id: number;
      shop_name: string;
      quantity: number;
    }>;
    avg_price: string;
  }>;
  primary_stock?: number;
  price_range?: {
    single_price?: number;
    min?: number;
    max?: number;
  };
  created_at: string;
  updated_at: string;
  _splitPrice?: number;
  _splitCondition?: string;
  _splitStock?: number;
}

export interface GSTSlab {
  id: number;
  rate: string;
  cgst: string;
  sgst: string;
  igst: string;
  effective_from: string;
  is_active: boolean;
  created_at: string;
}

export interface StockBatch {
  id: number;
  batch_number: string;
  product: number;
  product_name?: string;
  product_is_imei_tracked?: boolean;
  product_brand_name?: string;
  product_variant_name?: string;
  product_color_name?: string;
  product_category_name?: string;
  gst_slab: number;
  gst_rate?: string;
  purchased_quantity: number;
  total_purchase_amount: string;
  unit_purchase_price: string;
  selling_price: string;
  available_quantity: number;
  condition: string;
  condition_display?: string;
  source: string;
  source_display?: string;
  is_interstate: boolean;
  purchase_date: string;
  supplier_name?: string;
  invoice_number?: string;
  purchase_invoice?: number;
  purchase_invoice_number?: string;
  purchase_invoice_status?: string;
  purchase_invoice_balance?: string;
  initial_payment_amount?: number | string;
  initial_payment_method?: string;
  initial_payment_reference?: string;
  notes?: string;
  last_sold_at?: string;
  stock_status?: 'active' | 'dead' | 'clearance' | 'disposed';
  imei_numbers?: IMEINumber[];
  profit_per_unit?: number;
  profit_margin?: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DeadStockBatch {
  id: number;
  batch_number: string;
  product: number;
  product_name?: string;
  product_is_imei_tracked?: boolean;
  condition: string;
  condition_display?: string;
  selling_price: string;
  purchase_date: string;
  last_sold_at?: string;
  stock_status?: 'active' | 'dead' | 'clearance' | 'disposed';
  remaining_stock: number;
  stock_value: number;
  days_since_last_sale: number;
}

export interface StockAdjustment {
  id: number;
  stock_batch: number;
  stock_batch_number?: string;
  product_name?: string;
  shop?: number | null;
  shop_name?: string;
  adjustment_type: 'write_off' | 'clearance' | 'return' | 'damage' | 'manual';
  quantity: number;
  notes?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
}

export interface IMEINumber {
  id: number;
  imei: string;
  stock_batch: number;
  status: 'in_main_stock' | 'in_sub_stock' | 'sold' | 'written_off';
  sub_stock?: number;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: number;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: number;
  logo?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubStock {
  id: number;
  shop: number;
  shop_name?: string;
  stock_batch: number;
  product_name?: string;
  batch_number?: string;
  quantity: number;
  reorder_level: number;
  selling_price?: string;
  is_low_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockRequest {
  id: number;
  shop: number;
  shop_name?: string;
  stock_batch: number;
  product_name?: string;
  batch_number?: string;
  requested_quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: number;
  requested_by_name?: string;
  requested_at: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
}

export interface Notification {
  id: number;
  notification_type: 'low_stock' | 'stock_request' | 'stock_approved' | 'stock_rejected';
  user: number;
  title: string;
  message: string;
  shop?: number;
  shop_name?: string;
  stock_request?: number;
  sub_stock?: number;
  is_read: boolean;
  created_at: string;
}

export interface StockTransfer {
  id: number;
  stock_batch: number;
  shop: number;
  shop_name?: string;
  product_name?: string;
  batch_number?: string;
  quantity: number;
  transferred_by: number;
  transferred_by_name?: string;
  transferred_at: string;
  stock_request?: number;
  notes?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  customer_type: 'individual' | 'business';
  created_at: string;
  updated_at: string;
  shops?: Array<{
    id: number;
    name: string;
    code: string;
  }>;
}

export interface SalePayment {
  id: number;
  sale: number;
  payment_method: 'cash' | 'card' | 'upi' | 'net_banking' | 'cheque';
  amount: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export interface SaleItem {
  id: number;
  sale: number;
  stock_batch: number;
  product: number;
  product_name?: string;
  batch_number?: string;
  condition?: string;
  quantity: number;
  unit_price: string;
  unit_cost: string;
  gst_rate: string;
  gst_amount: string;
  total_amount: string;
  profit_per_unit: string;
  total_profit: string;
  imei?: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  shop: number;
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  shop_email?: string;
  customer?: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_email?: string | null;
  customer_gstin?: string | null;
  state_code?: string;
  subtotal: string;
  total_gst: string;
  discount: string;
  transport_charge?: string;
  loading_charge?: string;
  grand_total: string;
  payment_method: 'cash' | 'card' | 'upi' | 'net_banking' | 'cheque';
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_reference?: string;
  reverse_charge?: boolean;
  vehicle_no?: string;
  place_of_supply?: string;
  consignee_name?: string;
  consignee_address?: string;
  sold_by: number;
  sold_by_name?: string;
  sale_date: string;
  notes?: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface DashboardStats {
  total_products: number;
  total_stock_value: string;
  total_batches: number;
  pending_requests: number;
  low_stock_items: number;
  total_shops: number;
  today_sales_count: number;
  today_revenue: number;
  today_profit: number;
  week_sales_count: number;
  week_revenue: number;
  week_profit: number;
  month_sales_count: number;
  month_revenue: number;
  month_profit: number;
  total_customers: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  shop?: number;
}
