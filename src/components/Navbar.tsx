import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, User, LogOut, ShieldAlert, Sparkles, MessageCircle, Menu, X } from 'lucide-react';
import { Category } from '../types';

interface NavbarProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onSearch: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  user: any;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenTrack: () => void;
  onOpenContact: () => void;
}

export default function Navbar({
  categories,
  activeCategory,
  onSelectCategory,
  onSearch,
  cartCount,
  onOpenCart,
  user,
  onLogout,
  onOpenAuth,
  onOpenAdmin,
  onOpenTrack,
  onOpenContact
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm" id="store-header">
      {/* Top micro-bar */}
      <div className="bg-emerald-900 text-white py-1.5 px-4 text-xs font-medium text-center flex justify-between items-center max-w-7xl mx-auto rounded-b-lg">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>✨ Free delivery on all orders above Rs. 2,000 across Pakistan!</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>📍 samananbad, Lahore</span>
          <span>📞 +92 333 4488205</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <div 
          onClick={() => { onSelectCategory(''); clearSearch(); }}
          className="flex items-center gap-2 cursor-pointer select-none group"
          id="brand-logo"
        >
          <div className="w-10 h-10 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            UG
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-none">UstaadGee</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Stationers</span>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative" id="search-form">
          <input
            type="text"
            placeholder="Search premium registers, gel pens, calculators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-full py-2 pl-4 pr-10 text-sm outline-none transition"
          />
          <button type="submit" className="absolute right-3.5 top-2.5 text-gray-400 hover:text-emerald-700">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          {/* Contact */}
          <button 
            onClick={onOpenContact}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact</span>
          </button>

          {/* Track Order */}
          <button 
            onClick={onOpenTrack}
            className="hidden sm:flex text-xs font-bold text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-600 rounded-full px-3.5 py-1.5 transition"
          >
            Track Order
          </button>

          {/* Admin shortcut */}
          {user && user.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold px-3 py-1.5 rounded-full hover:bg-amber-100 transition shadow-sm animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* User profile action */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-gray-800 leading-none">{user.name}</p>
                <span className="text-[9px] text-emerald-700 font-bold capitalize">{user.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="flex items-center gap-1 text-gray-600 hover:text-emerald-700 p-2 rounded-lg hover:bg-gray-50 transition text-sm font-semibold"
            >
              <User className="w-5 h-5" />
              <span className="hidden md:inline">Login</span>
            </button>
          )}

          {/* Cart Trigger */}
          <button 
            onClick={onOpenCart}
            className="relative p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full transition shadow-sm"
            id="cart-trigger"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-emerald-700 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Category Horizontal Bar / Mobile Menu */}
      <div className="border-t border-gray-50 bg-gray-50/50">
        {/* Desktop category navigation */}
        <div className="hidden md:flex items-center gap-1 max-w-7xl mx-auto px-6 overflow-x-auto scrollbar-none py-1.5">
          <button
            onClick={() => onSelectCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeCategory === '' 
                ? 'bg-emerald-700 text-white' 
                : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/50'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeCategory === cat.id 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Mobile menu and search */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 animate-fadeIn">
            {/* Mobile Search */}
            <form onSubmit={(e) => { handleSearchSubmit(e); setMobileMenuOpen(false); }} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-3 pr-10 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              />
              <button type="submit" className="absolute right-3 top-2.5 text-gray-400">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile Links */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <button 
                onClick={() => { onOpenTrack(); setMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-xs font-bold text-gray-700"
              >
                Track Order
              </button>
              <button 
                onClick={() => { onOpenContact(); setMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-xs font-bold text-gray-700"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Shop
              </button>
            </div>

            {/* Mobile Categories list */}
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Shop Categories</p>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                <button
                  onClick={() => { onSelectCategory(''); setMobileMenuOpen(false); }}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-semibold ${
                    activeCategory === '' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-600'
                  }`}
                >
                  All Stationery Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { onSelectCategory(cat.id); setMobileMenuOpen(false); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-semibold ${
                      activeCategory === cat.id ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
