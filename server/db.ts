import fs from 'fs/promises';
import path from 'path';
import { 
  User, Category, Brand, Product, Order, OrderItem, 
  PaymentLog, Coupon, Banner, DeliveryArea, ContactMessage, 
  WishlistItem, Review, ShopSettings, AuditLog, InventoryMovement,
  DashboardStats, ProductVariant, OrderStatus, PaymentStatus
} from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');

// In-memory cache
let database: {
  users: User[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  paymentLogs: PaymentLog[];
  coupons: Coupon[];
  banners: Banner[];
  deliveryAreas: DeliveryArea[];
  messages: ContactMessage[];
  wishlist: WishlistItem[];
  reviews: Review[];
  settings: ShopSettings;
  auditLogs: AuditLog[];
  inventoryMovements: InventoryMovement[];
} = {
  users: [],
  categories: [],
  brands: [],
  products: [],
  orders: [],
  orderItems: [],
  paymentLogs: [],
  coupons: [],
  banners: [],
  deliveryAreas: [],
  messages: [],
  wishlist: [],
  reviews: [],
  settings: {} as ShopSettings,
  auditLogs: [],
  inventoryMovements: []
};

// Seed Constants
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'School Stationery', slug: 'school-stationery', description: 'Essential items for school students', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-2', name: 'Office Stationery', slug: 'office-stationery', description: 'Professional supplies for corporate spaces', image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-3', name: 'Pens & Writing', slug: 'pens-writing', description: 'Ballpoints, fountain pens, markers, and highlighters', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-4', name: 'Notebooks & Registers', slug: 'notebooks-registers', description: 'Registers, journals, and spirals', image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-5', name: 'Art Supplies', slug: 'art-supplies', description: 'Colors, brushes, canvases, and sketchbooks', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-6', name: 'Computer Accessories', slug: 'computer-accessories', description: 'Calculators, USBs, and key peripherals', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-7', name: 'Printer & Photocopy Supplies', slug: 'printer-photocopy-supplies', description: 'Ink cartridges, toners, and paper reams', image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-8', name: 'Printing Services', slug: 'printing-services', description: 'Custom photocopy, black & white / color prints, laminations', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-9', name: 'Exam & Test Supplies', slug: 'exam-test-supplies', description: 'Boards, geometry boxes, compass sets', image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&auto=format&fit=crop&q=60', active: true },
  { id: 'cat-10', name: 'Gifts & Novelties', slug: 'gifts-novelties', description: 'Wrappings, cards, custom gift items', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&auto=format&fit=crop&q=60', active: true }
];

const INITIAL_BRANDS: Brand[] = [
  { id: 'b-1', name: 'Piano', slug: 'piano', logo: '', active: true },
  { id: 'b-2', name: 'Dollar', slug: 'dollar', logo: '', active: true },
  { id: 'b-3', name: 'Dux', slug: 'dux', logo: '', active: true },
  { id: 'b-4', name: 'Pelikan', slug: 'pelikan', logo: '', active: true },
  { id: 'b-5', name: 'Double A', slug: 'double-a', logo: '', active: true },
  { id: 'b-6', name: 'Casio', slug: 'casio', logo: '', active: true },
  { id: 'b-7', name: 'Deli', slug: 'deli', logo: '', active: true },
  { id: 'b-8', name: 'Faber-Castell', slug: 'faber-castell', logo: '', active: true }
];

const INITIAL_DELIVERY_AREAS: DeliveryArea[] = [
  { id: 'da-1', city: 'Lahore', areaName: 'Samanabad (Local Area)', charges: 80, estDays: 'Same Day', active: true },
  { id: 'da-2', city: 'Lahore', areaName: 'Poonch Road & Ichhra', charges: 100, estDays: 'Same Day', active: true },
  { id: 'da-3', city: 'Lahore', areaName: 'Gulberg & Model Town', charges: 150, estDays: '1-2 Days', active: true },
  { id: 'da-4', city: 'Lahore', areaName: 'DHA & Johar Town', charges: 200, estDays: '1-2 Days', active: true },
  { id: 'da-5', city: 'Karachi', areaName: 'All Areas (Courier)', charges: 250, estDays: '3-4 Days', active: true },
  { id: 'da-6', city: 'Islamabad', areaName: 'All Areas (Courier)', charges: 250, estDays: '2-3 Days', active: true },
  { id: 'da-7', city: 'Faisalabad', areaName: 'All Areas (Courier)', charges: 220, estDays: '2-3 Days', active: true },
  { id: 'da-8', city: 'Rawalpindi', areaName: 'All Areas (Courier)', charges: 250, estDays: '2-3 Days', active: true },
  { id: 'da-9', city: 'Lahore', areaName: 'Shop Pickup (Poonch Road)', charges: 0, estDays: 'Ready in 2 Hours', active: true }
];

const INITIAL_SETTINGS: ShopSettings = {
  shopName: 'UstaadGee Stationers',
  phone: '+923334488205',
  whatsApp: '+923334488205',
  address: 'Poonch Road, Samanabad, Lahore',
  city: 'Lahore',
  currency: 'PKR',
  freeDeliveryMin: 2000,
  codActive: true,
  cardActive: true,
  easypaisa: {
    active: true,
    merchantId: '99824',
    storeId: 'UST_ONLINE',
    secureSalt: 'ep_salt_6628901',
    hashKey: 'ep_hash_key_88301',
    sandboxMode: true
  },
  jazzcash: {
    active: true,
    merchantId: 'MC_83021',
    secureSalt: 'jc_salt_3902183',
    sandboxMode: true
  },
  bankTransfer: {
    active: true,
    bankName: 'Meezan Bank Limited',
    accountTitle: 'UstaadGee Stationers',
    iban: 'PK49MEZN00340103456721',
    accountNumber: '00340103456721'
  }
};

const INITIAL_COUPONS: Coupon[] = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minOrderValue: 500, expiryDate: '2027-12-31', usageLimit: 100, usageCount: 0, active: true },
  { code: 'AZADI500', type: 'fixed', value: 500, minOrderValue: 3000, expiryDate: '2026-08-31', usageLimit: 50, usageCount: 0, active: true },
  { code: 'FREEBYU', type: 'percentage', value: 100, minOrderValue: 10000, expiryDate: '2027-01-01', usageLimit: 10, usageCount: 0, active: true }
];

