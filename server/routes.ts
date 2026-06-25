import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { PaymentProcessor } from './payment.ts';
import { OrderStatus, PaymentStatus, PaymentMethod, UnitType, ProductVariant } from '../src/types.ts';
import bcrypt from 'bcryptjs';

export const apiRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: any;
  body?: any;
  params?: any;
}

// Middleware to parse simple token auth
const getAuthUser = async (req: Request) => {
  const token = req.headers.authorization;
  if (!token) return null;
  // Format is "Bearer <userId>" in our simulated frontend
  const userId = token.replace('Bearer ', '').trim();
  return await db.users.findFirst(u => u.id === userId);
};

const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: any) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    // Unauthorized or forbidden
    return res.status(401).json({ error: 'Access denied. Administrator privileges required.' });
  }
  req.user = user;
  next();
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.get('/health', async (req: Request, res: Response) => {
  try {
    await db.query('SELECT 1');
    res.json({ db: 'connected' });
  } catch (err) {
    console.error('Health check DB error:', err);
    res.status(500).json({ db: 'error', error: err.message || 'Unknown' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log('Login payload:', { email, password });
  const user = await db.users.findFirst(u => u.email.toLowerCase() === email.toLowerCase());
  console.log('User lookup - found:', !!user, 'stored hash:', user?.password);
  if (!user) {
    return res.status(401).json({ error: 'Account not found with this email address.' });
  }

  // Compare hashed password using bcrypt (fallback to plaintext for legacy accounts)
  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(password, user.password);
  } catch (_) { /* ignore */ }
  console.log('Password compare result:', passwordMatches);
  if (!passwordMatches && user.password === password) {
    passwordMatches = true;
    const newHash = await bcrypt.hash(password, 10);
    await db.users.update(user.id, { password: newHash });
  }
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }

  // Log successful login
  await db.auditLogs.create({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'User Login',
    details: `User successfully logged into the website as ${user.role}`
  });

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: `Bearer ${user.id}` });
});



apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required fields.' });
  }

  const exists = await db.users.findFirst(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  // Hash password before storing
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await db.users.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: 'customer',
    phone
  });

  await db.auditLogs.create({
    userId: newUser.id,
    userEmail: newUser.email,
    userRole: 'customer',
    action: 'User Registered',
    details: 'New customer account created via web storefront'
  });

  const { password: _, ...safeUser } = newUser;
  res.json({ user: safeUser, token: `Bearer ${newUser.id}` });
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated session' });
  }
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ==========================================
// STOREFRONT CATALOG ENDPOINTS
// ==========================================

apiRouter.get('/categories', async (req, res) => {
  const list = await db.categories.findMany();
  res.json(list);
});

apiRouter.get('/brands', async (req, res) => {
  const list = await db.brands.findMany();
  res.json(list);
});

apiRouter.get('/banners', async (req, res) => {
  const list = await db.banners.findMany();
  res.json(list);
});

apiRouter.get('/delivery-areas', async (req, res) => {
  const list = await db.deliveryAreas.findMany();
  res.json(list);
});

apiRouter.get('/settings', async (req, res) => {
  // Public settings mask secrets
  const privateSettings = await db.settings.get();
  const publicSettings = {
    shopName: privateSettings.shopName,
    phone: privateSettings.phone,
    whatsApp: privateSettings.whatsApp,
    address: privateSettings.address,
    city: privateSettings.city,
    currency: privateSettings.currency,
    freeDeliveryMin: privateSettings.freeDeliveryMin,
    codActive: privateSettings.codActive,
    cardActive: privateSettings.cardActive,
    easypaisaActive: privateSettings.easypaisa.active,
    jazzcashActive: privateSettings.jazzcash.active,
    bankTransfer: privateSettings.bankTransfer.active ? {
      bankName: privateSettings.bankTransfer.bankName,
      accountTitle: privateSettings.bankTransfer.accountTitle,
      iban: privateSettings.bankTransfer.iban,
      accountNumber: privateSettings.bankTransfer.accountNumber
    } : null
  };
  res.json(publicSettings);
});

