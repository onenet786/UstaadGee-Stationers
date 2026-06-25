import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Ticket, Check, MapPin, CreditCard, Banknote, ShieldAlert } from 'lucide-react';
import { Product, DeliveryArea, PaymentMethod, Coupon } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
  variantName?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQty: (productId: string, qty: number, variantName?: string) => void;
  onRemoveItem: (productId: string, variantName?: string) => void;
  deliveryAreas: DeliveryArea[];
  onCheckoutSuccess: (orderData: any) => void;
  user: any;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  deliveryAreas,
  onCheckoutSuccess,
  user
}: CartDrawerProps) {
  // Checkout Form State
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Loading & error
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Auto-fill user if they log in later
  useEffect(() => {
    if (user) {
      setCustomerName(user.name);
      setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  if (!isOpen) return null;

  // Calculate Subtotal
  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.product.discountPrice || item.product.salePrice;
    return acc + price * item.quantity;
  }, 0);

  // Free shipping threshold check (Rs. 2,000)
  const FREE_SHIPPING_MIN = 2000;
  const matchesFreeShipping = subtotal >= FREE_SHIPPING_MIN;
  const remainingForFreeShipping = FREE_SHIPPING_MIN - subtotal;

  // Resolve shipping charges based on selection
  const selectedArea = deliveryAreas.find(da => da.id === deliveryAreaId);
  const baseShipping = selectedArea ? selectedArea.charges : 0;
  const shippingCharges = (matchesFreeShipping && baseShipping > 0) ? 0 : baseShipping;

  // Coupon discount computation
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      discount = Math.round((subtotal * appliedCoupon.value) / 100);
    } else {
      discount = appliedCoupon.value;
    }
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCharges);

  // Validate coupon via API
  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    if (!couponCodeInput.trim()) return;

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCodeInput.trim(), cartSubtotal: subtotal })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedCoupon(data.coupon);
        setCouponSuccess(`Coupon "${data.coupon.code.toUpperCase()}" applied successfully! Saved Rs. ${data.coupon.type === 'percentage' ? `${data.coupon.value}%` : `${data.coupon.value} PKR`}`);
      } else {
        setCouponError(data.error || 'Failed to apply coupon.');
      }
    } catch (e) {
      setCouponError('Network error validating coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  // Submit order placement to Express backend
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || !deliveryAreaId) {
      setCheckoutError('Please fill out all required fields marked with *');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone,
        shippingAddress,
        deliveryAreaId,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        notes,
        cartItems: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantName: item.variantName
        }))
      };

      // Header token for customer tracking if authenticated
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const localToken = localStorage.getItem('ustaad_token');
      if (localToken) {
        headers['Authorization'] = localToken;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Success: Clear cart, reset, close drawer, and fire callback (which displays order confirmation)
        onCheckoutSuccess(data);
        setStep('cart');
        setAppliedCoupon(null);
        setCouponCodeInput('');
        onClose();
      } else {
        setCheckoutError(data.error || 'An error occurred while placing the order.');
      }
    } catch (err) {
      setCheckoutError('Network error. Please check your connection and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-wrapper">
      {/* Overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer content */}
      <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out animate-slideOver">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-800" />
            <h2 className="text-base font-black text-gray-900">
              {step === 'cart' ? 'My Cart' : 'Checkout details'}
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {cartItems.length} items
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Step View */}
        {step === 'cart' ? (
          /* ======================================================== */
          /* STEP 1: CART LISTING                                     */
          /* ======================================================== */
          <>
            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-700">Your cart is empty</h3>
                <p className="text-xs text-gray-400 text-center max-w-[250px]">
                  Browse our stationery categories and add registers, pens, markers, or supplies!
                </p>
                <button 
                  onClick={onClose}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                {/* Free Shipping Progress bar */}
                <div className="p-4 bg-emerald-50 border-b border-emerald-100/30">
                  <div className="flex justify-between text-xs font-bold text-emerald-900 mb-1">
                    <span>
                      {matchesFreeShipping 
                        ? '🎉 Congratulations! You unlocked free delivery.' 
                        : `Buy Rs. ${remainingForFreeShipping} more for FREE shipping!`
                      }
                    </span>
                    <span>Rs. {subtotal} / {FREE_SHIPPING_MIN}</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Cart list */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-4 space-y-4">
                  {(Array.isArray(cartItems) ? cartItems : []).map((item, index) => {
                    const price = item.product.discountPrice || item.product.salePrice;
                    return (
                      <div key={`${item.product.id}-${item.variantName || index}`} className="flex gap-3 pt-4 first:pt-0">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden shrink-0">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Description */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 leading-snug line-clamp-1">
                              {item.product.name}
                            </h4>
                            {item.variantName && (
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 font-bold px-1.5 py-0.5 rounded">
                                Variant: {item.variantName}
                              </span>
                            )}
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {item.product.sku}</p>
                          </div>

                          {/* Control row */}
                          <div className="flex items-center justify-between gap-2 mt-1">
                            {/* Quantity buttons */}
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button 
                                onClick={() => onUpdateQty(item.product.id, Math.max(1, item.quantity - 1), item.variantName)}
                                className="p-1 hover:bg-gray-50 text-gray-500"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-extrabold text-gray-800">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => {
                                  // Check stock limit before incrementing
                                  if (item.quantity < item.product.stockQuantity) {
                                    onUpdateQty(item.product.id, item.quantity + 1, item.variantName);
                                  }
                                }}
                                className="p-1 hover:bg-gray-50 text-gray-500"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Price * quantity & delete */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-gray-900">
                                Rs. {price * item.quantity}
                              </span>
                              <button 
                                onClick={() => onRemoveItem(item.product.id, item.variantName)}
                                className="text-gray-300 hover:text-red-500 transition p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer and summary block */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Cart Subtotal:</span>
                    <span className="text-base font-black text-gray-900">Rs. {subtotal} PKR</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    * Shipping & delivery charges will be calculated in the next step based on your delivery city/area.
                  </p>
                  <button 
                    onClick={() => setStep('checkout')}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-700/10 flex items-center justify-center gap-2 transition"
                  >
                    <span>Proceed to Shipping details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* ======================================================== */
          /* STEP 2: CHECKOUT DETAIL FORM                             */
          /* ======================================================== */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Scrollable form details */}
            <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Customer information section */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>1. Delivery Information</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ahmed Khan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Phone Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. 03331234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="e.g. customer@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">City & Delivery Zone *</label>
                    <select 
                      required
                      value={deliveryAreaId}
                      onChange={(e) => setDeliveryAreaId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none bg-white focus:border-emerald-500"
                    >
                      <option value="">-- Choose Area --</option>
                      {(Array.isArray(deliveryAreas) ? deliveryAreas : []).map(area => (
                        <option key={area.id} value={area.id}>
                          {area.city} - {area.areaName} (Rs. {area.charges})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Estimated Delivery</label>
                    <input 
                      type="text" 
                      disabled
                      value={selectedArea ? selectedArea.estDays : 'Choose area...'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Shipping Street Address *</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="House/Apartment #, Block, Street Name, Nearest Landmark"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase">Order Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ring bell twice, deliver after 2 PM, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Coupon Discount Module */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-150 space-y-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="PROMO CODE (e.g. WELCOME10)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1 text-xs outline-none focus:border-emerald-500 uppercase font-bold"
                  />
                  {appliedCoupon ? (
                    <button 
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded-lg text-xs"
                    >
                      Remove
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-1 rounded-lg text-xs"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {couponError && <p className="text-[10px] text-rose-600 font-semibold">{couponError}</p>}
                {couponSuccess && <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" />{couponSuccess}</p>}
              </div>

              {/* Payment Methods module */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>2. Secure Payment Method</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {/* COD */}
                  <label className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition ${
                    paymentMethod === 'cod' 
                      ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="cod" 
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold">Cash on Delivery</span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1">Pay on your doorstep</span>
                  </label>

                  {/* Easypaisa */}
                  <label className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition ${
                    paymentMethod === 'easypaisa' 
                      ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="easypaisa" 
                      checked={paymentMethod === 'easypaisa'}
                      onChange={() => setPaymentMethod('easypaisa')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-black text-xs">ep</span>
                      <span className="text-xs font-bold">Easypaisa</span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1">Hosted Online Mobile Checkout</span>
                  </label>

                  {/* JazzCash */}
                  <label className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition ${
                    paymentMethod === 'jazzcash' 
                      ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="jazzcash" 
                      checked={paymentMethod === 'jazzcash'}
                      onChange={() => setPaymentMethod('jazzcash')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-600 font-extrabold text-xs">JC</span>
                      <span className="text-xs font-bold">JazzCash</span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1">Hosted Instant PIN Checkout</span>
                  </label>

                  {/* Meezan Bank Transfer */}
                  <label className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition ${
                    paymentMethod === 'bank_transfer' 
                      ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="bank_transfer" 
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 font-extrabold text-xs">MBL</span>
                      <span className="text-xs font-bold">Bank Transfer</span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1">Manual receipt upload</span>
                  </label>
                </div>

                {/* Conditional Instructions for Bank Transfer */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-3.5 space-y-2 text-indigo-950 animate-fadeIn">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Account details for Meezan Bank:</p>
                    <div className="text-xs space-y-1 font-mono">
                      <div className="flex justify-between"><span>Title:</span> <span className="font-bold text-gray-800">UstaadGee Stationers</span></div>
                      <div className="flex justify-between"><span>Account #:</span> <span className="font-bold text-gray-800">00340103456721</span></div>
                      <div className="flex justify-between"><span>IBAN:</span> <span className="font-bold text-gray-800">PK49MEZN00340103456721</span></div>
                    </div>
                    <p className="text-[10px] text-indigo-700 leading-normal">
                      💡 Transfer the amount using your banking app or Easypaisa/JazzCash app to our IBAN above. After payment, complete this checkout, then navigate to <b>Track Order</b> and upload the screenshot receipt. Admin will approve within 30 minutes!
                    </p>
                  </div>
                )}
              </div>

              {checkoutError && (
                <div className="bg-rose-50 border border-rose-150 p-3 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </form>

            {/* Billing summary and submit button */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Cart Items Subtotal:</span>
                  <span>Rs. {subtotal} PKR</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount Coupon ({appliedCoupon.code}):</span>
                    <span>- Rs. {discount} PKR</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Shipping & Delivery Charges:</span>
                  <span>{shippingCharges === 0 ? <span className="text-emerald-700 font-bold">FREE DELIVERY</span> : `Rs. ${shippingCharges} PKR`}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-2.5">
                  <span>Total Payable Amount:</span>
                  <span>Rs. {grandTotal} PKR</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => setStep('cart')}
                  className="bg-white border border-gray-200 text-gray-600 rounded-xl text-xs py-2.5 hover:bg-gray-50 transition"
                >
                  Back to Cart
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                  className="col-span-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-700/15 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <span>Confirm Order & Checkout</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
