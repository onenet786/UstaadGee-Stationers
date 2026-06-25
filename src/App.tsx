import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, ArrowUpDown, Filter, AlertTriangle, Sparkles, Phone, MessageSquare, 
  MapPin, Check, RefreshCw, X, ShoppingBag, ShieldAlert, BookOpen, Star, HelpCircle, ArrowRight
} from 'lucide-react';

import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import HeroBanner from './components/HeroBanner';
import OrderTrack from './components/OrderTrack';
import ProductDetailModal from './components/ProductDetailModal';
import AdminPanel from './components/AdminPanel';

import { Product, Category, Brand, DeliveryArea, ShopSettings, Banner, User } from './types';

export default function App() {
  // Store collections state
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // Filter and Catalog Controls
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'name'>('featured');

  // Application layouts state
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Cart Line items
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number; variantName?: string }[]>([]);

  // Authenticated sessions
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Checkout order confirmation success modal
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  // Authentication forms
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Init & sync Catalog Data from backend
  const loadStorefrontData = async () => {
    try {
      // 1. Fetch categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) setCategories(await catRes.json());

      // 2. Fetch brands
      const brandRes = await fetch('/api/brands');
      if (brandRes.ok) setBrands(await brandRes.json());

      // 3. Fetch products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) setProducts(await prodRes.json());

      // 4. Fetch delivery areas
      const areaRes = await fetch('/api/delivery-areas');
      if (areaRes.ok) setDeliveryAreas(await areaRes.json());

      // 5. Fetch slides
      const bannerRes = await fetch('/api/banners');
      if (bannerRes.ok) setBanners(await bannerRes.json());

      // 6. Fetch shop settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) setSettings(await settingsRes.json());

    } catch (e) {
      console.error('Failed to sync stationery storefront data', e);
    }
  };

  // Check current session from localToken
  const loadUserSession = async () => {
    const token = localStorage.getItem('ustaad_token');
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        // Stale token
        localStorage.removeItem('ustaad_token');
      }
    } catch (err) {
      console.warn('Session verification error');
    }
  };

  useEffect(() => {
    loadStorefrontData();
    loadUserSession();

    // Sync cart from LocalStorage if exists
    const savedCart = localStorage.getItem('ustaad_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        localStorage.removeItem('ustaad_cart');
      }
    }
  }, []);

  // Sync cart shifts back to LocalStorage
  const updateCartState = (items: typeof cartItems) => {
    setCartItems(items);
    localStorage.setItem('ustaad_cart', JSON.stringify(items));
  };

  // Add to cart trigger
  const handleAddToCart = (product: Product, variantName?: string) => {
    const existingIdx = cartItems.findIndex(
      item => item.product.id === product.id && item.variantName === variantName
    );

    let updated = [...cartItems];
    if (existingIdx > -1) {
      updated[existingIdx].quantity += 1;
    } else {
      updated.push({ product, quantity: 1, variantName });
    }

    updateCartState(updated);
    setCartOpen(true); // Automatically slide open cart drawer for checkout visual!
  };

  // Update cart line item quantity
  const handleUpdateQty = (productId: string, qty: number, variantName?: string) => {
    const updated = cartItems.map(item => {
      if (item.product.id === productId && item.variantName === variantName) {
        return { ...item, quantity: qty };
      }
      return item;
    });
    updateCartState(updated);
  };

  // Remove cart line item
  const handleRemoveCartItem = (productId: string, variantName?: string) => {
    const updated = cartItems.filter(
      item => !(item.product.id === productId && item.variantName === variantName)
    );
    updateCartState(updated);
  };

  // Resolve banner slug navigation
  const handleBannerSelectCategory = (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (cat) {
      setActiveCategory(cat.id);
    }
  };

  // Authentication flow submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authTab === 'login' 
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword, phone: authPhone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('ustaad_token', data.token);
        setCurrentUser(data.user);
        setAuthSuccess('Authentication successful! Closing modal...');
        setTimeout(() => {
          setAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
          setAuthName('');
          setAuthPhone('');
          setAuthSuccess('');
        }, 1000);
      } else {
        setAuthError(data.error || 'Authentication failed. Please check inputs.');
      }
    } catch (err) {
      setAuthError('Connection error contacting server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ustaad_token');
    setCurrentUser(null);
    setAdminOpen(false);
  };

  // Place order success handler
  const handleCheckoutSuccess = (orderResponse: any) => {
    // Clear cart items
    updateCartState([]);
    // Show dynamic success modal containing generated invoice details
    setPlacedOrder(orderResponse.order);
  };

  // Direct WhatsApp support trigger
  const triggerWhatsApp = () => {
    const phoneNum = settings?.whatsApp || '+923334488205';
    const cleanNum = phoneNum.replace('+', '');
    const text = encodeURIComponent('Assalam-o-Alaikum! I am visiting UstaadGee Stationers website and would like to ask some questions regarding school/office products.');
    window.open(`https://wa.me/${cleanNum}?text=${text}`, '_blank');
  };

  // Submit contact message directly to admin logs
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess('Your support ticket has been logged successfully! Our Lahore desk will contact you shortly.');
    setContactName('');
    setContactMsg('');
    setTimeout(() => {
      setContactSuccess('');
      setContactOpen(false);
    }, 4000);
  };

  // FILTERING AND SORTING COMPUTATIONS
  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => {
    // 1. Category check
    if (activeCategory && p.categoryId !== activeCategory) return false;

    // 2. Search check (Name, SKU, description, barcode)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = p.name.toLowerCase().includes(q) || 
                      p.sku.toLowerCase().includes(q) || 
                      (p.description && p.description.toLowerCase().includes(q)) ||
                      (p.barcode && p.barcode.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // 3. Price Range check
    const currentPrice = p.discountPrice || p.salePrice;
    if (currentPrice > priceRange) return false;

    // 4. Brand selector
    if (selectedBrand && p.brandId !== selectedBrand) return false;

    // 5. Availability (In stock only)
    if (inStockOnly && p.stockQuantity <= 0) return false;

    return true;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.discountPrice || a.salePrice;
    const priceB = b.discountPrice || b.salePrice;

    if (sortBy === 'price_low') return priceA - priceB;
    if (sortBy === 'price_high') return priceB - priceA;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    
    // Featured default
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800" id="main-viewframe">
      
      {/* 1. Navbar Navigation */}
      <Navbar
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSearch={setSearchQuery}
        cartCount={cartItems.reduce((acc, it) => acc + it.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        user={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => { setAuthTab('login'); setAuthModalOpen(true); }}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenTrack={() => setTrackOpen(true)}
        onOpenContact={() => setContactOpen(true)}
      />

      {/* 2. Main content container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" id="catalog-workspace">
        
        {/* If Order tracking portal is toggled on, show tracking dashboard instead of catalog! */}
        {trackOpen ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
              <span className="text-xs font-bold text-gray-500">📍 Client Order Tracking System</span>
              <button 
                onClick={() => setTrackOpen(false)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition"
              >
                ← Return to Catalog Shop
              </button>
            </div>
            <OrderTrack />
          </div>
        ) : (
          /* Normal Shopping Mode */
          <div className="space-y-6">
            
            {/* Hero slide show banners */}
            {activeCategory === '' && searchQuery === '' && (
              <HeroBanner 
                banners={banners} 
                onSelectCategoryBySlug={handleBannerSelectCategory} 
              />
            )}

            {/* Quick Categories list with SVG visuals on top */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2" id="quick-categories">
              {(Array.isArray(categories) ? categories : []).map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`border rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-between space-y-2 h-28 ${
                    activeCategory === cat.id 
                      ? 'border-emerald-600 bg-white shadow-md text-emerald-800 font-extrabold' 
                      : 'border-gray-150 bg-white hover:bg-gray-50 hover:border-emerald-200'
                  }`}
                >
                  <img src={cat.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                  <span className="text-xs tracking-tight line-clamp-1">{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Catalog Grid Frame: Left filters sidebar (desktop) + Right catalog */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Left sidebar filters details */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5 lg:sticky lg:top-28" id="filters-sidebar">
                <div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
                  <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                    <span>Catalog Filters</span>
                  </span>
                  <button 
                    onClick={() => {
                      setActiveCategory('');
                      setSelectedBrand('');
                      setPriceRange(5000);
                      setInStockOnly(false);
                      setSearchQuery('');
                      setSortBy('featured');
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 font-bold transition flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                </div>

                {/* Sort Option */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Sort Catalog By</span>
                  </span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs outline-none focus:border-emerald-500 font-medium text-gray-700"
                  >
                    <option value="featured">🔥 Best Match / Featured</option>
                    <option value="price_low">💵 Price: Low to High</option>
                    <option value="price_high">💵 Price: High to Low</option>
                    <option value="name">🔤 Alphabetical Title</option>
                  </select>
                </div>

                {/* Price range meter slider */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[10px] uppercase font-black text-gray-400 tracking-wider">
                    <span>Max Price Range</span>
                    <span className="text-gray-900 font-black font-mono">Rs. {priceRange} PKR</span>
                  </div>
                  <input 
                    type="range" 
                    min={50} 
                    max={5000} 
                    step={50}
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="w-full accent-emerald-700 cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                    <span>Rs. 50</span>
                    <span>Rs. 5,000</span>
                  </div>
                </div>

                {/* Brand select list */}
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Stationery Brands</span>
                  </span>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                    <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1 text-gray-700">
                      <input 
                        type="radio" 
                        name="brand_filter"
                        checked={selectedBrand === ''}
                        onChange={() => setSelectedBrand('')}
                        className="text-emerald-600 focus:ring-emerald-500 rounded-full"
                      />
                      <span>All Brands</span>
                    </label>
                    {(Array.isArray(brands) ? brands : []).map(brand => (
                      <label key={brand.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1 text-gray-700">
                        <input 
                          type="radio" 
                          name="brand_filter"
                          checked={selectedBrand === brand.id}
                          onChange={() => setSelectedBrand(brand.id)}
                          className="text-emerald-600 focus:ring-emerald-500 rounded-full"
                        />
                        <span>{brand.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability check */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Hide Out-Of-Stock items</span>
                  </label>
                </div>
              </div>

              {/* Right Col: Catalog list */}
              <div className="lg:col-span-3 space-y-4" id="products-catalog-section">
                
                {/* Visual state headers */}
                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                  <span>Showing {sortedProducts.length} premium stationery items</span>
                  {activeCategory && (
                    <span className="bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                      Filter: {categories.find(c => c.id === activeCategory)?.name}
                    </span>
                  )}
                </div>

                {/* Cards grid */}
                {sortedProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                      <HelpCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-black text-gray-800">No stationery items found</h3>
                    <p className="text-xs text-gray-400 max-w-sm">
                      We couldn't match any products under current filters or search terms. Try modifying your price threshold or search query.
                    </p>
                    <button 
                      onClick={() => {
                        setActiveCategory('');
                        setSelectedBrand('');
                        setPriceRange(5000);
                        setSearchQuery('');
                        setInStockOnly(false);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {(Array.isArray(sortedProducts) ? sortedProducts : []).map((p) => {
                      const cat = categories.find(c => c.id === p.categoryId);
                      const brand = brands.find(b => b.id === p.brandId);
                      return (
                        <ProductCard
                          key={p.id}
                          product={p}
                          categoryName={cat?.name}
                          brandName={brand?.name}
                          onAddToCart={handleAddToCart}
                          onSelect={setSelectedProduct}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* 3. Floating WhatsApp Support widget button in bottom corner */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2" id="whatsapp-widget">
        <button 
          onClick={triggerWhatsApp}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group border border-emerald-400"
          title="Chat on WhatsApp"
        >
          <Phone className="w-5 h-5 fill-white" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-xs font-bold pr-1">
            Lahore Helpline
          </span>
        </button>
      </div>

      {/* 4. Auth Modal overlay */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-5 animate-fadeIn relative">
            <button 
              onClick={() => setAuthModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="font-black text-gray-950 text-base">UstaadGee Stationers Account</h3>
              <p className="text-[11px] text-gray-400 mt-1">Access orders tracking logs or sign-in as office manager</p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-gray-100 text-center font-bold text-xs">
              <button 
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
                className={`pb-2.5 transition ${authTab === 'login' ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-gray-400'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
                className={`pb-2.5 transition ${authTab === 'register' ? 'border-b-2 border-emerald-700 text-emerald-800' : 'text-gray-400'}`}
              >
                New Customer Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs font-semibold">
              {authTab === 'register' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ahmed Khan"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-400 mb-1">Contact Phone *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. 03331234567"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. admin@ustaadgee.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Secure Password *</label>
                <input 
                  type="password" 
                  required
                  placeholder="Password (e.g. admin)"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {authError && <p className="text-[10px] text-rose-600 font-semibold">{authError}</p>}
              {authSuccess && <p className="text-[10px] text-emerald-700 font-semibold">{authSuccess}</p>}

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl transition shadow-md"
              >
                {authTab === 'login' ? 'Confirm Login' : 'Register Account'}
              </button>

              {authTab === 'login' && (
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-150 text-[10px] text-gray-500 leading-normal">
                  💡 <b>Quick Admin login:</b> Use email <span className="font-mono font-bold text-gray-800">admin@ustaadgee.com</span> and password <span className="font-mono font-bold text-gray-800">admin</span> to test back-office fulfillment screens instantly!
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 5. Contact Shop Modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-fadeIn relative">
            <button 
              onClick={() => setContactOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-gray-950 text-sm uppercase">Contact UstaadGee Samanabad desk</h3>
            <p className="text-xs text-gray-500 leading-normal">
              Need quick quotation or customized bulk printout orders? Drop your number and requirements below, or text our WhatsApp.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">My phone/WhatsApp *</label>
                <input 
                  type="text" 
                  required
                  placeholder="0333..."
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-gray-400 mb-1">Message details *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="List items, paper types, or specific school book supplies..."
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {contactSuccess && <p className="text-[10px] text-emerald-700 font-bold">{contactSuccess}</p>}

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={triggerWhatsApp}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold py-2 rounded-xl text-xs transition"
                >
                  Direct WhatsApp
                </button>
                <button 
                  type="submit"
                  className="bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Log Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Checkout Success Confirmation Invoice Modal */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-scaleUp text-center relative max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-gray-950 text-base">Alhamdulillah! Order Placed Successfully</h3>
              <p className="text-xs text-gray-500">Your stationery order has been logged into our processing queue.</p>
            </div>

            {/* Invoice summary box */}
            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between font-mono font-bold text-gray-400">
                <span>ORDER NUMBER</span>
                <span className="text-gray-900">{placedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Recipient Name</span>
                <span className="font-bold text-gray-800">{placedOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping City</span>
                <span className="font-bold text-gray-800">{placedOrder.shippingCity}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Secure payment</span>
                <span className="font-bold uppercase text-gray-800">{placedOrder.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-950 border-t border-gray-200 pt-2">
                <span>Grand Total Payable</span>
                <span>Rs. {placedOrder.totalAmount} PKR</span>
              </div>
            </div>

            {placedOrder.paymentMethod === 'bank_transfer' ? (
              <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-xl text-left text-[11px] text-indigo-900 leading-normal space-y-1">
                <p className="font-bold">⚠️ IMPORTANT NEXT STEP FOR BANK TRANSFER:</p>
                <p>Please send <b>Rs. {placedOrder.totalAmount}</b> to our Meezan account, then go to <b>Track Order</b>, enter your order ID (<b>{placedOrder.orderNumber}</b>) and upload the receipt screenshot. This verifies your purchase immediately.</p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                🚀 A dispatch team member will contact you on your registered phone number <b>{placedOrder.customerPhone}</b> before delivery. Use <b>Track Order</b> at any time on our navigation bar.
              </p>
            )}

            <button
              onClick={() => {
                // If bank transfer, immediately open tracker, otherwise just close success modal
                if (placedOrder.paymentMethod === 'bank_transfer') {
                  setTrackOpen(true);
                }
                setPlacedOrder(null);
              }}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-emerald-700/15"
            >
              {placedOrder.paymentMethod === 'bank_transfer' ? 'Upload Meezan Bank Receipt Slip' : 'Return to Stationery Shop'}
            </button>
          </div>
        </div>
      )}

      {/* 7. Product details modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          category={categories.find(c => c.id === selectedProduct.categoryId)}
          brand={brands.find(b => b.id === selectedProduct.brandId)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* 8. Full Admin Back Office portal workspace */}
      {adminOpen && (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          categories={categories}
          brands={brands}
          deliveryAreas={deliveryAreas}
          onRefreshData={loadStorefrontData}
        />
      )}

      {/* 9. Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveCartItem}
        deliveryAreas={deliveryAreas}
        onCheckoutSuccess={handleCheckoutSuccess}
        user={currentUser}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 mt-auto" id="store-footer">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h3 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-6 h-6 bg-emerald-600 text-white flex items-center justify-center font-black rounded text-xs">UG</span>
              <span>UstaadGee Stationers</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Serving premium school, office, arts, photocopy, printing, and general stationery goods. Same day dispatch and fast door-to-door delivery in Lahore & across Pakistan.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Lahore Flagship</h4>
            <ul className="text-xs space-y-2 font-medium">
              <li>Poonch Road, Samanabad</li>
              <li>Lahore, Pakistan</li>
              <li>Helpline: +92 333 4488205</li>
              <li>WhatsApp Support: +92 333 4488205</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Useful Links</h4>
            <ul className="text-xs space-y-2 font-medium text-slate-400">
              <li><button onClick={() => { setTrackOpen(true); }} className="hover:text-emerald-400">Order Tracking Portal</button></li>
              <li><button onClick={() => { setContactOpen(true); }} className="hover:text-emerald-400">Quotation & Print requests</button></li>
              <li><button onClick={() => { setAuthTab('login'); setAuthModalOpen(true); }} className="hover:text-emerald-400">Staff Secure Portal</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Guaranteed Security</h4>
            <p className="text-xs leading-relaxed text-slate-400">
              Safe, automated parameter checking for local payment providers including Cash on Delivery, Easypaisa, and JazzCash. Offline bank receipt reconciliation is verified manually.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <span>© {new Date().getFullYear()} UstaadGee Stationers. All rights reserved.</span>
          <span>Crafted for high-performance retail & aaPanel production servers.</span>
        </div>
      </footer>

    </div>
  );
}