// GET list of active storefront products with complex filters
apiRouter.get('/products', async (req: Request, res: Response) => {
  let list = await db.products.findMany();
  
  const { category, brand, search, minPrice, maxPrice, availability, featured } = req.query;

  // 1. Category Filter (by slug or ID)
  if (category) {
    const cats = await db.categories.findManyWithInactive();
    const catObj = cats.find(c => c.slug === category || c.id === category);
    if (catObj) {
      list = list.filter(p => p.categoryId === catObj.id);
    }
  }

  // 2. Brand Filter
  if (brand) {
    const brands = await db.brands.findManyWithInactive();
    const brandObj = brands.find(b => b.slug === brand || b.id === brand);
    if (brandObj) {
      list = list.filter(p => p.brandId === brandObj.id);
    }
  }

  // 3. Search Filter (name, SKU, description)
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }

  // 4. Featured filter
  if (featured === 'true') {
    list = list.filter(p => p.featured);
  }

  // 5. Price range
  if (minPrice) {
    list = list.filter(p => (p.discountPrice || p.salePrice) >= Number(minPrice));
  }
  if (maxPrice) {
    list = list.filter(p => (p.discountPrice || p.salePrice) <= Number(maxPrice));
  }

  // 6. Availability filter
  if (availability === 'in_stock') {
    list = list.filter(p => p.stockQuantity > 0);
  } else if (availability === 'low_stock') {
    list = list.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert);
  }

  res.json(list);
});

// GET single product detail
apiRouter.get('/products/:slug', async (req, res) => {
  const { slug } = req.params;
  const product = await db.products.findFirst(p => p.slug === slug && p.active);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  
  const categories = await db.categories.findManyWithInactive();
  const brands = await db.brands.findManyWithInactive();
  const category = categories.find(c => c.id === product.categoryId);
  const brand = brands.find(b => b.id === product.brandId);
  const reviews = await db.reviews.findByProduct(product.id);

  // Find related products (same category)
  const allProducts = await db.products.findMany();
  const related = allProducts
    .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  res.json({
    product,
    category,
    brand,
    reviews,
    related
  });
});

// ==========================================
// CHECKOUT & ORDER SYSTEM
// ==========================================

// Validate Coupon
apiRouter.post('/coupons/validate', async (req, res) => {
  const { code, cartSubtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

  const coupon = await db.coupons.findFirst(code);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid coupon code.' });
  }

  // Check expiry
  if (new Date(coupon.expiryDate).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This coupon has expired.' });
  }

  // Check usage limit
  if (coupon.usageCount >= coupon.usageLimit) {
    return res.status(400).json({ error: 'This coupon usage limit has been reached.' });
  }

  // Check minimum order value
  if (cartSubtotal < coupon.minOrderValue) {
    return res.status(400).json({ error: `This coupon requires a minimum purchase of Rs. ${coupon.minOrderValue}` });
  }

  res.json({ success: true, coupon });
});

