/**
 * Shared Type Definitions for UstaadGee Stationers
 */

export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // Hashed in database
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  active: boolean;
}

export type UnitType = 'piece' | 'box' | 'dozen' | 'packet' | 'ream';

export interface ProductVariant {
  name: string; // e.g. "Blue", "Black", "Pack of 10"
  stock: number;
  price?: number; // Override base price if applicable
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  brandId?: string;
  description: string;
  images: string[];
  costPrice: number;
  salePrice: number;
  discountPrice?: number; // active discount price if set
  stockQuantity: number;
  minStockAlert: number;
  unitType: UnitType;
  variants: ProductVariant[];
  active: boolean;
  featured: boolean;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'cod' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'card';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string; // "guest" or user ID
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingArea: string;
  deliveryCharges: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  estimatedDeliveryTime?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
  variantName?: string;
}

export interface PaymentLog {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  amount: number;
  status: string; // 'pending' | 'completed' | 'failed'
  payload?: string; // debug info
  createdAt: string;
}

export interface Coupon {
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  minOrderValue: number;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  active: boolean;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  link?: string;
  position: 'home_hero' | 'home_promo';
  active: boolean;
}

export interface DeliveryArea {
  id: string;
  city: string;
  areaName: string;
  charges: number;
  estDays: string;
  active: boolean;
}

export interface Address {
  id: string;
  userId: string;
  title: string; // "Home", "Office"
  addressLine: string;
  city: string;
  area: string;
  phone: string;
  isDefault: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export interface WishlistItem {
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  status: 'pending' | 'approved';
  createdAt: string;
}

export interface PaymentGatewayConfig {
  active: boolean;
  merchantId?: string;
  storeId?: string;
  secureSalt?: string;
  hashKey?: string;
  sandboxMode: boolean;
}

export interface BankConfig {
  active: boolean;
  bankName: string;
  accountTitle: string;
  iban: string;
  accountNumber: string;
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  whatsApp: string;
  address: string;
  city: string;
  currency: string;
  freeDeliveryMin: number;
  codActive: boolean;
  cardActive: boolean;
  easypaisa: PaymentGatewayConfig;
  jazzcash: PaymentGatewayConfig;
  bankTransfer: BankConfig;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  details: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number; // Positive for restock, negative for sale/loss
  type: 'purchase' | 'sale_deduction' | 'sale_restore' | 'adjustment';
  referenceId?: string; // OrderId or Purchase Invoice No
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  monthlyOrders: number;
  lowStockCount: number;
  pendingPaymentsCount: number;
  revenueByPaymentMethod: { method: string; total: number }[];
  salesTrend: { date: string; amount: number; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  categorySales: { name: string; value: number }[];
}
