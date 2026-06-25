import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, ShieldAlert, Sparkles, AlertCircle, Star, MessageSquare } from 'lucide-react';
import { Product, ProductVariant, Category, Brand } from '../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  category?: Category;
  brand?: Brand;
  onAddToCart: (p: Product, variantName?: string) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  category,
  brand,
  onAddToCart
}: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  // Fetch product detail and related reviews
  const loadProductDetails = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.slug}`);
      const data = await res.json();
      if (res.ok && data.reviews) {
        setReviews(data.reviews);
      }
    } catch (e) {
      console.error('Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadProductDetails();
    // Default select first variant if available
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0].name);
    }
  }, [product]);

  // Handle Review Submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setSubmittingReview(true);
    setReviewMessage('');

    try {
      // Build a bearer header if logged in, else use dummy to authenticate review
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const localToken = localStorage.getItem('ustaad_token');
      if (localToken) {
        headers['Authorization'] = localToken;
      } else {
        // Create quick temp customer to post review
        headers['Authorization'] = 'Bearer u-cust'; // Fallback seed customer
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewMessage('Review submitted successfully!');
        setReviewComment('');
        // Add locally to list for instant render
        setReviews(prev => [data.review, ...prev]);
      } else {
        setReviewMessage(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewMessage('Network error posting review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert;
  const activePrice = product.discountPrice || product.salePrice;
  const originalPrice = product.salePrice;
  const isDiscounted = !!product.discountPrice;

  const handleAddClick = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedVariant || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto" id="product-detail-modal">
      {/* Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-2 animate-fadeIn max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-20 p-1.5 bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 rounded-full shadow-md transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Product Image */}
        <div className="bg-gray-50 flex items-center justify-center p-8 border-r border-gray-100 relative h-64 md:h-full">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-contain max-h-80 rounded-2xl"
            referrerPolicy="no-referrer"
          />
          {isDiscounted && (
            <span className="absolute top-4 left-4 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
              SAVE Rs. {originalPrice - activePrice}
            </span>
          )}
        </div>

        {/* Right Side: Product Meta & Shopping actions */}
        <div className="p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category / Brand indicator */}
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-800 font-extrabold">
              <span>{category?.name || 'Stationery'}</span>
              {brand && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">{brand.name}</span>
                </>
              )}
            </div>

            <h3 className="text-lg md:text-xl font-black text-gray-950 leading-tight">
              {product.name}
            </h3>

            {/* SKU and stock status */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-400">SKU: {product.sku}</span>
              {isOutOfStock ? (
                <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">
                  Sold Out
                </span>
              ) : isLowStock ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Only {product.stockQuantity} remaining!</span>
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  In Stock (Ready)
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 leading-relaxed max-h-36 overflow-y-auto">
              {product.description || 'Premium school and office stationery supply of highest craftsmanship.'}
            </p>

            {/* Variants choice */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Available Options:</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVariant(v.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        selectedVariant === v.name 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-600 shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {v.name} ({v.stock > 0 ? `${v.stock} left` : 'Out of stock'})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="flex items-baseline gap-2 pt-2 border-t border-gray-50">
              {isDiscounted && (
                <span className="text-xs text-gray-400 line-through">
                  Rs. {originalPrice}
                </span>
              )}
              <span className="text-2xl font-black text-gray-950">
                Rs. {activePrice} PKR
              </span>
              <span className="text-xs text-gray-500">
                / {product.unitType}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-gray-50">
            <button
              onClick={handleAddClick}
              disabled={isOutOfStock}
              className={`w-full font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-emerald-700/10 text-sm ${
                isOutOfStock 
                  ? 'bg-gray-150 text-gray-400 cursor-not-allowed' 
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{isOutOfStock ? 'Temporarily Sold Out' : 'Add Selected Option to Cart'}</span>
            </button>
          </div>

          {/* Micro Reviews Section */}
          <div className="border-t border-gray-50 pt-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Customer Reviews ({reviews.length})</span>
            </h4>

            {reviewsLoading ? (
              <p className="text-[10px] text-gray-400 animate-pulse">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-[10px] text-gray-400 italic">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-2.5 max-h-32 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-gray-50 p-2 rounded-xl text-[10px] space-y-1">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>{rev.userName}</span>
                      <span className="text-amber-500">★ {rev.rating}/5</span>
                    </div>
                    <p className="text-gray-600 leading-snug">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick review submit */}
            <form onSubmit={handleReviewSubmit} className="space-y-2 pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500">Give your rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-sm ${reviewRating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Share your feedback about ink quality, binding..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[10px] outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 rounded-lg text-[10px]"
                >
                  Post
                </button>
              </div>
              {reviewMessage && <p className="text-[9px] text-emerald-700 font-bold">{reviewMessage}</p>}
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
