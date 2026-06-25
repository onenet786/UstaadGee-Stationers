// server/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
import {
  User, Category, Brand, Product, Order, OrderItem, PaymentLog, Coupon, Banner,
  DeliveryArea, ContactMessage, WishlistItem, Review, ShopSettings, AuditLog,
  InventoryMovement, DashboardStats
} from '../src/types.ts';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for PostgreSQL connection');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Helper to run a query and return rows */
async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

/** Initialize database: run migrations and seed if empty */
export async function initializeDb() {
  const migrationSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo TEXT,
      active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT,
      barcode TEXT,
      category_id TEXT REFERENCES categories(id),
      brand_id TEXT REFERENCES brands(id),
      description TEXT,
      images TEXT[],
      cost_price NUMERIC,
      sale_price NUMERIC,
      discount_price NUMERIC,
      stock_quantity INTEGER,
      min_stock_alert INTEGER,
      unit_type TEXT,
      variants JSONB,
      active BOOLEAN DEFAULT true,
      featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS settings (
      shop_name TEXT,
      phone TEXT,
      whatsapp TEXT,
      address TEXT,
      city TEXT,
      currency TEXT,
      free_delivery_min NUMERIC,
      cod_active BOOLEAN,
      card_active BOOLEAN,
      easypaisa JSONB,
      jazzcash JSONB,
      bank_transfer JSONB
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      user_role TEXT,
      action TEXT,
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      type TEXT,
      value NUMERIC,
      min_order_value NUMERIC,
      expiry_date DATE,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      image TEXT,
      title TEXT,
      subtitle TEXT,
      link TEXT,
      position TEXT,
      active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS delivery_areas (
      id TEXT PRIMARY KEY,
      city TEXT,
      area_name TEXT,
      charges NUMERIC,
      est_days TEXT,
      active BOOLEAN DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      subject TEXT,
      message TEXT,
      status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      user_id TEXT REFERENCES users(id),
      user_name TEXT,
      rating INTEGER,
      comment TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wishlist (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      product_id TEXT REFERENCES products(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES users(id),
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_area TEXT,
      delivery_charges NUMERIC,
      subtotal NUMERIC,
      discount NUMERIC,
      coupon_code TEXT,
      total_amount NUMERIC,
      payment_method TEXT,
      payment_status TEXT,
      status TEXT,
      notes TEXT,
      estimated_delivery_time TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      product_id TEXT REFERENCES products(id),
      product_name TEXT,
      sku TEXT,
      quantity INTEGER,
      price NUMERIC,
      total_price NUMERIC,
      variant_name TEXT
    );
    CREATE TABLE IF NOT EXISTS payment_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      payment_method TEXT,
      amount NUMERIC,
      status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      quantity INTEGER,
      type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  await pool.query(migrationSql);

  // Seed minimal data if tables empty
  const users = await query<User>('SELECT * FROM users LIMIT 1');
  if (users.length === 0) {
    await query(`
      INSERT INTO users (id, email, name, password, role, phone) VALUES
        ('u-admin','admin@ustaadgee.com','Ustaad Admin','$2b$10$xgqNscLUqYFNhRhA.hEMF.bMrgn32YZ1/L8k53wqz2nD.0KUwtIzm','admin','+923334488205'),
        ('u-cust','customer@test.com','Ahmed Khan','$2b$10$E8QavPQS//6xXOOEzipKN.FGvhFrKqn7uHJt0qq4jN7A1tqRx1IWq','customer','+923001234567')
    `);
  } else {
    // Automatically correct wrong admin hash if the database was already created with it
    await query(`
      UPDATE users 
      SET password = '$2b$10$xgqNscLUqYFNhRhA.hEMF.bMrgn32YZ1/L8k53wqz2nD.0KUwtIzm' 
      WHERE email = 'admin@ustaadgee.com' 
        AND password IN (
          '$2b$10$VyeWGcQ37FWhakTmULOgTu4UkiGZ9RkSeaZLEks5.Brqrg.c/htdS',
          '$2b$10$73mHhcHCGpnsphlI6Q29N.BQAqA8H5YTBPVtXNeFBVJQW7pmvFrIC'
        )
    `);
  }
  const catCount = await query<any>('SELECT COUNT(*) FROM categories');
  if (Number(catCount[0].count) === 0) {
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
    for (const c of INITIAL_CATEGORIES) {
      await query('INSERT INTO categories (id, name, slug, description, image, active) VALUES ($1,$2,$3,$4,$5,$6)', [c.id, c.name, c.slug, c.description, c.image, c.active]);
    }
  }
  const brandCount = await query<any>('SELECT COUNT(*) FROM brands');
  if (Number(brandCount[0].count) === 0) {
    const INITIAL_BRANDS = [
      { id: 'b-1', name: 'Piano', slug: 'piano', logo: '', active: true },
      { id: 'b-2', name: 'Dollar', slug: 'dollar', logo: '', active: true },
      { id: 'b-3', name: 'Dux', slug: 'dux', logo: '', active: true },
      { id: 'b-4', name: 'Pelikan', slug: 'pelikan', logo: '', active: true },
      { id: 'b-5', name: 'Double A', slug: 'double-a', logo: '', active: true },
      { id: 'b-6', name: 'Casio', slug: 'casio', logo: '', active: true },
      { id: 'b-7', name: 'Deli', slug: 'deli', logo: '', active: true },
      { id: 'b-8', name: 'Faber-Castell', slug: 'faber-castell', logo: '', active: true }
    ];
    for (const b of INITIAL_BRANDS) {
      await query('INSERT INTO brands (id, name, slug, logo, active) VALUES ($1,$2,$3,$4,$5)', [b.id, b.name, b.slug, b.logo, b.active]);
    }
  }
  const deliveryCount = await query<any>('SELECT COUNT(*) FROM delivery_areas');
  if (Number(deliveryCount[0].count) === 0) {
    const INITIAL_DELIVERY_AREAS = [
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
    for (const d of INITIAL_DELIVERY_AREAS) {
      await query('INSERT INTO delivery_areas (id, city, area_name, charges, est_days, active) VALUES ($1,$2,$3,$4,$5,$6)', [d.id, d.city, d.areaName, d.charges, d.estDays, d.active]);
    }
  }

  const bannersCount = await query<any>('SELECT COUNT(*) FROM banners');
  if (Number(bannersCount[0].count) === 0) {
    const INITIAL_BANNERS = [
      {
        id: 'bn-1',
        title: 'Back To School Sale!',
        subtitle: 'Get flat 15% discount on all school stationery kits.',
        link: '/category/school-stationery',
        image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1600&auto=format&fit=crop&q=80',
        position: '1',
        active: true
      },
      {
        id: 'bn-2',
        title: 'Premium Office Core',
        subtitle: 'Equip your workspace with imported papers, luxury pens, and desktop organizers.',
        link: '/category/office-stationery',
        image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1600&auto=format&fit=crop&q=80',
        position: '2',
        active: true
      },
      {
        id: 'bn-3',
        title: 'Artistic Masterpieces',
        subtitle: 'Professional canvas sets, oil paints, and watercolor sketchpads.',
        link: '/category/art-supplies',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&auto=format&fit=crop&q=80',
        position: '3',
        active: true
      }
    ];
    for (const b of INITIAL_BANNERS) {
      await query(
        'INSERT INTO banners (id, title, subtitle, link, image, position, active) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [b.id, b.title, b.subtitle, b.link, b.image, b.position, b.active]
      );
    }
  }

  const settingsCount = await query<any>('SELECT COUNT(*) FROM settings');
  if (Number(settingsCount[0].count) === 0) {
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
      easypaisa: { active: true, merchantId: '99824', storeId: 'UST_ONLINE', secureSalt: 'ep_salt_6628901', hashKey: 'ep_hash_key_88301', sandboxMode: true },
      jazzcash: { active: true, merchantId: 'MC_83021', secureSalt: 'jc_salt_3902183', sandboxMode: true },
      bankTransfer: { active: true, bankName: 'Meezan Bank Limited', accountTitle: 'UstaadGee Stationers', iban: 'PK49MEZN00340103456721', accountNumber: '00340103456721' }
    } as any;
    await query(
      `INSERT INTO settings (shop_name, phone, whatsapp, address, city, currency, free_delivery_min, cod_active, card_active, easypaisa, jazzcash, bank_transfer) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        INITIAL_SETTINGS.shopName,
        INITIAL_SETTINGS.phone,
        INITIAL_SETTINGS.whatsApp,
        INITIAL_SETTINGS.address,
        INITIAL_SETTINGS.city,
        INITIAL_SETTINGS.currency,
        INITIAL_SETTINGS.freeDeliveryMin,
        INITIAL_SETTINGS.codActive,
        INITIAL_SETTINGS.cardActive,
        JSON.stringify(INITIAL_SETTINGS.easypaisa),
        JSON.stringify(INITIAL_SETTINGS.jazzcash),
        JSON.stringify(INITIAL_SETTINGS.bankTransfer)
      ]
    );
  }
}

/** USER operations */
export const db = {
  // USERS ------------------------------------------------------------
  users: {
    findMany: async (): Promise<User[]> => query<User>('SELECT * FROM users'),
    findFirst: async (predicate: (u: User) => boolean): Promise<User | undefined> => {
      const list = await db.users.findMany();
      return list.find(predicate);
    },
    create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
      const id = `u-${Date.now()}`;
      const createdAt = new Date().toISOString();
      await query(
        'INSERT INTO users (id, email, name, password, role, phone, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, user.email, user.name, user.password, user.role, user.phone, createdAt]
      );
      return { ...user, id, createdAt } as User;
    },
    update: async (id: string, updates: Partial<User>): Promise<User | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE users SET ${setClause} WHERE id = $1`, [id, ...values]);
      return db.users.findFirst(u => u.id === id);
    }
  },
  // CATEGORIES --------------------------------------------------------
  categories: {
    findMany: async (): Promise<Category[]> => query<Category>('SELECT * FROM categories WHERE active = true'),
    findManyWithInactive: async (): Promise<Category[]> => query<Category>('SELECT * FROM categories'),
    create: async (cat: Omit<Category, 'id'>): Promise<Category> => {
      const id = `cat-${Date.now()}`;
      await query('INSERT INTO categories (id, name, slug, description, image, active) VALUES ($1,$2,$3,$4,$5,$6)', [id, cat.name, cat.slug, cat.description, cat.image, cat.active]);
      return { ...cat, id } as Category;
    },
    update: async (id: string, updates: Partial<Category>): Promise<Category | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE categories SET ${setClause} WHERE id = $1`, [id, ...values]);
      const list = await db.categories.findManyWithInactive();
      return list.find(c => c.id === id) ?? null;
    }
  },
  // BRANDS ------------------------------------------------------------
  brands: {
    findMany: async (): Promise<Brand[]> => query<Brand>('SELECT * FROM brands WHERE active = true'),
    findManyWithInactive: async (): Promise<Brand[]> => query<Brand>('SELECT * FROM brands'),
    create: async (brand: Omit<Brand, 'id'>): Promise<Brand> => {
      const id = `b-${Date.now()}`;
      await query('INSERT INTO brands (id, name, slug, logo, active) VALUES ($1,$2,$3,$4,$5)', [id, brand.name, brand.slug, brand.logo, brand.active]);
      return { ...brand, id } as Brand;
    },
    update: async (id: string, updates: Partial<Brand>): Promise<Brand | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE brands SET ${setClause} WHERE id = $1`, [id, ...values]);
      const list = await db.brands.findManyWithInactive();
      return list.find(b => b.id === id) ?? null;
    }
  },
  // PRODUCTS ----------------------------------------------------------
  products: {
    findMany: async (): Promise<Product[]> => query<Product>('SELECT * FROM products WHERE active = true'),
    findManyWithInactive: async (): Promise<Product[]> => query<Product>('SELECT * FROM products'),
    findFirst: async (predicate: (p: Product) => boolean): Promise<Product | undefined> => {
      const list = await db.products.findManyWithInactive();
      return list.find(predicate);
    },
    create: async (prod: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
      const id = `p-${Date.now()}`;
      const createdAt = new Date().toISOString();
      await query(
        `INSERT INTO products (id, name, slug, sku, barcode, category_id, brand_id, description, images, cost_price, sale_price, discount_price, stock_quantity, min_stock_alert, unit_type, variants, active, featured, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          id,
          prod.name,
          prod.slug,
          prod.sku,
          prod.barcode,
          prod.categoryId,
          prod.brandId,
          prod.description,
          prod.images,
          prod.costPrice,
          prod.salePrice,
          prod.discountPrice,
          prod.stockQuantity,
          prod.minStockAlert,
          prod.unitType,
          JSON.stringify(prod.variants),
          prod.active,
          prod.featured,
          createdAt
        ]
      );
      return { ...prod, id, createdAt } as Product;
    },
    update: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => {
        if (f === 'variants') return `${f} = $${i + 2}::jsonb`;
        return `${f} = $${i + 2}`;
      }).join(', ');
      const values = fields.map(f => (f === 'variants' ? JSON.stringify((updates as any)[f]) : (updates as any)[f]));
      await query(`UPDATE products SET ${setClause} WHERE id = $1`, [id, ...values]);
      const list = await db.products.findManyWithInactive();
      return list.find(p => p.id === id) ?? null;
    },
    delete: async (id: string): Promise<boolean> => {
      await query('UPDATE products SET active = false WHERE id = $1', [id]);
      return true;
    }
  },
  // SETTINGS ----------------------------------------------------------
  settings: {
    get: async (): Promise<ShopSettings> => {
      const rows = await query<any>('SELECT * FROM settings LIMIT 1');
      const row = rows[0];
      if (!row) throw new Error('Settings not found');
      return {
        shopName: row.shop_name,
        phone: row.phone,
        whatsApp: row.whatsapp,
        address: row.address,
        city: row.city,
        currency: row.currency,
        freeDeliveryMin: Number(row.free_delivery_min),
        codActive: row.cod_active,
        cardActive: row.card_active,
        easypaisa: row.easypaisa,
        jazzcash: row.jazzcash,
        bankTransfer: row.bank_transfer
      } as ShopSettings;
    },
    update: async (updates: Partial<ShopSettings>): Promise<ShopSettings> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return await db.settings.get();
      const setClause = fields.map((f, i) => {
        const col = f.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${col} = $${i + 2}`;
      }).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE settings SET ${setClause}`, values);
      return await db.settings.get();
    }
  },
  // AUDIT LOGS -------------------------------------------------------
  auditLogs: {
    create: async (log: { userId: string; userEmail: string; userRole: string; action: string; details: string }): Promise<void> => {
      const id = `al-${Date.now()}`;
      await query('INSERT INTO audit_logs (id, user_id, user_email, user_role, action, details) VALUES ($1,$2,$3,$4,$5,$6)', [id, log.userId, log.userEmail, log.userRole, log.action, log.details]);
    },
    findMany: async (): Promise<AuditLog[]> => query<AuditLog>('SELECT * FROM audit_logs')
  },
  // COUPONS ----------------------------------------------------------
  coupons: {
    findMany: async (): Promise<Coupon[]> => query<Coupon>('SELECT * FROM coupons'),
    findFirst: async (code: string): Promise<Coupon | undefined> => {
      const rows = await query<Coupon>('SELECT * FROM coupons WHERE UPPER(code) = $1 AND active = true', [code.toUpperCase()]);
      return rows[0];
    },
    incrementUsage: async (code: string): Promise<void> => {
      await query('UPDATE coupons SET usage_count = usage_count + 1 WHERE code = $1', [code]);
    }
  },
  // BANNERS ----------------------------------------------------------
  banners: {
    findMany: async (): Promise<Banner[]> => query<Banner>('SELECT * FROM banners WHERE active = true'),
    findManyAll: async (): Promise<Banner[]> => query<Banner>('SELECT * FROM banners'),
    create: async (banner: Omit<Banner, 'id'>): Promise<Banner> => {
      const id = `bn-${Date.now()}`;
      await query('INSERT INTO banners (id, image, title, subtitle, link, position, active) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, banner.image, banner.title, banner.subtitle, banner.link, banner.position, banner.active]);
      return { ...banner, id } as Banner;
    },
    update: async (id: string, updates: Partial<Banner>): Promise<Banner | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE banners SET ${setClause} WHERE id = $1`, [id, ...values]);
      const list = await db.banners.findManyAll();
      return list.find(b => b.id === id) ?? null;
    }
  },
  // DELIVERY AREAS ---------------------------------------------------
  deliveryAreas: {
    findMany: async (): Promise<DeliveryArea[]> => query<DeliveryArea>('SELECT * FROM delivery_areas WHERE active = true'),
    findManyWithInactive: async (): Promise<DeliveryArea[]> => query<DeliveryArea>('SELECT * FROM delivery_areas'),
    create: async (da: Omit<DeliveryArea, 'id'>): Promise<DeliveryArea> => {
      const id = `da-${Date.now()}`;
      await query('INSERT INTO delivery_areas (id, city, area_name, charges, est_days, active) VALUES ($1,$2,$3,$4,$5,$6)', [id, da.city, da.areaName, da.charges, da.estDays, da.active]);
      return { ...da, id } as DeliveryArea;
    },
    update: async (id: string, updates: Partial<DeliveryArea>): Promise<DeliveryArea | null> => {
      const fields = Object.keys(updates);
      if (fields.length === 0) return null;
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = fields.map(f => (updates as any)[f]);
      await query(`UPDATE delivery_areas SET ${setClause} WHERE id = $1`, [id, ...values]);
      const list = await db.deliveryAreas.findManyWithInactive();
      return list.find(d => d.id === id) ?? null;
    }
  },
  // MESSAGES ----------------------------------------------------------
  messages: {
    findMany: async (): Promise<ContactMessage[]> => query<ContactMessage>('SELECT * FROM messages'),
    create: async (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>): Promise<ContactMessage> => {
      const id = `msg-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const status = 'unread';
      await query('INSERT INTO messages (id, name, email, phone, subject, message, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, msg.name, msg.email, msg.phone, msg.subject, msg.message, status, createdAt]);
      return { ...msg, id, status, createdAt } as ContactMessage;
    },
    updateStatus: async (id: string, status: 'unread' | 'read' | 'replied'): Promise<ContactMessage | null> => {
      await query('UPDATE messages SET status = $1 WHERE id = $2', [status, id]);
      const rows = await query<ContactMessage>('SELECT * FROM messages WHERE id = $1', [id]);
      return rows[0] ?? null;
    }
  },
  // WISHLIST ----------------------------------------------------------
  wishlist: {
    getUserWishlist: async (userId: string): Promise<WishlistItem[]> => {
      return query<WishlistItem>('SELECT * FROM wishlist WHERE user_id = $1', [userId]);
    },
    add: async (userId: string, productId: string): Promise<void> => {
      const id = `w-${Date.now()}`;
      await query('INSERT INTO wishlist (id, user_id, product_id) VALUES ($1,$2,$3)', [id, userId, productId]);
    },
    remove: async (userId: string, productId: string): Promise<void> => {
      await query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    }
  },
  // REVIEWS ----------------------------------------------------------
  reviews: {
    findByProduct: async (productId: string): Promise<Review[]> => query<Review>('SELECT * FROM reviews WHERE product_id = $1', [productId]),
    create: async (rev: Omit<Review, 'id' | 'createdAt'>): Promise<Review> => {
      const id = `rev-${Date.now()}`;
      const createdAt = new Date().toISOString();
      await query('INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, rev.productId, rev.userId, rev.userName, rev.rating, rev.comment, rev.status ?? "pending", createdAt]);
      return { ...rev, id, createdAt } as Review;
    }
  },
  // ORDERS -----------------------------------------------------------
  orders: {
    findMany: async (): Promise<Order[]> => query<Order>('SELECT * FROM orders'),
    findManyByCustomer: async (custId: string): Promise<Order[]> => query<Order>('SELECT * FROM orders WHERE customer_id = $1', [custId]),
    findFirst: async (predicate: (o: Order) => boolean): Promise<Order | undefined> => {
      const list = await db.orders.findMany();
      return list.find(predicate);
    },
    findItems: async (orderId: string): Promise<OrderItem[]> => query<OrderItem>('SELECT * FROM order_items WHERE order_id = $1', [orderId]),
    create: async (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status' | 'paymentStatus'>, items: Omit<OrderItem, 'id' | 'orderId'>[]): Promise<{ order: Order; items: OrderItem[] }> => {
      const orderId = `ord-${Date.now()}`;
      const randStr = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `UG-${new Date().getFullYear()}-${randStr}`;
      const createdAt = new Date().toISOString();
      const status = 'pending';
      const paymentStatus = order.paymentMethod === 'cod' ? 'unpaid' : 'unpaid';
      await query(
        `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_area, delivery_charges, subtotal, discount, coupon_code, total_amount, payment_method, payment_status, status, notes, estimated_delivery_time, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          orderId,
          orderNumber,
          order.customerId,
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          order.shippingAddress,
          order.shippingCity,
          order.shippingArea,
          order.deliveryCharges,
          order.subtotal,
          order.discount,
          order.couponCode,
          order.totalAmount,
          order.paymentMethod,
          paymentStatus,
          status,
          order.notes,
          order.estimatedDeliveryTime,
          createdAt
        ]
      );
      const finalItems: OrderItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const itemId = `oi-${orderId}-${i}`;
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, sku, quantity, price, total_price, variant_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [itemId, orderId, it.productId, it.productName, it.sku, it.quantity, it.price, it.totalPrice, it.variantName]
        );
        finalItems.push({ ...it, id: itemId, orderId });
      }
      return { order: { ...order, id: orderId, orderNumber, status, paymentStatus, createdAt } as Order, items: finalItems };
    },
    updateStatus: async (orderId: string, status: string, paymentStatus?: string, notes?: string): Promise<Order | null> => {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 2;
      if (status) { fields.push(`status = $${idx++}`); values.push(status); }
      if (paymentStatus) { fields.push(`payment_status = $${idx++}`); values.push(paymentStatus); }
      if (notes) { fields.push(`notes = $${idx++}`); values.push(notes); }
      if (fields.length === 0) return null;
      await query(`UPDATE orders SET ${fields.join(', ')} WHERE id = $1`, [orderId, ...values]);
      // Stock adjustments – simplified version (only on confirmed status)
      if (status === 'confirmed') {
        const items = await db.orders.findItems(orderId);
        for (const item of items) {
          await query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.productId]);
          await query('INSERT INTO inventory_movements (id, product_id, quantity, type, notes) VALUES ($1,$2,$3,$4,$5)', [`im-${Date.now()}-${item.productId}`, item.productId, -item.quantity, 'sale_deduction', `Deducted for order ${orderId}`]);
        }
      }
      if (status === 'cancelled') {
        const items = await db.orders.findItems(orderId);
        for (const item of items) {
          await query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.productId]);
          await query('INSERT INTO inventory_movements (id, product_id, quantity, type, notes) VALUES ($1,$2,$3,$4,$5)', [`im-${Date.now()}-${item.productId}`, item.productId, item.quantity, 'sale_restore', `Restored for cancelled order ${orderId}`]);
        }
      }
      const rows = await query<Order>('SELECT * FROM orders WHERE id = $1', [orderId]);
      return rows[0] ?? null;
    }
  },
  // PAYMENT LOGS ------------------------------------------------------
  paymentLogs: {
    findMany: async (): Promise<PaymentLog[]> => query<PaymentLog>('SELECT * FROM payment_logs'),
    create: async (log: Omit<PaymentLog, 'id' | 'createdAt'>): Promise<PaymentLog> => {
      const id = `pl-${Date.now()}`;
      const createdAt = new Date().toISOString();
      await query('INSERT INTO payment_logs (id, order_id, payment_method, amount, status, created_at) VALUES ($1,$2,$3,$4,$5,$6)', [id, log.orderId, log.paymentMethod, log.amount, log.status, createdAt]);
      return { ...log, id, createdAt } as PaymentLog;
    }
  },
  // INVENTORY MOVEMENTS ----------------------------------------------
  inventoryMovements: {
    findMany: async (): Promise<InventoryMovement[]> => query<InventoryMovement>('SELECT * FROM inventory_movements'),
    log: async (mov: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> => {
      const id = `im-${Date.now()}`;
      const createdAt = new Date().toISOString();
      await query('INSERT INTO inventory_movements (id, product_id, quantity, type, reference_id, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, mov.productId, mov.quantity, mov.type, mov.referenceId, mov.notes, createdAt]);
      return { ...mov, id, createdAt } as InventoryMovement;
    }
  },
  // REPORTS -----------------------------------------------------------
  reports: {
    getDashboardStats: async (): Promise<DashboardStats> => {
      const today = await query<any>(`
        SELECT COALESCE(SUM(total_amount), 0) AS sales, COUNT(*) AS orders 
        FROM orders 
        WHERE created_at >= CURRENT_DATE AND status != 'cancelled'
      `);
      const month = await query<any>(`
        SELECT COALESCE(SUM(total_amount), 0) AS sales, COUNT(*) AS orders 
        FROM orders 
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status != 'cancelled'
      `);
      const lowStock = await query<any>(`
        SELECT COUNT(*) AS count 
        FROM products 
        WHERE stock_quantity <= min_stock_alert AND active = true
      `);
      const pendingPay = await query<any>(`
        SELECT COUNT(*) AS count 
        FROM orders 
        WHERE payment_status = 'pending' AND status != 'cancelled'
      `);
      const paymentMethods = await query<any>(`
        SELECT payment_method AS method, COALESCE(SUM(total_amount), 0) AS total 
        FROM orders 
        WHERE status != 'cancelled' 
        GROUP BY payment_method
      `);
      const trend = await query<any>(`
        SELECT 
          to_char(d, 'YYYY-MM-DD') AS date,
          COALESCE(SUM(o.total_amount), 0)::numeric AS amount,
          COUNT(o.id)::integer AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
        LEFT JOIN orders o ON date_trunc('day', o.created_at) = d AND o.status != 'cancelled'
        GROUP BY d
        ORDER BY d
      `);
      const topProds = await query<any>(`
        SELECT 
          p.name, 
          SUM(oi.quantity)::integer AS quantity, 
          SUM(oi.quantity * oi.price)::numeric AS revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
        LIMIT 5
      `);
      const catSales = await query<any>(`
        SELECT 
          c.name, 
          SUM(oi.quantity * oi.price)::numeric AS value
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        GROUP BY c.id, c.name
      `);

      return {
        todaySales: Number(today[0]?.sales || 0),
        todayOrders: Number(today[0]?.orders || 0),
        monthlySales: Number(month[0]?.sales || 0),
        monthlyOrders: Number(month[0]?.orders || 0),
        lowStockCount: Number(lowStock[0]?.count || 0),
        pendingPaymentsCount: Number(pendingPay[0]?.count || 0),
        revenueByPaymentMethod: paymentMethods.map((pm: any) => ({ method: pm.method, total: Number(pm.total) })),
        salesTrend: trend.map((t: any) => ({ date: t.date, amount: Number(t.amount), count: Number(t.count) })),
        topProducts: topProds.map((tp: any) => ({ name: tp.name, quantity: Number(tp.quantity), revenue: Number(tp.revenue) })),
        categorySales: catSales.map((cs: any) => ({ name: cs.name, value: Number(cs.value) }))
      };
    }
  }
};