// Place Order
apiRouter.post('/orders', async (req: Request, res: Response) => {
  const {
    customerName, customerEmail, customerPhone,
    shippingAddress, shippingCity, shippingArea, deliveryAreaId,
    couponCode, notes, cartItems
  } = req.body;

  if (!customerName || !customerPhone || !shippingAddress || !deliveryAreaId || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'Missing shipping details or empty cart.' });
  }

  // Resolve user session if any
  const user = await getAuthUser(req);
  const customerId = user ? user.id : 'guest';

  // Calculate prices
  let subtotal = 0;
  const itemsToCreate: any[] = [];

  for (const item of cartItems) {
    const prod = await db.products.findFirst(p => p.id === item.productId && p.active);
    if (!prod) {
      return res.status(400).json({ error: `Product with ID ${item.productId} is not available.` });
    }

    // Verify stock availability
    if (prod.stockQuantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for "${prod.name}". Only ${prod.stockQuantity} remaining.` });
    }

    // Check variant stock
    if (item.variantName) {
      const v = prod.variants.find(vr => vr.name === item.variantName);
      if (v && v.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for "${prod.name} (${item.variantName})". Only ${v.stock} remaining.` });
      }
    }

    const price = prod.discountPrice || prod.salePrice;
    const totalPrice = price * item.quantity;
    subtotal += totalPrice;

    itemsToCreate.push({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: item.quantity,
      price,
      totalPrice,
      variantName: item.variantName
    });
  }

  // Apply Coupon Discount
  let discount = 0;
  if (couponCode) {
    const coupon = await db.coupons.findFirst(couponCode);
    if (coupon && subtotal >= coupon.minOrderValue && coupon.usageCount < coupon.usageLimit) {
      if (coupon.type === 'percentage') {
        discount = Math.round((subtotal * coupon.value) / 100);
      } else {
        discount = coupon.value;
      }
      await db.coupons.incrementUsage(couponCode);
    }
  }

  // Get delivery charge
  const deliveryAreas = await db.deliveryAreas.findManyWithInactive();
  const deliveryArea = deliveryAreas.find(da => da.id === deliveryAreaId);
  if (!deliveryArea) {
    return res.status(400).json({ error: 'Invalid delivery area/city selected.' });
  }

  const settings = await db.settings.get();
  // Free delivery logic
  let deliveryCharges = deliveryArea.charges;
  if (subtotal >= settings.freeDeliveryMin && deliveryCharges > 0) {
    deliveryCharges = 0;
  }

  const totalAmount = Math.max(0, subtotal - discount + deliveryCharges);
  const paymentMethod: PaymentMethod = req.body.paymentMethod || 'cod';

  // Create Order
  const { order, items } = await db.orders.create({
    customerId,
    customerName,
    customerEmail: customerEmail || 'guest@ustaadgee.com',
    customerPhone,
    shippingAddress,
    shippingCity: deliveryArea.city,
    shippingArea: deliveryArea.areaName,
    deliveryCharges,
    subtotal,
    discount,
    couponCode: couponCode || undefined,
    totalAmount,
    paymentMethod,
    notes,
    estimatedDeliveryTime: deliveryArea.estDays
  }, itemsToCreate);

  // Initiate Payment Gateway session if needed
  const paymentRes = await PaymentProcessor.initiatePayment(order);

  res.json({
    success: true,
    message: 'Order placed successfully!',
    order,
    items,
    payment: paymentRes
  });
});

// Track Order by Number
apiRouter.get('/orders/track/:number', async (req, res) => {
  const { number } = req.params;
  const order = await db.orders.findFirst(o => o.orderNumber.toUpperCase() === number.toUpperCase());
  if (!order) {
    return res.status(404).json({ error: 'Order not found. Please verify the order number (e.g. UG-2026-XXXX)' });
  }
  const items = await db.orders.findItems(order.id);
  res.json({ order, items });
});

// Customer History
apiRouter.get('/orders/customer/:customerId', async (req, res) => {
  const { customerId } = req.params;
  const list = await db.orders.findManyByCustomer(customerId);
  res.json(list);
});

// Customer Bank Payment Proof Upload
apiRouter.post('/orders/:id/upload-proof', async (req, res) => {
  const { id } = req.params;
  const { screenshotUrl } = req.body;
  
  if (!screenshotUrl) {
    return res.status(400).json({ error: 'Proof screenshot URL is required.' });
  }

  const updated = await PaymentProcessor.processManualBankProof(id, screenshotUrl);
  if (!updated) {
    return res.status(400).json({ error: 'Failed to upload proof. Order not found or not set to Bank Transfer.' });
  }

  res.json({ success: true, order: updated, message: 'Transfer receipt successfully uploaded. Under review by staff.' });
});

// Submit review
apiRouter.post('/reviews', async (req, res) => {
  const { productId, rating, comment } = req.body;
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'You must be logged in to leave reviews.' });
  }

  const newReview = await db.reviews.create({
      productId,
      userId: user.id,
      userName: user.name,
      rating: Number(rating),
      comment,
      status: 'pending'
    });

  res.json({ success: true, review: newReview, message: 'Thank you! Your review has been submitted successfully.' });
});

// Contact Support / Send message
apiRouter.post('/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required fields.' });
  }

  const msgObj = await db.messages.create({
    name,
    email,
    phone: phone || '',
    subject: subject || 'Store Inquiry',
    message
  });

  res.json({ success: true, message: 'Your message has been received. Our team will contact you shortly.', id: msgObj.id });
});

