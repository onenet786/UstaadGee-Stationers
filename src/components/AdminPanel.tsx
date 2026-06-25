import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, FolderTree, ShoppingCart, Truck, Settings, ShieldAlert,
  Plus, Search, Edit2, Trash2, Check, X, CheckSquare, AlertTriangle, FileText, BarChart2, ListFilter, RotateCcw,
  User, CheckCircle2, RefreshCw, Eye, ExternalLink, Calendar
} from 'lucide-react';
import { Product, Category, Brand, Order, DeliveryArea, ShopSettings, AuditLog, InventoryMovement, DashboardStats } from '../types';

interface AdminPanelProps {
  onClose: () => void;
  categories: Category[];
  brands: Brand[];
  deliveryAreas: DeliveryArea[];
  onRefreshData: () => void;
}

type AdminTab = 'dashboard' | 'products' | 'categories' | 'orders' | 'areas' | 'settings' | 'logs';

export default function AdminPanel({
  onClose,
  categories,
  brands,
  deliveryAreas,
  onRefreshData
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Stats & listings from backend API
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms states
  const [searchQuery, setSearchQuery] = useState('');
  
  // Product Form (Create/Edit)
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodBrandId, setProdBrandId] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState(0);
  const [prodSalePrice, setProdSalePrice] = useState(0);
  const [prodDiscPrice, setProdDiscPrice] = useState('');
  const [prodStock, setProdStock] = useState(0);
  const [prodMinStock, setProdMinStock] = useState(5);
  const [prodUnit, setProdUnit] = useState<'piece' | 'box' | 'dozen' | 'packet' | 'ream'>('piece');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodActive, setProdActive] = useState(true);
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodVariantsInput, setProdVariantsInput] = useState(''); // comma-separated e.g. "Blue Ink, Black Ink"

  // Category Form
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('');

  // Zone/Area Form
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [areaCity, setAreaCity] = useState('Lahore');
  const [areaName, setAreaName] = useState('');
  const [areaCharges, setAreaCharges] = useState(150);
  const [areaEst, setAreaEst] = useState('1-2 Days');

  // Selected Order details modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Token helper
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('ustaad_token') || ''
    };
  };

  // Fetch admin stats and collections
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      
      // Load Dashboard Stats
      const statsRes = await fetch('/api/admin/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load products list
      const prodRes = await fetch('/api/admin/products', { headers });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Load full categories list (including inactive)
      const catRes = await fetch('/api/admin/categories', { headers });
      if (catRes.ok) {
        const catData = await catRes.json();
        setAllCategories(catData);
      }

      // Load delivery areas list (including inactive)
      const areaRes = await fetch('/api/admin/delivery-areas', { headers });
      if (areaRes.ok) {
        const areaData = await areaRes.json();
        setAreas(areaData);
      }

      // Load settings
      const setRes = await fetch('/api/admin/settings', { headers });
      if (setRes.ok) {
        const setData = await setRes.json();
        setShopSettings(setData);
      }

      // Load Orders (expanded with items)
      const ordRes = await fetch('/api/admin/orders', { headers });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData);
      }

      // Load audit logs
      const logRes = await fetch('/api/admin/audit-logs', { headers });
      if (logRes.ok) {
        const logData = await logRes.json();
        setAuditLogs(logData);
      }

      // Load inventory history
      const movRes = await fetch('/api/admin/inventory-movements', { headers });
      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData);
      }

    } catch (e) {
      console.error('Failed to load admin panel details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  // Product submit (Create/Update)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    const variants = prodVariantsInput.split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(name => ({ name, stock: Math.floor(prodStock / (prodVariantsInput.split(',').length || 1)) }));

    const payload = {
      name: prodName,
      categoryId: prodCatId,
      brandId: prodBrandId || undefined,
      barcode: prodBarcode || undefined,
      costPrice: Number(prodCostPrice),
      salePrice: Number(prodSalePrice),
      discountPrice: prodDiscPrice ? Number(prodDiscPrice) : undefined,
      stockQuantity: Number(prodStock),
      minStockAlert: Number(prodMinStock),
      unitType: prodUnit,
      description: prodDesc,
      featured: prodFeatured,
      active: prodActive,
      images: prodImgUrl ? [prodImgUrl] : undefined,
      variants
    };

    try {
      const url = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setProductFormOpen(false);
        resetProductForm();
        loadAdminData();
        onRefreshData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit product.');
      }
    } catch (err) {
      alert('Network error submitting product.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCatId('');
    setProdBrandId('');
    setProdBarcode('');
    setProdCostPrice(0);
    setProdSalePrice(0);
    setProdDiscPrice('');
    setProdStock(0);
    setProdMinStock(5);
    setProdUnit('piece');
    setProdDesc('');
    setProdFeatured(false);
    setProdActive(true);
    setProdImgUrl('');
    setProdVariantsInput('');
  };

  const handleEditProductClick = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCatId(p.categoryId);
    setProdBrandId(p.brandId || '');
    setProdBarcode(p.barcode || '');
    setProdCostPrice(p.costPrice);
    setProdSalePrice(p.salePrice);
    setProdDiscPrice(p.discountPrice?.toString() || '');
    setProdStock(p.stockQuantity);
    setProdMinStock(p.minStockAlert);
    setProdUnit(p.unitType);
    setProdDesc(p.description);
    setProdFeatured(p.featured);
    setProdActive(p.active);
    setProdImgUrl(p.images[0] || '');
    setProdVariantsInput((Array.isArray(p.variants) ? p.variants : []).map(v => v.name).join(', ') || '');
    setProductFormOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product? It will hide it from the storefront.')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        loadAdminData();
        onRefreshData();
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  // Category Submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: catName, description: catDesc, image: catImg || undefined })
      });
      if (res.ok) {
        setCategoryFormOpen(false);
        setCatName('');
        setCatDesc('');
        setCatImg('');
        loadAdminData();
        onRefreshData();
      }
    } catch (err) {
      alert('Error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Zone Area Submit
  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/delivery-areas', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ city: areaCity, areaName, charges: Number(areaCharges), estDays: areaEst })
      });
      if (res.ok) {
        setAreaFormOpen(false);
        setAreaName('');
        setAreaCharges(150);
        loadAdminData();
      }
    } catch (e) {
      alert('Error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Order status transitions
  const handleUpdateOrderStatus = async (orderId: string, status: string, paymentStatus: string, notes?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status, paymentStatus, notes })
      });
      if (res.ok) {
        const data = await res.json();
        // Update selected order detail if open
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: data.order.status, paymentStatus: data.order.paymentStatus }));
        }
        loadAdminData();
      }
    } catch (err) {
      alert('Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  // Bank slip manual receipt verification
  const handleReviewBankProof = async (orderId: string, approve: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/review-bank-proof`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ approve })
      });
      if (res.ok) {
        const data = await res.json();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: data.order.status, paymentStatus: data.order.paymentStatus, paymentProofUrl: data.order.paymentProofUrl }));
        }
        loadAdminData();
        alert(approve ? 'Receipt Approved! Order has been set to Confirmed & Paid.' : 'Receipt Rejected.');
      }
    } catch (err) {
      alert('Error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Settings update
  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopSettings) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(shopSettings)
      });
      if (res.ok) {
        alert('Shop settings and API gateway parameters updated successfully on server.');
        loadAdminData();
      }
    } catch (e) {
      alert('Error.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex overflow-hidden font-sans" id="admin-panel-portal">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0" id="admin-sidebar">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 text-white font-black text-lg flex items-center justify-center rounded-lg">UG</div>
            <div>
              <h3 className="text-white text-sm font-black tracking-tight leading-none">UstaadGee Admin</h3>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Office Core</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'products' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Manage Products</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'categories' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Categories & Brands</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order Fulfilment</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('areas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'areas' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Delivery Zones</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'logs' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Trails & Stocks</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Payment & Shop settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom footer */}
        <div className="p-4 border-t border-slate-850 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xs uppercase">
              UA
            </div>
            <div className="text-[10px]">
              <p className="text-white font-bold leading-none">Ustaad Admin</p>
              <span className="text-slate-500 font-medium">admin@ustaadgee.com</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-bold py-2 px-3 rounded-xl text-[11px] transition"
          >
            Exit Admin Area
          </button>
        </div>
      </aside>

      {/* Main Panel Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        {/* Top Header bar */}
        <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-gray-950 uppercase tracking-tight capitalize">
              {activeTab} Workspace
            </h1>
            {loading && <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadAdminData}
              className="p-1.5 hover:bg-gray-150 rounded-full text-gray-500 transition"
              title="Sync Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 font-mono">
              Server Time: {new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
            </span>
          </div>
        </header>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ======================================================== */}
          {/* VIEW 1: DASHBOARD                                        */}
          {/* ======================================================== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Counters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Today's Sales Revenue</span>
                  <div className="text-xl font-black text-gray-900">Rs. {stats.todaySales} PKR</div>
                  <p className="text-[10px] text-gray-400">From {stats.todayOrders} checkout tickets</p>
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">This Month's Sales</span>
                  <div className="text-xl font-black text-gray-900">Rs. {stats.monthlySales} PKR</div>
                  <p className="text-[10px] text-gray-400">From {stats.monthlyOrders} order collections</p>
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-2 border-l-rose-500 border-l-4">
                  <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Low Stock Items Alert</span>
                  </span>
                  <div className="text-xl font-black text-gray-900">{stats.lowStockCount} items</div>
                  <p className="text-[10px] text-rose-600 font-semibold">Immediate purchase required</p>
                </div>
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-2 border-l-amber-500 border-l-4">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Pending Billing Tickets</span>
                  <div className="text-xl font-black text-gray-900">{stats.pendingPaymentsCount} unpaid</div>
                  <p className="text-[10px] text-gray-400">Excludes cancelled tickets</p>
                </div>
              </div>

              {/* Graphic charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales trends SVG chart */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Daily Sales Trend (Last 7 Days)</h3>
                  <div className="h-44 w-full flex items-end gap-1.5 pt-4 border-b border-gray-200">
                    {(Array.isArray(stats?.salesTrend) ? stats.salesTrend : []).map(day => {
                      const maxVal = Math.max(...(Array.isArray(stats?.salesTrend) ? stats.salesTrend : []).map(d => d.amount)) || 1;
                      const heightPct = (day.amount / maxVal) * 80; // Scale to max 80%
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-8 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                            Rs. {day.amount}
                          </div>
                          {/* Bar */}
                          <div 
                            className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-t-md transition-all duration-500" 
                            style={{ height: `${Math.max(5, heightPct)}%` }}
                          />
                          <span className="text-[9px] text-gray-400 whitespace-nowrap">{day.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top selling products list */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Best Sellers List (By Revenue)</h3>
                  <div className="divide-y divide-gray-100">
                    {(Array.isArray(stats?.topProducts) ? stats.topProducts : []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-4">No completed order sales recorded yet.</p>
                    ) : (
                      (Array.isArray(stats?.topProducts) ? stats.topProducts : []).map((p, idx) => (
                        <div key={p.name} className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black text-gray-400 w-5">#{idx + 1}</span>
                            <span className="text-xs font-bold text-gray-800 line-clamp-1">{p.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-gray-950">Rs. {p.revenue} PKR</p>
                            <span className="text-[10px] text-gray-400">{p.quantity} units sold</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Low stock table alerts */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>Immediate Procurement Required (Stock level &lt; Alert trigger)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px]">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Title</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Alert Trigger</th>
                        <th className="p-3">Unit type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(Array.isArray(products) ? products : []).filter(p => p.active && p.stockQuantity <= p.minStockAlert).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400 italic">All items are sufficiently stocked! Excellent.</td>
                        </tr>
                      ) : (
                        (Array.isArray(products) ? products : []).filter(p => p.active && p.stockQuantity <= p.minStockAlert).map(p => (
                          <tr key={p.id} className="text-rose-950 bg-rose-50/10">
                            <td className="p-3 font-mono font-bold">{p.sku}</td>
                            <td className="p-3 font-bold">{p.name}</td>
                            <td className="p-3 text-rose-700 font-extrabold">{p.stockQuantity}</td>
                            <td className="p-3 text-gray-400">{p.minStockAlert}</td>
                            <td className="p-3 uppercase text-gray-400 text-[10px]">{p.unitType}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: PRODUCTS                                         */}
          {/* ======================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Search master SKU, title, descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <button
                  onClick={() => { resetProductForm(); setProductFormOpen(true); }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-emerald-700/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stationery Item</span>
                </button>
              </div>

              {/* Create/Edit Form Modal Overlay */}
              {productFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                      <h3 className="font-black text-gray-900 text-base">
                        {editingProductId ? '✏️ Modify Stationery Record' : '📦 Create Stationery Record'}
                      </h3>
                      <button 
                        onClick={() => setProductFormOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    <form onSubmit={handleProductSubmit} className="space-y-4 text-xs font-semibold">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Product Title *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Dollar Fountain Pen SP-10 (Blue)"
                            value={prodName}
                            onChange={(e) => setProdName(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Category Assignment *</label>
                          <select 
                            required
                            value={prodCatId}
                            onChange={(e) => setProdCatId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-emerald-500"
                          >
                            <option value="">-- Choose Category --</option>
                            {(Array.isArray(allCategories) ? allCategories : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Brand Assignment</label>
                          <select 
                            value={prodBrandId}
                            onChange={(e) => setProdBrandId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-emerald-500"
                          >
                            <option value="">-- Choose Brand --</option>
                            {(Array.isArray(brands) ? brands : []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Barcode (EAN-13)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 8964000110..."
                            value={prodBarcode}
                            onChange={(e) => setProdBarcode(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Cost Price *</label>
                          <input 
                            type="number" 
                            required
                            placeholder="Cost"
                            value={prodCostPrice}
                            onChange={(e) => setProdCostPrice(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Sale Price *</label>
                          <input 
                            type="number" 
                            required
                            placeholder="Retail"
                            value={prodSalePrice}
                            onChange={(e) => setProdSalePrice(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Promo/Discount Price</label>
                          <input 
                            type="number" 
                            placeholder="Active promo"
                            value={prodDiscPrice}
                            onChange={(e) => setProdDiscPrice(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Stock unit type</label>
                          <select 
                            value={prodUnit}
                            onChange={(e) => setProdUnit(e.target.value as any)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-emerald-500 capitalize"
                          >
                            <option value="piece">piece</option>
                            <option value="box">box</option>
                            <option value="dozen">dozen</option>
                            <option value="packet">packet</option>
                            <option value="ream">ream</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Opening Stock Qty *</label>
                          <input 
                            type="number" 
                            required
                            placeholder="Qty on hand"
                            value={prodStock}
                            onChange={(e) => setProdStock(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Min Stock Alert trigger *</label>
                          <input 
                            type="number" 
                            required
                            placeholder="Defalut: 5"
                            value={prodMinStock}
                            onChange={(e) => setProdMinStock(Number(e.target.value))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Variants List (Comma-separated name)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Blue, Black, Red (We will distribute stock equally)"
                          value={prodVariantsInput}
                          onChange={(e) => setProdVariantsInput(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Image URL</label>
                        <input 
                          type="url" 
                          placeholder="e.g. https://images.unsplash.com/... (Leaves empty for default placeholders)"
                          value={prodImgUrl}
                          onChange={(e) => setProdImgUrl(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1 uppercase font-bold">Product Description</label>
                        <textarea 
                          rows={3}
                          placeholder="Provide deep specifications (writing fluid quality, binding offset weight, etc.)"
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prodFeatured}
                            onChange={(e) => setProdFeatured(e.target.checked)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-gray-700">★ Display as Featured Item on Home Page</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={prodActive}
                            onChange={(e) => setProdActive(e.target.checked)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-gray-700">✓ Active storefront listing (Available to buy)</span>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-gray-150 flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setProductFormOpen(false)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={actionLoading}
                          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center gap-1"
                        >
                          {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                          <span>Save Stationery Record</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Table List of Products */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px]">
                      <tr>
                        <th className="p-3">Item Details</th>
                        <th className="p-3">SKU / Barcode</th>
                        <th className="p-3">Base Cost</th>
                        <th className="p-3">Retail Price</th>
                        <th className="p-3">Stock Qty</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(Array.isArray(products) ? products : [])
                        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(p => {
                          const catName = (categories || []).find(c => c.id === p.categoryId)?.name || 'General';
                          return (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="p-3 flex items-center gap-3">
                                <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
                                <div>
                                  <h4 className="font-bold text-gray-900 leading-tight">{p.name}</h4>
                                  <span className="text-[10px] text-emerald-800 font-bold">{catName}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <p className="font-mono font-bold text-gray-800">{p.sku}</p>
                                <span className="text-[10px] text-gray-400 font-mono">{p.barcode || 'N/A'}</span>
                              </td>
                              <td className="p-3 text-gray-500">Rs. {p.costPrice}</td>
                              <td className="p-3">
                                <p className="font-extrabold text-gray-900">Rs. {p.discountPrice || p.salePrice}</p>
                                {p.discountPrice && <span className="text-[9px] line-through text-gray-400">Rs. {p.salePrice}</span>}
                              </td>
                              <td className="p-3">
                                <span className={`font-black ${p.stockQuantity <= p.minStockAlert ? 'text-rose-600' : 'text-gray-900'}`}>
                                  {p.stockQuantity}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase"> / {p.unitType}</span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {p.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                <button 
                                  onClick={() => handleEditProductClick(p)}
                                  className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-gray-100 rounded transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1 text-slate-300 hover:text-red-600 hover:bg-gray-100 rounded transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: CATEGORIES & BRANDS                              */}
          {/* ======================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Box: Categories */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                  <h3 className="text-sm font-black uppercase text-gray-800 flex items-center gap-1.5">
                    <FolderTree className="w-5 h-5 text-emerald-700" />
                    <span>Store Categories</span>
                  </h3>
                  <button 
                    onClick={() => setCategoryFormOpen(true)}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded-lg transition"
                  >
                    + Add Category
                  </button>
                </div>

                {/* Create category overlay */}
                {categoryFormOpen && (
                  <form onSubmit={handleCategorySubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Category Name *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Drawing Instruments"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Category Description</label>
                      <input 
                        type="text" 
                        placeholder="Short tagline..."
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Banner Image URL</label>
                      <input 
                        type="url" 
                        placeholder="Unsplash URL..."
                        value={catImg}
                        onChange={(e) => setCatImg(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button type="button" onClick={() => setCategoryFormOpen(false)} className="bg-white border border-gray-200 px-3 py-1 rounded">Cancel</button>
                      <button type="submit" disabled={actionLoading} className="bg-emerald-700 text-white px-4 py-1 rounded">Save</button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-gray-100">
                  {(Array.isArray(allCategories) ? allCategories : []).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={c.image} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-extrabold text-gray-900">{c.name}</p>
                          <span className="text-[10px] text-gray-400 font-mono">Slug: {c.slug}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        c.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Box: Brands */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 self-start">
                <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                  <h3 className="text-sm font-black uppercase text-gray-800 flex items-center gap-1.5">
                    <CheckSquare className="w-5 h-5 text-emerald-700" />
                    <span>Stationery Brands</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  {(Array.isArray(brands) ? brands : []).map(b => (
                    <div key={b.id} className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex justify-between items-center">
                      <span>{b.name}</span>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Matched</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: ORDER FULFILMENT                                 */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Order table listings */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px]">
                      <tr>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Customer details</th>
                        <th className="p-3">Grand Total</th>
                        <th className="p-3">Payment status</th>
                        <th className="p-3">Order status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(!Array.isArray(orders) || orders.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-gray-400 italic">No checkout orders registered inside system database yet.</td>
                        </tr>
                      ) : (
                        orders.map(o => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="p-3">
                              <p className="font-black text-gray-950">{o.orderNumber}</p>
                              <span className="text-[10px] text-gray-400 font-mono capitalize">{o.paymentMethod.replace('_', ' ')}</span>
                            </td>
                            <td className="p-3 text-gray-400 font-mono">
                              {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-gray-900">{o.customerName}</p>
                              <p className="text-[10px] text-gray-400">{o.customerPhone}</p>
                            </td>
                            <td className="p-3 font-extrabold text-gray-950">Rs. {o.totalAmount}</td>
                            <td className="p-3">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                o.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {o.paymentStatus}
                              </span>
                              {o.paymentProofUrl && (
                                <span className="ml-1 bg-indigo-100 text-indigo-800 text-[8px] font-extrabold px-1 py-0.5 rounded animate-pulse">SLIP</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full capitalize ${
                                o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                o.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-indigo-100 text-indigo-800'
                              }`}>
                                {o.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => setSelectedOrder(o)}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspect Details Overlay Modal */}
              {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-gray-150 pb-2">
                      <div>
                        <h4 className="text-xs uppercase font-bold text-gray-400">Order Fulfilment Ticket</h4>
                        <h3 className="font-black text-gray-900 text-base">{selectedOrder.orderNumber}</h3>
                      </div>
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Order Details Body */}
                    <div className="text-xs space-y-4 font-medium">
                      
                      {/* Customer info & Delivery Address details */}
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-3.5 border border-gray-150">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Customer Information</p>
                          <p className="font-bold text-gray-800">{selectedOrder.customerName}</p>
                          <p className="text-gray-500">{selectedOrder.customerPhone}</p>
                          <p className="text-gray-400">{selectedOrder.customerEmail}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Shipping Destination</p>
                          <p className="text-gray-700 leading-normal">{selectedOrder.shippingAddress}</p>
                          <p className="font-bold text-emerald-800">{selectedOrder.shippingArea}, {selectedOrder.shippingCity}</p>
                          <span className="text-[9px] text-gray-400">Est days: {selectedOrder.estimatedDeliveryTime}</span>
                        </div>
                      </div>

                      {/* Manual payment proof verification */}
                      {selectedOrder.paymentProofUrl && (
                        <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-indigo-800">Meezan Bank Screenshot Receipt Attached:</span>
                            <a 
                              href={selectedOrder.paymentProofUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5 text-[10px]"
                            >
                              <span>View Slip full screen</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          
                          <div className="border border-indigo-200 rounded-lg overflow-hidden max-h-48 bg-white flex justify-center">
                            <img src={selectedOrder.paymentProofUrl} alt="Bank Proof" className="object-contain max-h-48" />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleReviewBankProof(selectedOrder.id, false)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-[10px] transition"
                            >
                              ✗ Reject Slip
                            </button>
                            <button
                              onClick={() => handleReviewBankProof(selectedOrder.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg text-[10px] transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Confirmed Payment</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Items list */}
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Purchased Items Details</p>
                        <div className="divide-y divide-gray-100 border border-gray-150 rounded-xl px-3 bg-white">
                          {(Array.isArray(selectedOrder?.items) ? selectedOrder.items : []).map((it: any) => (
                            <div key={it.id} className="flex justify-between py-2 text-[11px]">
                              <div>
                                <span className="font-bold text-gray-800">{it.productName}</span>
                                {it.variantName && <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold ml-1.5">{it.variantName}</span>}
                              </div>
                              <span className="font-mono text-gray-400">Rs. {it.price} x {it.quantity} = <b>Rs. {it.totalPrice}</b></span>
                            </div>
                          ))}
                        </div>
                        <div className="text-right pt-2 font-black text-gray-900">
                          Total Amount Paid/Payable: <span className="text-sm">Rs. {selectedOrder.totalAmount} PKR</span>
                        </div>
                      </div>

                      {/* Order status actions */}
                      <div className="pt-4 border-t border-gray-150 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Modify Order Processing Workflow</p>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {/* Confirm */}
                          {selectedOrder.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'confirmed', selectedOrder.paymentStatus, 'Order confirmed by staff')}
                              className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              ✓ Confirm Order (Deducts stock automatically)
                            </button>
                          )}
                          
                          {/* Processing */}
                          {selectedOrder.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'processing', selectedOrder.paymentStatus, 'Under printing/photocopy/assembly')}
                              className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              ⚡ Start Processing
                            </button>
                          )}

                          {/* Packed */}
                          {selectedOrder.status === 'processing' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'packed', selectedOrder.paymentStatus, 'Items securely packed')}
                              className="bg-purple-600 text-white hover:bg-purple-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              📦 Mark as Packed
                            </button>
                          )}

                          {/* Out for delivery */}
                          {selectedOrder.status === 'packed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'out_for_delivery', selectedOrder.paymentStatus, 'Dispatched with courier')}
                              className="bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              🚚 Out For Delivery
                            </button>
                          )}

                          {/* Delivered */}
                          {selectedOrder.status === 'out_for_delivery' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'delivered', 'paid', 'Delivered & COD amount collected')}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              ✓ Mark as Delivered (COD paid)
                            </button>
                          )}

                          {/* Cancel Order */}
                          {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'cancelled', 'unpaid', 'Order cancelled')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            >
                              ✗ Cancel order & restore stocks
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: DELIVERY AREAS                                   */}
          {/* ======================================================== */}
          {activeTab === 'areas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase text-gray-800">Pakistani Courier Shipping Rates</h3>
                <button
                  onClick={() => setAreaFormOpen(true)}
                  className="bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition"
                >
                  + Add Delivery Area
                </button>
              </div>

              {areaFormOpen && (
                <form onSubmit={handleAreaSubmit} className="bg-white p-4 rounded-xl border border-gray-200 max-w-md space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">City *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Lahore"
                        value={areaCity}
                        onChange={(e) => setAreaCity(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Area Name *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. DHA Phase 5"
                        value={areaName}
                        onChange={(e) => setAreaName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Charges (PKR) *</label>
                      <input 
                        type="number" 
                        required
                        value={areaCharges}
                        onChange={(e) => setAreaCharges(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-500 mb-1">Estimated Days</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Same Day or 2-3 Days"
                        value={areaEst}
                        onChange={(e) => setAreaEst(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={() => setAreaFormOpen(false)} className="bg-white border border-gray-200 px-3 py-1 rounded">Cancel</button>
                    <button type="submit" disabled={actionLoading} className="bg-emerald-700 text-white px-4 py-1 rounded">Save</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(areas) ? areas : []).map(a => (
                  <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">{a.city}</span>
                      <h4 className="font-bold text-gray-900 text-sm mt-1">{a.areaName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Est. days: {a.estDays}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-50">
                      <span className="text-xs text-gray-500">Charges:</span>
                      <span className="text-sm font-black text-gray-950">Rs. {a.charges} PKR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 6: AUDIT LOGS & MOVEMENTS                           */}
          {/* ======================================================== */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-fadeIn grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Box: Audit logs */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Security & admin Activity log</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {(Array.isArray(auditLogs) ? auditLogs : []).map(l => (
                    <div key={l.id} className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>{l.action}</span>
                        <span className="text-gray-400 font-mono">{new Date(l.createdAt).toLocaleTimeString('en-US')}</span>
                      </div>
                      <p className="text-gray-600 leading-normal">{l.details}</p>
                      <div className="text-slate-500 font-semibold flex justify-between">
                        <span>User: {l.userEmail}</span>
                        <span className="capitalize">({l.userRole})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Box: Inventory movements */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 self-start">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Stationery Stock Movement History</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {(Array.isArray(movements) ? movements : []).map(m => {
                    const isIncrease = m.quantity > 0;
                    const p = (Array.isArray(products) ? products : []).find(prod => prod.id === m.productId);
                    return (
                      <div key={m.id} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-[10px]">
                        <div>
                          <p className="font-bold text-gray-800">{p?.name || 'Item Record'}</p>
                          <span className="text-gray-400 capitalize">{m.type.replace('_', ' ')} {m.referenceId ? `(Ref: ${m.referenceId})` : ''}</span>
                        </div>
                        <span className={`font-black text-xs shrink-0 ${isIncrease ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncrease ? '+' : ''}{m.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 7: PAYMENT SETTINGS                                 */}
          {/* ======================================================== */}
          {activeTab === 'settings' && shopSettings && (
            <form onSubmit={handleSettingsUpdate} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-w-2xl space-y-5 text-xs animate-fadeIn">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">Shop details & Payment hashes</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 mb-1 uppercase">Shop name</label>
                  <input 
                    type="text" 
                    required
                    value={shopSettings.shopName}
                    onChange={(e) => setShopSettings({ ...shopSettings, shopName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1 uppercase">helpline hotline</label>
                  <input 
                    type="text" 
                    required
                    value={shopSettings.phone}
                    onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-500 mb-1 uppercase">WhatsApp widget number</label>
                  <input 
                    type="text" 
                    required
                    value={shopSettings.whatsApp}
                    onChange={(e) => setShopSettings({ ...shopSettings, whatsApp: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1 uppercase">Shop Physical City</label>
                  <input 
                    type="text" 
                    required
                    value={shopSettings.city}
                    onChange={(e) => setShopSettings({ ...shopSettings, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1 uppercase">Free delivery min (Rs.)</label>
                  <input 
                    type="number" 
                    required
                    value={shopSettings.freeDeliveryMin}
                    onChange={(e) => setShopSettings({ ...shopSettings, freeDeliveryMin: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-500 mb-1 uppercase">Shop address details</label>
                <input 
                  type="text" 
                  required
                  value={shopSettings.address}
                  onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Bank Account Config */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-150 pb-1">
                  <span className="font-extrabold text-[11px] uppercase text-slate-800">Bank Transfer Account Details</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={shopSettings.bankTransfer.active}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        bankTransfer: { ...shopSettings.bankTransfer, active: e.target.checked } 
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-[10px]">Active</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">BANK NAME</label>
                    <input 
                      type="text" 
                      value={shopSettings.bankTransfer.bankName}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        bankTransfer: { ...shopSettings.bankTransfer, bankName: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">ACCOUNT TITLE</label>
                    <input 
                      type="text" 
                      value={shopSettings.bankTransfer.accountTitle}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        bankTransfer: { ...shopSettings.bankTransfer, accountTitle: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">ACCOUNT NUMBER</label>
                    <input 
                      type="text" 
                      value={shopSettings.bankTransfer.accountNumber}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        bankTransfer: { ...shopSettings.bankTransfer, accountNumber: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">IBAN NUMBER</label>
                    <input 
                      type="text" 
                      value={shopSettings.bankTransfer.iban}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        bankTransfer: { ...shopSettings.bankTransfer, iban: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Easypaisa Merchant config */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-150 pb-1">
                  <span className="font-extrabold text-[11px] uppercase text-emerald-800">Easypaisa Online Merchant Gateway Integration</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={shopSettings.easypaisa.active}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, active: e.target.checked } 
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-[10px]">Active</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">MERCHANT ID</label>
                    <input 
                      type="text" 
                      value={shopSettings.easypaisa.merchantId}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, merchantId: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">STORE ID</label>
                    <input 
                      type="text" 
                      value={shopSettings.easypaisa.storeId}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, storeId: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">INTEGRATION MODE</label>
                    <select
                      value={shopSettings.easypaisa.sandboxMode ? 'sandbox' : 'live'}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, sandboxMode: e.target.value === 'sandbox' } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-bold"
                    >
                      <option value="sandbox">SANDBOX (Testing)</option>
                      <option value="live">LIVE PRODUCTION</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">SECRET HASH KEY</label>
                    <input 
                      type="password" 
                      value={shopSettings.easypaisa.hashKey}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, hashKey: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">SECURE SALT VALUE</label>
                    <input 
                      type="password" 
                      value={shopSettings.easypaisa.secureSalt}
                      onChange={(e) => setShopSettings({ 
                        ...shopSettings, 
                        easypaisa: { ...shopSettings.easypaisa, secureSalt: e.target.value } 
                      })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Submit settings button */}
              <div className="pt-4 border-t border-gray-150 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-5 rounded-xl transition flex items-center gap-1 shadow-md shadow-emerald-700/10"
                >
                  {actionLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Administrative Configurations</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
