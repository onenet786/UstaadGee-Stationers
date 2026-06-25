import React, { useState } from 'react';
import { Search, MapPin, Phone, Calendar, ArrowUpRight, Upload, CheckCircle2, AlertCircle, Printer, Image, DollarSign, Clock } from 'lucide-react';
import { Order, OrderItem } from '../types';

interface OrderTrackProps {
  initialOrderNumber?: string;
}

export default function OrderTrack({ initialOrderNumber = '' }: OrderTrackProps) {
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Upload proof state
  const [proofUrl, setProofUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumberInput.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);
    setItems([]);
    setUploadSuccess('');
    setUploadError('');

    try {
      const res = await fetch(`/api/orders/track/${orderNumberInput.trim()}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        setItems(data.items);
      } else {
        setError(data.error || 'Failed to locate order. Please check the number and try again.');
      }
    } catch (err) {
      setError('Network error searching for order.');
    } finally {
      setLoading(false);
    }
  };

  // Customer uploads a payment receipt link/screenshot
  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !proofUrl.trim()) return;

    setUploadLoading(true);
    setUploadSuccess('');
    setUploadError('');

    try {
      const res = await fetch(`/api/orders/${order.id}/upload-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshotUrl: proofUrl.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(data.message);
        // Refresh the tracked order
        setOrder(data.order);
      } else {
        setUploadError(data.error || 'Failed to save proof.');
      }
    } catch (err) {
      setUploadError('Network error uploading proof receipt.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Helper for tracking timelines
  const statuses: { label: string; key: string; color: string }[] = [
    { label: 'Placed', key: 'pending', color: 'bg-yellow-500' },
    { label: 'Confirmed', key: 'confirmed', color: 'bg-blue-500' },
    { label: 'Processing', key: 'processing', color: 'bg-indigo-500' },
    { label: 'Packed', key: 'packed', color: 'bg-purple-500' },
    { label: 'On Route', key: 'out_for_delivery', color: 'bg-cyan-500' },
    { label: 'Delivered', key: 'delivered', color: 'bg-emerald-500' }
  ];

  const getStatusIndex = (currentStatus: string) => {
    if (currentStatus === 'cancelled' || currentStatus === 'returned') return -1;
    return statuses.findIndex(s => s.key === currentStatus);
  };

  const statusIdx = order ? getStatusIndex(order.status) : -1;

  // Print Invoice trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" id="order-tracking-portal">
      {/* Track Box Search bar */}
      <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm text-center space-y-4">
        <h2 className="text-xl font-black text-gray-900">Track Your Stationery Order</h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Enter the order number printed on your receipt (e.g. <b>UG-2026-XXXX</b>) to track its processing status, estimated arrival, or upload bank transfer slips.
        </p>
        <form onSubmit={handleTrack} className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            placeholder="e.g. UG-2026-1024"
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition uppercase font-bold"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-600 text-xs font-semibold max-w-md mx-auto flex items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-10 space-y-2">
          <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 font-medium">Locating UstaadGee Order data...</p>
        </div>
      )}

      {/* Track Order Panel result */}
      {order && (
        <div className="space-y-6 animate-fadeIn" id="invoice-block">
          
          {/* Main Status Ribbon */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tracking Reference</span>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>{order.orderNumber}</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    order.status === 'returned' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-center">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-emerald-700 border border-gray-200 hover:border-emerald-500 rounded-lg px-3 py-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="pt-6 pb-2">
              {order.status === 'cancelled' || order.status === 'returned' ? (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-rose-600 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-extrabold">Order Cancelled or Returned</h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      This order has been marked as <b>{order.status.toUpperCase()}</b> by shop administration. Any reserved items have been restored to our main stationery inventory database.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline bar */}
                  <div className="absolute top-4 left-4 right-4 h-1 bg-gray-100 -z-10 hidden md:block" />
                  
                  {/* Grid of Steps */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {statuses.map((st, sidx) => {
                      const isActive = sidx <= statusIdx;
                      const isCurrent = sidx === statusIdx;

                      return (
                        <div key={st.key} className="flex md:flex-col items-center gap-3 md:gap-2 text-center md:text-center select-none">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 ${
                            isCurrent ? 'bg-emerald-700 text-white ring-4 ring-emerald-100 scale-110' :
                            isActive ? 'bg-emerald-600 text-white' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {isActive ? '✓' : sidx + 1}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                              {st.label}
                            </p>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                                Active State
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ETA Info */}
            {order.status !== 'cancelled' && order.estimatedDeliveryTime && (
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50/50 p-2.5 rounded-lg w-fit">
                <Clock className="w-4 h-4" />
                <span>Estimated Arrival: {order.estimatedDeliveryTime}</span>
              </div>
            )}
          </div>

          {/* Customer Bank Transfer Proof Upload panel */}
          {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' && (
            <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-700" />
                <h3 className="text-sm font-black text-indigo-950">Meezan Bank Transfer Verification Required</h3>
              </div>
              <p className="text-xs text-indigo-800 leading-normal">
                You selected <b>Direct Bank Transfer</b>. Please send <b>Rs. {order.totalAmount} PKR</b> to our Meezan Bank account and submit your receipt snapshot link below. This triggers immediate admin approval.
              </p>

              {order.paymentProofUrl ? (
                <div className="bg-white rounded-xl p-3 border border-indigo-100 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-bold text-gray-800">Screenshot receipt uploaded!</span>
                      <p className="text-[10px] text-gray-400">Status: Awaiting administrative manual matching</p>
                    </div>
                  </div>
                  <a 
                    href={order.paymentProofUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <span>View Slip</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <form onSubmit={handleUploadProof} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-800 uppercase mb-1">
                      Paste receipt Screenshot/Image URL *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          required
                          placeholder="e.g. https://imagehost.com/my-receipt.jpg"
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                        <Image className="absolute right-3 top-2.5 w-4 h-4 text-indigo-300" />
                      </div>
                      <button
                        type="submit"
                        disabled={uploadLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl text-xs transition disabled:opacity-50"
                      >
                        {uploadLoading ? 'Uploading...' : 'Submit Receipt'}
                      </button>
                    </div>
                  </div>
                  {uploadSuccess && <p className="text-xs text-emerald-700 font-semibold">{uploadSuccess}</p>}
                  {uploadError && <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>}
                </form>
              )}
            </div>
          )}

          {/* Invoice Structure Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Col: Order items details */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100">
                Purchased Items List
              </h4>

              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-1">
                {items.map((it) => (
                  <div key={it.id} className="flex gap-3 py-3 first:pt-0">
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-gray-800 leading-tight">
                        {it.productName}
                      </h5>
                      {it.variantName && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                          {it.variantName}
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {it.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-800">
                        Rs. {it.price} x {it.quantity}
                      </p>
                      <p className="text-xs font-black text-gray-900">
                        Rs. {it.totalPrice} PKR
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill summary block */}
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Items Subtotal:</span>
                  <span>Rs. {order.subtotal} PKR</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Coupon Discount ({order.couponCode}):</span>
                    <span>- Rs. {order.discount} PKR</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Shipping & Delivery charges:</span>
                  <span>{order.deliveryCharges === 0 ? 'FREE DELIVERY' : `Rs. ${order.deliveryCharges} PKR`}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-100 pt-2.5">
                  <span>Grand Total Paid/Payable:</span>
                  <span>Rs. {order.totalAmount} PKR</span>
                </div>
              </div>
            </div>

            {/* Right Col: Customer & Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-5">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100">
                  Customer & Shipping
                </h4>
                
                <div className="text-xs space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Recipient Name</span>
                    <p className="font-extrabold text-gray-800 mt-0.5">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Contact Number</span>
                    <p className="font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{order.customerPhone}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Delivery Address</span>
                    <p className="font-medium text-gray-700 mt-0.5 leading-relaxed flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{order.shippingAddress}, {order.shippingArea}, {order.shippingCity}, Pakistan</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Date Placed</span>
                    <p className="font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Payment Status
                </h4>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-extrabold uppercase text-gray-800">{order.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                      order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Print specific terms */}
          <div className="hidden print:block text-[10px] text-gray-400 text-center pt-8 border-t border-gray-100 mt-12 space-y-1">
            <p><b>Thank you for shopping at UstaadGee Stationers!</b></p>
            <p>Poonch Road, Samanabad, Lahore, Pakistan | Helpline: +92 333 4488205</p>
            <p>Generated dynamically via secure storefront engine. This is an official digital invoice.</p>
          </div>

        </div>
      )}
    </div>
  );
}
