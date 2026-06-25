import React from 'react';
import { ShoppingCart, Star, Eye, Tag, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: any;
  product: Product;
  categoryName?: string;
  brandName?: string;
  onAddToCart: (p: Product, variantName?: string) => void;
  onSelect: (p: Product) => void;
}

export default function ProductCard({
  product,
  categoryName,
  brandName,
  onAddToCart,
  onSelect
}: ProductCardProps) {
  const isDiscounted = !!product.discountPrice;
  const price = product.discountPrice || product.salePrice;
  const originalPrice = product.salePrice;
  const savings = isDiscounted ? originalPrice - (product.discountPrice || 0) : 0;
  
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockAlert;

  const handleCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    // Default to the first variant if available, otherwise undefined
    const defaultVariant = product.variants && product.variants.length > 0 
      ? product.variants[0].name 
      : undefined;
    onAddToCart(product, defaultVariant);
  };

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-gray-150 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden cursor-pointer h-full relative"
      id={`product-card-${product.id}`}
    >
      {/* Badges / Discount flag */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {isDiscounted && (
          <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Tag className="w-3 h-3" />
            <span>SAVE Rs. {savings}</span>
          </span>
        )}
        {product.featured && (
          <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm w-fit uppercase tracking-wider">
            ★ Featured
          </span>
        )}
        {isOutOfStock ? (
          <span className="bg-slate-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            Sold Out
          </span>
        ) : isLowStock ? (
          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Only {product.stockQuantity} Left!</span>
          </span>
        ) : null}
      </div>

      {/* Product Image and Hover actions */}
      <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          id={`product-img-${product.id}`}
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="bg-white/95 text-gray-800 rounded-full p-2.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-emerald-600 hover:text-white">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          {/* Metadata: Category & Brand */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-800 font-extrabold">
            <span>{categoryName || 'Stationery'}</span>
            {brandName && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 font-bold">{brandName}</span>
              </>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-800 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">SKU: {product.sku}</p>
        </div>

        <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-50">
          {/* Pricing */}
          <div className="flex flex-col">
            {isDiscounted && (
              <span className="text-xs text-gray-400 line-through">
                Rs. {originalPrice}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-gray-900">
                Rs. {price}
              </span>
              <span className="text-[9px] text-gray-500 lowercase font-medium">
                / {product.unitType}
              </span>
            </div>
          </div>

          {/* Quick Add To Cart */}
          <button
            onClick={handleCartClick}
            disabled={isOutOfStock}
            className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/10'
            }`}
            title={isOutOfStock ? 'Sold Out' : 'Quick Add to Cart'}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