const INITIAL_BANNERS: Banner[] = [
  { id: 'bn-1', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1200&auto=format&fit=crop&q=80', title: 'Back To School Sale!', subtitle: 'Get flat 15% discount on all school stationery kits.', link: '/category/school-stationery', position: 'home_hero', active: true },
  { id: 'bn-2', image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1200&auto=format&fit=crop&q=80', title: 'Premium Office Supplies', subtitle: 'Organize your desk with imported files, staplers, and paper reams.', link: '/category/office-stationery', position: 'home_hero', active: true },
  { id: 'bn-3', image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80', title: 'Double A Paper Reams', subtitle: 'A4 Premium 80gsm sheets for crisp photocopying.', link: '/category/printer-photocopy-supplies', position: 'home_promo', active: true }
];

const INITIAL_PRODUCTS: Product[] = [
  // School Stationery
  {
    id: 'p-1',
    name: 'Bahadur 2B Lead Pencils (Pack of 12)',
    slug: 'bahadur-2b-lead-pencils-pack-of-12',
    sku: 'PCL-BAH-2B-12',
    barcode: '8964000100234',
    categoryId: 'cat-1',
    brandId: 'b-8', // Faber-Castell / Bahadur
    description: 'High-quality 2B lead pencils with smooth graphite core. Break-resistant lead, perfect for school examinations, sketching, and daily homework. Non-toxic wood.',
    images: ['https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=80'],
    costPrice: 120,
    salePrice: 180,
    discountPrice: 160,
    stockQuantity: 120,
    minStockAlert: 15,
    unitType: 'box',
    variants: [{ name: 'Standard Lead', stock: 120 }],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-2',
    name: 'Dux Container Sharpener (D-99)',
    slug: 'dux-container-sharpener-d-99',
    sku: 'SHP-DUX-D99',
    barcode: '8964000100412',
    categoryId: 'cat-1',
    brandId: 'b-3',
    description: 'Ergonomic pencil sharpener with a durable plastic shavings container. High-carbon steel blades ensure precise and clean sharpening every time without breaking lead.',
    images: ['https://images.unsplash.com/photo-1596495578065-6e0763fa1141?w=500&auto=format&fit=crop&q=80'],
    costPrice: 12,
    salePrice: 25,
    stockQuantity: 250,
    minStockAlert: 30,
    unitType: 'piece',
    variants: [
      { name: 'Neon Blue', stock: 100 },
      { name: 'Neon Green', stock: 80 },
      { name: 'Neon Pink', stock: 70 }
    ],
    active: true,
    featured: false,
    createdAt: new Date().toISOString()
  },
  // Pens & Writing
  {
    id: 'p-3',
    name: 'Piano Single Line Ballpoint (Blue, Box of 10)',
    slug: 'piano-single-line-ballpoint-blue-box-of-10',
    sku: 'PEN-PIA-SL-BLUE',
    barcode: '8964000110822',
    categoryId: 'cat-3',
    brandId: 'b-1',
    description: 'Pakistan’s favorite smooth writing pen. 0.7mm Swiss Tungsten Carbide tip. Oil-based German ink providing skip-free writing and clean letters. Ideal for school and exam boards.',
    images: ['https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80'],
    costPrice: 90,
    salePrice: 150,
    discountPrice: 130,
    stockQuantity: 80,
    minStockAlert: 10,
    unitType: 'box',
    variants: [
      { name: 'Blue Ink', stock: 50 },
      { name: 'Black Ink', stock: 30 }
    ],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p-4',
    name: 'Dollar SP-10 Fountain Pen',
    slug: 'dollar-sp-10-fountain-pen',
    sku: 'PEN-DOL-SP10',
    barcode: '8964000110990',
    categoryId: 'cat-3',
    brandId: 'b-2',
    description: 'Timeless calligraphy and school writing tool. Features an ink-window to check remaining volume, an ergonomic grip, and a stainless steel iridium-point fine nib. Easily refillable.',
    images: ['https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=500&auto=format&fit=crop&q=80'],
    costPrice: 55,
    salePrice: 85,
    stockQuantity: 4, // Set LOW stock for testing dashboard alerts!
    minStockAlert: 10,
    unitType: 'piece',
    variants: [
      { name: 'Traditional Blue', stock: 2 },
      { name: 'Ruby Red', stock: 2 }
    ],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  // Notebooks
  {
    id: 'p-5',
    name: 'UstaadGee Premium Single Line Register (200 Pages)',
    slug: 'ustaadgee-premium-single-line-register-200-pages',
    sku: 'REG-UG-SL-200',
    categoryId: 'cat-4',
    description: 'Custom manufactured UstaadGee house register. Premium 75gsm white offset paper that prevents ink bleeding or ghosting. Strong card binding with protective outer plastic laminate.',
    images: ['https://images.unsplash.com/photo-1517842645767-c639042777db?w=500&auto=format&fit=crop&q=80'],
    costPrice: 180,
    salePrice: 280,
    discountPrice: 250,
    stockQuantity: 45,
    minStockAlert: 8,
    unitType: 'piece',
    variants: [
      { name: 'Single Line (Ruled)', stock: 30 },
      { name: 'Four Line (English)', stock: 15 }
    ],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  // Art Supplies
  {
    id: 'p-6',
    name: 'Deli Water Color Cake Set (12 Colors with Brush)',
    slug: 'deli-water-color-cake-set-12-colors-with-brush',
    sku: 'ART-DEL-WCC12',
    barcode: '6921734910231',
    categoryId: 'cat-5',
    brandId: 'b-7',
    description: 'Vibrant, high-opacity watercolor cakes in a sturdy travel palette box. Excellent mixing ratios, non-toxic, and washes easily from clothes and hands. Comes with a premium nylon brush.',
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=80'],
    costPrice: 320,
    salePrice: 490,
    stockQuantity: 40,
    minStockAlert: 5,
    unitType: 'box',
    variants: [{ name: '12 Colors', stock: 40 }],
    active: true,
    featured: false,
    createdAt: new Date().toISOString()
  },
  // Paper Reams
  {
    id: 'p-7',
    name: 'Double A A4 Paper Ream (80gsm, 500 Sheets)',
    slug: 'double-a-a4-paper-ream-80gsm-500-sheets',
    sku: 'REAM-AA-A4-80G',
    barcode: '8850123019021',
    categoryId: 'cat-7',
    brandId: 'b-5',
    description: 'High-quality photocopying and laser printing ream. Smooth sheet surfaces produce clear, high-contrast, double-sided copies. Acid-free premium pulp preventing jams.',
    images: ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=80'],
    costPrice: 1150,
    salePrice: 1550,
    discountPrice: 1450,
    stockQuantity: 65,
    minStockAlert: 10,
    unitType: 'ream',
    variants: [{ name: 'A4 size 80gsm', stock: 65 }],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  // Computer Accessories
  {
    id: 'p-8',
    name: 'Casio fx-991ES Plus 2nd Gen Scientific Calculator',
    slug: 'casio-fx-991es-plus-2nd-gen-scientific-calculator',
    sku: 'CAL-CAS-991ES',
    barcode: '4971850092341',
    categoryId: 'cat-6',
    brandId: 'b-6',
    description: 'Authentic engineering & science calculator with natural textbook display (displays formula/equations exactly as in textbooks). 417 functions. Dual power source (Solar & Battery).',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80'],
    costPrice: 2800,
    salePrice: 3800,
    discountPrice: 3490,
    stockQuantity: 15,
    minStockAlert: 3,
    unitType: 'piece',
    variants: [{ name: 'Standard Black', stock: 15 }],
    active: true,
    featured: true,
    createdAt: new Date().toISOString()
  },
  // Printing Services
  {
    id: 'p-9',
    name: 'Standard Photocopying (Black & White, A4)',
    slug: 'standard-photocopying-black-white-a4',
    sku: 'SERV-PHOTO-A4-BW',
    categoryId: 'cat-8',
    description: 'High-speed, double-sided crisp black and white photocopy on 75gsm premium paper ream. Specify special requests like booklet format or double-sided in instructions.',
    images: ['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=80'],
    costPrice: 2,
    salePrice: 5,
    stockQuantity: 9999, // Infinite stock
    minStockAlert: 0,
    unitType: 'piece',
    variants: [
      { name: 'Single-Sided', stock: 9999 },
      { name: 'Double-Sided', stock: 9999 }
    ],
    active: true,
    featured: false,
    createdAt: new Date().toISOString()
  }
];

// Helper to save DB to local JSON
async function saveToDisk() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, 'db.json'), 
      JSON.stringify(database, null, 2), 
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save database to disk:', error);
  }
}

// Initial Database Setup
export async function initializeDb() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const dbPath = path.join(DATA_DIR, 'db.json');
    
    try {
      const dataStr = await fs.readFile(dbPath, 'utf-8');
      database = JSON.parse(dataStr);
      console.log('Database loaded successfully from disk. Records found:', database.products.length);
    } catch (e) {
      console.log('No database found. Running migrations & seeds...');
      
      // Setup initial entities
      database.users = [
        {
          id: 'u-admin',
          email: 'admin@ustaadgee.com',
          name: 'Ustaad Admin',
          password: 'admin123_ustaad', // Hashed in production, plain check for preview simplicity
          role: 'admin',
          phone: '+923334488205',
          createdAt: new Date().toISOString()
        },
        {
          id: 'u-cust',
          email: 'customer@test.com',
          name: 'Ahmed Khan',
          password: 'customer_pass',
          role: 'customer',
          phone: '+923001234567',
          createdAt: new Date().toISOString()
        }
      ];
      database.categories = INITIAL_CATEGORIES;
      database.brands = INITIAL_BRANDS;
      database.deliveryAreas = INITIAL_DELIVERY_AREAS;
      database.settings = INITIAL_SETTINGS;
      database.coupons = INITIAL_COUPONS;
      database.banners = INITIAL_BANNERS;
      database.products = INITIAL_PRODUCTS;
      
      // Empty lists
      database.orders = [];
      database.orderItems = [];
      database.paymentLogs = [];
      database.messages = [];
      database.wishlist = [];
      database.reviews = [];
      database.auditLogs = [
        {
          id: 'al-1',
          userId: 'u-admin',
          userEmail: 'admin@ustaadgee.com',
          userRole: 'admin',
          action: 'System Initialization',
          details: 'UstaadGee Stationers SQLite-JSON relational store initialized with categories, brands, default delivery areas, and settings.',
          createdAt: new Date().toISOString()
        }
      ];
      database.inventoryMovements = [];
      
      // Initialize inventory history for products
      for (const prod of database.products) {
        database.inventoryMovements.push({
          id: `im-${prod.id}`,
          productId: prod.id,
          quantity: prod.stockQuantity,
          type: 'purchase',
          notes: 'Opening initial seed stock',
          createdAt: new Date().toISOString()
        });
      }

      await saveToDisk();
      console.log('Database initialized and written to disk successfully.');
    }
  } catch (error) {
    console.error('Critical database init error:', error);
  }
}

// Data Getters and Setters
export const db = {
  // USERS
  users: {
    findMany: () => database.users,
    findFirst: (predicate: (u: User) => boolean) => database.users.find(predicate),
    create: async (user: Omit<User, 'id' | 'createdAt'>) => {
      const newUser: User = {
        ...user,
        id: `u-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      database.users.push(newUser);
      await saveToDisk();
      return newUser;
    },
    update: async (id: string, updates: Partial<User>) => {
      const idx = database.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        database.users[idx] = { ...database.users[idx], ...updates };
        await saveToDisk();
        return database.users[idx];
      }
      return null;
    }
  },

  // CATEGORIES
  categories: {
    findMany: () => database.categories.filter(c => c.active),
    findManyWithInactive: () => database.categories,
    create: async (cat: Omit<Category, 'id'>) => {
      const newCat: Category = { ...cat, id: `cat-${Date.now()}` };
      database.categories.push(newCat);
      await saveToDisk();
      return newCat;
    },
    update: async (id: string, updates: Partial<Category>) => {
      const idx = database.categories.findIndex(c => c.id === id);
      if (idx !== -1) {
        database.categories[idx] = { ...database.categories[idx], ...updates };
        await saveToDisk();
        return database.categories[idx];
      }
      return null;
    }
  },

  // BRANDS
  brands: {
    findMany: () => database.brands.filter(b => b.active),
    findManyWithInactive: () => database.brands,
    create: async (brand: Omit<Brand, 'id'>) => {
      const newBrand: Brand = { ...brand, id: `b-${Date.now()}` };
      database.brands.push(newBrand);
      await saveToDisk();
      return newBrand;
    },
    update: async (id: string, updates: Partial<Brand>) => {
      const idx = database.brands.findIndex(b => b.id === id);
      if (idx !== -1) {
        database.brands[idx] = { ...database.brands[idx], ...updates };
        await saveToDisk();
        return database.brands[idx];
      }
      return null;
    }
  },

  // PRODUCTS
  products: {
    findMany: () => database.products.filter(p => p.active),
    findManyWithInactive: () => database.products,
    findFirst: (predicate: (p: Product) => boolean) => database.products.find(predicate),
    create: async (prod: Omit<Product, 'id' | 'createdAt'>) => {
      const newProd: Product = {
        ...prod,
        id: `p-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      database.products.push(newProd);
      
      // Log opening inventory
      database.inventoryMovements.push({
        id: `im-${Date.now()}`,
        productId: newProd.id,
        quantity: newProd.stockQuantity,
        type: 'purchase',
        notes: 'Initial stock on creation',
        createdAt: new Date().toISOString()
      });

      await saveToDisk();
      return newProd;
    },
    update: async (id: string, updates: Partial<Product>) => {
      const idx = database.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        const oldStock = database.products[idx].stockQuantity;
        database.products[idx] = { ...database.products[idx], ...updates };
        
        // Log stock movement if stock quantity was manually modified in updates
        if (updates.stockQuantity !== undefined && updates.stockQuantity !== oldStock) {
          const diff = updates.stockQuantity - oldStock;
          database.inventoryMovements.push({
            id: `im-${Date.now()}`,
            productId: id,
            quantity: diff,
            type: 'adjustment',
            notes: 'Manual inventory stock adjustment via admin panel',
            createdAt: new Date().toISOString()
          });
        }

        await saveToDisk();
        return database.products[idx];
      }
      return null;
    },
    delete: async (id: string) => {
      // We soft-delete by setting active to false
      const idx = database.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        database.products[idx].active = false;
        await saveToDisk();
        return true;
      }
      return false;
    }
  },

  // ORDERS
  orders: {
    findMany: () => database.orders,
    findManyByCustomer: (cust: string) => database.orders.filter(o => o.customerId === cust),
    findFirst: (predicate: (o: Order) => boolean) => database.orders.find(predicate),
    findItems: (orderId: string) => database.orderItems.filter(oi => oi.orderId === orderId),
    create: async (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status' | 'paymentStatus'>, items: Omit<OrderItem, 'id' | 'orderId'>[]) => {
      const orderId = `ord-${Date.now()}`;
      const randStr = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `UG-${new Date().getFullYear()}-${randStr}`;
      
      const newOrder: Order = {
        ...order,
        id: orderId,
        orderNumber,
        status: 'pending',
        paymentStatus: order.paymentMethod === 'cod' ? 'unpaid' : 'unpaid', // Initial COD is unpaid
        createdAt: new Date().toISOString()
      };

      const finalItems: OrderItem[] = items.map((it, idx) => ({
        ...it,
        id: `oi-${orderId}-${idx}`,
        orderId
      }));

      // Add to database
      database.orders.push(newOrder);
      database.orderItems.push(...finalItems);

      // Log movement & Deduct stock on confirmation of order?
      // "Automatic stock deduction after confirmed order" -> Let's handle this in the status transition route!
      // But let's log payment attempts if online.
      if (order.paymentMethod !== 'cod') {
        database.paymentLogs.push({
          id: `plg-${Date.now()}`,
          orderId,
          paymentMethod: order.paymentMethod,
          amount: order.totalAmount,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      await saveToDisk();
      return { order: newOrder, items: finalItems };
    },
    updateStatus: async (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus, notes?: string) => {
      const idx = database.orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        const order = database.orders[idx];
        const oldStatus = order.status;
        order.status = status;
        if (paymentStatus) {
          order.paymentStatus = paymentStatus;
        }
        if (notes) {
          order.notes = (order.notes || '') + ' | ' + notes;
        }

        // Automatic Inventory logic:
        // 1. "Automatic stock deduction after confirmed order" (when status switches to 'confirmed' from 'pending')
        if (status === 'confirmed' && oldStatus === 'pending') {
          const items = database.orderItems.filter(oi => oi.orderId === orderId);
          for (const item of items) {
            const pIdx = database.products.findIndex(p => p.id === item.productId);
            if (pIdx !== -1) {
              const prod = database.products[pIdx];
              prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
              
              // Find matching variant and deduct stock too if variantName matches
              if (item.variantName && prod.variants) {
                const varIdx = prod.variants.findIndex(v => v.name === item.variantName);
                if (varIdx !== -1) {
                  prod.variants[varIdx].stock = Math.max(0, prod.variants[varIdx].stock - item.quantity);
                }
              }

              // Log inventory movement
              database.inventoryMovements.push({
                id: `im-${Date.now()}-${item.productId}`,
                productId: item.productId,
                quantity: -item.quantity,
                type: 'sale_deduction',
                referenceId: orderId,
                notes: `Deducted for order ${order.orderNumber}`,
                createdAt: new Date().toISOString()
              });
            }
          }
        }

        // 2. "Restore stock on cancellation" (when status switches to 'cancelled' from a status that was already confirmed or processing/packed/out_for_delivery)
        if (status === 'cancelled' && ['confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered'].includes(oldStatus)) {
          const items = database.orderItems.filter(oi => oi.orderId === orderId);
          for (const item of items) {
            const pIdx = database.products.findIndex(p => p.id === item.productId);
            if (pIdx !== -1) {
              const prod = database.products[pIdx];
              prod.stockQuantity += item.quantity;

              if (item.variantName && prod.variants) {
                const varIdx = prod.variants.findIndex(v => v.name === item.variantName);
                if (varIdx !== -1) {
                  prod.variants[varIdx].stock += item.quantity;
                }
              }

              // Log inventory movement
              database.inventoryMovements.push({
                id: `im-${Date.now()}-${item.productId}`,
                productId: item.productId,
                quantity: item.quantity,
                type: 'sale_restore',
                referenceId: orderId,
                notes: `Restored stock from cancelled order ${order.orderNumber}`,
                createdAt: new Date().toISOString()
              });
            }
          }
        }

        await saveToDisk();
        return order;
      }
      return null;
    }
  },

  // PAYMENT LOGS
  paymentLogs: {
    findMany: () => database.paymentLogs,
    create: async (log: Omit<PaymentLog, 'id' | 'createdAt'>) => {
      const newLog: PaymentLog = {
        ...log,
        id: `plg-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      database.paymentLogs.push(newLog);
      await saveToDisk();
      return newLog;
    }
  },

  // COUPONS
  coupons: {
    findMany: () => database.coupons,
    findFirst: (code: string) => database.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active),
    incrementUsage: async (code: string) => {
      const coupon = database.coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
      if (coupon) {
        coupon.usageCount += 1;
        await saveToDisk();
      }
    }
  },

  // BANNERS
  banners: {
    findMany: () => database.banners.filter(b => b.active),
    findManyAll: () => database.banners,
    create: async (banner: Omit<Banner, 'id'>) => {
      const newBanner: Banner = { ...banner, id: `bn-${Date.now()}` };
      database.banners.push(newBanner);
      await saveToDisk();
      return newBanner;
    },
    update: async (id: string, updates: Partial<Banner>) => {
      const idx = database.banners.findIndex(b => b.id === id);
      if (idx !== -1) {
        database.banners[idx] = { ...database.banners[idx], ...updates };
        await saveToDisk();
        return database.banners[idx];
      }
      return null;
    }
  },

  // SHIPPING ZONES / DELIVERY AREAS
  deliveryAreas: {
    findMany: () => database.deliveryAreas.filter(d => d.active),
    findManyWithInactive: () => database.deliveryAreas,
    create: async (da: Omit<DeliveryArea, 'id'>) => {
      const newDa: DeliveryArea = { ...da, id: `da-${Date.now()}` };
      database.deliveryAreas.push(newDa);
      await saveToDisk();
      return newDa;
    },
    update: async (id: string, updates: Partial<DeliveryArea>) => {
      const idx = database.deliveryAreas.findIndex(d => d.id === id);
      if (idx !== -1) {
        database.deliveryAreas[idx] = { ...database.deliveryAreas[idx], ...updates };
        await saveToDisk();
        return database.deliveryAreas[idx];
      }
      return null;
    }
  },

  // SETTINGS
  settings: {
    get: () => database.settings,
    update: async (updates: Partial<ShopSettings>) => {
      database.settings = { ...database.settings, ...updates };
      await saveToDisk();
      return database.settings;
    }
  },

  // CONTACT MESSAGES
  messages: {
    findMany: () => database.messages,
    create: async (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>) => {
      const newMsg: ContactMessage = {
        ...msg,
        id: `msg-${Date.now()}`,
        status: 'unread',
        createdAt: new Date().toISOString()
      };
      database.messages.push(newMsg);
      await saveToDisk();
      return newMsg;
    },
    updateStatus: async (id: string, status: 'unread' | 'read' | 'replied') => {
      const idx = database.messages.findIndex(m => m.id === id);
      if (idx !== -1) {
        database.messages[idx].status = status;
        await saveToDisk();
        return database.messages[idx];
      }
      return null;
    }
  },

  // WISHLIST
  wishlist: {
    getUserWishlist: (userId: string) => database.wishlist.filter(w => w.userId === userId),
    add: async (userId: string, productId: string) => {
      const exists = database.wishlist.some(w => w.userId === userId && w.productId === productId);
      if (!exists) {
        database.wishlist.push({ userId, productId, createdAt: new Date().toISOString() });
        await saveToDisk();
      }
      return true;
    },
    remove: async (userId: string, productId: string) => {
      database.wishlist = database.wishlist.filter(w => !(w.userId === userId && w.productId === productId));
      await saveToDisk();
      return true;
    }
  },

  // REVIEWS
  reviews: {
    findByProduct: (productId: string) => database.reviews.filter(r => r.productId === productId && r.status === 'approved'),
    findManyAll: () => database.reviews,
    create: async (review: Omit<Review, 'id' | 'createdAt' | 'status'>) => {
      const newReview: Review = {
        ...review,
        id: `rev-${Date.now()}`,
        status: 'approved', // Auto-approve in preview for simplicity
        createdAt: new Date().toISOString()
      };
      database.reviews.push(newReview);
      await saveToDisk();
      return newReview;
    },
    updateStatus: async (id: string, status: 'pending' | 'approved') => {
      const idx = database.reviews.findIndex(r => r.id === id);
      if (idx !== -1) {
        database.reviews[idx].status = status;
        await saveToDisk();
        return database.reviews[idx];
      }
      return null;
    }
  },

  // AUDIT LOGS
  auditLogs: {
    findMany: () => database.auditLogs,
    create: async (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
      const newLog: AuditLog = {
        ...log,
        id: `al-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      database.auditLogs.unshift(newLog); // newest first
      await saveToDisk();
      return newLog;
    }
  },

  // INVENTORY MOVEMENTS
  inventoryMovements: {
    findMany: () => database.inventoryMovements,
    findByProduct: (productId: string) => database.inventoryMovements.filter(im => im.productId === productId)
  },

  // REPORTS & DASHBOARD
  reports: {
    getDashboardStats: (): DashboardStats => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      // Filter orders
      const orders = database.orders;
      const orderItems = database.orderItems;

      let todaySales = 0;
      let todayOrders = 0;
      let monthlySales = 0;
      let monthlyOrders = 0;

      orders.forEach(o => {
        const oTime = new Date(o.createdAt).getTime();
        // Skip cancelled orders for sales reports, but count for orders list if needed
        const isSalesEligible = o.status !== 'cancelled';

        if (oTime >= startOfToday) {
          todayOrders++;
          if (isSalesEligible) todaySales += o.totalAmount;
        }

        if (oTime >= startOfMonth) {
          monthlyOrders++;
          if (isSalesEligible) monthlySales += o.totalAmount;
        }
      });

      // Low Stock Alert items
      const lowStockCount = database.products.filter(p => p.active && p.stockQuantity <= p.minStockAlert).length;
      
      // Pending Payments Count
      const pendingPaymentsCount = orders.filter(o => o.paymentStatus === 'unpaid' && o.status !== 'cancelled').length;

      // Sales Trend (Last 7 days)
      const salesTrendMap: { [dateStr: string]: { amount: number; count: number } } = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        salesTrendMap[dateStr] = { amount: 0, count: 0 };
      }

      orders.forEach(o => {
        const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (salesTrendMap[dateStr] !== undefined) {
          salesTrendMap[dateStr].count++;
          if (o.status !== 'cancelled') {
            salesTrendMap[dateStr].amount += o.totalAmount;
          }
        }
      });

      const salesTrend = Object.keys(salesTrendMap).map(date => ({
        date,
        amount: salesTrendMap[date].amount,
        count: salesTrendMap[date].count
      }));

      // Revenue by Payment Method
      const methodMap: { [m: string]: number } = { cod: 0, easypaisa: 0, jazzcash: 0, bank_transfer: 0, card: 0 };
      orders.forEach(o => {
        if (o.status !== 'cancelled' && o.paymentStatus === 'paid') {
          methodMap[o.paymentMethod] = (methodMap[o.paymentMethod] || 0) + o.totalAmount;
        }
      });
      const revenueByPaymentMethod = Object.keys(methodMap).map(method => ({
        method: method.toUpperCase().replace('_', ' '),
        total: methodMap[method]
      }));

      // Top Selling Products
      const productSalesMap: { [pid: string]: { name: string; quantity: number; revenue: number } } = {};
      orderItems.forEach(oi => {
        const o = orders.find(ord => ord.id === oi.orderId);
        if (o && o.status !== 'cancelled') {
          if (!productSalesMap[oi.productId]) {
            productSalesMap[oi.productId] = { name: oi.productName, quantity: 0, revenue: 0 };
          }
          productSalesMap[oi.productId].quantity += oi.quantity;
          productSalesMap[oi.productId].revenue += oi.totalPrice;
        }
      });

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Category Sales
      const catSalesMap: { [cid: string]: { name: string; value: number } } = {};
      orderItems.forEach(oi => {
        const o = orders.find(ord => ord.id === oi.orderId);
        const p = database.products.find(prod => prod.id === oi.productId);
        if (o && o.status !== 'cancelled' && p) {
          const cat = database.categories.find(c => c.id === p.categoryId);
          if (cat) {
            if (!catSalesMap[cat.id]) {
              catSalesMap[cat.id] = { name: cat.name, value: 0 };
            }
            catSalesMap[cat.id].value += oi.totalPrice;
          }
        }
      });
      const categorySales = Object.values(catSalesMap);

      return {
        todaySales,
        todayOrders,
        monthlySales,
        monthlyOrders,
        lowStockCount,
        pendingPaymentsCount,
        revenueByPaymentMethod,
        salesTrend,
        topProducts,
        categorySales
      };
    }
  }
};