// Wishlist toggle
apiRouter.post('/wishlist/toggle', async (req, res) => {
  const { productId } = req.body;
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });

  const wishlist = await db.wishlist.getUserWishlist(user.id);
  const exists = wishlist.some(w => w.productId === productId);
  if (exists) {
    await db.wishlist.remove(user.id, productId);
    res.json({ added: false });
  } else {
    await db.wishlist.add(user.id, productId);
    res.json({ added: true });
  }
});

apiRouter.get('/wishlist', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });

  const wishlist = await db.wishlist.getUserWishlist(user.id);
  const allProducts = await db.products.findManyWithInactive();
  const products = wishlist.map(w => allProducts.find(p => p.id === w.productId)).filter(Boolean);
  res.json(products);
});

// ==========================================
// PAYMENT GATEWAY REDIRECT SIMULATION
// ==========================================

// Render a responsive HTML simulated payment portal inside iframe/tab
apiRouter.get('/payments/:gateway/simulate-gateway', async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const { orderId, amount, txnId, storeId } = req.query;

  const order = await db.orders.findFirst(o => o.id === String(orderId));
  if (!order) {
    return res.send('<h3>Critical Error: Order reference not found inside gateway.</h3>');
  }

  let title = 'Secure Payment Gateway';
  let themeColor = 'bg-slate-800';
  let branding = 'General Gateway';

  if (gateway === 'easypaisa') {
    title = 'Easypaisa Hosted Checkout';
    themeColor = 'bg-emerald-600';
    branding = 'Easypaisa Merchant API';
  } else if (gateway === 'jazzcash') {
    title = 'JazzCash SafePay Checkout';
    themeColor = 'bg-red-600';
    branding = 'JazzCash Hosted Portal';
  } else if (gateway === 'card') {
    title = 'Secure Card Checkout';
    themeColor = 'bg-blue-600';
    branding = 'Visa / Mastercard secure';
  }

  // HTML response with styled UI simulating payment flow
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full overflow-hidden">
        
        <!-- Header -->
        <div class="${themeColor} text-white p-6 text-center">
          <h2 class="text-2xl font-bold tracking-tight">${title}</h2>
          <p class="text-xs text-opacity-80 mt-1">${branding}</p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Summary Card -->
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Merchant:</span>
              <span class="font-semibold text-gray-800">UstaadGee Stationers</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Order Number:</span>
              <span class="font-semibold text-gray-800">${order.orderNumber}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Transaction ID:</span>
              <span class="font-mono text-gray-700 font-semibold">${txnId}</span>
            </div>
            ${storeId ? `
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Store ID:</span>
              <span class="font-semibold text-gray-800">${storeId}</span>
            </div>
            ` : ''}
            <div class="border-t border-gray-200 my-2 pt-2 flex justify-between">
              <span class="text-base font-bold text-gray-900">Total Amount:</span>
              <span class="text-lg font-extrabold text-gray-900">Rs. ${amount} PKR</span>
            </div>
          </div>

          <!-- Simulation inputs -->
          <form id="paymentForm" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">
                ${gateway === 'card' ? 'Credit/Debit Card Number' : 'Mobile Account Number'}
              </label>
              <input 
                type="text" 
                value="${gateway === 'card' ? '4242 •••• •••• 4242' : order.customerPhone}" 
                class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-800 text-sm font-semibold focus:outline-none"
                disabled
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Security PIN / CVV
              </label>
              <input 
                type="password" 
                placeholder="••••" 
                maxlength="4" 
                value="1234"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
            </div>

            <!-- Action buttons -->
            <div class="pt-2 flex flex-col gap-2">
              <button 
                type="button"
                onclick="submitPayment('SUCCESS')"
                class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition duration-150 text-sm"
              >
                ✓ Authorize & Pay Rs. ${amount}
              </button>
              <button 
                type="button"
                onclick="submitPayment('FAILED')"
                class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 text-xs text-opacity-90"
              >
                ✗ Simulate Transaction Decline
              </button>
            </div>
          </form>

          <!-- Disclaimer -->
          <p class="text-[11px] text-gray-400 text-center leading-relaxed">
            This is an integration-ready simulation of the <b>${gateway.toUpperCase()}</b> Merchant Portal. 
            Clicking Authorize executes secure callbacks back to UstaadGee's billing core.
          </p>
        </div>

      </div>

      <script>
        function submitPayment(status) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/api/payments/${gateway}/callback';

          const params = {
            orderId: '${orderId}',
            txnId: '${txnId}',
            status: status,
            hash: 'MOCK_SHA_256_VERIFIED_CALLBACK'
          };

          for (const key in params) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = params[key];
            form.appendChild(input);
          }

          document.body.appendChild(form);
          form.submit();
        }
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Payment Callback Webhook
apiRouter.post('/payments/:gateway/callback', async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const { orderId, txnId, status, hash } = req.body;

  const code = status === 'SUCCESS' ? '000' : '999';

  const result = await PaymentProcessor.verifyCallback(orderId, txnId, code, hash);

  // Return elegant post-payment response to customer
  const successHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Status</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full p-6 text-center space-y-4">
        ${result.success ? `
          <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full text-3xl font-bold">✓</div>
          <h2 class="text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            Thank you! Your payment of <b>Rs. ${result.order?.totalAmount} PKR</b> was received. 
            Your order <b>${result.order?.orderNumber}</b> is now <b>Confirmed</b> and under process.
          </p>
        ` : `
          <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full text-3xl font-bold">✗</div>
          <h2 class="text-2xl font-bold text-gray-900">Payment Failed</h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            The transaction was declined or cancelled. You can retry paying from your orders history tab.
          </p>
        `}
        <div class="pt-4 border-t border-gray-100">
          <button 
            onclick="closeGateway()" 
            class="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Return to Store
          </button>
        </div>
      </div>
      <script>
        function closeGateway() {
          // Send back messages or redirect
          window.location.href = '/?order_tracking=${result.order?.orderNumber || ""}';
        }
      </script>
    </body>
    </html>
  `;
  res.send(successHtml);
});

// ==========================================
// ADMIN DASHBOARD & REPORTS (PROTECTED)
// ==========================================

apiRouter.get('/admin/stats', requireAdmin, async (req, res) => {
  const stats = await db.reports.getDashboardStats();
  res.json(stats);
});

apiRouter.get('/admin/audit-logs', requireAdmin, async (req, res) => {
  const logs = await db.auditLogs.findMany();
  res.json(logs);
});

apiRouter.get('/admin/inventory-movements', requireAdmin, async (req, res) => {
  const movements = await db.inventoryMovements.findMany();
  res.json(movements);
});

apiRouter.get('/admin/messages', requireAdmin, async (req, res) => {
  const msgs = await db.messages.findMany();
  res.json(msgs);
});

apiRouter.put('/admin/messages/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await db.messages.updateStatus(id, status);
  res.json({ success: true, message: updated });
});

apiRouter.get('/admin/settings', requireAdmin, async (req, res) => {
  const settings = await db.settings.get();
  res.json(settings);
});

apiRouter.put('/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const settings = await db.settings.update(req.body);
  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Update Settings',
    details: 'Shop configurations and payment credentials modified via settings portal.'
  });
  res.json({ success: true, settings });
});

// Admin product lists
apiRouter.get('/admin/products', requireAdmin, async (req, res) => {
  const list = await db.products.findManyWithInactive();
  res.json(list);
});

apiRouter.post('/admin/products', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, categoryId, salePrice, costPrice, stockQuantity, minStockAlert, description, unitType, variants, images, featured, active, brandId, barcode } = req.body;
  
  if (!name || !categoryId || !salePrice || stockQuantity === undefined) {
    return res.status(400).json({ error: 'Name, Category, Sale Price, and Stock Quantity are required.' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const sku = `PROD-${Date.now().toString().slice(-6)}`;

  const product = await db.products.create({
    name,
    slug,
    sku,
    barcode: barcode || undefined,
    categoryId,
    brandId: brandId || undefined,
    description: description || '',
    images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'],
    costPrice: Number(costPrice || 0),
    salePrice: Number(salePrice),
    discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
    stockQuantity: Number(stockQuantity),
    minStockAlert: Number(minStockAlert || 5),
    unitType: (unitType as UnitType) || 'piece',
    variants: (variants as ProductVariant[]) || [],
    active: active !== undefined ? active : true,
    featured: featured !== undefined ? featured : false
  });

  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Create Product',
    details: `Added new product "${name}" to stock (SKU: ${product.sku}, Stock: ${product.stockQuantity})`
  });

  res.json({ success: true, product });
});

apiRouter.put('/admin/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const oldProduct = await db.products.findManyWithInactive().then(list => list.find(p => p.id === id));
  if (!oldProduct) return res.status(404).json({ error: 'Product not found' });

  const updated = await db.products.update(id, req.body);
  
  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Update Product',
    details: `Modified product details for "${oldProduct.name}" (SKU: ${oldProduct.sku})`
  });

  res.json({ success: true, product: updated });
});

apiRouter.delete('/admin/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const product = await db.products.findManyWithInactive().then(list => list.find(p => p.id === id));
  if (!product) return res.status(404).json({ error: 'Product not found' });

  await db.products.delete(id);
  
  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Soft-Delete Product',
    details: `Deactivated product "${product.name}"`
  });

  res.json({ success: true, message: 'Product deactivated successfully.' });
});

// Admin Categories CRUD
apiRouter.get('/admin/categories', requireAdmin, (req, res) => {
  res.json(db.categories.findManyWithInactive());
});

apiRouter.post('/admin/categories', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, image, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const cat = await db.categories.create({
    name,
    slug,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
    active: active !== undefined ? active : true
  });

  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Create Category',
    details: `Added new category "${name}"`
  });

  res.json({ success: true, category: cat });
});

apiRouter.put('/admin/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await db.categories.update(id, req.body);
  res.json({ success: true, category: updated });
});

// Admin Orders Management
apiRouter.get('/admin/orders', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  // fetch orders (async)
  const orders = await db.orders.findMany();
  // enhance each order with its items (async)
  const enhancedOrders = await Promise.all(
    orders.map(async (o) => ({
      ...o,
      items: await db.orders.findItems(o.id),
    }))
  );
  res.json(enhancedOrders);
});

apiRouter.put('/admin/orders/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, paymentStatus, notes } = req.body;

  const order = await db.orders.findFirst(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const updated = await db.orders.updateStatus(id, status as OrderStatus, paymentStatus as PaymentStatus, notes);
  
  await db.auditLogs.create({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: 'admin',
    action: 'Update Order Status',
    details: `Changed order ${order.orderNumber} status from "${order.status}" to "${status}" (Payment status: ${paymentStatus})`
  });

  res.json({ success: true, order: updated });
});

apiRouter.post('/admin/orders/:id/review-bank-proof', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { approve } = req.body; // boolean

  const updated = await PaymentProcessor.reviewManualBankProof(
    id, 
    approve, 
    req.user.id, 
    req.user.email
  );

  if (!updated) {
    return res.status(400).json({ error: 'Failed to process bank proof.' });
  }

  res.json({ success: true, order: updated });
});

// Admin Delivery Areas
apiRouter.get('/admin/delivery-areas', requireAdmin, (req, res) => {
  res.json(db.deliveryAreas.findManyWithInactive());
});

apiRouter.post('/admin/delivery-areas', requireAdmin, async (req: Request, res: Response) => {
  const { city, areaName, charges, estDays, active } = req.body;
  if (!city || !areaName || charges === undefined) {
    return res.status(400).json({ error: 'City, Area name, and Charges are required.' });
  }
  const da = await db.deliveryAreas.create({
    city,
    areaName,
    charges: Number(charges),
    estDays: estDays || '1-2 Days',
    active: active !== undefined ? active : true
  });
  res.json({ success: true, deliveryArea: da });
});

apiRouter.put('/admin/delivery-areas/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await db.deliveryAreas.update(id, req.body);
  res.json({ success: true, deliveryArea: updated });
});
